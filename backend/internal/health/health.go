package health

import (
	"context"
	"encoding/json"
	"net/http"
	"time"

	"github.com/jackc/pgx/v5/pgxpool"
)

type Response struct {
	OK   bool `json:"ok"`
	DBOK bool `json:"db_ok"`
}

func Handler(db *pgxpool.Pool) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		dbOK := false
		if db != nil {
			ctx, cancel := context.WithTimeout(r.Context(), 500*time.Millisecond)
			defer cancel()
			if err := db.Ping(ctx); err == nil {
				dbOK = true
			}
		}

		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusOK)
		_ = json.NewEncoder(w).Encode(Response{OK: true, DBOK: dbOK})
	}
}

// Back-compat: old handler signature (no DB).
func HandlerNoDB(w http.ResponseWriter, r *http.Request) { Handler(nil)(w, r) }
