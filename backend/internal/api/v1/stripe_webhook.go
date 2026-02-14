package v1

import (
	"bytes"
	"context"
	"encoding/json"
	"io"
	"net/http"
	"strings"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
	stripe "github.com/stripe/stripe-go/v78"
	"github.com/stripe/stripe-go/v78/webhook"

	"github.com/paretoimproved/local-roots/backend/internal/resp"
)

type StripeWebhookAPI struct {
	DB            *pgxpool.Pool
	WebhookSecret string
}

// StripeWebhook handles asynchronous payment state updates.
// For MVP we keep this minimal:
// - synchronize orders.payment_status from Stripe PaymentIntent events
// - if a payment fails/cancels while the order is still "placed", cancel it and release inventory
func (a StripeWebhookAPI) StripeWebhook(w http.ResponseWriter, r *http.Request) {
	secret := strings.TrimSpace(a.WebhookSecret)
	if secret == "" {
		resp.ServiceUnavailable(w, "webhook not configured")
		return
	}
	if a.DB == nil {
		resp.ServiceUnavailable(w, "database not configured")
		return
	}
	if r.Method != http.MethodPost {
		resp.BadRequest(w, "invalid method")
		return
	}

	body, err := io.ReadAll(io.LimitReader(r.Body, 2<<20))
	if err != nil {
		resp.BadRequest(w, "invalid body")
		return
	}
	// Restore body (useful for debugging on error paths).
	r.Body = io.NopCloser(bytes.NewReader(body))

	sig := r.Header.Get("Stripe-Signature")
	ev, err := webhook.ConstructEvent(body, sig, secret)
	if err != nil {
		resp.BadRequest(w, "invalid signature")
		return
	}

	ctx := r.Context()

	switch ev.Type {
	case "payment_intent.requires_capture":
		var pi stripe.PaymentIntent
		if err := json.Unmarshal(ev.Data.Raw, &pi); err == nil && pi.ID != "" {
			_ = a.updatePaymentByPI(ctx, pi.ID, "authorized", false)
		}
	case "payment_intent.succeeded":
		var pi stripe.PaymentIntent
		if err := json.Unmarshal(ev.Data.Raw, &pi); err == nil && pi.ID != "" {
			_ = a.updatePaymentByPI(ctx, pi.ID, "paid", false)
		}
	case "payment_intent.canceled":
		var pi stripe.PaymentIntent
		if err := json.Unmarshal(ev.Data.Raw, &pi); err == nil && pi.ID != "" {
			_ = a.updatePaymentByPI(ctx, pi.ID, "voided", true)
		}
	case "payment_intent.payment_failed":
		var pi stripe.PaymentIntent
		if err := json.Unmarshal(ev.Data.Raw, &pi); err == nil && pi.ID != "" {
			_ = a.updatePaymentByPI(ctx, pi.ID, "failed", true)
		}
	default:
		// ignore other events for MVP
	}

	resp.OK(w, map[string]any{"ok": true})
}

func (a StripeWebhookAPI) updatePaymentByPI(ctx context.Context, paymentIntentID string, paymentStatus string, cancelIfPlaced bool) error {
	tx, err := a.DB.Begin(ctx)
	if err != nil {
		return err
	}
	defer tx.Rollback(ctx)

	var (
		orderID string
		storeID string
		status  string
		method  string
	)
	err = tx.QueryRow(ctx, `
		select id::text, store_id::text, status, payment_method
		from orders
		where stripe_payment_intent_id = $1
		limit 1
		for update
	`, paymentIntentID).Scan(&orderID, &storeID, &status, &method)
	if err != nil {
		if err == pgx.ErrNoRows {
			return nil
		}
		return err
	}

	// Always sync the payment_status; this is safe and makes UI accurate.
	if _, err := tx.Exec(ctx, `
		update orders
		set payment_status = $2, updated_at = now()
		where id = $1::uuid
	`, orderID, paymentStatus); err != nil {
		return err
	}

	// If the payment failed/voided before seller fulfillment started, cancel and release inventory.
	if cancelIfPlaced && method == "card" && status == "placed" {
		if err := adjustOfferingsForOrder(ctx, tx, orderID, "release"); err != nil {
			return err
		}
		if _, err := tx.Exec(ctx, `
			update orders
			set status = 'canceled', updated_at = now()
			where id = $1::uuid
		`, orderID); err != nil {
			return err
		}
	}

	return tx.Commit(ctx)
}
