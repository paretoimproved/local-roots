package auth

import (
	"testing"
)

func TestVerifyGoogleIDToken_MalformedToken(t *testing.T) {
	_, err := VerifyGoogleIDToken("not-a-jwt", "client-id")
	if err == nil {
		t.Fatal("expected error for malformed token")
	}
}

func TestVerifyGoogleIDToken_EmptyToken(t *testing.T) {
	_, err := VerifyGoogleIDToken("", "client-id")
	if err == nil {
		t.Fatal("expected error for empty token")
	}
}

func TestVerifyGoogleIDToken_MissingKid(t *testing.T) {
	// A valid-ish JWT structure but with no kid in header.
	// Header: {"alg":"RS256","typ":"JWT"} (no kid)
	// eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9
	token := "eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIn0.fake-signature"
	_, err := VerifyGoogleIDToken(token, "client-id")
	if err == nil {
		t.Fatal("expected error for missing kid")
	}
}
