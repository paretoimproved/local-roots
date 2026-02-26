package v1

import (
	"bytes"
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"os"
	"path/filepath"
	"strings"
	"testing"
	"time"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/jackc/pgx/v5/stdlib"
	"github.com/pressly/goose/v3"
)

// TestPickupConfirmPreview_Validation tests that the Preview handler
// rejects requests with missing or malformed query params.
func TestPickupConfirmPreview_Validation(t *testing.T) {
	api := PickupConfirmAPI{} // nil DB triggers panic on real queries — we test early returns only.

	cases := []struct {
		name   string
		query  string
		status int
	}{
		{"missing both params", "", http.StatusBadRequest},
		{"missing code", "?order=00000000-0000-0000-0000-000000000001", http.StatusBadRequest},
		{"missing order", "?code=123456", http.StatusBadRequest},
		{"invalid order uuid", "?order=not-a-uuid&code=123456", http.StatusBadRequest},
	}

	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			req := httptest.NewRequest(http.MethodGet, "/v1/seller/pickup/preview"+tc.query, nil)
			rr := httptest.NewRecorder()
			api.Preview(rr, req, AuthUser{ID: "user-1", Role: "seller"})
			if rr.Code != tc.status {
				t.Errorf("got %d want %d: %s", rr.Code, tc.status, rr.Body.String())
			}
		})
	}
}

// TestPickupConfirmConfirm_Validation tests that the Confirm handler
// rejects requests with missing or malformed body fields.
func TestPickupConfirmConfirm_Validation(t *testing.T) {
	api := PickupConfirmAPI{}

	cases := []struct {
		name   string
		body   map[string]any
		status int
	}{
		{"empty body", map[string]any{}, http.StatusBadRequest},
		{"missing pickup_code", map[string]any{"order_id": "00000000-0000-0000-0000-000000000001"}, http.StatusBadRequest},
		{"missing order_id", map[string]any{"pickup_code": "123456"}, http.StatusBadRequest},
		{"invalid order_id", map[string]any{"order_id": "bad", "pickup_code": "123456"}, http.StatusBadRequest},
	}

	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			b, _ := json.Marshal(tc.body)
			req := httptest.NewRequest(http.MethodPost, "/v1/seller/pickup/confirm", bytes.NewReader(b))
			req.Header.Set("Content-Type", "application/json")
			rr := httptest.NewRecorder()
			api.Confirm(rr, req, AuthUser{ID: "user-1", Role: "seller"})
			if rr.Code != tc.status {
				t.Errorf("got %d want %d: %s", rr.Code, tc.status, rr.Body.String())
			}
		})
	}
}

