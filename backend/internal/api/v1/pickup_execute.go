package v1

import (
	"context"
	"errors"
	"fmt"
	"log"
	"strings"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"

	"github.com/paretoimproved/local-roots/backend/internal/email"
	"github.com/paretoimproved/local-roots/backend/internal/payments/stripepay"
)

// Sentinel errors for pickup confirmation.
var (
	ErrOrderNotFound         = errors.New("order not found")
	ErrOrderNotEligible      = errors.New("order not eligible for pickup")
	ErrInvalidPickupCode     = errors.New("invalid pickup code")
	ErrPaymentsNotConfigured = errors.New("payments not configured")
	ErrNoPaymentIntent       = errors.New("no payment intent found")
)

// PickupResult contains data from a successful pickup confirmation,
// used by callers to build their HTTP responses.
type PickupResult struct {
	StoreID        string
	PickupWindowID string
	SubtotalCents  int
	BuyerName      *string
	BuyerEmail     string
	TotalCents     int
}

// ExecutePickupConfirm handles the core pickup confirmation logic shared between
// the seller confirm-pickup endpoint and the QR-based pickup confirm endpoint.
//
// If expectedStoreID is non-empty, the order query is scoped to that store.
// The transaction is committed on success; Stripe capture, transfer, and email
// happen after commit (failures are non-fatal — webhooks reconcile).
func ExecutePickupConfirm(
	ctx context.Context,
	tx pgx.Tx,
	db *pgxpool.Pool,
	stripe *stripepay.Client,
	emailClient *email.Client,
	frontendURL string,
	orderID string,
	pickupCode string,
	expectedStoreID string,
) (*PickupResult, error) {
	// 1. Look up the order within the transaction.
	var (
		currentStatus  string
		storeID        string
		pickupWindowID string
		dbPickupCode   string
		stripePI       *string
		subtotalCents  int
		buyerName      *string
		buyerEmail     string
		totalCents     int
	)

	var err error
	if expectedStoreID != "" {
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
			where o.id = $1::uuid and o.store_id = $2::uuid
			for update
		`, orderID, expectedStoreID).Scan(
			&currentStatus, &storeID, &pickupWindowID, &dbPickupCode,
			&stripePI, &subtotalCents, &buyerName, &buyerEmail, &totalCents,
		)
	} else {
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
		`, orderID).Scan(
			&currentStatus, &storeID, &pickupWindowID, &dbPickupCode,
			&stripePI, &subtotalCents, &buyerName, &buyerEmail, &totalCents,
		)
	}
	if err != nil {
		if err == pgx.ErrNoRows {
			return nil, ErrOrderNotFound
		}
		return nil, err
	}

	// 2. Validate order status.
	if currentStatus != "placed" && currentStatus != "ready" {
		return nil, ErrOrderNotEligible
	}

	// 3. Validate pickup code.
	if dbPickupCode != pickupCode {
		return nil, ErrInvalidPickupCode
	}

	// 4. Check Stripe is configured.
	if stripe == nil || !stripe.Enabled() {
		return nil, ErrPaymentsNotConfigured
	}
	if stripePI == nil || strings.TrimSpace(*stripePI) == "" {
		return nil, ErrNoPaymentIntent
	}
	trimPI := strings.TrimSpace(*stripePI)

	// 5. Adjust offerings (finalize inventory).
	if err := adjustOfferingsForOrder(ctx, tx, orderID, "finalize"); err != nil {
		return nil, err
	}

	// 6. Update order to picked_up.
	if _, err := tx.Exec(ctx, `
		update orders
		set status = 'picked_up',
			payment_status = 'paid',
			captured_cents = total_cents,
			picked_up_at = now(),
			updated_at = now()
		where id = $1::uuid
	`, orderID); err != nil {
		return nil, err
	}

	// 7. Commit the transaction.
	if err := tx.Commit(ctx); err != nil {
		return nil, err
	}

	// 8. Capture the Stripe authorization (after commit; webhook reconciles on failure).
	if err := stripe.CaptureAuthorization(ctx, trimPI, "capture-"+orderID); err != nil {
		log.Printf("WARN: capture authorization failed for order %s: %v (webhook will reconcile)", orderID, err)
	}

	// 9. Transfer seller's share to their Connect account.
	transferToSeller(ctx, db, stripe, storeID, orderID, trimPI, subtotalCents, "transfer-")

	// 10. Send payment receipt email.
	if emailClient != nil && emailClient.Enabled() && frontendURL != "" {
		if info, ok := fetchOrderEmailInfo(ctx, db, orderID); ok {
			orderURL := strings.TrimRight(frontendURL, "/") + "/orders/" + orderID + "?t=" + info.buyerToken
			amountStr := fmt.Sprintf("$%.2f", float64(info.totalCents)/100.0)
			subj, body := email.PaymentReceipt(amountStr, info.boxTitle, orderURL)
			emailClient.SendAsync(info.buyerEmail, subj, body)
		}
	}

	return &PickupResult{
		StoreID:        storeID,
		PickupWindowID: pickupWindowID,
		SubtotalCents:  subtotalCents,
		BuyerName:      buyerName,
		BuyerEmail:     buyerEmail,
		TotalCents:     totalCents,
	}, nil
}
