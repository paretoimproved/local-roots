package v1

import (
	"net/http"
	"regexp"
	"strings"
	"time"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"

	"github.com/paretoimproved/local-roots/backend/internal/resp"
)

var uuidRe = regexp.MustCompile(`^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$`)

func validUUID(s string) bool {
	return uuidRe.MatchString(s)
}

func extractBuyerToken(r *http.Request) string {
	authz := strings.TrimSpace(r.Header.Get("Authorization"))
	parts := strings.SplitN(authz, " ", 2)
	if len(parts) == 2 && strings.EqualFold(parts[0], "bearer") {
		return strings.TrimSpace(parts[1])
	}
	return ""
}

type OrdersAPI struct {
	DB *pgxpool.Pool
}

type CreateOrderRequest struct {
	Buyer struct {
		Email string  `json:"email"`
		Name  *string `json:"name"`
		Phone *string `json:"phone"`
	} `json:"buyer"`
	Items []struct {
		OfferingID string `json:"offering_id"`
		Quantity   int    `json:"quantity"`
	} `json:"items"`
}

type OrderItem struct {
	ID             string  `json:"id"`
	OfferingID     *string `json:"offering_id"`
	ProductTitle   string  `json:"product_title"`
	ProductUnit    string  `json:"product_unit"`
	PriceCents     int     `json:"price_cents"`
	Quantity       int     `json:"quantity"`
	LineTotalCents int     `json:"line_total_cents"`
}

type Order struct {
	ID             string      `json:"id"`
	StoreID        string      `json:"store_id"`
	PickupWindowID string      `json:"pickup_window_id"`
	BuyerToken     string      `json:"buyer_token"`
	PickupCode     string      `json:"pickup_code"`
	BuyerEmail     string      `json:"buyer_email"`
	BuyerName      *string     `json:"buyer_name"`
	BuyerPhone     *string     `json:"buyer_phone"`
	Status         string      `json:"status"`
	PaymentMethod  string      `json:"payment_method"`
	PaymentStatus  string      `json:"payment_status"`
	SubtotalCents  int         `json:"subtotal_cents"`
	BuyerFeeCents  int         `json:"buyer_fee_cents"`
	TotalCents     int         `json:"total_cents"`
	CapturedCents  int         `json:"captured_cents"`
	CreatedAt      time.Time   `json:"created_at"`
	Items          []OrderItem `json:"items"`
}

