package v1

import (
	"context"
	"errors"
	"net/http"
	"strings"
	"time"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"

	"github.com/paretoimproved/local-roots/backend/internal/payments/stripepay"
	"github.com/paretoimproved/local-roots/backend/internal/resp"
)

type SellerOrdersAPI struct {
	DB     *pgxpool.Pool
	Stripe *stripepay.Client
}

type SellerOrder struct {
	ID             string      `json:"id"`
	StoreID        string      `json:"store_id"`
	PickupWindowID string      `json:"pickup_window_id"`
	BuyerEmail     string      `json:"buyer_email"`
	BuyerName      *string     `json:"buyer_name"`
	BuyerPhone     *string     `json:"buyer_phone"`
	Status         string      `json:"status"`
	PaymentMethod  string      `json:"payment_method"`
	PaymentStatus  string      `json:"payment_status"`
	SubtotalCents  int         `json:"subtotal_cents"`
	TotalCents     int         `json:"total_cents"`
	CreatedAt      time.Time   `json:"created_at"`
	Items          []OrderItem `json:"items"`
}

func (a SellerOrdersAPI) ListOrdersForPickupWindow(w http.ResponseWriter, r *http.Request, u AuthUser) {
	if a.DB == nil {
		resp.ServiceUnavailable(w, "database not configured")
		return
	}
	if u.Role != "seller" && u.Role != "admin" {
		resp.Forbidden(w, "seller access required")
		return
	}

	storeID := r.PathValue("storeId")
	windowID := r.PathValue("pickupWindowId")
	if storeID == "" || windowID == "" {
		resp.BadRequest(w, "missing storeId or pickupWindowId")
		return
	}

	var ownerID string
	if err := a.DB.QueryRow(r.Context(), `select owner_user_id::text from stores where id = $1::uuid`, storeID).Scan(&ownerID); err != nil {
		if err == pgx.ErrNoRows {
			resp.NotFound(w, "store not found")
			return
		}
		resp.Internal(w, err)
		return
	}
	if ownerID != u.ID {
		resp.Forbidden(w, "not your store")
		return
	}

	rows, err := a.DB.Query(r.Context(), `
		select
			o.id::text,
			o.store_id::text,
			o.pickup_window_id::text,
			o.buyer_email,
			o.buyer_name,
			o.buyer_phone,
			o.status,
			o.payment_method,
			o.payment_status,
			o.subtotal_cents,
			o.total_cents,
			o.created_at,

			oi.id::text,
			oi.offering_id::text,
			oi.product_title,
			oi.product_unit,
			oi.price_cents,
			oi.quantity,
			oi.line_total_cents
		from orders o
		left join order_items oi on oi.order_id = o.id
		where o.store_id = $1::uuid and o.pickup_window_id = $2::uuid
		order by o.created_at desc, oi.created_at asc
		limit 20000
	`, storeID, windowID)
	if err != nil {
		resp.Internal(w, err)
		return
	}
	defer rows.Close()

	out := make([]SellerOrder, 0)
	byID := make(map[string]int)
	for rows.Next() {
		var (
			o         SellerOrder
			itemID    *string
			offering  *string
			title     *string
			unit      *string
			price     *int
			qty       *int
			lineTotal *int
		)

		if err := rows.Scan(
			&o.ID,
			&o.StoreID,
			&o.PickupWindowID,
			&o.BuyerEmail,
			&o.BuyerName,
			&o.BuyerPhone,
			&o.Status,
			&o.PaymentMethod,
			&o.PaymentStatus,
			&o.SubtotalCents,
			&o.TotalCents,
			&o.CreatedAt,

			&itemID,
			&offering,
			&title,
			&unit,
			&price,
			&qty,
			&lineTotal,
		); err != nil {
			resp.Internal(w, err)
			return
		}

		idx, ok := byID[o.ID]
		if !ok {
			out = append(out, o)
			idx = len(out) - 1
			byID[o.ID] = idx
		}

		// Append item if present.
		if itemID != nil {
			it := OrderItem{
				ID:           *itemID,
				OfferingID:   offering,
				ProductTitle: "",
				ProductUnit:  "",
			}
			if title != nil {
				it.ProductTitle = *title
			}
			if unit != nil {
				it.ProductUnit = *unit
			}
			if price != nil {
				it.PriceCents = *price
			}
			if qty != nil {
				it.Quantity = *qty
			}
			if lineTotal != nil {
				it.LineTotalCents = *lineTotal
			}
			out[idx].Items = append(out[idx].Items, it)
		}
	}
	if rows.Err() != nil {
		resp.Internal(w, rows.Err())
		return
	}

	resp.OK(w, out)
}

type UpdateOrderStatusRequest struct {
	Status string `json:"status"`
}

