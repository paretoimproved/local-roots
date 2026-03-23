package v1

import (
	"net/http"
	"strings"
	"time"

	"github.com/jackc/pgx/v5/pgxpool"

	"github.com/paretoimproved/local-roots/backend/internal/auth"
	"github.com/paretoimproved/local-roots/backend/internal/resp"
)

// AdminAPI handles admin-only endpoints.
type AdminAPI struct {
	DB        *pgxpool.Pool
	JWTSecret string
}

// RequireAdmin wraps a handler and enforces that the caller holds a valid JWT
// with role == "admin". Returns 503 when auth is not configured, 401 for
// missing/invalid tokens, and 403 for non-admin roles.
//
// Unlike RequireUser, this middleware does not query the database — admin
// sessions are validated purely by JWT signature + role claim. The DB nil
// guard lives in the individual handler methods.
func (a AdminAPI) RequireAdmin(next func(http.ResponseWriter, *http.Request, AuthUser)) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		if strings.TrimSpace(a.JWTSecret) == "" {
			resp.ServiceUnavailable(w, "auth not configured")
			return
		}

		authz := r.Header.Get("Authorization")
		parts := strings.SplitN(authz, " ", 2)
		if len(parts) != 2 || !strings.EqualFold(parts[0], "bearer") {
			resp.Unauthorized(w, "missing bearer token")
			return
		}

		claims, err := auth.ParseJWT([]byte(a.JWTSecret), parts[1])
		if err != nil {
			resp.Unauthorized(w, "invalid token")
			return
		}

		if claims.Role != "admin" {
			resp.Forbidden(w, "admin access required")
			return
		}

		u := AuthUser{
			ID:   claims.UserID,
			Role: claims.Role,
		}

		next(w, r, u)
	}
}

// recentOrder is a single row in the recent_orders list.
type recentOrder struct {
	ID            string    `json:"id"`
	StoreName     string    `json:"store_name"`
	BuyerEmail    *string   `json:"buyer_email"`
	Status        string    `json:"status"`
	PaymentStatus string    `json:"payment_status"`
	TotalCents    int64     `json:"total_cents"`
	CreatedAt     time.Time `json:"created_at"`
}

// dashboardResponse is the JSON shape returned by Dashboard.
type dashboardResponse struct {
	ActiveStores         int64         `json:"active_stores"`
	TotalSubscribers     int64         `json:"total_subscribers"`
	RecentOrders         []recentOrder `json:"recent_orders"`
	PickupCompletionRate *float64      `json:"pickup_completion_rate"`
	TotalRevenueCents    int64         `json:"total_revenue_cents"`
}

// Dashboard returns platform-wide metrics for the admin dashboard.
func (a AdminAPI) Dashboard(w http.ResponseWriter, r *http.Request, _ AuthUser) {
	if a.DB == nil {
		resp.ServiceUnavailable(w, "database not configured")
		return
	}

	ctx := r.Context()

	var out dashboardResponse

	// Active stores.
	if err := a.DB.QueryRow(ctx,
		`SELECT count(*) FROM stores WHERE is_live = true`,
	).Scan(&out.ActiveStores); err != nil {
		resp.Internal(w, err)
		return
	}

	// Total active subscribers.
	if err := a.DB.QueryRow(ctx,
		`SELECT count(*) FROM subscriptions WHERE status = 'active'`,
	).Scan(&out.TotalSubscribers); err != nil {
		resp.Internal(w, err)
		return
	}

	// Recent orders (last 20).
	rows, err := a.DB.Query(ctx, `
		SELECT o.id::text, s.name, u.email, o.status, o.payment_status, o.total_cents, o.created_at
		FROM orders o
		JOIN stores s ON o.store_id = s.id
		LEFT JOIN users u ON o.buyer_id = u.id
		ORDER BY o.created_at DESC
		LIMIT 20
	`)
	if err != nil {
		resp.Internal(w, err)
		return
	}
	defer rows.Close()

	out.RecentOrders = []recentOrder{}
	for rows.Next() {
		var ro recentOrder
		if err := rows.Scan(&ro.ID, &ro.StoreName, &ro.BuyerEmail, &ro.Status, &ro.PaymentStatus, &ro.TotalCents, &ro.CreatedAt); err != nil {
			resp.Internal(w, err)
			return
		}
		out.RecentOrders = append(out.RecentOrders, ro)
	}
	if err := rows.Err(); err != nil {
		resp.Internal(w, err)
		return
	}

	// Pickup completion rate (last 30 days). May be NULL when no qualifying orders.
	if err := a.DB.QueryRow(ctx, `
		SELECT count(*) FILTER (WHERE status = 'picked_up')::float /
		       NULLIF(count(*) FILTER (WHERE status IN ('picked_up', 'no_show', 'ready')), 0)
		FROM orders
		WHERE created_at > now() - interval '30 days'
	`).Scan(&out.PickupCompletionRate); err != nil {
		resp.Internal(w, err)
		return
	}

	// Total platform revenue (sum of captured payments).
	if err := a.DB.QueryRow(ctx,
		`SELECT COALESCE(sum(captured_cents), 0) FROM orders WHERE payment_status = 'paid'`,
	).Scan(&out.TotalRevenueCents); err != nil {
		resp.Internal(w, err)
		return
	}

	resp.OK(w, out)
}
