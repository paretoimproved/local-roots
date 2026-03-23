package v1

import (
	"context"
	"crypto/rand"
	"crypto/sha256"
	"encoding/hex"
	"net/http"
	"strings"
	"time"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgconn"
	"github.com/jackc/pgx/v5/pgxpool"

	"github.com/paretoimproved/local-roots/backend/internal/auth"
	"github.com/paretoimproved/local-roots/backend/internal/resp"
)

type AuthAPI struct {
	DB        *pgxpool.Pool
	JWTSecret string
}

type AuthUser struct {
	ID          string  `json:"id"`
	Email       string  `json:"email"`
	Role        string  `json:"role"`
	DisplayName *string `json:"display_name"`
}

type AuthResponse struct {
	Token        string   `json:"token"`
	RefreshToken string   `json:"refresh_token,omitempty"`
	User         AuthUser `json:"user"`
}

// generateRefreshToken creates a cryptographically random 32-byte hex string.
func generateRefreshToken() (string, error) {
	b := make([]byte, 32)
	if _, err := rand.Read(b); err != nil {
		return "", err
	}
	return hex.EncodeToString(b), nil
}

// hashRefreshToken returns the SHA-256 hex digest of the given token.
func hashRefreshToken(token string) string {
	h := sha256.Sum256([]byte(token))
	return hex.EncodeToString(h[:])
}

// issueTokenPair signs a JWT and creates a refresh token stored in the DB.
func issueTokenPair(ctx context.Context, db *pgxpool.Pool, jwtSecret string, userID, role string, tokenVersion int) (*AuthResponse, error) {
	tok, err := auth.SignJWT([]byte(jwtSecret), userID, role, 4*time.Hour, tokenVersion)
	if err != nil {
		return nil, err
	}

	refreshRaw, err := generateRefreshToken()
	if err != nil {
		return nil, err
	}

	hash := hashRefreshToken(refreshRaw)
	_, err = db.Exec(ctx, `
		INSERT INTO refresh_tokens (user_id, token_hash, expires_at)
		VALUES ($1::uuid, $2, now() + interval '30 days')
	`, userID, hash)
	if err != nil {
		return nil, err
	}

	return &AuthResponse{
		Token:        tok,
		RefreshToken: refreshRaw,
	}, nil
}

type registerRequest struct {
	Email       string  `json:"email"`
	Password    string  `json:"password"`
	DisplayName *string `json:"display_name"`
	Role        string  `json:"role"` // optional; default "seller"
}

func (a AuthAPI) Register(w http.ResponseWriter, r *http.Request) {
	if a.DB == nil {
		resp.ServiceUnavailable(w, "database not configured")
		return
	}
	if strings.TrimSpace(a.JWTSecret) == "" {
		resp.ServiceUnavailable(w, "auth not configured")
		return
	}

	var in registerRequest
	if err := resp.DecodeJSON(w, r, &in); err != nil {
		resp.BadRequest(w, "invalid json")
		return
	}

	email := strings.ToLower(strings.TrimSpace(in.Email))
	if email == "" || !strings.Contains(email, "@") {
		resp.BadRequest(w, "invalid email")
		return
	}
	if len(in.Password) < 8 {
		resp.BadRequest(w, "password must be at least 8 characters")
		return
	}

	role := strings.TrimSpace(in.Role)
	if role == "" {
		role = "seller"
	}
	if role != "seller" && role != "buyer" {
		resp.BadRequest(w, "invalid role")
		return
	}

	hash, err := auth.HashPassword(in.Password)
	if err != nil {
		resp.Internal(w, err)
		return
	}

	var u AuthUser
	err = a.DB.QueryRow(r.Context(), `
		insert into users (email, role, display_name, password_hash)
		values ($1, $2, $3, $4)
		returning id::text, email, role, display_name
	`, email, role, in.DisplayName, hash).Scan(&u.ID, &u.Email, &u.Role, &u.DisplayName)
	if err != nil {
		// Unique on email.
		if pgxErr, ok := err.(*pgconn.PgError); ok && pgxErr.Code == "23505" {
			resp.BadRequest(w, "email already in use")
			return
		}
		resp.Internal(w, err)
		return
	}

	var tokenVersion int
	_ = a.DB.QueryRow(r.Context(), `select token_version from users where id = $1::uuid`, u.ID).Scan(&tokenVersion)

	ar, err := issueTokenPair(r.Context(), a.DB, a.JWTSecret, u.ID, u.Role, tokenVersion)
	if err != nil {
		resp.Internal(w, err)
		return
	}
	ar.User = u

	resp.OK(w, ar)
}

type loginRequest struct {
	Email    string `json:"email"`
	Password string `json:"password"`
}

