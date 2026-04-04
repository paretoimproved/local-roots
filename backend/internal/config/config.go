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
	BuyerFeeBps         int
	BuyerFeeFlatCents   int
	FrontendURL         string
	ResendAPIKey        string
	EmailFrom           string
	NoShowPlatformSplitBps int
	GoogleOAuthClientID    string
}

func envInt(key string, defaultVal int) int {
	if v := os.Getenv(key); v != "" {
		if n, err := strconv.Atoi(v); err == nil && n >= 0 {
			return n
		}
	}
	return defaultVal
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
	noShowFeeCents := envInt("NO_SHOW_FEE_CENTS", 500)
	buyerFeeBps := envInt("BUYER_FEE_BPS", 700)
	buyerFeeFlatCents := envInt("BUYER_FEE_FLAT_CENTS", 35)

	frontendURL := os.Getenv("FRONTEND_URL")

	resendAPIKey := os.Getenv("RESEND_API_KEY")
	emailFrom := os.Getenv("EMAIL_FROM")
	if emailFrom == "" {
		emailFrom = "Local Roots <noreply@localroots.com>"
	}

	noShowPlatformSplitBps := envInt("NO_SHOW_PLATFORM_SPLIT_BPS", 3000)

	googleOAuthClientID := os.Getenv("GOOGLE_OAUTH_CLIENT_ID")

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
		NoShowFeeCents:         noShowFeeCents,
		BuyerFeeBps:           buyerFeeBps,
		BuyerFeeFlatCents:     buyerFeeFlatCents,
		FrontendURL:           frontendURL,
		ResendAPIKey:          resendAPIKey,
		EmailFrom:             emailFrom,
		NoShowPlatformSplitBps: noShowPlatformSplitBps,
		GoogleOAuthClientID:    googleOAuthClientID,
	}
}
