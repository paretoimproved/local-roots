package main

import (
	"context"
	"log"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"
	_ "time/tzdata"

	"github.com/getsentry/sentry-go"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/paretoimproved/local-roots/backend/internal/config"
	"github.com/paretoimproved/local-roots/backend/internal/db"
	"github.com/paretoimproved/local-roots/backend/internal/email"
	"github.com/paretoimproved/local-roots/backend/internal/httpx"
	"github.com/paretoimproved/local-roots/backend/internal/payments/stripepay"
	"github.com/paretoimproved/local-roots/backend/internal/scheduler"
)

func main() {
	cfg := config.FromEnv()

	if dsn := os.Getenv("SENTRY_DSN"); dsn != "" {
		if err := sentry.Init(sentry.ClientOptions{
			Dsn:         dsn,
			Environment: cfg.Env,
		}); err != nil {
			log.Printf("sentry init: %v", err)
		}
		defer sentry.Flush(2 * time.Second)
	}

	if cfg.Env == "prod" && len(cfg.JWTSecret) < 32 {
		log.Fatal("JWT_SECRET must be at least 32 characters in production")
	}

	var pool *pgxpool.Pool
	if cfg.DatabaseURL != "" {
		p, err := db.Connect(context.Background(), cfg.DatabaseURL)
		if err != nil {
			log.Fatalf("db connect: %v", err)
		}
		pool = p
		defer pool.Close()
	}

	// Construct shared clients (used by both HTTP handlers and scheduler).
	var stripeClient *stripepay.Client
	if c, err := stripepay.New(cfg.StripeSecretKey); err == nil {
		stripeClient = c
	}
	emailClient := email.New(cfg.ResendAPIKey, cfg.EmailFrom)

	srv := &http.Server{
		Addr:              cfg.Addr,
		Handler:           httpx.NewHandler(httpx.Deps{Config: cfg, DB: pool, Stripe: stripeClient, Email: emailClient}),
		ReadHeaderTimeout: 5 * time.Second,
		ReadTimeout:       30 * time.Second,
		WriteTimeout:      60 * time.Second,
		IdleTimeout:       120 * time.Second,
	}

	// Start in-process scheduler in production (replaces GitHub Actions cron).
	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()

	if cfg.Env == "prod" {
		go scheduler.Start(ctx, pool, stripeClient, emailClient, cfg.FrontendURL, cfg.JWTSecret)
	}

	go func() {
		log.Printf("api listening on %s", cfg.Addr)
		if err := srv.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			log.Fatalf("listen: %v", err)
		}
	}()

	stop := make(chan os.Signal, 1)
	signal.Notify(stop, syscall.SIGINT, syscall.SIGTERM)
	<-stop

	cancel() // Stop scheduler.

	shutdownCtx, shutdownCancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer shutdownCancel()

	log.Printf("shutting down")
	if err := srv.Shutdown(shutdownCtx); err != nil {
		log.Printf("shutdown: %v", err)
	}
}
