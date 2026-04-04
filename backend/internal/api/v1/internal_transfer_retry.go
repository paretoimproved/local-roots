package v1

import (
	"context"
	"fmt"
	"log"
	"strings"

	"github.com/jackc/pgx/v5/pgxpool"

	"github.com/paretoimproved/local-roots/backend/internal/payments/stripepay"
)

// TransferRetryResult holds the outcome of a transfer retry run.
type TransferRetryResult struct {
	Candidates int
	Retried    int
	Failed     int
}

// RunTransferRetry finds orders whose seller transfer failed and retries them
// (up to 3 attempts). Safe to call from both the HTTP handler and the
// in-process scheduler.
func RunTransferRetry(ctx context.Context, db *pgxpool.Pool, sc *stripepay.Client) (TransferRetryResult, error) {
	if db == nil {
		return TransferRetryResult{}, fmt.Errorf("database not configured")
	}
	if sc == nil || !sc.Enabled() {
		return TransferRetryResult{}, fmt.Errorf("payments not configured")
	}

	rows, err := db.Query(ctx, `
		SELECT o.id::text, o.store_id::text, o.stripe_payment_intent_id,
		       o.subtotal_cents, o.transfer_retry_count
		FROM orders o
		WHERE o.transfer_attempted_at IS NOT NULL
		  AND o.stripe_transfer_id IS NULL
		  AND o.transfer_error IS NOT NULL
		  AND o.transfer_retry_count < 3
		  AND o.status IN ('picked_up', 'no_show')
		  AND o.refunded_at IS NULL
		LIMIT 20
	`)
	if err != nil {
		return TransferRetryResult{}, err
	}
	defer rows.Close()

	type candidate struct {
		orderID      string
		storeID      string
		piID         string
		subtotalCents int
		retryCount   int
	}

	var cands []candidate
	for rows.Next() {
		var c candidate
		if err := rows.Scan(&c.orderID, &c.storeID, &c.piID, &c.subtotalCents, &c.retryCount); err != nil {
			return TransferRetryResult{}, err
		}
		cands = append(cands, c)
	}
	if rows.Err() != nil {
		return TransferRetryResult{}, rows.Err()
	}

	retried := 0
	failed := 0

	for _, c := range cands {
		// Look up store's Stripe Connect account.
		var connectAccountID *string
		var connectStatus string
		if err := db.QueryRow(ctx, `
			SELECT stripe_account_id, stripe_account_status
			FROM stores
			WHERE id = $1::uuid
		`, c.storeID).Scan(&connectAccountID, &connectStatus); err != nil {
			log.Printf("transfer-retry: store lookup failed for order %s: %v", c.orderID, err)
			failed++
			updateTransferError(ctx, db, c.orderID, fmt.Sprintf("store lookup: %v", err))
			continue
		}

		if connectAccountID == nil || strings.TrimSpace(*connectAccountID) == "" || connectStatus != "active" {
			log.Printf("transfer-retry: skipping order %s — store %s account not active", c.orderID, c.storeID)
			failed++
			updateTransferError(ctx, db, c.orderID, "store connect account not active")
			continue
		}

		chargeID, err := sc.GetChargeIDFromPaymentIntent(ctx, c.piID)
		if err != nil {
			log.Printf("transfer-retry: get charge failed for order %s: %v", c.orderID, err)
			failed++
			updateTransferError(ctx, db, c.orderID, fmt.Sprintf("get charge: %v", err))
			continue
		}

		transferID, err := sc.CreateTransfer(ctx, c.subtotalCents, *connectAccountID, chargeID, "retry-"+c.orderID)
		if err != nil {
			log.Printf("transfer-retry: transfer failed for order %s: %v", c.orderID, err)
			failed++
			updateTransferError(ctx, db, c.orderID, fmt.Sprintf("transfer: %v", err))
			continue
		}

		_, _ = db.Exec(ctx, `
			UPDATE orders
			SET stripe_transfer_id = $1,
			    transfer_error = NULL,
			    transfer_attempted_at = NOW()
			WHERE id = $2::uuid
		`, transferID, c.orderID)

		log.Printf("transfer-retry: success for order %s (transfer %s)", c.orderID, transferID)
		retried++
	}

	return TransferRetryResult{
		Candidates: len(cands),
		Retried:    retried,
		Failed:     failed,
	}, nil
}

func updateTransferError(ctx context.Context, db *pgxpool.Pool, orderID string, errMsg string) {
	_, _ = db.Exec(ctx, `
		UPDATE orders
		SET transfer_retry_count = transfer_retry_count + 1,
		    transfer_error = $1,
		    transfer_attempted_at = NOW()
		WHERE id = $2::uuid
	`, errMsg, orderID)
}
