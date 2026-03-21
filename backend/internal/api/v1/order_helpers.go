package v1

import (
	"context"
	"log"
	"strings"

	"github.com/jackc/pgx/v5/pgxpool"

	"github.com/paretoimproved/local-roots/backend/internal/payments/stripepay"
)

// transferToSeller transfers funds from a captured payment to the seller's
// Stripe Connect account. Records failures for retry by the transfer retry cron.
func transferToSeller(ctx context.Context, db *pgxpool.Pool, sc *stripepay.Client, storeID, orderID, piID string, amount int, idempotencyPrefix string) {
	if amount <= 0 || sc == nil || !sc.Enabled() {
		return
	}
	var connectAccountID *string
	var connectStatus string
	if err := db.QueryRow(ctx, `
		select stripe_account_id, stripe_account_status
		from stores
		where id = $1::uuid
	`, storeID).Scan(&connectAccountID, &connectStatus); err != nil {
		return
	}
	if connectAccountID == nil || strings.TrimSpace(*connectAccountID) == "" || connectStatus != "active" {
		return
	}
	chargeID, _ := sc.GetChargeIDFromPaymentIntent(ctx, piID)
	transferID, err := sc.CreateTransfer(ctx, amount, *connectAccountID, chargeID, idempotencyPrefix+orderID)
	if err != nil {
		// Record failure for retry cron to pick up.
		log.Printf("transfer: failed order=%s err=%v", orderID, err)
		_, _ = db.Exec(ctx, `
			update orders
			set transfer_attempted_at = now(),
			    transfer_error = $2,
			    transfer_retry_count = transfer_retry_count + 1,
			    updated_at = now()
			where id = $1::uuid
		`, orderID, err.Error())
		return
	}
	if transferID != "" {
		_, _ = db.Exec(ctx, `
			update orders
			set stripe_transfer_id = $2,
			    transfer_attempted_at = now(),
			    transfer_error = null,
			    updated_at = now()
			where id = $1::uuid
		`, orderID, transferID)
	}
}

type orderEmailInfo struct {
	buyerEmail string
	boxTitle   string
	pickupCode string
	totalCents int
	buyerToken string
}

func fetchOrderEmailInfo(ctx context.Context, pool *pgxpool.Pool, orderID string) (orderEmailInfo, bool) {
	var info orderEmailInfo
	err := pool.QueryRow(ctx, `
		select
			o.buyer_email,
			coalesce((select oi.product_title from order_items oi where oi.order_id = o.id limit 1), 'Order'),
			o.pickup_code,
			o.total_cents,
			o.buyer_token
		from orders o
		where o.id = $1::uuid
	`, orderID).Scan(&info.buyerEmail, &info.boxTitle, &info.pickupCode, &info.totalCents, &info.buyerToken)
	return info, err == nil
}
