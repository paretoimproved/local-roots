package config

import (
	"os"
	"strconv"
)

type Config struct {
	Addr                string
	Env                 string
	DatabaseURL         string
	JWTSecret           string
	CORSAllowOrigins    string
	GooglePlacesAPIKey  string
	StripeSecretKey     string
	StripeWebhookSecret string
	InternalCronSecret  string
	NoShowFeeCents      int
}

func FromEnv() Config {
	addr := os.Getenv("ADDR")
	if addr == "" {
		if port := os.Getenv("PORT"); port != "" {
			addr = ":" + port
		} else {
			addr = ":8080"
		}
	}
	env := os.Getenv("ENV")
	if env == "" {
		env = "dev"
	}

	dbURL := os.Getenv("DATABASE_URL")
	jwtSecret := os.Getenv("JWT_SECRET")
	corsAllowOrigins := os.Getenv("CORS_ALLOW_ORIGINS")
	googlePlacesAPIKey := os.Getenv("GOOGLE_PLACES_API_KEY")
	stripeSecretKey := os.Getenv("STRIPE_SECRET_KEY")
	stripeWebhookSecret := os.Getenv("STRIPE_WEBHOOK_SECRET")
	internalCronSecret := os.Getenv("INTERNAL_CRON_SECRET")
	noShowFeeCents := 500
	if v := os.Getenv("NO_SHOW_FEE_CENTS"); v != "" {
		if n, err := strconv.Atoi(v); err == nil && n >= 0 {
			noShowFeeCents = n
		}
	}

	return Config{
		Addr:                addr,
		Env:                 env,
		DatabaseURL:         dbURL,
		JWTSecret:           jwtSecret,
		CORSAllowOrigins:    corsAllowOrigins,
		GooglePlacesAPIKey:  googlePlacesAPIKey,
		StripeSecretKey:     stripeSecretKey,
		StripeWebhookSecret: stripeWebhookSecret,
		InternalCronSecret:  internalCronSecret,
		NoShowFeeCents:      noShowFeeCents,
	}
}
