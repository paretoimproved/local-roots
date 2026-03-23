package v1

import (
	"context"
	"fmt"
	"log"

	"github.com/jackc/pgx/v5/pgxpool"

	"github.com/paretoimproved/local-roots/backend/internal/email"
)

// MilestoneResult holds the outcome of a milestone email run.
type MilestoneResult struct {
	Candidates int
	Sent       int
}

// RunMilestoneEmails finds subscribers who have hit cumulative pickup milestones
// (5, 10, 25, 50) and sends a celebration email. Idempotent: only sends once
// per subscription + milestone pair via the milestone_emails table.
func RunMilestoneEmails(ctx context.Context, db *pgxpool.Pool, emailClient *email.Client, frontendURL, jwtSecret string) (MilestoneResult, error) {
	if db == nil {
		return MilestoneResult{}, fmt.Errorf("database not configured")
	}
	if emailClient == nil || !emailClient.Enabled() {
		return MilestoneResult{}, fmt.Errorf("email not configured")
	}

	rows, err := db.Query(ctx, `
		SELECT s.id as subscription_id, s.buyer_email, s.buyer_name,
		       st.name as store_name, st.id as store_id,
		       COUNT(o.id) as pickup_count
		FROM subscriptions s
		JOIN stores st ON st.id = s.store_id
		JOIN orders o ON o.subscription_id IN (
		    SELECT s2.id FROM subscriptions s2
		    WHERE s2.buyer_email = s.buyer_email AND s2.store_id = s.store_id
		)
		WHERE s.status = 'active'
		  AND o.status = 'picked_up'
		GROUP BY s.id, s.buyer_email, s.buyer_name, st.name, st.id
		HAVING COUNT(o.id) IN (5, 10, 25, 50)
		LIMIT 100
	`)
	if err != nil {
		return MilestoneResult{}, err
	}
	defer rows.Close()

	type candidate struct {
		subscriptionID string
		buyerEmail     string
		buyerName      string
		storeName      string
		storeID        string
		pickupCount    int
	}

	var candidates []candidate
	for rows.Next() {
		var c candidate
		var namePtr *string
		if err := rows.Scan(&c.subscriptionID, &c.buyerEmail, &namePtr, &c.storeName, &c.storeID, &c.pickupCount); err != nil {
			return MilestoneResult{}, err
		}
		if namePtr != nil {
			c.buyerName = *namePtr
		}
		candidates = append(candidates, c)
	}
	if rows.Err() != nil {
		return MilestoneResult{}, rows.Err()
	}

	sent := 0
	for _, c := range candidates {
		milestone := fmt.Sprintf("%d", c.pickupCount)

		// Check if we already sent this milestone for this subscription.
		var exists bool
		err := db.QueryRow(ctx, `
			SELECT EXISTS(
				SELECT 1 FROM milestone_emails
				WHERE subscription_id = $1::uuid AND milestone = $2
			)
		`, c.subscriptionID, milestone).Scan(&exists)
		if err != nil {
			log.Printf("milestone: error checking existing record sub=%s milestone=%s: %v", c.subscriptionID, milestone, err)
			continue
		}
		if exists {
			continue
		}

		// Skip opted-out users.
		var optedOut bool
		_ = db.QueryRow(ctx, `SELECT email_marketing_opt_out FROM users WHERE lower(email) = lower($1)`, c.buyerEmail).Scan(&optedOut)
		if optedOut {
			continue
		}

		unsubURL := UnsubscribeLink(c.buyerEmail, frontendURL, jwtSecret)
		subj, body := email.MilestoneCelebration(c.buyerName, c.storeName, milestone, unsubURL)
		if err := emailClient.Send(c.buyerEmail, subj, body); err != nil {
			log.Printf("milestone: error sending email to=%s sub=%s milestone=%s: %v", c.buyerEmail, c.subscriptionID, milestone, err)
			continue
		}

		_, err = db.Exec(ctx, `
			INSERT INTO milestone_emails (subscription_id, milestone) VALUES ($1::uuid, $2)
		`, c.subscriptionID, milestone)
		if err != nil {
			log.Printf("milestone: error recording sent email sub=%s milestone=%s: %v", c.subscriptionID, milestone, err)
			continue
		}

		sent++
	}

	return MilestoneResult{
		Candidates: len(candidates),
		Sent:       sent,
	}, nil
}
