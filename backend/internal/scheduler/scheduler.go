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
func Start(ctx context.Context, db *pgxpool.Pool, stripeClient *stripepay.Client, emailClient *email.Client, frontendURL string) {
	billingTicker := time.NewTicker(30 * time.Minute)
	reminderTicker := time.NewTicker(30 * time.Minute)
	defer billingTicker.Stop()
	defer reminderTicker.Stop()

	log.Printf("scheduler: started (billing=30m, reminders=30m)")

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
