package v1

import (
	"bytes"
	"context"
	"crypto/rand"
	"encoding/hex"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"os"
	"path/filepath"
	"strings"
	"sync"
	"testing"
	"time"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/jackc/pgx/v5/stdlib"
	"github.com/pressly/goose/v3"
)

func TestCreateOrder_ReservationDoesNotOversell(t *testing.T) {
	dbURL := strings.TrimSpace(os.Getenv("DATABASE_URL"))
	if dbURL == "" {
		t.Skip("DATABASE_URL not set")
	}

	ctx := context.Background()
	schema := "it_" + randHex(t, 8)

	// Create schema using a plain connection (default search_path).
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

	// Ensure cleanup.
	defer func() {
		cfg, err := pgx.ParseConfig(dbURL)
		if err != nil {
			t.Logf("cleanup parse: %v", err)
			return
		}
		c, err := pgx.ConnectConfig(context.Background(), cfg)
		if err != nil {
			t.Logf("cleanup connect: %v", err)
			return
		}
		_, _ = c.Exec(context.Background(), `drop schema if exists `+schema+` cascade`)
		_ = c.Close(context.Background())
	}()

	// Migrate within the schema via search_path.
	migCfg, err := pgx.ParseConfig(dbURL)
	if err != nil {
		t.Fatalf("parse DATABASE_URL: %v", err)
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

	// Create a pool that uses the same schema.
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

	// Arrange minimal data: user/store/location/window/product/offering.
	var (
		userID    string
		storeID   string
		locID     string
		windowID  string
		productID string
		offering  string
	)

	if err := pool.QueryRow(ctx, `
		insert into users (email, role) values ('seller@example.com', 'seller')
		returning id::text
	`).Scan(&userID); err != nil {
		t.Fatalf("insert user: %v", err)
	}
	if err := pool.QueryRow(ctx, `
		insert into stores (owner_user_id, name) values ($1::uuid, 'My Store')
		returning id::text
	`, userID).Scan(&storeID); err != nil {
		t.Fatalf("insert store: %v", err)
	}
	if err := pool.QueryRow(ctx, `
		insert into pickup_locations (store_id, address1, city, region, postal_code, timezone)
		values ($1::uuid, '123 Main', 'Town', 'CA', '99999', 'UTC')
		returning id::text
	`, storeID).Scan(&locID); err != nil {
		t.Fatalf("insert pickup_location: %v", err)
	}

	startAt := time.Now().UTC().Add(24 * time.Hour).Truncate(time.Second)
	endAt := startAt.Add(2 * time.Hour)
	cutoffAt := startAt.Add(-2 * time.Hour)
	if err := pool.QueryRow(ctx, `
		insert into pickup_windows (store_id, pickup_location_id, start_at, end_at, cutoff_at, status)
		values ($1::uuid, $2::uuid, $3, $4, $5, 'published')
		returning id::text
	`, storeID, locID, startAt, endAt, cutoffAt).Scan(&windowID); err != nil {
		t.Fatalf("insert pickup_window: %v", err)
	}

	if err := pool.QueryRow(ctx, `
		insert into products (store_id, title, unit) values ($1::uuid, 'Apples', 'lb')
		returning id::text
	`, storeID).Scan(&productID); err != nil {
		t.Fatalf("insert product: %v", err)
	}

	if err := pool.QueryRow(ctx, `
		insert into offerings (store_id, pickup_window_id, product_id, price_cents, quantity_available, quantity_reserved, status)
		values ($1::uuid, $2::uuid, $3::uuid, 500, 5, 0, 'active')
		returning id::text
	`, storeID, windowID, productID).Scan(&offering); err != nil {
		t.Fatalf("insert offering: %v", err)
	}

	api := OrdersAPI{DB: pool}

	place := func(qty int) *httptest.ResponseRecorder {
		body, _ := json.Marshal(map[string]any{
			"buyer": map[string]any{"email": "buyer@example.com"},
			"items": []map[string]any{{"offering_id": offering, "quantity": qty}},
		})
		req := httptest.NewRequest(http.MethodPost, "/v1/pickup-windows/"+windowID+"/orders", bytes.NewReader(body))
		req.SetPathValue("pickupWindowId", windowID)
		rr := httptest.NewRecorder()
		api.CreateOrder(rr, req)
		return rr
	}

	// Run two concurrent orders of qty=3 against inventory 5. One must fail.
	var wg sync.WaitGroup
	wg.Add(2)
	var r1, r2 *httptest.ResponseRecorder
	go func() { defer wg.Done(); r1 = place(3) }()
	go func() { defer wg.Done(); r2 = place(3) }()
	wg.Wait()

	okCount := 0
	failCount := 0
	for _, rr := range []*httptest.ResponseRecorder{r1, r2} {
		if rr.Code == http.StatusOK {
			okCount++
		} else if rr.Code == http.StatusBadRequest {
			failCount++
		} else {
			t.Fatalf("unexpected status: %d body=%s", rr.Code, rr.Body.String())
		}
	}
	if okCount != 1 || failCount != 1 {
		t.Fatalf("expected 1 ok + 1 bad_request, got ok=%d fail=%d", okCount, failCount)
	}

	var reserved int
	if err := pool.QueryRow(ctx, `select quantity_reserved from offerings where id = $1::uuid`, offering).Scan(&reserved); err != nil {
		t.Fatalf("select reserved: %v", err)
	}
	if reserved != 3 {
		t.Fatalf("reserved=%d want 3", reserved)
	}
}

func randHex(t *testing.T, nbytes int) string {
	t.Helper()
	b := make([]byte, nbytes)
	if _, err := rand.Read(b); err != nil {
		t.Fatalf("rand: %v", err)
	}
	return hex.EncodeToString(b)
}
