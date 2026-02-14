package v1

import (
	"net/http"
	"strings"
	"time"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"

	"github.com/paretoimproved/local-roots/backend/internal/resp"
)

type BuyerOrdersAPI struct {
	DB *pgxpool.Pool
}

type GetOrderResponse struct {
	Order Order `json:"order"`
	// Whether a review exists for the order.
	HasReview bool `json:"has_review"`
}

func (a BuyerOrdersAPI) GetOrder(w http.ResponseWriter, r *http.Request) {
	if a.DB == nil {
		resp.ServiceUnavailable(w, "database not configured")
		return
	}

	orderID := r.PathValue("orderId")
	if orderID == "" {
		resp.BadRequest(w, "missing orderId")
		return
	}

	token := strings.TrimSpace(r.URL.Query().Get("token"))
	if token == "" {
		// Accept buyer token via Authorization header for consistency with other auth patterns.
		// Note: this is not a JWT; it is the opaque buyer_token issued when placing an order.
		authz := strings.TrimSpace(r.Header.Get("Authorization"))
		parts := strings.SplitN(authz, " ", 2)
		if len(parts) == 2 && strings.EqualFold(parts[0], "bearer") {
			token = strings.TrimSpace(parts[1])
		}
	}
	if token == "" {
		resp.Unauthorized(w, "missing token")
		return
	}

	var o Order
	err := a.DB.QueryRow(r.Context(), `
		select
			id::text,
			store_id::text,
			pickup_window_id::text,
			buyer_token,
			pickup_code,
			buyer_email,
			buyer_name,
			buyer_phone,
			status,
			payment_method,
			payment_status,
			subtotal_cents,
			total_cents,
			captured_cents,
			created_at
		from orders
		where id = $1::uuid
			and buyer_token = $2
		limit 1
	`, orderID, token).Scan(
		&o.ID,
		&o.StoreID,
		&o.PickupWindowID,
		&o.BuyerToken,
		&o.PickupCode,
		&o.BuyerEmail,
		&o.BuyerName,
		&o.BuyerPhone,
		&o.Status,
		&o.PaymentMethod,
		&o.PaymentStatus,
		&o.SubtotalCents,
		&o.TotalCents,
		&o.CapturedCents,
		&o.CreatedAt,
	)
	if err != nil {
		if err == pgx.ErrNoRows {
			resp.Unauthorized(w, "order not found")
			return
		}
		resp.Internal(w, err)
		return
	}

	rows, err := a.DB.Query(r.Context(), `
		select id::text, offering_id::text, product_title, product_unit, price_cents, quantity, line_total_cents
		from order_items
		where order_id = $1::uuid
		order by created_at asc
	`, orderID)
	if err != nil {
		resp.Internal(w, err)
		return
	}
	defer rows.Close()

	for rows.Next() {
		var it OrderItem
		var offeringID *string
		if err := rows.Scan(&it.ID, &offeringID, &it.ProductTitle, &it.ProductUnit, &it.PriceCents, &it.Quantity, &it.LineTotalCents); err != nil {
			resp.Internal(w, err)
			return
		}
		it.OfferingID = offeringID
		o.Items = append(o.Items, it)
	}
	if rows.Err() != nil {
		resp.Internal(w, rows.Err())
		return
	}

	var hasReview bool
	if err := a.DB.QueryRow(r.Context(), `
		select exists(select 1 from reviews where order_id = $1::uuid)
	`, orderID).Scan(&hasReview); err != nil {
		resp.Internal(w, err)
		return
	}

	resp.OK(w, GetOrderResponse{Order: o, HasReview: hasReview})
}

type CreateReviewRequest struct {
	Token  string  `json:"token"`
	Rating int     `json:"rating"`
	Body   *string `json:"body"`
}

type Review struct {
	ID        string    `json:"id"`
	OrderID   string    `json:"order_id"`
	StoreID   string    `json:"store_id"`
	Rating    int       `json:"rating"`
	Body      *string   `json:"body"`
	CreatedAt time.Time `json:"created_at"`
}

func (a BuyerOrdersAPI) CreateReview(w http.ResponseWriter, r *http.Request) {
	if a.DB == nil {
		resp.ServiceUnavailable(w, "database not configured")
		return
	}

	orderID := r.PathValue("orderId")
	if orderID == "" {
		resp.BadRequest(w, "missing orderId")
		return
	}

	var in CreateReviewRequest
	if err := resp.DecodeJSON(w, r, &in); err != nil {
		resp.BadRequest(w, "invalid json")
		return
	}

	token := strings.TrimSpace(in.Token)
	if token == "" {
		resp.Unauthorized(w, "missing token")
		return
	}
	if in.Rating < 1 || in.Rating > 5 {
		resp.BadRequest(w, "rating must be 1-5")
		return
	}

	var (
		storeID string
		status  string
	)
	if err := a.DB.QueryRow(r.Context(), `
		select store_id::text, status
		from orders
		where id = $1::uuid and buyer_token = $2
		limit 1
	`, orderID, token).Scan(&storeID, &status); err != nil {
		if err == pgx.ErrNoRows {
			resp.Unauthorized(w, "order not found")
			return
		}
		resp.Internal(w, err)
		return
	}

	if status != "picked_up" {
		resp.BadRequest(w, "order is not completed")
		return
	}

	var out Review
	err := a.DB.QueryRow(r.Context(), `
		insert into reviews (order_id, store_id, rating, body)
		values ($1::uuid, $2::uuid, $3, $4)
		on conflict (order_id) do nothing
		returning id::text, order_id::text, store_id::text, rating, body, created_at
	`, orderID, storeID, in.Rating, in.Body).Scan(
		&out.ID,
		&out.OrderID,
		&out.StoreID,
		&out.Rating,
		&out.Body,
		&out.CreatedAt,
	)
	if err != nil {
		if err == pgx.ErrNoRows {
			resp.BadRequest(w, "review already exists")
			return
		}
		resp.Internal(w, err)
		return
	}

	resp.OK(w, out)
}
