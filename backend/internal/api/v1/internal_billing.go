package v1

import (
	"context"
	"crypto/subtle"
	"fmt"
	"net/http"
	"strings"
	"time"

	"github.com/jackc/pgx/v5/pgxpool"
	stripe "github.com/stripe/stripe-go/v78"

	"github.com/paretoimproved/local-roots/backend/internal/payments/stripepay"
	"github.com/paretoimproved/local-roots/backend/internal/resp"
)

type InternalBillingAPI struct {
	DB     *pgxpool.Pool
	Stripe *stripepay.Client
	Secret string
}

type authorizeCandidate struct {
	orderID       string
	storeID       string
	windowID      string
	subID         string
	total         int
	customer      string
	paymentMethod string
}

// BillingResult holds the outcome of a billing authorization run.
type BillingResult struct {
	Candidates int
	Authorized int
	Failed     int
	Until      time.Time
}

// RunBillingAuthorization finds pending subscription orders with upcoming pickups
// and creates off-session Stripe payment authorizations. Safe to call from both
// the HTTP handler and the in-process scheduler.
func RunBillingAuthorization(ctx context.Context, db *pgxpool.Pool, stripeClient *stripepay.Client) (BillingResult, error) {
	if db == nil {
		return BillingResult{}, fmt.Errorf("database not configured")
	}
	if stripeClient == nil || !stripeClient.Enabled() {
		return BillingResult{}, fmt.Errorf("payments not configured")
	}

	now := time.Now().UTC()
	until := now.Add(7 * 24 * time.Hour)

	rows, err := db.Query(ctx, `
		select
			o.id::text,
			o.store_id::text,
			o.pickup_window_id::text,
			o.subscription_id::text,
			o.total_cents,
			s.stripe_customer_id,
			s.stripe_payment_method_id
		from orders o
		join subscriptions s on s.id = o.subscription_id
		join pickup_windows pw on pw.id = o.pickup_window_id
		where o.payment_method = 'card'
			and o.payment_status = 'pending'
			and o.stripe_payment_intent_id is null
			and o.status = 'placed'
			and pw.start_at <= $1
		order by pw.start_at asc, o.created_at asc
		limit 1000
	`, until)
	if err != nil {
		return BillingResult{}, err
	}
	defer rows.Close()

	var cands []authorizeCandidate
	for rows.Next() {
		var c authorizeCandidate
		if err := rows.Scan(&c.orderID, &c.storeID, &c.windowID, &c.subID, &c.total, &c.customer, &c.paymentMethod); err != nil {
			return BillingResult{}, err
		}
		cands = append(cands, c)
	}
	if rows.Err() != nil {
		return BillingResult{}, rows.Err()
	}

	a := InternalBillingAPI{DB: db, Stripe: stripeClient}
	authorized := 0
	failed := 0

	for _, c := range cands {
		if c.total <= 0 || c.customer == "" || c.paymentMethod == "" {
			continue
		}
		err := a.authorizeOne(ctx, c)
		if err != nil {
			failed++
		} else {
			authorized++
		}
	}

	return BillingResult{
		Candidates: len(cands),
		Authorized: authorized,
		Failed:     failed,
		Until:      until,
	}, nil
}

func (a InternalBillingAPI) AuthorizePending(w http.ResponseWriter, r *http.Request) {
	if a.DB == nil {
		resp.ServiceUnavailable(w, "database not configured")
		return
	}
	if a.Stripe == nil || !a.Stripe.Enabled() {
		resp.ServiceUnavailable(w, "payments not configured")
		return
	}
	if !a.requireSecret(w, r) {
		return
	}

	result, err := RunBillingAuthorization(r.Context(), a.DB, a.Stripe)
	if err != nil {
		resp.Internal(w, err)
		return
	}

	resp.OK(w, map[string]any{
		"candidates": result.Candidates,
		"authorized": result.Authorized,
		"failed":     result.Failed,
		"until":      result.Until.Format(time.RFC3339),
	})
}

func (a InternalBillingAPI) authorizeOne(ctx context.Context, c authorizeCandidate) error {
	piID, piStatus, err := a.Stripe.CreateOffSessionAuthorization(ctx, stripepay.CreateOffSessionPaymentIntentInput{
		AmountCents:     c.total,
		Currency:        "usd",
		CustomerID:      c.customer,
		PaymentMethodID: c.paymentMethod,
		Metadata: map[string]string{
			"order_id":         c.orderID,
			"store_id":         c.storeID,
			"subscription_id":  c.subID,
			"pickup_window_id": c.windowID,
		},
		IdempotencyKey: "auth-order-" + c.orderID,
	})
	if err != nil {
		// Best effort: mark payment failed + cancel order + release inventory.
		_ = a.failAndCancel(ctx, c.orderID, c.storeID, "failed")
		return err
	}
	if piStatus != string(stripe.PaymentIntentStatusRequiresCapture) {
		// Best effort: void and cancel the order.
		_ = a.Stripe.CancelPaymentIntent(ctx, piID, "cancel-"+c.orderID)
		_ = a.failAndCancel(ctx, c.orderID, c.storeID, "requires_action")
		return nil
	}

	// Store PI and mark authorized.
	_, err = a.DB.Exec(ctx, `
		update orders
		set stripe_payment_intent_id = $3,
			payment_status = 'authorized',
			updated_at = now()
		where id = $1::uuid and store_id = $2::uuid
	`, c.orderID, c.storeID, piID)
	return err
}

func (a InternalBillingAPI) failAndCancel(ctx context.Context, orderID string, storeID string, status string) error {
	tx, err := a.DB.Begin(ctx)
	if err != nil {
		return err
	}
	defer tx.Rollback(ctx)

	// Lock order, ensure still placed.
	var currentStatus string
	if err := tx.QueryRow(ctx, `
		select status
		from orders
		where id = $1::uuid and store_id = $2::uuid
		for update
	`, orderID, storeID).Scan(&currentStatus); err != nil {
		return err
	}
	if currentStatus != "placed" {
		return tx.Commit(ctx)
	}

	if err := adjustOfferingsForOrder(ctx, tx, orderID, "release"); err != nil {
		return err
	}
	if _, err := tx.Exec(ctx, `
		update orders
		set status = 'canceled',
			payment_status = $3,
			updated_at = now()
		where id = $1::uuid and store_id = $2::uuid
	`, orderID, storeID, status); err != nil {
		return err
	}
	return tx.Commit(ctx)
}

func (a InternalBillingAPI) requireSecret(w http.ResponseWriter, r *http.Request) bool {
	secret := strings.TrimSpace(a.Secret)
	if secret == "" {
		resp.ServiceUnavailable(w, "internal secret not configured")
		return false
	}
	authz := strings.TrimSpace(r.Header.Get("Authorization"))
	parts := strings.SplitN(authz, " ", 2)
	if len(parts) != 2 || !strings.EqualFold(parts[0], "bearer") {
		resp.Unauthorized(w, "missing token")
		return false
	}
	if subtle.ConstantTimeCompare([]byte(strings.TrimSpace(parts[1])), []byte(secret)) != 1 {
		resp.Unauthorized(w, "invalid token")
		return false
	}
	return true
}
