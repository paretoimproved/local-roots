package v1

import (
	"errors"
	"net/http"
	"strings"
	"time"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"

	"github.com/paretoimproved/local-roots/backend/internal/email"
	"github.com/paretoimproved/local-roots/backend/internal/payments/stripepay"
	"github.com/paretoimproved/local-roots/backend/internal/resp"
)

type PickupConfirmAPI struct {
	DB          *pgxpool.Pool
	Stripe      *stripepay.Client
	Email       *email.Client
	FrontendURL string
}

type PickupPreviewResponse struct {
	OrderID        string      `json:"order_id"`
	StoreID        string      `json:"store_id"`
	StoreName      string      `json:"store_name"`
	Status         string      `json:"status"`
	BuyerName      *string     `json:"buyer_name"`
	BuyerEmail     string      `json:"buyer_email"`
	Items          []OrderItem `json:"items"`
	SubtotalCents  int         `json:"subtotal_cents"`
	BuyerFeeCents  int         `json:"buyer_fee_cents"`
	TotalCents     int         `json:"total_cents"`
	PaymentStatus  string      `json:"payment_status"`
	PickupWindowID string      `json:"pickup_window_id"`
	CreatedAt      time.Time   `json:"created_at"`
	UpdatedAt      time.Time   `json:"updated_at"`
}

type PickupConfirmRequest struct {
	OrderID    string `json:"order_id"`
	PickupCode string `json:"pickup_code"`
}

type PickupConfirmResponse struct {
	OrderID        string      `json:"order_id"`
	StoreID        string      `json:"store_id"`
	PickupWindowID string      `json:"pickup_window_id"`
	Status         string      `json:"status"`
	BuyerName      *string     `json:"buyer_name"`
	BuyerEmail     string      `json:"buyer_email"`
	Items          []OrderItem `json:"items"`
	TotalCents     int         `json:"total_cents"`
	SubtotalCents  int         `json:"subtotal_cents"`
	ConfirmedAt    time.Time   `json:"confirmed_at"`
}

// Preview returns the order details for a pickup confirmation screen.
// The seller opens this URL by scanning the buyer's QR code.
func (a PickupConfirmAPI) Preview(w http.ResponseWriter, r *http.Request, u AuthUser) {
	orderID := r.URL.Query().Get("order")
	code := r.URL.Query().Get("code")
	if orderID == "" || !validUUID(orderID) {
		resp.BadRequest(w, "invalid pickup code")
		return
	}
	code = strings.TrimSpace(code)
	if code == "" {
		resp.BadRequest(w, "invalid pickup code")
		return
	}

	ctx := r.Context()

	// Look up order + store info.
	var (
		out         PickupPreviewResponse
		pickupCode  string
		ownerUserID string
	)
	err := a.DB.QueryRow(ctx, `
		select
			o.id::text,
			o.store_id::text,
			s.name,
			s.owner_user_id::text,
			o.status,
			o.buyer_name,
			o.buyer_email,
			o.subtotal_cents,
			o.buyer_fee_cents,
			o.total_cents,
			o.payment_status,
			o.pickup_window_id::text,
			o.pickup_code,
			o.created_at,
			o.updated_at
		from orders o
		join stores s on s.id = o.store_id
		where o.id = $1::uuid
	`, orderID).Scan(
		&out.OrderID,
		&out.StoreID,
		&out.StoreName,
		&ownerUserID,
		&out.Status,
		&out.BuyerName,
		&out.BuyerEmail,
		&out.SubtotalCents,
		&out.BuyerFeeCents,
		&out.TotalCents,
		&out.PaymentStatus,
		&out.PickupWindowID,
		&pickupCode,
		&out.CreatedAt,
		&out.UpdatedAt,
	)
	if err != nil {
		if err == pgx.ErrNoRows {
			resp.BadRequest(w, "invalid pickup code")
			return
		}
		resp.Internal(w, err)
		return
	}

	if pickupCode != code {
		resp.BadRequest(w, "invalid pickup code")
		return
	}

	if ownerUserID != u.ID {
		resp.Forbidden(w, "this order belongs to a different store")
		return
	}

	// Fetch items.
	rows, err := a.DB.Query(ctx, `
		select
			id::text,
			offering_id::text,
			product_title,
			product_unit,
			price_cents,
			quantity,
			line_total_cents
		from order_items
		where order_id = $1::uuid
		order by created_at asc
	`, orderID)
	if err != nil {
		resp.Internal(w, err)
		return
	}
	defer rows.Close()

	out.Items = make([]OrderItem, 0)
	for rows.Next() {
		var it OrderItem
		if err := rows.Scan(
			&it.ID,
			&it.OfferingID,
			&it.ProductTitle,
			&it.ProductUnit,
			&it.PriceCents,
			&it.Quantity,
			&it.LineTotalCents,
		); err != nil {
			resp.Internal(w, err)
			return
		}
		out.Items = append(out.Items, it)
	}
	if rows.Err() != nil {
		resp.Internal(w, rows.Err())
		return
	}

	resp.OK(w, out)
}

