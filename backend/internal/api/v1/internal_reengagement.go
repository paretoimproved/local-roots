package v1

import (
	"context"
	"fmt"
	"log"
	"strings"

	"github.com/jackc/pgx/v5/pgxpool"

	"github.com/paretoimproved/local-roots/backend/internal/email"
)

// ReengagementResult holds the outcome of a lapsed-subscriber reengagement run.
type ReengagementResult struct {
	Candidates int
	Sent       int
}

// RunReengagement finds active subscribers who haven't picked up in 2+ cycles
// (based on plan cadence) and sends them a nudge email. Idempotent: only sends
// once per 14 days per subscription (last_reengagement_email_at).
func RunReengagement(ctx context.Context, db *pgxpool.Pool, emailClient *email.Client, frontendURL string) (ReengagementResult, error) {
	if db == nil {
		return ReengagementResult{}, fmt.Errorf("database not configured")
	}
	if emailClient == nil || !emailClient.Enabled() {
		return ReengagementResult{}, fmt.Errorf("email not configured")
	}

	rows, err := db.Query(ctx, `
		SELECT s.id::text, s.buyer_email, s.buyer_name, sp.title as plan_title,
		       sp.cadence, st.name as store_name, st.id::text as store_id
		FROM subscriptions s
		JOIN subscription_plans sp ON sp.id = s.plan_id
		JOIN stores st ON st.id = s.store_id
		WHERE s.status = 'active'
		  AND (s.last_reengagement_email_at IS NULL
		       OR s.last_reengagement_email_at < NOW() - INTERVAL '14 days')
		  AND NOT EXISTS (
		    SELECT 1 FROM orders o
		    WHERE o.subscription_id = s.id
		      AND o.status = 'picked_up'
		      AND o.picked_up_at > NOW() - (
		        CASE sp.cadence
		          WHEN 'weekly' THEN INTERVAL '14 days'
		          WHEN 'biweekly' THEN INTERVAL '28 days'
		          WHEN 'monthly' THEN INTERVAL '60 days'
		        END
		      )
		  )
		LIMIT 50
	`)
	if err != nil {
		return ReengagementResult{}, err
	}
	defer rows.Close()

	type candidate struct {
		subID      string
		buyerEmail string
		buyerName  string
		planTitle  string
		cadence    string
		storeName  string
		storeID    string
	}

	var candidates []candidate
	for rows.Next() {
		var c candidate
		if err := rows.Scan(&c.subID, &c.buyerEmail, &c.buyerName, &c.planTitle, &c.cadence, &c.storeName, &c.storeID); err != nil {
			return ReengagementResult{}, err
		}
		candidates = append(candidates, c)
	}
	if rows.Err() != nil {
		return ReengagementResult{}, rows.Err()
	}

	sent := 0
	baseURL := strings.TrimRight(frontendURL, "/")

	for _, c := range candidates {
		storeURL := baseURL + "/stores/" + c.storeID

		subj, body := email.LapsedSubscriberNudge(c.storeName, c.planTitle, storeURL)
		if err := emailClient.Send(c.buyerEmail, subj, body); err != nil {
			log.Printf("reengagement: failed to send to %s (sub=%s): %v", c.buyerEmail, c.subID, err)
			continue
		}

		if _, err := db.Exec(ctx, `
			UPDATE subscriptions SET last_reengagement_email_at = NOW() WHERE id = $1::uuid
		`, c.subID); err != nil {
			log.Printf("reengagement: failed to update last_reengagement_email_at for sub=%s: %v", c.subID, err)
		}

		sent++
	}

	return ReengagementResult{
		Candidates: len(candidates),
		Sent:       sent,
	}, nil
}

// ReviewPromptResult holds the outcome of a post-pickup review prompt run.
type ReviewPromptResult struct {
	Candidates int
	Sent       int
}

// RunReviewPrompts finds orders picked up 2+ hours ago that have no review and
// no prior prompt, then sends the buyer a review request email.
func RunReviewPrompts(ctx context.Context, db *pgxpool.Pool, emailClient *email.Client, frontendURL string) (ReviewPromptResult, error) {
	if db == nil {
		return ReviewPromptResult{}, fmt.Errorf("database not configured")
	}
	if emailClient == nil || !emailClient.Enabled() {
		return ReviewPromptResult{}, fmt.Errorf("email not configured")
	}

	rows, err := db.Query(ctx, `
		SELECT o.id::text, o.buyer_email, o.store_id::text, o.buyer_token,
		       COALESCE(sp.title, o.product_title, 'Order') as box_title,
		       st.name as store_name
		FROM orders o
		LEFT JOIN subscription_plans sp ON sp.id = o.plan_id
		JOIN stores st ON st.id = o.store_id
		WHERE o.status = 'picked_up'
		  AND o.picked_up_at < NOW() - INTERVAL '2 hours'
		  AND o.review_prompt_sent_at IS NULL
		  AND NOT EXISTS (
		    SELECT 1 FROM reviews r WHERE r.order_id = o.id
		  )
		LIMIT 50
	`)
	if err != nil {
		return ReviewPromptResult{}, err
	}
	defer rows.Close()

	type candidate struct {
		orderID    string
		buyerEmail string
		storeID    string
		buyerToken string
		boxTitle   string
		storeName  string
	}

	var candidates []candidate
	for rows.Next() {
		var c candidate
		if err := rows.Scan(&c.orderID, &c.buyerEmail, &c.storeID, &c.buyerToken, &c.boxTitle, &c.storeName); err != nil {
			return ReviewPromptResult{}, err
		}
		candidates = append(candidates, c)
	}
	if rows.Err() != nil {
		return ReviewPromptResult{}, rows.Err()
	}

	sent := 0
	baseURL := strings.TrimRight(frontendURL, "/")

	for _, c := range candidates {
		reviewURL := baseURL + "/orders/" + c.orderID + "?t=" + c.buyerToken

		subj, body := email.PostPickupReviewPrompt(c.storeName, c.boxTitle, reviewURL)
		if err := emailClient.Send(c.buyerEmail, subj, body); err != nil {
			log.Printf("review-prompt: failed to send to %s (order=%s): %v", c.buyerEmail, c.orderID, err)
			continue
		}

		if _, err := db.Exec(ctx, `
			UPDATE orders SET review_prompt_sent_at = NOW() WHERE id = $1::uuid
		`, c.orderID); err != nil {
			log.Printf("review-prompt: failed to update review_prompt_sent_at for order=%s: %v", c.orderID, err)
		}

		sent++
	}

	return ReviewPromptResult{
		Candidates: len(candidates),
		Sent:       sent,
	}, nil
}
