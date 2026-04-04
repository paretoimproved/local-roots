package v1

import (
	"net/http"
	"net/http/httptest"
	"testing"
)

func TestRequireSecret(t *testing.T) {
	cases := []struct {
		name       string
		secret     string
		authHeader string
		wantOK     bool
	}{
		{
			name:       "valid secret",
			secret:     "my-cron-secret",
			authHeader: "Bearer my-cron-secret",
			wantOK:     true,
		},
		{
			name:       "wrong secret",
			secret:     "my-cron-secret",
			authHeader: "Bearer wrong-secret",
			wantOK:     false,
		},
		{
			name:       "missing auth header",
			secret:     "my-cron-secret",
			authHeader: "",
			wantOK:     false,
		},
		{
			name:       "no bearer prefix",
			secret:     "my-cron-secret",
			authHeader: "my-cron-secret",
			wantOK:     false,
		},
		{
			name:       "empty secret config",
			secret:     "",
			authHeader: "Bearer anything",
			wantOK:     false,
		},
		{
			name:       "whitespace in secret",
			secret:     "  my-secret  ",
			authHeader: "Bearer my-secret",
			wantOK:     true,
		},
	}

	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			api := InternalBillingAPI{Secret: tc.secret}
			w := httptest.NewRecorder()
			r, _ := http.NewRequest("POST", "/v1/internal/billing/authorize-pending", nil)
			if tc.authHeader != "" {
				r.Header.Set("Authorization", tc.authHeader)
			}

			got := api.requireSecret(w, r)
			if got != tc.wantOK {
				t.Errorf("requireSecret() = %v, want %v (status=%d)", got, tc.wantOK, w.Code)
			}
			if !tc.wantOK && w.Code < 400 {
				t.Errorf("expected error status code, got %d", w.Code)
			}
		})
	}
}
