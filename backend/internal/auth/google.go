package auth

import (
	"crypto/rsa"
	"encoding/base64"
	"encoding/json"
	"fmt"
	"math/big"
	"net/http"
	"sync"
	"time"

	"github.com/golang-jwt/jwt/v5"
)

// GoogleClaims holds the verified claims from a Google ID token.
type GoogleClaims struct {
	Sub           string `json:"sub"`
	Email         string `json:"email"`
	EmailVerified bool   `json:"email_verified"`
	Name          string `json:"name"`
	Picture       string `json:"picture"`
}

// jwksCache stores Google's public keys with a TTL.
var jwksCache struct {
	sync.RWMutex
	keys      map[string]*rsa.PublicKey
	fetchedAt time.Time
}

const jwksCacheTTL = 1 * time.Hour
const googleJWKSURL = "https://www.googleapis.com/oauth2/v3/certs"

type jwksResponse struct {
	Keys []jwkKey `json:"keys"`
}

type jwkKey struct {
	Kid string `json:"kid"`
	Kty string `json:"kty"`
	N   string `json:"n"`
	E   string `json:"e"`
}

func fetchGoogleKeys() (map[string]*rsa.PublicKey, error) {
	resp, err := http.Get(googleJWKSURL)
	if err != nil {
		return nil, fmt.Errorf("fetch google jwks: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("google jwks returned status %d", resp.StatusCode)
	}

	var jwks jwksResponse
	if err := json.NewDecoder(resp.Body).Decode(&jwks); err != nil {
		return nil, fmt.Errorf("decode google jwks: %w", err)
	}

	keys := make(map[string]*rsa.PublicKey, len(jwks.Keys))
	for _, k := range jwks.Keys {
		if k.Kty != "RSA" {
			continue
		}
		nBytes, err := base64.RawURLEncoding.DecodeString(k.N)
		if err != nil {
			continue
		}
		eBytes, err := base64.RawURLEncoding.DecodeString(k.E)
		if err != nil {
			continue
		}
		n := new(big.Int).SetBytes(nBytes)
		e := new(big.Int).SetBytes(eBytes)
		keys[k.Kid] = &rsa.PublicKey{N: n, E: int(e.Int64())}
	}

	return keys, nil
}

func getGoogleKey(kid string) (*rsa.PublicKey, error) {
	jwksCache.RLock()
	if time.Since(jwksCache.fetchedAt) < jwksCacheTTL && jwksCache.keys != nil {
		if key, ok := jwksCache.keys[kid]; ok {
			jwksCache.RUnlock()
			return key, nil
		}
		jwksCache.RUnlock()
		return nil, fmt.Errorf("unknown kid %q", kid)
	}
	jwksCache.RUnlock()

	jwksCache.Lock()
	defer jwksCache.Unlock()

	// Double-check after acquiring write lock.
	if time.Since(jwksCache.fetchedAt) < jwksCacheTTL && jwksCache.keys != nil {
		if key, ok := jwksCache.keys[kid]; ok {
			return key, nil
		}
		return nil, fmt.Errorf("unknown kid %q", kid)
	}

	keys, err := fetchGoogleKeys()
	if err != nil {
		return nil, err
	}
	jwksCache.keys = keys
	jwksCache.fetchedAt = time.Now()

	key, ok := keys[kid]
	if !ok {
		return nil, fmt.Errorf("unknown kid %q", kid)
	}
	return key, nil
}

// VerifyGoogleIDToken verifies a Google ID token and returns the claims.
func VerifyGoogleIDToken(idToken string, clientID string) (*GoogleClaims, error) {
	// Parse without verification first to get the kid from the header.
	parser := jwt.NewParser()
	unverified, _, err := parser.ParseUnverified(idToken, jwt.MapClaims{})
	if err != nil {
		return nil, fmt.Errorf("parse token header: %w", err)
	}

	kid, ok := unverified.Header["kid"].(string)
	if !ok || kid == "" {
		return nil, fmt.Errorf("missing kid in token header")
	}

	rsaKey, err := getGoogleKey(kid)
	if err != nil {
		return nil, err
	}

	// Now verify the token properly.
	token, err := jwt.Parse(idToken, func(t *jwt.Token) (any, error) {
		if _, ok := t.Method.(*jwt.SigningMethodRSA); !ok {
			return nil, fmt.Errorf("unexpected signing method: %v", t.Header["alg"])
		}
		return rsaKey, nil
	},
		jwt.WithAudience(clientID),
		jwt.WithIssuer("https://accounts.google.com"),
	)
	if err != nil {
		return nil, fmt.Errorf("verify token: %w", err)
	}

	mapClaims, ok := token.Claims.(jwt.MapClaims)
	if !ok {
		return nil, fmt.Errorf("invalid claims type")
	}

	claims := &GoogleClaims{}
	if v, ok := mapClaims["sub"].(string); ok {
		claims.Sub = v
	}
	if v, ok := mapClaims["email"].(string); ok {
		claims.Email = v
	}
	if v, ok := mapClaims["email_verified"].(bool); ok {
		claims.EmailVerified = v
	}
	if v, ok := mapClaims["name"].(string); ok {
		claims.Name = v
	}
	if v, ok := mapClaims["picture"].(string); ok {
		claims.Picture = v
	}

	return claims, nil
}
