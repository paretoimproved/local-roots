package config

import "os"

type Config struct {
	Addr             string
	Env              string
	DatabaseURL      string
	JWTSecret        string
	CORSAllowOrigins string
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

	return Config{
		Addr:             addr,
		Env:              env,
		DatabaseURL:      dbURL,
		JWTSecret:        jwtSecret,
		CORSAllowOrigins: corsAllowOrigins,
	}
}
