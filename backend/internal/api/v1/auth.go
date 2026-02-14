package v1

import (
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
	Token string   `json:"token"`
	User  AuthUser `json:"user"`
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

	tok, err := auth.SignJWT([]byte(a.JWTSecret), u.ID, u.Role, 7*24*time.Hour)
	if err != nil {
		resp.Internal(w, err)
		return
	}

	resp.OK(w, AuthResponse{Token: tok, User: u})
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

	tok, err := auth.SignJWT([]byte(a.JWTSecret), u.ID, u.Role, 7*24*time.Hour)
	if err != nil {
		resp.Internal(w, err)
		return
	}

	resp.OK(w, AuthResponse{Token: tok, User: u})
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
		err = a.DB.QueryRow(r.Context(), `
			select id::text, email, role, display_name
			from users
			where id = $1::uuid
			limit 1
		`, claims.UserID).Scan(&u.ID, &u.Email, &u.Role, &u.DisplayName)
		if err != nil {
			if err == pgx.ErrNoRows {
				resp.Unauthorized(w, "invalid token")
				return
			}
			resp.Internal(w, err)
			return
		}

		next(w, r, u)
	}
}
