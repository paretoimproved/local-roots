package v1

import (
	"context"
	"fmt"
	"log"

	"github.com/jackc/pgx/v5/pgxpool"

	"github.com/paretoimproved/local-roots/backend/internal/email"
)

// DigestResult holds the outcome of a seller weekly digest run.
type DigestResult struct {
	Candidates int
	Sent       int
}

// RunSellerDigest sends a weekly digest email to each seller with an active store
// that has at least one active subscription. Includes active subscriber count,
// pickups this week, and revenue this week.
func RunSellerDigest(ctx context.Context, db *pgxpool.Pool, emailClient *email.Client) (DigestResult, error) {
	if db == nil {
		return DigestResult{}, fmt.Errorf("database not configured")
	}
	if emailClient == nil || !emailClient.Enabled() {
		return DigestResult{}, fmt.Errorf("email not configured")
	}

	rows, err := db.Query(ctx, `
		SELECT DISTINCT st.id::text, st.name, u.email as seller_email
		FROM stores st
		JOIN users u ON u.id = st.user_id
		WHERE st.is_active = true
		  AND EXISTS (SELECT 1 FROM subscriptions sub WHERE sub.store_id = st.id AND sub.status = 'active')
	`)
	if err != nil {
		return DigestResult{}, err
	}
	defer rows.Close()

	type store struct {
		storeID     string
		storeName   string
		sellerEmail string
	}

	var stores []store
	for rows.Next() {
		var s store
		if err := rows.Scan(&s.storeID, &s.storeName, &s.sellerEmail); err != nil {
			return DigestResult{}, err
		}
		stores = append(stores, s)
	}
	if rows.Err() != nil {
		return DigestResult{}, rows.Err()
	}

	sent := 0
	for _, s := range stores {
		var activeSubs int
		var pickupsWeek int
		var revenueWeek int

		err := db.QueryRow(ctx, `
			SELECT
			  (SELECT COUNT(*) FROM subscriptions WHERE store_id = $1::uuid AND status = 'active') as active_subs,
			  (SELECT COUNT(*) FROM orders WHERE store_id = $1::uuid AND status = 'picked_up' AND picked_up_at >= NOW() - INTERVAL '7 days') as pickups_week,
			  (SELECT COALESCE(SUM(total_cents), 0) FROM orders WHERE store_id = $1::uuid AND status = 'picked_up' AND picked_up_at >= NOW() - INTERVAL '7 days') as revenue_week
		`, s.storeID).Scan(&activeSubs, &pickupsWeek, &revenueWeek)
		if err != nil {
			log.Printf("digest: error querying metrics for store=%s: %v", s.storeID, err)
			continue
		}

		activeSubsStr := fmt.Sprintf("%d", activeSubs)
		pickupsStr := fmt.Sprintf("%d", pickupsWeek)
		revenueFormatted := fmt.Sprintf("$%.2f", float64(revenueWeek)/100)

		subj, body := email.SellerWeeklyDigest(s.storeName, activeSubsStr, pickupsStr, revenueFormatted)
		if err := emailClient.Send(s.sellerEmail, subj, body); err != nil {
			log.Printf("digest: error sending email to=%s store=%s: %v", s.sellerEmail, s.storeID, err)
			continue
		}

		sent++
	}

	return DigestResult{
		Candidates: len(stores),
		Sent:       sent,
	}, nil
}