// UpdateOrderStatus supports:
// - placed -> ready
// - placed -> canceled
// - ready  -> no_show
func (a SellerOrdersAPI) UpdateOrderStatus(w http.ResponseWriter, r *http.Request, u AuthUser) {
	if a.DB == nil {
		resp.ServiceUnavailable(w, "database not configured")
		return
	}
	if u.Role != "seller" && u.Role != "admin" {
		resp.Forbidden(w, "seller access required")
		return
	}

	storeID := r.PathValue("storeId")
	orderID := r.PathValue("orderId")
	if storeID == "" || orderID == "" {
		resp.BadRequest(w, "missing storeId or orderId")
		return
	}

	var in UpdateOrderStatusRequest
	if err := resp.DecodeJSON(w, r, &in); err != nil {
		resp.BadRequest(w, "invalid json")
		return
	}
	in.Status = strings.TrimSpace(in.Status)
	if in.Status == "" {
		resp.BadRequest(w, "status is required")
		return
	}

	var ownerID string
	if err := a.DB.QueryRow(r.Context(), `select owner_user_id::text from stores where id = $1::uuid`, storeID).Scan(&ownerID); err != nil {
		if err == pgx.ErrNoRows {
			resp.NotFound(w, "store not found")
			return
		}
		resp.Internal(w, err)
		return
	}
	if ownerID != u.ID {
		resp.Forbidden(w, "not your store")
		return
	}

	ctx := r.Context()
	tx, err := a.DB.Begin(ctx)
	if err != nil {
		resp.Internal(w, err)
		return
	}
	defer tx.Rollback(ctx)

	var currentStatus string
	var pickupWindowID string
	var paymentMethod string
	var paymentStatus string
	var stripePI *string
	if err := tx.QueryRow(ctx, `
		select
			status,
			pickup_window_id::text,
			payment_method,
			payment_status,
			stripe_payment_intent_id
		from orders
		where id = $1::uuid and store_id = $2::uuid
		for update
	`, orderID, storeID).Scan(&currentStatus, &pickupWindowID, &paymentMethod, &paymentStatus, &stripePI); err != nil {
		if err == pgx.ErrNoRows {
			resp.NotFound(w, "order not found")
			return
		}
		resp.Internal(w, err)
		return
	}

	if !isAllowedTransition(currentStatus, in.Status) {
		resp.BadRequest(w, "invalid status transition")
		return
	}

	newPaymentStatus := paymentStatus

	// Adjust inventory reservations/availability based on transition.
	if currentStatus == "placed" && (in.Status == "canceled") {
		if err := adjustOfferingsForOrder(ctx, tx, orderID, "release"); err != nil {
			resp.Internal(w, err)
			return
		}
		if paymentMethod == "card" && stripePI != nil && strings.TrimSpace(*stripePI) != "" && paymentStatus == "authorized" {
			if a.Stripe == nil || !a.Stripe.Enabled() {
				resp.ServiceUnavailable(w, "payments not configured")
				return
			}
			if err := a.Stripe.CancelPaymentIntent(ctx, strings.TrimSpace(*stripePI), "void-"+orderID); err != nil {
				resp.Internal(w, err)
				return
			}
			newPaymentStatus = "voided"
		}
	}
	if currentStatus == "ready" && (in.Status == "no_show") {
		if err := adjustOfferingsForOrder(ctx, tx, orderID, "release"); err != nil {
			resp.Internal(w, err)
			return
		}
		if paymentMethod == "card" && stripePI != nil && strings.TrimSpace(*stripePI) != "" && paymentStatus == "authorized" {
			if a.Stripe == nil || !a.Stripe.Enabled() {
				resp.ServiceUnavailable(w, "payments not configured")
				return
			}
			if err := a.Stripe.CancelPaymentIntent(ctx, strings.TrimSpace(*stripePI), "void-"+orderID); err != nil {
				resp.Internal(w, err)
				return
			}
			newPaymentStatus = "voided"
		}
	}
	// Note: ready -> picked_up is intentionally handled via ConfirmPickup (pickup-code handshake),
	// not via this generic status endpoint.

	if _, err := tx.Exec(ctx, `
		update orders
		set status = $2, payment_status = $3, updated_at = now()
		where id = $1::uuid
	`, orderID, in.Status, newPaymentStatus); err != nil {
		resp.Internal(w, err)
		return
	}

	if err := tx.Commit(ctx); err != nil {
		resp.Internal(w, err)
		return
	}

	resp.OK(w, map[string]any{
		"id":               orderID,
		"store_id":         storeID,
		"pickup_window_id": pickupWindowID,
		"status":           in.Status,
	})
}

func isAllowedTransition(from string, to string) bool {
	switch from {
	case "placed":
		return to == "ready" || to == "canceled"
	case "ready":
		return to == "no_show"
	default:
		return false
	}
}

type ConfirmPickupRequest struct {
	PickupCode string `json:"pickup_code"`
}

