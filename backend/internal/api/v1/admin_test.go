package v1

import (
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"github.com/paretoimproved/local-roots/backend/internal/auth"
)

const adminTestSecret = "test-jwt-secret-32chars-minimum!"

// newAdminToken creates a signed JWT with the given role for testing.
func newAdminTestToken(t *testing.T, secret, userID, role string) string {
	t.Helper()
	tok, err := auth.SignJWT([]byte(secret), userID, role, time.Hour, 1)
	if err != nil {
		t.Fatalf("SignJWT: %v", err)
	}
	return tok
}

// TestRequireAdmin_NilDB verifies that Dashboard returns 503 when the DB is
// nil (service not configured). RequireAdmin itself does not query the DB, so
// the nil guard fires inside Dashboard.
func TestRequireAdmin_NilDB(t *testing.T) {
	a := AdminAPI{DB: nil, JWTSecret: adminTestSecret}

	tok := newAdminTestToken(t, adminTestSecret, "admin-user-1", "admin")
	req := httptest.NewRequest(http.MethodGet, "/v1/admin/dashboard", nil)
	req.Header.Set("Authorization", "Bearer "+tok)
	rr := httptest.NewRecorder()

	// Call Dashboard directly (bypassing the middleware) to test the nil-DB
	// guard on the handler itself.
	a.Dashboard(rr, req, AuthUser{ID: "admin-user-1", Role: "admin"})

	if rr.Code != http.StatusServiceUnavailable {
		t.Errorf("nil DB: got %d want 503", rr.Code)
	}
}

// TestRequireAdmin_AdminAllowed verifies that a valid JWT with role=admin
// passes through RequireAdmin and the inner handler is invoked.
func TestRequireAdmin_AdminAllowed(t *testing.T) {
	a := AdminAPI{DB: nil, JWTSecret: adminTestSecret}

	tok := newAdminTestToken(t, adminTestSecret, "admin-user-1", "admin")
	req := httptest.NewRequest(http.MethodGet, "/v1/admin/dashboard", nil)
	req.Header.Set("Authorization", "Bearer "+tok)
	rr := httptest.NewRecorder()

	called := false
	var calledWith AuthUser
	handler := a.RequireAdmin(func(w http.ResponseWriter, r *http.Request, u AuthUser) {
		called = true
		calledWith = u
		w.WriteHeader(http.StatusOK)
	})
	handler(rr, req)

	if !called {
		t.Fatal("inner handler was not called for admin token")
	}
	if calledWith.Role != "admin" {
		t.Errorf("AuthUser.Role = %q, want %q", calledWith.Role, "admin")
	}
	if calledWith.ID != "admin-user-1" {
		t.Errorf("AuthUser.ID = %q, want %q", calledWith.ID, "admin-user-1")
	}
	if rr.Code != http.StatusOK {
		t.Errorf("got %d want 200", rr.Code)
	}
}

// TestRequireAdmin_SellerDenied verifies that a valid JWT with role=seller is
// rejected with 403 Forbidden before reaching the inner handler.
func TestRequireAdmin_SellerDenied(t *testing.T) {
	a := AdminAPI{DB: nil, JWTSecret: adminTestSecret}

	tok := newAdminTestToken(t, adminTestSecret, "seller-user-1", "seller")
	req := httptest.NewRequest(http.MethodGet, "/v1/admin/dashboard", nil)
	req.Header.Set("Authorization", "Bearer "+tok)
	rr := httptest.NewRecorder()

	called := false
	handler := a.RequireAdmin(func(w http.ResponseWriter, r *http.Request, u AuthUser) {
		called = true
	})
	handler(rr, req)

	if called {
		t.Error("inner handler must not be called for seller role")
	}
	if rr.Code != http.StatusForbidden {
		t.Errorf("seller role: got %d want 403", rr.Code)
	}
}

// TestRequireAdmin_NoJWT verifies that a request with no Authorization header
// returns 401 Unauthorized.
func TestRequireAdmin_NoJWT(t *testing.T) {
	a := AdminAPI{DB: nil, JWTSecret: adminTestSecret}

	req := httptest.NewRequest(http.MethodGet, "/v1/admin/dashboard", nil)
	// No Authorization header.
	rr := httptest.NewRecorder()

	called := false
	handler := a.RequireAdmin(func(w http.ResponseWriter, r *http.Request, u AuthUser) {
		called = true
	})
	handler(rr, req)

	if called {
		t.Error("inner handler must not be called with no JWT")
	}
	if rr.Code != http.StatusUnauthorized {
		t.Errorf("no JWT: got %d want 401", rr.Code)
	}
}
