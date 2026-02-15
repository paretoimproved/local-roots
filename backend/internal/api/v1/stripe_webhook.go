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
	secrets := splitWebhookSecrets(a.WebhookSecret)
	if len(secrets) == 0 {
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
	ev, err := constructStripeEvent(body, sig, secrets)
	if err != nil {
		resp.BadRequest(w, "invalid signature")
		return
	}

	ctx := r.Context()

	switch ev.Type {
	case "payment_intent.requires_capture":
		var pi stripe.PaymentIntent
		if err := json.Unmarshal(ev.Data.Raw, &pi); err == nil && pi.ID != "" {
			zero := 0
			if err := a.updatePaymentByPI(ctx, pi.ID, "authorized", &zero, false); err != nil {
				resp.Internal(w, err)
				return
			}
		}
	case "payment_intent.succeeded":
		var pi stripe.PaymentIntent
		if err := json.Unmarshal(ev.Data.Raw, &pi); err == nil && pi.ID != "" {
			amt := int(pi.AmountReceived)
			if err := a.updatePaymentByPI(ctx, pi.ID, "paid", &amt, false); err != nil {
				resp.Internal(w, err)
				return
			}
		}
	case "payment_intent.canceled":
		var pi stripe.PaymentIntent
		if err := json.Unmarshal(ev.Data.Raw, &pi); err == nil && pi.ID != "" {
			zero := 0
			if err := a.updatePaymentByPI(ctx, pi.ID, "voided", &zero, true); err != nil {
				resp.Internal(w, err)
				return
			}
		}
	case "payment_intent.payment_failed":
		var pi stripe.PaymentIntent
		if err := json.Unmarshal(ev.Data.Raw, &pi); err == nil && pi.ID != "" {
			zero := 0
			if err := a.updatePaymentByPI(ctx, pi.ID, "failed", &zero, true); err != nil {
				resp.Internal(w, err)
				return
			}
		}
	default:
		// ignore other events for MVP
	}

	resp.OK(w, map[string]any{"ok": true})
}

func splitWebhookSecrets(v string) []string {
	// Allow comma/newline-separated secrets to support rotation without downtime.
	v = strings.ReplaceAll(v, "\n", ",")
	var out []string
	for _, part := range strings.Split(v, ",") {
		s := strings.TrimSpace(part)
		if s == "" {
			continue
		}
		out = append(out, s)
	}
	return out
}

func constructStripeEvent(body []byte, sig string, secrets []string) (stripe.Event, error) {
	// Try each secret; useful during secret rotation.
	var lastErr error
	for _, s := range secrets {
		ev, err := webhook.ConstructEvent(body, sig, s)
		if err == nil {
			return ev, nil
		}
		lastErr = err
	}
	return stripe.Event{}, lastErr
}

func (a StripeWebhookAPI) updatePaymentByPI(ctx context.Context, paymentIntentID string, paymentStatus string, capturedCents *int, cancelIfPlaced bool) error {
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

	// Sync payment fields from Stripe; this keeps UI accurate after async changes.
	if capturedCents != nil {
		if _, err := tx.Exec(ctx, `
			update orders
			set payment_status = $2,
				captured_cents = $3,
				updated_at = now()
			where id = $1::uuid
		`, orderID, paymentStatus, *capturedCents); err != nil {
			return err
		}
	} else {
		if _, err := tx.Exec(ctx, `
			update orders
			set payment_status = $2, updated_at = now()
			where id = $1::uuid
		`, orderID, paymentStatus); err != nil {
			return err
		}
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
