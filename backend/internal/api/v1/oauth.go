package v1

import (
	"net/http"
	"strings"
	"time"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"

	"github.com/paretoimproved/local-roots/backend/internal/auth"
	"github.com/paretoimproved/local-roots/backend/internal/resp"
)

type OAuthAPI struct {
	DB                   *pgxpool.Pool
	JWTSecret            string
	GoogleOAuthClientID  string
}

type googleLoginRequest struct {
	IDToken string `json:"id_token"`
	Role    string `json:"role"`
}

func (o OAuthAPI) GoogleLogin(w http.ResponseWriter, r *http.Request) {
	if o.DB == nil {
		resp.ServiceUnavailable(w, "database not configured")
		return
	}
	if strings.TrimSpace(o.JWTSecret) == "" {
		resp.ServiceUnavailable(w, "auth not configured")
		return
	}
	if strings.TrimSpace(o.GoogleOAuthClientID) == "" {
		resp.ServiceUnavailable(w, "google oauth not configured")
		return
	}

	var in googleLoginRequest
	if err := resp.DecodeJSON(w, r, &in); err != nil {
		resp.BadRequest(w, "invalid json")
		return
	}

	if strings.TrimSpace(in.IDToken) == "" {
		resp.BadRequest(w, "id_token is required")
		return
	}

	role := strings.TrimSpace(in.Role)
	if role == "" {
		role = "buyer"
	}
	if role != "buyer" && role != "seller" {
		resp.BadRequest(w, "invalid role")
		return
	}

	// Verify the Google ID token.
	claims, err := auth.VerifyGoogleIDToken(in.IDToken, o.GoogleOAuthClientID)
	if err != nil {
		resp.Unauthorized(w, "invalid google token")
		return
	}

	if !claims.EmailVerified {
		resp.BadRequest(w, "google email not verified")
		return
	}

	email := strings.ToLower(strings.TrimSpace(claims.Email))
	if email == "" {
		resp.BadRequest(w, "google token missing email")
		return
	}

	ctx := r.Context()

	// 1. Look up by oauth_provider + oauth_provider_id.
	var u AuthUser
	err = o.DB.QueryRow(ctx, `
		SELECT id::text, email, role, display_name
		FROM users
		WHERE oauth_provider = 'google' AND oauth_provider_id = $1
		LIMIT 1
	`, claims.Sub).Scan(&u.ID, &u.Email, &u.Role, &u.DisplayName)

	if err == nil {
		// Found by OAuth link. Upgrade buyer→seller if requested.
		if role == "seller" && u.Role == "buyer" {
			_, _ = o.DB.Exec(ctx, `UPDATE users SET role = 'seller' WHERE id = $1::uuid`, u.ID)
			u.Role = "seller"
		}
		o.issueToken(w, u)
		return
	}
	if err != pgx.ErrNoRows {
		resp.Internal(w, err)
		return
	}

	// 2. Look up by email.
	err = o.DB.QueryRow(ctx, `
		SELECT id::text, email, role, display_name
		FROM users
		WHERE lower(email) = $1
		LIMIT 1
	`, email).Scan(&u.ID, &u.Email, &u.Role, &u.DisplayName)

	if err == nil {
		// Link Google to existing account.
		_, err = o.DB.Exec(ctx, `
			UPDATE users SET oauth_provider = 'google', oauth_provider_id = $1
			WHERE id = $2::uuid AND (oauth_provider IS NULL OR oauth_provider = 'google')
		`, claims.Sub, u.ID)
		if err != nil {
			resp.Internal(w, err)
			return
		}

		// Update display_name from Google if not set.
		if u.DisplayName == nil && claims.Name != "" {
			_, _ = o.DB.Exec(ctx, `UPDATE users SET display_name = $1 WHERE id = $2::uuid AND display_name IS NULL`, claims.Name, u.ID)
			u.DisplayName = &claims.Name
		}

		// Upgrade buyer→seller if requested.
		if role == "seller" && u.Role == "buyer" {
			_, _ = o.DB.Exec(ctx, `UPDATE users SET role = 'seller' WHERE id = $1::uuid`, u.ID)
			u.Role = "seller"
		}

		o.issueToken(w, u)
		return
	}
	if err != pgx.ErrNoRows {
		resp.Internal(w, err)
		return
	}

	// 3. Create new user.
	var displayName *string
	if claims.Name != "" {
		displayName = &claims.Name
	}

	err = o.DB.QueryRow(ctx, `
		INSERT INTO users (email, role, display_name, oauth_provider, oauth_provider_id)
		VALUES ($1, $2, $3, 'google', $4)
		RETURNING id::text, email, role, display_name
	`, email, role, displayName, claims.Sub).Scan(&u.ID, &u.Email, &u.Role, &u.DisplayName)
	if err != nil {
		// Race condition: retry lookup.
		err2 := o.DB.QueryRow(ctx, `
			SELECT id::text, email, role, display_name
			FROM users
			WHERE oauth_provider = 'google' AND oauth_provider_id = $1
			LIMIT 1
		`, claims.Sub).Scan(&u.ID, &u.Email, &u.Role, &u.DisplayName)
		if err2 != nil {
			// Try email fallback.
			err3 := o.DB.QueryRow(ctx, `
				SELECT id::text, email, role, display_name
				FROM users
				WHERE lower(email) = $1
				LIMIT 1
			`, email).Scan(&u.ID, &u.Email, &u.Role, &u.DisplayName)
			if err3 != nil {
				resp.Internal(w, err)
				return
			}
		}
		// Link Google if not already linked.
		_, _ = o.DB.Exec(ctx, `
			UPDATE users SET oauth_provider = 'google', oauth_provider_id = $1
			WHERE id = $2::uuid AND oauth_provider IS NULL
		`, claims.Sub, u.ID)
	}

	// Link existing orders and subscriptions by email (mirrors buyer_auth.go).
	_, _ = o.DB.Exec(ctx, `
		UPDATE orders SET buyer_user_id = $1::uuid
		WHERE lower(buyer_email) = $2 AND buyer_user_id IS NULL
	`, u.ID, email)
	_, _ = o.DB.Exec(ctx, `
		UPDATE subscriptions SET buyer_user_id = $1::uuid
		WHERE lower(buyer_email) = $2 AND buyer_user_id IS NULL
	`, u.ID, email)

	o.issueToken(w, u)
}

func (o OAuthAPI) issueToken(w http.ResponseWriter, u AuthUser) {
	ttl := 30 * 24 * time.Hour

	tok, err := auth.SignJWT([]byte(o.JWTSecret), u.ID, u.Role, ttl)
	if err != nil {
		resp.Internal(w, err)
		return
	}

	resp.OK(w, AuthResponse{Token: tok, User: u})
}
