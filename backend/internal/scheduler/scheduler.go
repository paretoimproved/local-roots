package scheduler

import (
	"context"
	"log"
	"time"

	"github.com/jackc/pgx/v5/pgxpool"

	v1 "github.com/paretoimproved/local-roots/backend/internal/api/v1"
	"github.com/paretoimproved/local-roots/backend/internal/email"
	"github.com/paretoimproved/local-roots/backend/internal/payments/stripepay"
)

// Start launches in-process cron jobs. It blocks until ctx is cancelled.
// Call this in a goroutine from main.go.
//
// Jobs:
//   - Billing authorization: every 30 minutes
//   - Pickup reminders: every 30 minutes (offset by 15 min)
//   - Re-engagement emails: every 6 hours
//   - Review prompts: every 30 minutes
//   - Transfer retry: every hour
//   - Milestone emails: every 6 hours
//   - Seller weekly digest: every hour (sends only on Monday 14:00 UTC)
func Start(ctx context.Context, db *pgxpool.Pool, stripeClient *stripepay.Client, emailClient *email.Client, frontendURL, jwtSecret string) {
	billingTicker := time.NewTicker(30 * time.Minute)
	reminderTicker := time.NewTicker(30 * time.Minute)
	reengagementTicker := time.NewTicker(6 * time.Hour)
	reviewPromptTicker := time.NewTicker(30 * time.Minute)
	transferRetryTicker := time.NewTicker(1 * time.Hour)
	milestoneTicker := time.NewTicker(6 * time.Hour)
	digestTicker := time.NewTicker(1 * time.Hour)
	defer billingTicker.Stop()
	defer reminderTicker.Stop()
	defer reengagementTicker.Stop()
	defer reviewPromptTicker.Stop()
	defer transferRetryTicker.Stop()
	defer milestoneTicker.Stop()
	defer digestTicker.Stop()

	log.Printf("scheduler: started (billing=30m, reminders=30m, reengagement=6h, review_prompts=30m, transfer_retry=1h, milestones=6h, digest=1h)")

	// Run billing immediately on startup, then on tick.
	go runBilling(ctx, db, stripeClient)

	// Delay reminders by 15 min to stagger with billing.
	go func() {
		select {
		case <-time.After(15 * time.Minute):
			runReminders(ctx, db, emailClient, frontendURL)
		case <-ctx.Done():
		}
	}()

	for {
		select {
		case <-ctx.Done():
			log.Printf("scheduler: stopped")
			return
		case <-billingTicker.C:
			go runBilling(ctx, db, stripeClient)
		case <-reminderTicker.C:
			go runReminders(ctx, db, emailClient, frontendURL)
		case <-reengagementTicker.C:
			go runReengagement(ctx, db, emailClient, frontendURL, jwtSecret)
		case <-reviewPromptTicker.C:
			go runReviewPrompts(ctx, db, emailClient, frontendURL)
		case <-transferRetryTicker.C:
			go runTransferRetry(ctx, db, stripeClient)
		case <-milestoneTicker.C:
			go runMilestones(ctx, db, emailClient, frontendURL, jwtSecret)
		case <-digestTicker.C:
			go runDigest(ctx, db, emailClient)
		}
	}
}

func runBilling(ctx context.Context, db *pgxpool.Pool, stripeClient *stripepay.Client) {
	defer func() {
		if r := recover(); r != nil {
			log.Printf("scheduler: billing panic: %v", r)
		}
	}()

	if db == nil || stripeClient == nil || !stripeClient.Enabled() {
		return
	}

	result, err := v1.RunBillingAuthorization(ctx, db, stripeClient)
	if err != nil {
		log.Printf("scheduler: billing error: %v", err)
		return
	}
	log.Printf("scheduler: billing candidates=%d authorized=%d failed=%d until=%s",
		result.Candidates, result.Authorized, result.Failed, result.Until.Format(time.RFC3339))
}

