package httpx

import (
	"net/http"

	"github.com/paretoimproved/local-roots/backend/internal/config"
	v1 "github.com/paretoimproved/local-roots/backend/internal/api/v1"
	"github.com/paretoimproved/local-roots/backend/internal/health"
	"github.com/jackc/pgx/v5/pgxpool"
)

type Deps struct {
	Config config.Config
	DB     *pgxpool.Pool
}

func NewHandler(deps Deps) http.Handler {
	mux := http.NewServeMux()

	mux.HandleFunc("GET /health", health.Handler(deps.DB))

	// Placeholder for versioned API.
	mux.HandleFunc("GET /v1", func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		_, _ = w.Write([]byte(`{"name":"local-roots","env":"` + deps.Config.Env + `"}`))
	})

	public := v1.PublicAPI{DB: deps.DB}
	mux.HandleFunc("GET /v1/stores", public.ListStores)
	mux.HandleFunc("GET /v1/stores/{storeId}/pickup-windows", public.ListStorePickupWindows)
	mux.HandleFunc("GET /v1/pickup-windows/{pickupWindowId}/offerings", public.ListPickupWindowOfferings)

	return mux
}
