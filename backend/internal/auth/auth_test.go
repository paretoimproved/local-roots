package auth

import (
	"testing"
	"time"

	"github.com/golang-jwt/jwt/v5"
)

func TestSignParseJWT_RoundTrip(t *testing.T) {
	secret := []byte("test-secret")

	token, err := SignJWT(secret, "user-123", "seller", time.Hour)
	if err != nil {
		t.Fatalf("SignJWT: %v", err)
	}

	claims, err := ParseJWT(secret, token)
	if err != nil {
		t.Fatalf("ParseJWT: %v", err)
	}
	if claims.UserID != "user-123" {
		t.Fatalf("UserID: got %q", claims.UserID)
	}
	if claims.Role != "seller" {
		t.Fatalf("Role: got %q", claims.Role)
	}
}

func TestParseJWT_RejectsWrongAlg(t *testing.T) {
	secret := []byte("test-secret")

	now := time.Now()
	claims := Claims{
		UserID: "user-123",
		Role:   "seller",
		RegisteredClaims: jwt.RegisteredClaims{
			IssuedAt:  jwt.NewNumericDate(now),
			ExpiresAt: jwt.NewNumericDate(now.Add(time.Hour)),
		},
	}

	tok := jwt.NewWithClaims(jwt.SigningMethodHS384, claims)
	signed, err := tok.SignedString(secret)
	if err != nil {
		t.Fatalf("SignedString: %v", err)
	}

	if _, err := ParseJWT(secret, signed); err == nil {
		t.Fatalf("expected error")
	}
}

func TestParseJWT_RejectsBadSignature(t *testing.T) {
	secret := []byte("test-secret")
	other := []byte("other-secret")

	token, err := SignJWT(other, "user-123", "seller", time.Hour)
	if err != nil {
		t.Fatalf("SignJWT: %v", err)
	}

	if _, err := ParseJWT(secret, token); err == nil {
		t.Fatalf("expected error")
	}
}

