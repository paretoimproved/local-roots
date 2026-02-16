package v1

import (
	"net/http"
	"testing"
	"time"

	"github.com/paretoimproved/local-roots/backend/internal/auth"
)

func TestExtractBuyerToken(t *testing.T) {
	cases := []struct {
		name   string
		header string
		want   string
	}{
		{"bearer token", "Bearer my-token-123", "my-token-123"},
		{"bearer lowercase", "bearer my-token", "my-token"},
		{"BEARER uppercase", "BEARER my-token", "my-token"},
		{"no prefix", "my-token", ""},
		{"empty", "", ""},
		{"only bearer", "Bearer ", ""},
		{"extra spaces", "  Bearer   my-token  ", "my-token"},
	}

	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			r, _ := http.NewRequest("GET", "/", nil)
			if tc.header != "" {
				r.Header.Set("Authorization", tc.header)
			}
			got := extractBuyerToken(r)
			if got != tc.want {
				t.Errorf("got %q want %q", got, tc.want)
			}
		})
	}
}

func TestResolveBuyerAuth_JWT(t *testing.T) {
	secret := "test-jwt-secret-32chars-minimum!"

	// Create a valid buyer JWT.
	tok, err := auth.SignJWT([]byte(secret), "user-123", "buyer", time.Hour)
	if err != nil {
		t.Fatal(err)
	}

	r, _ := http.NewRequest("GET", "/", nil)
	r.Header.Set("Authorization", "Bearer "+tok)

	bi := resolveBuyerAuth(r, secret)
	if !bi.isAuthenticated() {
		t.Fatal("should be authenticated")
	}
	if bi.userID == nil {
		t.Fatal("userID should be set for JWT auth")
	}
	if *bi.userID != "user-123" {
		t.Errorf("userID: got %q want %q", *bi.userID, "user-123")
	}
	if bi.buyerToken != nil {
		t.Error("buyerToken should be nil for JWT auth")
	}
}

func TestResolveBuyerAuth_OpaqueToken(t *testing.T) {
	r, _ := http.NewRequest("GET", "/", nil)
	r.Header.Set("Authorization", "Bearer opaque-buyer-token-abc")

	// With JWT secret, but the token isn't a valid JWT → falls back to opaque.
	bi := resolveBuyerAuth(r, "some-secret")
	if !bi.isAuthenticated() {
		t.Fatal("should be authenticated")
	}
	if bi.buyerToken == nil {
		t.Fatal("buyerToken should be set for opaque auth")
	}
	if *bi.buyerToken != "opaque-buyer-token-abc" {
		t.Errorf("buyerToken: got %q want %q", *bi.buyerToken, "opaque-buyer-token-abc")
	}
	if bi.userID != nil {
		t.Error("userID should be nil for opaque auth")
	}
}

func TestResolveBuyerAuth_NoHeader(t *testing.T) {
	r, _ := http.NewRequest("GET", "/", nil)

	bi := resolveBuyerAuth(r, "some-secret")
	if bi.isAuthenticated() {
		t.Error("should not be authenticated without Authorization header")
	}
}

func TestResolveBuyerAuth_SellerJWT(t *testing.T) {
	secret := "test-jwt-secret-32chars-minimum!"

	// Create a seller JWT — should NOT authenticate as buyer.
	tok, err := auth.SignJWT([]byte(secret), "seller-456", "seller", time.Hour)
	if err != nil {
		t.Fatal(err)
	}

	r, _ := http.NewRequest("GET", "/", nil)
	r.Header.Set("Authorization", "Bearer "+tok)

	bi := resolveBuyerAuth(r, secret)
	// A valid JWT with role=seller should fall back to opaque token treatment.
	if bi.userID != nil {
		t.Error("seller JWT should NOT set userID for buyer auth")
	}
	// The raw token is treated as an opaque buyer token (will fail DB lookup later).
	if bi.buyerToken == nil {
		t.Fatal("should fall back to opaque token")
	}
}

func TestResolveBuyerAuth_ExpiredJWT(t *testing.T) {
	secret := "test-jwt-secret-32chars-minimum!"

	// Create an expired JWT.
	tok, err := auth.SignJWT([]byte(secret), "user-123", "buyer", -time.Hour)
	if err != nil {
		t.Fatal(err)
	}

	r, _ := http.NewRequest("GET", "/", nil)
	r.Header.Set("Authorization", "Bearer "+tok)

	bi := resolveBuyerAuth(r, secret)
	// Expired JWT should fall back to opaque token.
	if bi.userID != nil {
		t.Error("expired JWT should NOT set userID")
	}
	if bi.buyerToken == nil {
		t.Fatal("should fall back to opaque token")
	}
}

func TestResolveBuyerAuth_NoSecret(t *testing.T) {
	r, _ := http.NewRequest("GET", "/", nil)
	r.Header.Set("Authorization", "Bearer some-token")

	// With empty JWT secret, all tokens are treated as opaque.
	bi := resolveBuyerAuth(r, "")
	if bi.userID != nil {
		t.Error("should not attempt JWT parse with empty secret")
	}
	if bi.buyerToken == nil || *bi.buyerToken != "some-token" {
		t.Error("should treat as opaque token")
	}
}
