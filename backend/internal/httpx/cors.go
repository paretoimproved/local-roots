package httpx

import (
	"net/http"
	"strings"

	"github.com/paretoimproved/local-roots/backend/internal/config"
)

func withCORS(cfg config.Config, next http.Handler) http.Handler {
	allowed := parseAllowedOrigins(cfg.CORSAllowOrigins)

	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		origin := r.Header.Get("Origin")
		if origin != "" && isOriginAllowed(cfg, origin, allowed) {
			w.Header().Set("Access-Control-Allow-Origin", origin)
			w.Header().Set("Vary", "Origin")
			w.Header().Set("Access-Control-Allow-Credentials", "true")
			w.Header().Set("Access-Control-Allow-Methods", "GET,POST,PATCH,DELETE,OPTIONS")
			w.Header().Set("Access-Control-Allow-Headers", "Authorization,Content-Type")
			w.Header().Set("Access-Control-Max-Age", "600")
		}

		if r.Method == http.MethodOptions {
			w.WriteHeader(http.StatusNoContent)
			return
		}

		next.ServeHTTP(w, r)
	})
}

func parseAllowedOrigins(v string) []string {
	var out []string
	for _, part := range strings.Split(v, ",") {
		s := strings.TrimSpace(part)
		if s == "" {
			continue
		}
		out = append(out, s)
	}
	return out
}

func isOriginAllowed(cfg config.Config, origin string, allowed []string) bool {
	// Explicit allow list wins.
	for _, a := range allowed {
		if origin == a {
			return true
		}
	}

	// In production, require explicit allowlisting to avoid accidentally accepting
	// requests from unrelated browser clients.
	if cfg.Env == "prod" {
		return false
	}

	// Reasonable default for Vercel previews in non-prod environments.
	if strings.HasSuffix(origin, ".vercel.app") && strings.HasPrefix(origin, "https://") {
		return true
	}

	// Local dev.
	if origin == "http://localhost:3000" || origin == "http://127.0.0.1:3000" {
		return true
	}

	return false
}