func (a AuthAPI) Login(w http.ResponseWriter, r *http.Request) {
	if a.DB == nil {
		resp.ServiceUnavailable(w, "database not configured")
		return
	}
	if strings.TrimSpace(a.JWTSecret) == "" {
		resp.ServiceUnavailable(w, "auth not configured")
		return
	}

	var in loginRequest
	if err := resp.DecodeJSON(w, r, &in); err != nil {
		resp.BadRequest(w, "invalid json")
		return
	}

	email := strings.ToLower(strings.TrimSpace(in.Email))
	if email == "" || in.Password == "" {
		resp.BadRequest(w, "email and password are required")
		return
	}

	var (
		u    AuthUser
		hash *string
	)
	err := a.DB.QueryRow(r.Context(), `
		select id::text, email, role, display_name, password_hash
		from users
		where lower(email) = $1
		limit 1
	`, email).Scan(&u.ID, &u.Email, &u.Role, &u.DisplayName, &hash)
	if err != nil {
		if err == pgx.ErrNoRows {
			resp.Unauthorized(w, "invalid credentials")
			return
		}
		resp.Internal(w, err)
		return
	}
	if hash == nil {
		resp.Unauthorized(w, "invalid credentials")
		return
	}
	if err := auth.CheckPassword(*hash, in.Password); err != nil {
		resp.Unauthorized(w, "invalid credentials")
		return
	}

	var tokenVersion int
	_ = a.DB.QueryRow(r.Context(), `select token_version from users where id = $1::uuid`, u.ID).Scan(&tokenVersion)

	ar, err := issueTokenPair(r.Context(), a.DB, a.JWTSecret, u.ID, u.Role, tokenVersion)
	if err != nil {
		resp.Internal(w, err)
		return
	}
	ar.User = u

	resp.OK(w, ar)
}

type refreshRequest struct {
	RefreshToken string `json:"refresh_token"`
}

func (a AuthAPI) Refresh(w http.ResponseWriter, r *http.Request) {
	if a.DB == nil {
		resp.ServiceUnavailable(w, "database not configured")
		return
	}
	if strings.TrimSpace(a.JWTSecret) == "" {
		resp.ServiceUnavailable(w, "auth not configured")
		return
	}

	var in refreshRequest
	if err := resp.DecodeJSON(w, r, &in); err != nil {
		resp.BadRequest(w, "invalid json")
		return
	}

	token := strings.TrimSpace(in.RefreshToken)
	if token == "" {
		resp.BadRequest(w, "missing refresh_token")
		return
	}

	hash := hashRefreshToken(token)

	var id, userID string
	var used bool
	var expiresAt time.Time
	err := a.DB.QueryRow(r.Context(), `
		SELECT id::text, user_id::text, used, expires_at
		FROM refresh_tokens
		WHERE token_hash = $1
	`, hash).Scan(&id, &userID, &used, &expiresAt)
	if err != nil {
		if err == pgx.ErrNoRows {
			resp.Unauthorized(w, "invalid refresh token")
			return
		}
		resp.Internal(w, err)
		return
	}

	if used {
		resp.Unauthorized(w, "refresh token already used")
		return
	}
	if time.Now().After(expiresAt) {
		resp.Unauthorized(w, "refresh token expired")
		return
	}

	// Mark as used (rotation).
	_, err = a.DB.Exec(r.Context(), `
		UPDATE refresh_tokens SET used = true, updated_at = now() WHERE id = $1::uuid
	`, id)
	if err != nil {
		resp.Internal(w, err)
		return
	}

	// Look up user.
	var u AuthUser
	var tokenVersion int
	err = a.DB.QueryRow(r.Context(), `
		SELECT id::text, email, role, display_name, token_version
		FROM users
		WHERE id = $1::uuid
	`, userID).Scan(&u.ID, &u.Email, &u.Role, &u.DisplayName, &tokenVersion)
	if err != nil {
		if err == pgx.ErrNoRows {
			resp.Unauthorized(w, "user not found")
			return
		}
		resp.Internal(w, err)
		return
	}

	ar, err := issueTokenPair(r.Context(), a.DB, a.JWTSecret, u.ID, u.Role, tokenVersion)
	if err != nil {
		resp.Internal(w, err)
		return
	}
	ar.User = u

	resp.OK(w, ar)
}

func (a AuthAPI) RequireUser(next func(http.ResponseWriter, *http.Request, AuthUser)) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		if a.DB == nil {
			resp.ServiceUnavailable(w, "database not configured")
			return
		}
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

		var u AuthUser
		var dbTokenVersion int
		err = a.DB.QueryRow(r.Context(), `
			select id::text, email, role, display_name, token_version
			from users
			where id = $1::uuid
			limit 1
		`, claims.UserID).Scan(&u.ID, &u.Email, &u.Role, &u.DisplayName, &dbTokenVersion)
		if err != nil {
			if err == pgx.ErrNoRows {
				resp.Unauthorized(w, "invalid token")
				return
			}
			resp.Internal(w, err)
			return
		}

		if claims.Version != dbTokenVersion {
			resp.Unauthorized(w, "token revoked")
			return
		}

		next(w, r, u)
	}
}
