package v1

import (
	"crypto/hmac"
	"crypto/sha256"
	"encoding/hex"
	"net/http"
	"net/http/httptest"
	"strconv"
	"strings"
	"testing"
	"time"
)

const testUnsubSecret = "test-secret-key"

func TestGenerateUnsubscribeToken(t *testing.T) {
	token := generateUnsubscribeToken("user@example.com", testUnsubSecret)
	if token == "" {
		t.Error("expected non-empty token")
	}
}

func TestValidateUnsubscribeToken_Valid(t *testing.T) {
	email := "user@example.com"
	token := generateUnsubscribeToken(email, testUnsubSecret)

	got, err := validateUnsubscribeToken(token, testUnsubSecret)
	if err != nil {
		t.Fatalf("expected valid token, got error: %v", err)
	}
	if got != email {
		t.Errorf("expected email %q, got %q", email, got)
	}
}

// buildExpiredToken creates a properly signed token but with a past expiry.
func buildExpiredToken(email, secret string) string {
	expiry := time.Now().UTC().Add(-1 * time.Hour).Unix() // expired 1 hour ago
	emailHex := hex.EncodeToString([]byte(email))
	expiryStr := strconv.FormatInt(expiry, 10)

	mac := hmac.New(sha256.New, []byte(secret))
	mac.Write([]byte(email + "." + expiryStr))
	sig := hex.EncodeToString(mac.Sum(nil))

	return sig + "." + emailHex + "." + expiryStr
}

func TestValidateUnsubscribeToken_Expired(t *testing.T) {
	token := buildExpiredToken("user@example.com", testUnsubSecret)
	_, err := validateUnsubscribeToken(token, testUnsubSecret)
	if err == nil {
		t.Error("expected error for expired token")
	}
	if !strings.Contains(err.Error(), "expired") {
		t.Errorf("expected 'expired' in error, got: %v", err)
	}
}

func TestValidateUnsubscribeToken_Tampered(t *testing.T) {
	token := generateUnsubscribeToken("user@example.com", testUnsubSecret)
	// Flip a character in the signature portion (first segment).
	tampered := "0" + token[1:]
	_, err := validateUnsubscribeToken(tampered, testUnsubSecret)
	if err == nil {
		t.Error("expected error for tampered token")
	}
}

func TestUnsubscribe_NilDB(t *testing.T) {
	api := UnsubscribeAPI{DB: nil, JWTSecret: testUnsubSecret}

	// Generate a valid token so we get past token validation.
	token := generateUnsubscribeToken("user@example.com", testUnsubSecret)

	req := httptest.NewRequest(http.MethodGet, "/v1/unsubscribe?token="+token, nil)
	w := httptest.NewRecorder()

	api.Unsubscribe(w, req)

	if w.Code != http.StatusServiceUnavailable {
		t.Errorf("expected 503, got %d", w.Code)
	}
}
