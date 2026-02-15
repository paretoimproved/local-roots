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
	DB             *pgxpool.Pool
	Stripe          *stripepay.Client
	NoShowFeeCents int
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
	BuyerFeeCents  int         `json:"buyer_fee_cents"`
	TotalCents     int         `json:"total_cents"`
	CapturedCents  int         `json:"captured_cents"`
	CreatedAt      time.Time   `json:"created_at"`
	Items          []OrderItem `json:"items"`
}

func (a SellerOrdersAPI) ListOrdersForPickupWindow(w http.ResponseWriter, r *http.Request, u AuthUser, sc StoreContext) {
	windowID := r.PathValue("pickupWindowId")
	if windowID == "" || !validUUID(windowID) {
		resp.BadRequest(w, "missing or invalid pickupWindowId")
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
			o.buyer_fee_cents,
			o.total_cents,
			o.captured_cents,
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
		limit 200
	`, sc.StoreID, windowID)
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
			&o.BuyerFeeCents,
			&o.TotalCents,
			&o.CapturedCents,
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
	Status   string `json:"status"`
	WaiveFee bool   `json:"waive_fee"`
}

// UpdateOrderStatus supports:
// - placed -> ready
// - placed -> canceled
// - ready  -> no_show
func (a SellerOrdersAPI) UpdateOrderStatus(w http.ResponseWriter, r *http.Request, u AuthUser, sc StoreContext) {
	orderID := r.PathValue("orderId")
	if orderID == "" || !validUUID(orderID) {
		resp.BadRequest(w, "missing or invalid orderId")
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
	`, orderID, sc.StoreID).Scan(&currentStatus, &pickupWindowID, &paymentMethod, &paymentStatus, &stripePI); err != nil {
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
	capturedCentsDelta := -1 // -1 means "leave unchanged"

	noShowFeeCents := a.NoShowFeeCents
	if noShowFeeCents <= 0 {
		noShowFeeCents = 500
	}

	// Track deferred Stripe action to run after commit.
	type stripeAction struct {
		cancel       bool
		captureAmt   int
		piID         string
		idempotency  string
	}
	var deferred *stripeAction

	hasCard := paymentMethod == "card" && stripePI != nil && strings.TrimSpace(*stripePI) != ""
	trimmedPI := ""
	if hasCard {
		trimmedPI = strings.TrimSpace(*stripePI)
	}

	// Adjust inventory reservations/availability based on transition.
	if currentStatus == "placed" && (in.Status == "canceled") {
		if err := adjustOfferingsForOrder(ctx, tx, orderID, "release"); err != nil {
			resp.Internal(w, err)
			return
		}
		if hasCard && paymentStatus == "authorized" {
			if a.Stripe == nil || !a.Stripe.Enabled() {
				resp.ServiceUnavailable(w, "payments not configured")
				return
			}
			newPaymentStatus = "voided"
			deferred = &stripeAction{cancel: true, piID: trimmedPI, idempotency: "void-" + orderID}
		}
	}
	if currentStatus == "ready" && (in.Status == "no_show") {
		if err := adjustOfferingsForOrder(ctx, tx, orderID, "release"); err != nil {
			resp.Internal(w, err)
			return
		}
		if hasCard {
			if a.Stripe == nil || !a.Stripe.Enabled() {
				resp.ServiceUnavailable(w, "payments not configured")
				return
			}
			if in.WaiveFee || paymentStatus != "authorized" {
				newPaymentStatus = "voided"
				capturedCentsDelta = 0
				deferred = &stripeAction{cancel: true, piID: trimmedPI, idempotency: "void-" + orderID}
			} else {
				var totalCents int
				if err := tx.QueryRow(ctx, `select total_cents from orders where id = $1::uuid`, orderID).Scan(&totalCents); err != nil {
					resp.Internal(w, err)
					return
				}
				fee := noShowFeeCents
				if totalCents < fee {
					fee = totalCents
				}
				if fee <= 0 {
					newPaymentStatus = "voided"
					capturedCentsDelta = 0
					deferred = &stripeAction{cancel: true, piID: trimmedPI, idempotency: "void-" + orderID}
				} else {
					newPaymentStatus = "paid"
					capturedCentsDelta = fee
					deferred = &stripeAction{captureAmt: fee, piID: trimmedPI, idempotency: "noshow-" + orderID}
				}
			}
		}
	}
	// Note: ready -> picked_up is intentionally handled via ConfirmPickup (pickup-code handshake),
	// not via this generic status endpoint.

	if capturedCentsDelta >= 0 {
		if _, err := tx.Exec(ctx, `
			update orders
			set status = $2,
				payment_status = $3,
				captured_cents = $4,
				updated_at = now()
			where id = $1::uuid
		`, orderID, in.Status, newPaymentStatus, capturedCentsDelta); err != nil {
			resp.Internal(w, err)
			return
		}
	} else {
		if _, err := tx.Exec(ctx, `
			update orders
			set status = $2, payment_status = $3, updated_at = now()
			where id = $1::uuid
		`, orderID, in.Status, newPaymentStatus); err != nil {
			resp.Internal(w, err)
			return
		}
	}

	if err := tx.Commit(ctx); err != nil {
		resp.Internal(w, err)
		return
	}

	// Call Stripe after commit. If this fails, the webhook will reconcile.
	if deferred != nil {
		if deferred.cancel {
			_ = a.Stripe.CancelPaymentIntent(ctx, deferred.piID, deferred.idempotency)
		} else {
			_ = a.Stripe.CaptureAuthorizationAmount(ctx, deferred.piID, deferred.captureAmt, deferred.idempotency)
		}
	}

	resp.OK(w, map[string]any{
		"id":               orderID,
		"store_id":         sc.StoreID,
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
func (a SellerOrdersAPI) ConfirmPickup(w http.ResponseWriter, r *http.Request, u AuthUser, sc StoreContext) {
	orderID := r.PathValue("orderId")
	if orderID == "" || !validUUID(orderID) {
		resp.BadRequest(w, "missing or invalid orderId")
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
	`, orderID, sc.StoreID).Scan(&currentStatus, &pickupWindowID, &pickupCode, &paymentMethod, &paymentStatus, &stripePI); err != nil {
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

	needsCapture := paymentMethod == "card" && stripePI != nil && strings.TrimSpace(*stripePI) != "" && paymentStatus == "authorized"
	if needsCapture {
		if a.Stripe == nil || !a.Stripe.Enabled() {
			resp.ServiceUnavailable(w, "payments not configured")
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
			captured_cents = case when payment_method = 'card' then total_cents else captured_cents end,
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

	// Capture the Stripe authorization after commit. If this fails, the
	// payment_intent.succeeded webhook will reconcile the payment status.
	if needsCapture {
		_ = a.Stripe.CaptureAuthorization(ctx, strings.TrimSpace(*stripePI), "capture-"+orderID)
	}

	resp.OK(w, map[string]any{
		"id":               orderID,
		"store_id":         sc.StoreID,
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