// Confirm confirms a pickup and captures payment.
// Mirrors ConfirmPickup in seller_orders.go but without storeId in the URL.
func (a PickupConfirmAPI) Confirm(w http.ResponseWriter, r *http.Request, u AuthUser) {
	var in PickupConfirmRequest
	if err := resp.DecodeJSON(w, r, &in); err != nil {
		resp.BadRequest(w, "invalid json")
		return
	}
	in.OrderID = strings.TrimSpace(in.OrderID)
	in.PickupCode = strings.TrimSpace(in.PickupCode)
	if in.OrderID == "" || !validUUID(in.OrderID) {
		resp.BadRequest(w, "invalid order_id")
		return
	}
	if in.PickupCode == "" {
		resp.BadRequest(w, "pickup_code is required")
		return
	}

	ctx := r.Context()

	// Verify seller owns the store that this order belongs to.
	var ownerUserID string
	err := a.DB.QueryRow(ctx, `
		select s.owner_user_id::text
		from orders o
		join stores s on s.id = o.store_id
		where o.id = $1::uuid
	`, in.OrderID).Scan(&ownerUserID)
	if err != nil {
		if err == pgx.ErrNoRows {
			resp.BadRequest(w, "invalid pickup code")
			return
		}
		resp.Internal(w, err)
		return
	}
	if ownerUserID != u.ID {
		resp.Forbidden(w, "this order belongs to a different store")
		return
	}

	tx, err := a.DB.Begin(ctx)
	if err != nil {
		resp.Internal(w, err)
		return
	}
	defer tx.Rollback(ctx)

	result, err := ExecutePickupConfirm(ctx, tx, a.DB, a.Stripe, a.Email, a.FrontendURL, in.OrderID, in.PickupCode, "")
	if err != nil {
		switch {
		case errors.Is(err, ErrOrderNotFound):
			resp.BadRequest(w, "invalid pickup code")
		case errors.Is(err, ErrOrderNotEligible):
			resp.BadRequest(w, "order is not eligible for pickup")
		case errors.Is(err, ErrInvalidPickupCode):
			resp.BadRequest(w, "invalid pickup code")
		case errors.Is(err, ErrPaymentsNotConfigured):
			resp.ServiceUnavailable(w, "payments not configured")
		case errors.Is(err, ErrNoPaymentIntent):
			resp.BadRequest(w, "order has no payment intent")
		default:
			resp.Internal(w, err)
		}
		return
	}

	now := time.Now().UTC()

	// Fetch items for the rich response.
	rows, err := a.DB.Query(ctx, `
		select
			id::text,
			offering_id::text,
			product_title,
			product_unit,
			price_cents,
			quantity,
			line_total_cents
		from order_items
		where order_id = $1::uuid
		order by created_at asc
	`, in.OrderID)
	if err != nil {
		// Order already confirmed — return minimal success.
		resp.OK(w, PickupConfirmResponse{
			OrderID:        in.OrderID,
			StoreID:        result.StoreID,
			PickupWindowID: result.PickupWindowID,
			Status:         "picked_up",
			BuyerName:      result.BuyerName,
			BuyerEmail:     result.BuyerEmail,
			TotalCents:     result.TotalCents,
			SubtotalCents:  result.SubtotalCents,
			ConfirmedAt:    now,
			Items:          []OrderItem{},
		})
		return
	}
	defer rows.Close()

	items := make([]OrderItem, 0)
	for rows.Next() {
		var it OrderItem
		if err := rows.Scan(
			&it.ID,
			&it.OfferingID,
			&it.ProductTitle,
			&it.ProductUnit,
			&it.PriceCents,
			&it.Quantity,
			&it.LineTotalCents,
		); err != nil {
			break
		}
		items = append(items, it)
	}

	resp.OK(w, PickupConfirmResponse{
		OrderID:        in.OrderID,
		StoreID:        result.StoreID,
		PickupWindowID: result.PickupWindowID,
		Status:         "picked_up",
		BuyerName:      result.BuyerName,
		BuyerEmail:     result.BuyerEmail,
		Items:          items,
		TotalCents:     result.TotalCents,
		SubtotalCents:  result.SubtotalCents,
		ConfirmedAt:    now,
	})
}
