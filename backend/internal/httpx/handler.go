package httpx

import (
	"net/http"

	"github.com/paretoimproved/local-roots/backend/internal/config"
	"github.com/paretoimproved/local-roots/backend/internal/health"
)

func NewHandler(cfg config.Config) http.Handler {
	mux := http.NewServeMux()

	mux.HandleFunc("GET /health", health.Handler)

	// Placeholder for versioned API.
	mux.HandleFunc("GET /v1", func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		_, _ = w.Write([]byte(`{"name":"local-roots","env":"` + cfg.Env + `"}`))
	})

	return mux
}
