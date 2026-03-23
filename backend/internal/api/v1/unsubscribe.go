package v1

import (
	"crypto/hmac"
	"crypto/sha256"
	"encoding/hex"
	"fmt"
	"net/http"
	"strconv"
	"strings"
	"time"

	"github.com/jackc/pgx/v5/pgxpool"

	"github.com/paretoimproved/local-roots/backend/internal/resp"
)

// UnsubscribeAPI handles email unsubscribe requests (CAN-SPAM compliance).
type UnsubscribeAPI struct {
	DB        *pgxpool.Pool
	JWTSecret string
}

// generateUnsubscribeToken creates a signed token for the given email.
// Format: hex(hmac) + "." + hex(email) + "." + expiryUnix
// The token is valid for 30 days.
func generateUnsubscribeToken(email, secret string) string {
	expiry := time.Now().UTC().Add(30 * 24 * time.Hour).Unix()
	emailHex := hex.EncodeToString([]byte(email))
	expiryStr := strconv.FormatInt(expiry, 10)

	mac := hmac.New(sha256.New, []byte(secret))
	mac.Write([]byte(email + "." + expiryStr))
	sig := hex.EncodeToString(mac.Sum(nil))

	return sig + "." + emailHex + "." + expiryStr
}

// validateUnsubscribeToken parses and verifies a token, returning the email on success.
func validateUnsubscribeToken(token, secret string) (string, error) {
	parts := strings.SplitN(token, ".", 3)
	if len(parts) != 3 {
		return "", fmt.Errorf("malformed token")
	}

	sig := parts[0]
	emailHex := parts[1]
	expiryStr := parts[2]

	emailBytes, err := hex.DecodeString(emailHex)
	if err != nil {
		return "", fmt.Errorf("malformed token: invalid email encoding")
	}
	email := string(emailBytes)

	expiry, err := strconv.ParseInt(expiryStr, 10, 64)
	if err != nil {
		return "", fmt.Errorf("malformed token: invalid expiry")
	}

	if time.Now().UTC().Unix() > expiry {
		return "", fmt.Errorf("token expired")
	}

	mac := hmac.New(sha256.New, []byte(secret))
	mac.Write([]byte(email + "." + expiryStr))
	expected := hex.EncodeToString(mac.Sum(nil))

	if !hmac.Equal([]byte(sig), []byte(expected)) {
		return "", fmt.Errorf("invalid token signature")
	}

	return email, nil
}

// UnsubscribeLink returns the full unsubscribe URL for use in email templates.
func UnsubscribeLink(email, frontendURL, secret string) string {
	token := generateUnsubscribeToken(email, secret)
	base := strings.TrimRight(frontendURL, "/")
	return base + "/unsubscribe?token=" + token
}

// Unsubscribe handles GET /v1/unsubscribe?token=...
// Validates the signed token and sets email_marketing_opt_out = true for the user.
func (a UnsubscribeAPI) Unsubscribe(w http.ResponseWriter, r *http.Request) {
	if a.DB == nil {
		resp.ServiceUnavailable(w, "database not configured")
		return
	}

	token := strings.TrimSpace(r.URL.Query().Get("token"))
	if token == "" {
		resp.BadRequest(w, "missing token")
		return
	}

	email, err := validateUnsubscribeToken(token, a.JWTSecret)
	if err != nil {
		resp.BadRequest(w, "invalid or expired unsubscribe link")
		return
	}

	_, err = a.DB.Exec(r.Context(), `
		UPDATE users SET email_marketing_opt_out = true WHERE lower(email) = lower($1)
	`, email)
	if err != nil {
		resp.Internal(w, err)
		return
	}

	w.Header().Set("Content-Type", "text/html; charset=utf-8")
	w.WriteHeader(http.StatusOK)
	_, _ = w.Write([]byte(`<!doctype html>
<html lang="en">
<head><meta charset="utf-8"><title>Unsubscribed - Local Roots</title></head>
<body style="font-family:sans-serif;max-width:480px;margin:80px auto;text-align:center;">
  <h1 style="color:#2d6a4f;">You've been unsubscribed</h1>
  <p>You've been unsubscribed from marketing emails from Local Roots.</p>
  <p>You'll still receive transactional emails about your orders and pickups.</p>
</body>
</html>`))
}