func runReminders(ctx context.Context, db *pgxpool.Pool, emailClient *email.Client, frontendURL string) {
	defer func() {
		if r := recover(); r != nil {
			log.Printf("scheduler: reminders panic: %v", r)
		}
	}()

	if db == nil || emailClient == nil || !emailClient.Enabled() {
		return
	}

	result, err := v1.RunPickupReminders(ctx, db, emailClient, frontendURL)
	if err != nil {
		log.Printf("scheduler: reminders error: %v", err)
		return
	}
	log.Printf("scheduler: reminders candidates=%d sent=%d",
		result.Candidates, result.Sent)
}

func runReengagement(ctx context.Context, db *pgxpool.Pool, emailClient *email.Client, frontendURL, jwtSecret string) {
	defer func() {
		if r := recover(); r != nil {
			log.Printf("scheduler: reengagement panic: %v", r)
		}
	}()

	if db == nil || emailClient == nil || !emailClient.Enabled() {
		return
	}

	result, err := v1.RunReengagement(ctx, db, emailClient, frontendURL, jwtSecret)
	if err != nil {
		log.Printf("scheduler: reengagement error: %v", err)
		return
	}
	log.Printf("scheduler: reengagement candidates=%d sent=%d",
		result.Candidates, result.Sent)
}

func runReviewPrompts(ctx context.Context, db *pgxpool.Pool, emailClient *email.Client, frontendURL string) {
	defer func() {
		if r := recover(); r != nil {
			log.Printf("scheduler: review_prompts panic: %v", r)
		}
	}()

	if db == nil || emailClient == nil || !emailClient.Enabled() {
		return
	}

	result, err := v1.RunReviewPrompts(ctx, db, emailClient, frontendURL)
	if err != nil {
		log.Printf("scheduler: review_prompts error: %v", err)
		return
	}
	log.Printf("scheduler: review_prompts candidates=%d sent=%d",
		result.Candidates, result.Sent)
}

func runTransferRetry(ctx context.Context, db *pgxpool.Pool, stripeClient *stripepay.Client) {
	defer func() {
		if r := recover(); r != nil {
			log.Printf("scheduler: transfer_retry panic: %v", r)
		}
	}()

	if db == nil || stripeClient == nil || !stripeClient.Enabled() {
		return
	}

	result, err := v1.RunTransferRetry(ctx, db, stripeClient)
	if err != nil {
		log.Printf("scheduler: transfer_retry error: %v", err)
		return
	}
	log.Printf("scheduler: transfer_retry candidates=%d retried=%d failed=%d",
		result.Candidates, result.Retried, result.Failed)
}

func runMilestones(ctx context.Context, db *pgxpool.Pool, emailClient *email.Client, frontendURL, jwtSecret string) {
	defer func() {
		if r := recover(); r != nil {
			log.Printf("scheduler: milestones panic: %v", r)
		}
	}()

	if db == nil || emailClient == nil || !emailClient.Enabled() {
		return
	}

	result, err := v1.RunMilestoneEmails(ctx, db, emailClient, frontendURL, jwtSecret)
	if err != nil {
		log.Printf("scheduler: milestones error: %v", err)
		return
	}
	log.Printf("scheduler: milestones candidates=%d sent=%d",
		result.Candidates, result.Sent)
}

func runDigest(ctx context.Context, db *pgxpool.Pool, emailClient *email.Client) {
	defer func() {
		if r := recover(); r != nil {
			log.Printf("scheduler: digest panic: %v", r)
		}
	}()

	if db == nil || emailClient == nil || !emailClient.Enabled() {
		return
	}

	// Only send on Monday around 14:00 UTC (9 AM ET).
	now := time.Now().UTC()
	if now.Weekday() != time.Monday || now.Hour() != 14 {
		return
	}

	result, err := v1.RunSellerDigest(ctx, db, emailClient)
	if err != nil {
		log.Printf("scheduler: digest error: %v", err)
		return
	}
	log.Printf("scheduler: digest candidates=%d sent=%d",
		result.Candidates, result.Sent)
}
