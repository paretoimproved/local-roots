package v1

import (
	"net/http"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"

	"github.com/paretoimproved/local-roots/backend/internal/resp"
)

// StoreContext holds verified store ownership data, passed to handlers after middleware validation.
type StoreContext struct {
	StoreID string
}

// RequireStoreOwner creates middleware that validates storeId path parameter,
// checks UUID format, verifies store exists, and confirms the authenticated user owns it.
// Handlers receive a StoreContext with the verified store ID.
func RequireStoreOwner(db *pgxpool.Pool, next func(http.ResponseWriter, *http.Request, AuthUser, StoreContext)) func(http.ResponseWriter, *http.Request, AuthUser) {
	return func(w http.ResponseWriter, r *http.Request, u AuthUser) {
		if u.Role != "seller" && u.Role != "admin" {
			resp.Forbidden(w, "seller access required")
			return
		}

		storeID := r.PathValue("storeId")
		if storeID == "" || !validUUID(storeID) {
			resp.BadRequest(w, "invalid store id")
			return
		}

		var ownerID string
		if err := db.QueryRow(r.Context(), `select owner_user_id::text from stores where id = $1::uuid`, storeID).Scan(&ownerID); err != nil {
			if err == pgx.ErrNoRows {
				resp.NotFound(w, "store not found")
				return
			}
			resp.Internal(w, err)
			return
		}
		if ownerID != u.ID {
			resp.Forbidden(w, "not your store")
			return
		}

		next(w, r, u, StoreContext{StoreID: storeID})
	}
}
