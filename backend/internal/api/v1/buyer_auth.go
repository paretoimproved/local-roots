package v1

import (
	"crypto/rand"
	"encoding/hex"
	"net/http"
	"strings"
	"time"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"

	"github.com/paretoimproved/local-roots/backend/internal/auth"
	"github.com/paretoimproved/local-roots/backend/internal/email"
	"github.com/paretoimproved/local-roots/backend/internal/resp"
)

type BuyerAuthAPI struct {
	DB          *pgxpool.Pool
	JWTSecret   string
	Email       *email.Client
	FrontendURL string
}

type sendMagicLinkRequest struct {
	Email string `json:"email"`
}

func (a BuyerAuthAPI) SendMagicLink(w http.ResponseWriter, r *http.Request) {
	if a.DB == nil {
		resp.ServiceUnavailable(w, "database not configured")
		return
	}
	if a.Email == nil || !a.Email.Enabled() {
		resp.ServiceUnavailable(w, "email not configured")
		return
	}

	var in sendMagicLinkRequest
	if err := resp.DecodeJSON(w, r, &in); err != nil {
		resp.BadRequest(w, "invalid json")
		return
	}

	emailAddr := strings.ToLower(strings.TrimSpace(in.Email))
	if emailAddr == "" || !strings.Contains(emailAddr, "@") {
		resp.BadRequest(w, "invalid email")
		return
	}

	// Generate random token.
	b := make([]byte, 32)
	if _, err := rand.Read(b); err != nil {
		resp.Internal(w, err)
		return
	}
	token := hex.EncodeToString(b)

	expiresAt := time.Now().Add(15 * time.Minute)
	if _, err := a.DB.Exec(r.Context(), `
		insert into magic_link_tokens (email, token, expires_at)
		values ($1, $2, $3)
	`, emailAddr, token, expiresAt); err != nil {
		resp.Internal(w, err)
		return
	}

	verifyURL := strings.TrimRight(a.FrontendURL, "/") + "/buyer/auth/verify?token=" + token
	subj, body := email.MagicLink(verifyURL)
	a.Email.SendAsync(emailAddr, subj, body)

	// Always return ok (don't reveal whether email exists).
	resp.OK(w, map[string]any{"ok": true})
}

type verifyMagicLinkRequest struct {
	Token string `json:"token"`
}

func (a BuyerAuthAPI) Verify(w http.ResponseWriter, r *http.Request) {
	if a.DB == nil {
		resp.ServiceUnavailable(w, "database not configured")
		return
	}
	if strings.TrimSpace(a.JWTSecret) == "" {
		resp.ServiceUnavailable(w, "auth not configured")
		return
	}

	var in verifyMagicLinkRequest
	if err := resp.DecodeJSON(w, r, &in); err != nil {
		resp.BadRequest(w, "invalid json")
		return
	}

	token := strings.TrimSpace(in.Token)
	if token == "" {
		resp.BadRequest(w, "missing token")
		return
	}

	// Consume the token atomically.
	var emailAddr string
	err := a.DB.QueryRow(r.Context(), `
		update magic_link_tokens
		set used_at = now()
		where token = $1
			and used_at is null
			and expires_at > now()
		returning email
	`, token).Scan(&emailAddr)
	if err != nil {
		if err == pgx.ErrNoRows {
			resp.BadRequest(w, "invalid or expired link")
			return
		}
		resp.Internal(w, err)
		return
	}

	// Find or create buyer user.
	var userID string
	err = a.DB.QueryRow(r.Context(), `
		select id::text from users
		where lower(email) = $1 and role = 'buyer'
		limit 1
	`, emailAddr).Scan(&userID)
	if err != nil && err != pgx.ErrNoRows {
		resp.Internal(w, err)
		return
	}
	if err == pgx.ErrNoRows {
		err = a.DB.QueryRow(r.Context(), `
			insert into users (email, role)
			values ($1, 'buyer')
			returning id::text
		`, emailAddr).Scan(&userID)
		if err != nil {
			// Race condition: another request created the user concurrently.
			err2 := a.DB.QueryRow(r.Context(), `
				select id::text from users
				where lower(email) = $1 and role = 'buyer'
				limit 1
			`, emailAddr).Scan(&userID)
			if err2 != nil {
				resp.Internal(w, err)
				return
			}
		}
	}

	// Link existing orders and subscriptions by email to this buyer user.
	if _, err := a.DB.Exec(r.Context(), `
		update orders set buyer_user_id = $1::uuid
		where lower(buyer_email) = $2 and buyer_user_id is null
	`, userID, emailAddr); err != nil {
		resp.Internal(w, err)
		return
	}
	if _, err := a.DB.Exec(r.Context(), `
		update subscriptions set buyer_user_id = $1::uuid
		where lower(buyer_email) = $2 and buyer_user_id is null
	`, userID, emailAddr); err != nil {
		resp.Internal(w, err)
		return
	}

	// Sign JWT (30-day expiry for buyers).
	tok, err := auth.SignJWT([]byte(a.JWTSecret), userID, "buyer", 30*24*time.Hour)
	if err != nil {
		resp.Internal(w, err)
		return
	}

	resp.OK(w, map[string]any{
		"token": tok,
		"user": map[string]any{
			"id":    userID,
			"email": emailAddr,
			"role":  "buyer",
		},
	})
}