func (a OrdersAPI) CreateOrder(w http.ResponseWriter, r *http.Request) {
	if a.DB == nil {
		resp.ServiceUnavailable(w, "database not configured")
		return
	}

	windowID := r.PathValue("pickupWindowId")
	if windowID == "" {
		resp.BadRequest(w, "missing pickupWindowId")
		return
	}

	var in CreateOrderRequest
	if err := resp.DecodeJSON(w, r, &in); err != nil {
		resp.BadRequest(w, "invalid json")
		return
	}

	buyerEmail := strings.ToLower(strings.TrimSpace(in.Buyer.Email))
	if buyerEmail == "" || !strings.Contains(buyerEmail, "@") {
		resp.BadRequest(w, "invalid buyer email")
		return
	}
	if len(in.Items) == 0 {
		resp.BadRequest(w, "at least one item is required")
		return
	}
	if len(in.Items) > 50 {
		resp.BadRequest(w, "too many items")
		return
	}

	ctx := r.Context()
	tx, err := a.DB.Begin(ctx)
	if err != nil {
		resp.Internal(w, err)
		return
	}
	defer tx.Rollback(ctx)

	var (
		storeID  string
		status   string
		cutoffAt time.Time
	)
	if err := tx.QueryRow(ctx, `
		select store_id::text, status, cutoff_at
		from pickup_windows
		where id = $1::uuid
		limit 1
	`, windowID).Scan(&storeID, &status, &cutoffAt); err != nil {
		if err == pgx.ErrNoRows {
			resp.NotFound(w, "pickup window not found")
			return
		}
		resp.Internal(w, err)
		return
	}

	now := time.Now().UTC()
	if status != "published" {
		resp.BadRequest(w, "pickup window is not available")
		return
	}
	if !cutoffAt.After(now) {
		resp.BadRequest(w, "pickup window cutoff has passed")
		return
	}

	type resolvedItem struct {
		offeringID   string
		productTitle string
		productUnit  string
		priceCents   int
		qty          int
		lineTotal    int
	}

	var (
		items    []resolvedItem
		subtotal int
	)

	// Resolve + lock offerings to reserve inventory.
	for _, it := range in.Items {
		oid := strings.TrimSpace(it.OfferingID)
		if oid == "" || it.Quantity <= 0 {
			resp.BadRequest(w, "invalid items")
			return
		}

		var (
			priceCents   int
			qtyAvail     int
			qtyReserved  int
			productTitle string
			productUnit  string
		)
		err := tx.QueryRow(ctx, `
			select
				o.price_cents,
				o.quantity_available,
				o.quantity_reserved,
				p.title,
				p.unit
			from offerings o
			join products p on p.id = o.product_id
			where o.id = $1::uuid
				and o.pickup_window_id = $2::uuid
				and o.status = 'active'
			for update
		`, oid, windowID).Scan(&priceCents, &qtyAvail, &qtyReserved, &productTitle, &productUnit)
		if err != nil {
			if err == pgx.ErrNoRows {
				resp.BadRequest(w, "offering not available")
				return
			}
			resp.Internal(w, err)
			return
		}

		remain := qtyAvail - qtyReserved
		if remain < it.Quantity {
			resp.BadRequest(w, "insufficient inventory")
			return
		}

		if _, err := tx.Exec(ctx, `
			update offerings
			set quantity_reserved = quantity_reserved + $2
			where id = $1::uuid
		`, oid, it.Quantity); err != nil {
			resp.Internal(w, err)
			return
		}

		line := priceCents * it.Quantity
		subtotal += line
		items = append(items, resolvedItem{
			offeringID:   oid,
			productTitle: productTitle,
			productUnit:  productUnit,
			priceCents:   priceCents,
			qty:          it.Quantity,
			lineTotal:    line,
		})
	}

	// No fees yet.
	buyerFee := 0
	total := subtotal

	var out Order
	out.BuyerEmail = buyerEmail
	out.BuyerName = in.Buyer.Name
	out.BuyerPhone = in.Buyer.Phone
	out.StoreID = storeID
	out.PickupWindowID = windowID
	out.SubtotalCents = subtotal
	out.BuyerFeeCents = buyerFee
	out.TotalCents = total

	err = tx.QueryRow(ctx, `
		insert into orders (store_id, pickup_window_id, buyer_email, buyer_name, buyer_phone, status, payment_method, payment_status, subtotal_cents, buyer_fee_cents, total_cents)
		values ($1::uuid, $2::uuid, $3, $4, $5, 'placed', 'pay_at_pickup', 'unpaid', $6, $7, $8)
		returning id::text, buyer_token, pickup_code, status, payment_method, payment_status, captured_cents, created_at
	`, storeID, windowID, buyerEmail, in.Buyer.Name, in.Buyer.Phone, subtotal, buyerFee, total).Scan(
		&out.ID,
		&out.BuyerToken,
		&out.PickupCode,
		&out.Status,
		&out.PaymentMethod,
		&out.PaymentStatus,
		&out.CapturedCents,
		&out.CreatedAt,
	)
	if err != nil {
		resp.Internal(w, err)
		return
	}

	for _, it := range items {
		var itemID string
		if err := tx.QueryRow(ctx, `
			insert into order_items (order_id, offering_id, product_title, product_unit, price_cents, quantity, line_total_cents)
			values ($1::uuid, $2::uuid, $3, $4, $5, $6, $7)
			returning id::text
		`, out.ID, it.offeringID, it.productTitle, it.productUnit, it.priceCents, it.qty, it.lineTotal).Scan(&itemID); err != nil {
			resp.Internal(w, err)
			return
		}
		oid := it.offeringID
		out.Items = append(out.Items, OrderItem{
			ID:             itemID,
			OfferingID:     &oid,
			ProductTitle:   it.productTitle,
			ProductUnit:    it.productUnit,
			PriceCents:     it.priceCents,
			Quantity:       it.qty,
			LineTotalCents: it.lineTotal,
		})
	}

	if err := tx.Commit(ctx); err != nil {
		resp.Internal(w, err)
		return
	}

	resp.OK(w, out)
}