// ConfirmPickup requires a buyer-present pickup code handshake.
// - ready -> picked_up (only if pickup_code matches)
func (a SellerOrdersAPI) ConfirmPickup(w http.ResponseWriter, r *http.Request, u AuthUser) {
	if a.DB == nil {
		resp.ServiceUnavailable(w, "database not configured")
		return
	}
	if u.Role != "seller" && u.Role != "admin" {
		resp.Forbidden(w, "seller access required")
		return
	}

	storeID := r.PathValue("storeId")
	orderID := r.PathValue("orderId")
	if storeID == "" || orderID == "" {
		resp.BadRequest(w, "missing storeId or orderId")
		return
	}

	var in ConfirmPickupRequest
	if err := resp.DecodeJSON(w, r, &in); err != nil {
		resp.BadRequest(w, "invalid json")
		return
	}
	in.PickupCode = strings.TrimSpace(in.PickupCode)
	if in.PickupCode == "" {
		resp.BadRequest(w, "pickup_code is required")
		return
	}

	var ownerID string
	if err := a.DB.QueryRow(r.Context(), `select owner_user_id::text from stores where id = $1::uuid`, storeID).Scan(&ownerID); err != nil {
		if err == pgx.ErrNoRows {
			resp.NotFound(w, "store not found")
			return
		}
		resp.Internal(w, err)
		return
	}
	if ownerID != u.ID {
		resp.Forbidden(w, "not your store")
		return
	}

	ctx := r.Context()
	tx, err := a.DB.Begin(ctx)
	if err != nil {
		resp.Internal(w, err)
		return
	}
	defer tx.Rollback(ctx)

	var currentStatus string
	var pickupWindowID string
	var pickupCode string
	var paymentMethod string
	var paymentStatus string
	var stripePI *string
	if err := tx.QueryRow(ctx, `
		select
			status,
			pickup_window_id::text,
			pickup_code,
			payment_method,
			payment_status,
			stripe_payment_intent_id
		from orders
		where id = $1::uuid and store_id = $2::uuid
		for update
	`, orderID, storeID).Scan(&currentStatus, &pickupWindowID, &pickupCode, &paymentMethod, &paymentStatus, &stripePI); err != nil {
		if err == pgx.ErrNoRows {
			resp.NotFound(w, "order not found")
			return
		}
		resp.Internal(w, err)
		return
	}

	if currentStatus != "ready" {
		resp.BadRequest(w, "order is not ready for pickup")
		return
	}
	if pickupCode != in.PickupCode {
		resp.BadRequest(w, "invalid pickup code")
		return
	}

	if paymentMethod == "card" {
		if stripePI == nil || strings.TrimSpace(*stripePI) == "" {
			resp.BadRequest(w, "missing payment authorization")
			return
		}
		if paymentStatus != "authorized" {
			resp.BadRequest(w, "payment is not authorized")
			return
		}
		if a.Stripe == nil || !a.Stripe.Enabled() {
			resp.ServiceUnavailable(w, "payments not configured")
			return
		}
		if err := a.Stripe.CaptureAuthorization(ctx, strings.TrimSpace(*stripePI), "capture-"+orderID); err != nil {
			resp.Internal(w, err)
			return
		}
	}

	if err := adjustOfferingsForOrder(ctx, tx, orderID, "finalize"); err != nil {
		resp.Internal(w, err)
		return
	}

	if _, err := tx.Exec(ctx, `
		update orders
		set status = 'picked_up',
			payment_status = case when payment_method = 'card' then 'paid' else payment_status end,
			updated_at = now()
		where id = $1::uuid
	`, orderID); err != nil {
		resp.Internal(w, err)
		return
	}

	if err := tx.Commit(ctx); err != nil {
		resp.Internal(w, err)
		return
	}

	resp.OK(w, map[string]any{
		"id":               orderID,
		"store_id":         storeID,
		"pickup_window_id": pickupWindowID,
		"status":           "picked_up",
	})
}

// mode:
// - "release": decrement quantity_reserved
// - "finalize": decrement quantity_available and quantity_reserved
func adjustOfferingsForOrder(ctx context.Context, tx pgx.Tx, orderID string, mode string) error {
	rows, err := tx.Query(ctx, `
		select offering_id::text, quantity
		from order_items
		where order_id = $1::uuid
	`, orderID)
	if err != nil {
		return err
	}
	defer rows.Close()

	type item struct {
		offeringID string
		qty        int
	}
	var items []item
	for rows.Next() {
		var offeringID *string
		var qty int
		if err := rows.Scan(&offeringID, &qty); err != nil {
			return err
		}
		if offeringID == nil {
			continue
		}
		items = append(items, item{offeringID: *offeringID, qty: qty})
	}
	if rows.Err() != nil {
		return rows.Err()
	}

	// Lock and adjust each offering row.
	for _, it := range items {
		switch mode {
		case "release":
			if _, err := tx.Exec(ctx, `
				update offerings
				set quantity_reserved = greatest(0, quantity_reserved - $2)
				where id = $1::uuid
			`, it.offeringID, it.qty); err != nil {
				return err
			}
		case "finalize":
			if _, err := tx.Exec(ctx, `
				update offerings
				set
					quantity_available = greatest(0, quantity_available - $2),
					quantity_reserved = greatest(0, quantity_reserved - $2)
				where id = $1::uuid
			`, it.offeringID, it.qty); err != nil {
				return err
			}
		default:
			return errors.New("invalid adjust mode")
		}
	}
	return nil
}