// GetMe returns the authenticated buyer's info. Gated behind RequireUser.
func (a BuyerAuthAPI) GetMe(w http.ResponseWriter, r *http.Request, u AuthUser) {
	if u.Role != "buyer" {
		resp.Forbidden(w, "buyer access only")
		return
	}
	resp.OK(w, map[string]any{
		"id":           u.ID,
		"email":        u.Email,
		"role":         u.Role,
		"display_name": u.DisplayName,
	})
}

type BuyerOrderSummary struct {
	ID            string    `json:"id"`
	StoreID       string    `json:"store_id"`
	Status        string    `json:"status"`
	TotalCents    int       `json:"total_cents"`
	PickupCode    string    `json:"pickup_code"`
	ProductTitle  string    `json:"product_title"`
	PickupStartAt time.Time `json:"pickup_start_at"`
	CreatedAt     time.Time `json:"created_at"`
}

// ListOrders returns orders for the authenticated buyer. Gated behind RequireUser.
func (a BuyerAuthAPI) ListOrders(w http.ResponseWriter, r *http.Request, u AuthUser) {
	if u.Role != "buyer" {
		resp.Forbidden(w, "buyer access only")
		return
	}
	rows, err := a.DB.Query(r.Context(), `
		select
			o.id::text,
			o.store_id::text,
			o.status,
			o.total_cents,
			o.pickup_code,
			coalesce((select oi.product_title from order_items oi where oi.order_id = o.id limit 1), ''),
			pw.start_at,
			o.created_at
		from orders o
		join pickup_windows pw on pw.id = o.pickup_window_id and pw.store_id = o.store_id
		where o.buyer_user_id = $1::uuid
		order by o.created_at desc
		limit 50
	`, u.ID)
	if err != nil {
		resp.Internal(w, err)
		return
	}
	defer rows.Close()

	out := []BuyerOrderSummary{}
	for rows.Next() {
		var s BuyerOrderSummary
		if err := rows.Scan(&s.ID, &s.StoreID, &s.Status, &s.TotalCents, &s.PickupCode, &s.ProductTitle, &s.PickupStartAt, &s.CreatedAt); err != nil {
			resp.Internal(w, err)
			return
		}
		out = append(out, s)
	}
	if rows.Err() != nil {
		resp.Internal(w, rows.Err())
		return
	}

	resp.OK(w, out)
}

type BuyerSubscriptionSummary struct {
	ID         string    `json:"id"`
	PlanID     string    `json:"plan_id"`
	StoreID    string    `json:"store_id"`
	Status     string    `json:"status"`
	PlanTitle  string    `json:"plan_title"`
	Cadence    string    `json:"cadence"`
	PriceCents int       `json:"price_cents"`
	CreatedAt  time.Time `json:"created_at"`
}

// ListSubscriptions returns subscriptions for the authenticated buyer.
func (a BuyerAuthAPI) ListSubscriptions(w http.ResponseWriter, r *http.Request, u AuthUser) {
	if u.Role != "buyer" {
		resp.Forbidden(w, "buyer access only")
		return
	}
	rows, err := a.DB.Query(r.Context(), `
		select
			s.id::text,
			s.plan_id::text,
			s.store_id::text,
			s.status,
			sp.title,
			sp.cadence,
			sp.price_cents,
			s.created_at
		from subscriptions s
		join subscription_plans sp on sp.id = s.plan_id
		where s.buyer_user_id = $1::uuid
		order by s.created_at desc
		limit 50
	`, u.ID)
	if err != nil {
		resp.Internal(w, err)
		return
	}
	defer rows.Close()

	out := []BuyerSubscriptionSummary{}
	for rows.Next() {
		var s BuyerSubscriptionSummary
		if err := rows.Scan(&s.ID, &s.PlanID, &s.StoreID, &s.Status, &s.PlanTitle, &s.Cadence, &s.PriceCents, &s.CreatedAt); err != nil {
			resp.Internal(w, err)
			return
		}
		out = append(out, s)
	}
	if rows.Err() != nil {
		resp.Internal(w, rows.Err())
		return
	}

	resp.OK(w, out)
}