// TestPickupConfirmIntegration is an integration test that verifies the full
// Preview + Confirm flow against a real database. Skipped unless DATABASE_URL is set.
func TestPickupConfirmIntegration(t *testing.T) {
	dbURL := strings.TrimSpace(os.Getenv("DATABASE_URL"))
	if dbURL == "" {
		t.Skip("DATABASE_URL not set")
	}

	ctx := context.Background()
	schema := "it_" + randHex(t, 8)

	// Create schema.
	createCfg, err := pgx.ParseConfig(dbURL)
	if err != nil {
		t.Fatalf("parse DATABASE_URL: %v", err)
	}
	conn, err := pgx.ConnectConfig(ctx, createCfg)
	if err != nil {
		t.Fatalf("connect: %v", err)
	}
	if _, err := conn.Exec(ctx, `create schema `+schema); err != nil {
		_ = conn.Close(ctx)
		t.Fatalf("create schema: %v", err)
	}
	_ = conn.Close(ctx)

	defer func() {
		cfg, err := pgx.ParseConfig(dbURL)
		if err != nil {
			return
		}
		c, err := pgx.ConnectConfig(context.Background(), cfg)
		if err != nil {
			return
		}
		_, _ = c.Exec(context.Background(), `drop schema if exists `+schema+` cascade`)
		_ = c.Close(context.Background())
	}()

	// Run migrations.
	migCfg, err := pgx.ParseConfig(dbURL)
	if err != nil {
		t.Fatalf("parse: %v", err)
	}
	migCfg.RuntimeParams["search_path"] = schema + ",public"
	sqlDB := stdlib.OpenDB(*migCfg)
	sqlDB.SetMaxOpenConns(1)
	defer sqlDB.Close()

	if err := goose.SetDialect("postgres"); err != nil {
		t.Fatalf("goose dialect: %v", err)
	}
	migrationsDir := filepath.Join("..", "..", "..", "migrations")
	if err := goose.Up(sqlDB, migrationsDir); err != nil {
		t.Fatalf("goose up: %v", err)
	}

	poolCfg, err := pgxpool.ParseConfig(dbURL)
	if err != nil {
		t.Fatalf("pool parse: %v", err)
	}
	poolCfg.ConnConfig.RuntimeParams["search_path"] = schema + ",public"
	pool, err := pgxpool.NewWithConfig(ctx, poolCfg)
	if err != nil {
		t.Fatalf("pool: %v", err)
	}
	defer pool.Close()

	// Arrange: user, store, location, window, product, offering, order.
	var sellerUserID, otherUserID, storeID, windowID, orderID, pickupCode string

	if err := pool.QueryRow(ctx, `insert into users (email, role) values ('seller@example.com', 'seller') returning id::text`).Scan(&sellerUserID); err != nil {
		t.Fatalf("insert seller: %v", err)
	}
	if err := pool.QueryRow(ctx, `insert into users (email, role) values ('other@example.com', 'seller') returning id::text`).Scan(&otherUserID); err != nil {
		t.Fatalf("insert other user: %v", err)
	}
	if err := pool.QueryRow(ctx, `insert into stores (owner_user_id, name) values ($1::uuid, 'Test Farm') returning id::text`, sellerUserID).Scan(&storeID); err != nil {
		t.Fatalf("insert store: %v", err)
	}

	var locID string
	if err := pool.QueryRow(ctx, `insert into pickup_locations (store_id, address1, city, region, postal_code, timezone) values ($1::uuid, '123 Main', 'Town', 'CA', '99999', 'UTC') returning id::text`, storeID).Scan(&locID); err != nil {
		t.Fatalf("insert location: %v", err)
	}

	startAt := time.Now().UTC().Add(24 * time.Hour).Truncate(time.Second)
	if err := pool.QueryRow(ctx, `insert into pickup_windows (store_id, pickup_location_id, start_at, end_at, cutoff_at, status) values ($1::uuid, $2::uuid, $3, $4, $5, 'published') returning id::text`,
		storeID, locID, startAt, startAt.Add(2*time.Hour), startAt.Add(-2*time.Hour)).Scan(&windowID); err != nil {
		t.Fatalf("insert window: %v", err)
	}

	var productID, offeringID string
	if err := pool.QueryRow(ctx, `insert into products (store_id, title, unit) values ($1::uuid, 'Apples', 'lb') returning id::text`, storeID).Scan(&productID); err != nil {
		t.Fatalf("insert product: %v", err)
	}
	if err := pool.QueryRow(ctx, `insert into offerings (store_id, pickup_window_id, product_id, price_cents, quantity_available, quantity_reserved, status) values ($1::uuid, $2::uuid, $3::uuid, 500, 10, 1, 'active') returning id::text`,
		storeID, windowID, productID).Scan(&offeringID); err != nil {
		t.Fatalf("insert offering: %v", err)
	}

	if err := pool.QueryRow(ctx, `
		insert into orders (store_id, pickup_window_id, buyer_email, buyer_name, status, payment_method, payment_status, subtotal_cents, buyer_fee_cents, total_cents, stripe_payment_intent_id, buyer_token)
		values ($1::uuid, $2::uuid, 'buyer@test.com', 'Test Buyer', 'placed', 'card', 'authorized', 500, 25, 525, 'pi_test_123', 'tok_buyer')
		returning id::text, pickup_code
	`, storeID, windowID).Scan(&orderID, &pickupCode); err != nil {
		t.Fatalf("insert order: %v", err)
	}

	// Insert order item.
	if _, err := pool.Exec(ctx, `
		insert into order_items (order_id, offering_id, product_title, product_unit, price_cents, quantity, line_total_cents)
		values ($1::uuid, $2::uuid, 'Apples', 'lb', 500, 1, 500)
	`, orderID, offeringID); err != nil {
		t.Fatalf("insert order_item: %v", err)
	}

	api := PickupConfirmAPI{DB: pool}

	// --- Preview tests ---

	t.Run("preview: valid seller + matching code → 200", func(t *testing.T) {
		req := httptest.NewRequest(http.MethodGet, "/v1/seller/pickup/preview?order="+orderID+"&code="+pickupCode, nil)
		rr := httptest.NewRecorder()
		api.Preview(rr, req, AuthUser{ID: sellerUserID, Role: "seller"})
		if rr.Code != http.StatusOK {
			t.Fatalf("got %d: %s", rr.Code, rr.Body.String())
		}
		var out PickupPreviewResponse
		if err := json.Unmarshal(rr.Body.Bytes(), &out); err != nil {
			t.Fatalf("unmarshal: %v", err)
		}
		if out.OrderID != orderID {
			t.Errorf("order_id=%s want %s", out.OrderID, orderID)
		}
		if out.StoreName != "Test Farm" {
			t.Errorf("store_name=%s want Test Farm", out.StoreName)
		}
		if out.Status != "placed" {
			t.Errorf("status=%s want placed", out.Status)
		}
		if len(out.Items) != 1 {
			t.Errorf("items len=%d want 1", len(out.Items))
		}
	})

	t.Run("preview: wrong code → 400", func(t *testing.T) {
		req := httptest.NewRequest(http.MethodGet, "/v1/seller/pickup/preview?order="+orderID+"&code=000000", nil)
		rr := httptest.NewRecorder()
		api.Preview(rr, req, AuthUser{ID: sellerUserID, Role: "seller"})
		if rr.Code != http.StatusBadRequest {
			t.Errorf("got %d want 400: %s", rr.Code, rr.Body.String())
		}
	})

	t.Run("preview: non-owner seller → 403", func(t *testing.T) {
		req := httptest.NewRequest(http.MethodGet, "/v1/seller/pickup/preview?order="+orderID+"&code="+pickupCode, nil)
		rr := httptest.NewRecorder()
		api.Preview(rr, req, AuthUser{ID: otherUserID, Role: "seller"})
		if rr.Code != http.StatusForbidden {
			t.Errorf("got %d want 403: %s", rr.Code, rr.Body.String())
		}
	})

	// --- Confirm tests ---

	t.Run("confirm: wrong code → 400", func(t *testing.T) {
		b, _ := json.Marshal(PickupConfirmRequest{OrderID: orderID, PickupCode: "000000"})
		req := httptest.NewRequest(http.MethodPost, "/v1/seller/pickup/confirm", bytes.NewReader(b))
		req.Header.Set("Content-Type", "application/json")
		rr := httptest.NewRecorder()
		api.Confirm(rr, req, AuthUser{ID: sellerUserID, Role: "seller"})
		if rr.Code != http.StatusBadRequest {
			t.Errorf("got %d want 400: %s", rr.Code, rr.Body.String())
		}
	})

	t.Run("confirm: non-owner → 403", func(t *testing.T) {
		b, _ := json.Marshal(PickupConfirmRequest{OrderID: orderID, PickupCode: pickupCode})
		req := httptest.NewRequest(http.MethodPost, "/v1/seller/pickup/confirm", bytes.NewReader(b))
		req.Header.Set("Content-Type", "application/json")
		rr := httptest.NewRecorder()
		api.Confirm(rr, req, AuthUser{ID: otherUserID, Role: "seller"})
		if rr.Code != http.StatusForbidden {
			t.Errorf("got %d want 403: %s", rr.Code, rr.Body.String())
		}
	})

	// Create a cancelled order to test confirm on non-eligible status.
	var canceledOrderID, canceledCode string
	if err := pool.QueryRow(ctx, `
		insert into orders (store_id, pickup_window_id, buyer_email, status, payment_method, payment_status, subtotal_cents, buyer_fee_cents, total_cents, stripe_payment_intent_id, buyer_token)
		values ($1::uuid, $2::uuid, 'buyer2@test.com', 'canceled', 'card', 'voided', 500, 25, 525, 'pi_test_456', 'tok_buyer2')
		returning id::text, pickup_code
	`, storeID, windowID).Scan(&canceledOrderID, &canceledCode); err != nil {
		t.Fatalf("insert canceled order: %v", err)
	}

	t.Run("confirm: canceled order → 400", func(t *testing.T) {
		b, _ := json.Marshal(PickupConfirmRequest{OrderID: canceledOrderID, PickupCode: canceledCode})
		req := httptest.NewRequest(http.MethodPost, "/v1/seller/pickup/confirm", bytes.NewReader(b))
		req.Header.Set("Content-Type", "application/json")
		rr := httptest.NewRecorder()
		api.Confirm(rr, req, AuthUser{ID: sellerUserID, Role: "seller"})
		if rr.Code != http.StatusBadRequest {
			t.Errorf("got %d want 400: %s", rr.Code, rr.Body.String())
		}
	})

	// Test preview for canceled order returns 200 with status "canceled".
	t.Run("preview: canceled order → 200 with status canceled", func(t *testing.T) {
		req := httptest.NewRequest(http.MethodGet, "/v1/seller/pickup/preview?order="+canceledOrderID+"&code="+canceledCode, nil)
		rr := httptest.NewRecorder()
		api.Preview(rr, req, AuthUser{ID: sellerUserID, Role: "seller"})
		if rr.Code != http.StatusOK {
			t.Fatalf("got %d: %s", rr.Code, rr.Body.String())
		}
		var out PickupPreviewResponse
		if err := json.Unmarshal(rr.Body.Bytes(), &out); err != nil {
			t.Fatalf("unmarshal: %v", err)
		}
		if out.Status != "canceled" {
			t.Errorf("status=%s want canceled", out.Status)
		}
	})
}
