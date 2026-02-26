package v1

import (
	"fmt"
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
	tx, err := a.DB.Begin(ctx)
	if err != nil {
		resp.Internal(w, err)
		return
	}
	defer tx.Rollback(ctx)

	var (
		currentStatus  string
		storeID        string
		pickupWindowID string
		pickupCode     string
		stripePI       *string
		subtotalCents  int
		buyerName      *string
		buyerEmail     string
		totalCents     int
	)
	err = tx.QueryRow(ctx, `
		select
			o.status,
			o.store_id::text,
			o.pickup_window_id::text,
			o.pickup_code,
			o.stripe_payment_intent_id,
			o.subtotal_cents,
			o.buyer_name,
			o.buyer_email,
			o.total_cents
		from orders o
		where o.id = $1::uuid
		for update
	`, in.OrderID).Scan(
		&currentStatus,
		&storeID,
		&pickupWindowID,
		&pickupCode,
		&stripePI,
		&subtotalCents,
		&buyerName,
		&buyerEmail,
		&totalCents,
	)
	if err != nil {
		if err == pgx.ErrNoRows {
			resp.BadRequest(w, "invalid pickup code")
			return
		}
		resp.Internal(w, err)
		return
	}

	if pickupCode != in.PickupCode {
		resp.BadRequest(w, "invalid pickup code")
		return
	}

	// Verify seller owns the store.
	var ownerUserID string
	if err := tx.QueryRow(ctx, `select owner_user_id::text from stores where id = $1::uuid`, storeID).Scan(&ownerUserID); err != nil {
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

	if currentStatus != "placed" && currentStatus != "ready" {
		resp.BadRequest(w, "order is not eligible for pickup")
		return
	}

	if a.Stripe == nil || !a.Stripe.Enabled() {
		resp.ServiceUnavailable(w, "payments not configured")
		return
	}
	if stripePI == nil || strings.TrimSpace(*stripePI) == "" {
		resp.BadRequest(w, "order has no payment intent")
		return
	}
	trimPI := strings.TrimSpace(*stripePI)

	if err := adjustOfferingsForOrder(ctx, tx, in.OrderID, "finalize"); err != nil {
		resp.Internal(w, err)
		return
	}

	if _, err := tx.Exec(ctx, `
		update orders
		set status = 'picked_up',
			payment_status = 'paid',
			captured_cents = total_cents,
			updated_at = now()
		where id = $1::uuid
	`, in.OrderID); err != nil {
		resp.Internal(w, err)
		return
	}

	if err := tx.Commit(ctx); err != nil {
		resp.Internal(w, err)
		return
	}

	now := time.Now().UTC()

	// Capture the Stripe authorization after commit.
	_ = a.Stripe.CaptureAuthorization(ctx, trimPI, "capture-"+in.OrderID)

	// Transfer seller's share to their Connect account.
	transferToSeller(ctx, a.DB, a.Stripe, storeID, in.OrderID, trimPI, subtotalCents, "transfer-")

	// Send payment receipt email.
	if a.Email != nil && a.Email.Enabled() && a.FrontendURL != "" {
		if info, ok := fetchOrderEmailInfo(ctx, a.DB, in.OrderID); ok {
			orderURL := strings.TrimRight(a.FrontendURL, "/") + "/orders/" + in.OrderID + "?t=" + info.buyerToken
			amountStr := fmt.Sprintf("$%.2f", float64(info.totalCents)/100.0)
			subj, body := email.PaymentReceipt(amountStr, info.boxTitle, orderURL)
			a.Email.SendAsync(info.buyerEmail, subj, body)
		}
	}

	// Fetch items for the response.
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
			StoreID:        storeID,
			PickupWindowID: pickupWindowID,
			Status:         "picked_up",
			BuyerName:      buyerName,
			BuyerEmail:     buyerEmail,
			TotalCents:     totalCents,
			SubtotalCents:  subtotalCents,
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
		StoreID:        storeID,
		PickupWindowID: pickupWindowID,
		Status:         "picked_up",
		BuyerName:      buyerName,
		BuyerEmail:     buyerEmail,
		Items:          items,
		TotalCents:     totalCents,
		SubtotalCents:  subtotalCents,
		ConfirmedAt:    now,
	})
}
