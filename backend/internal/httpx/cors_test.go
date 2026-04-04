package httpx

import (
	"testing"

	"github.com/paretoimproved/local-roots/backend/internal/config"
)

func TestParseAllowedOrigins(t *testing.T) {
	cases := []struct {
		name  string
		input string
		want  []string
	}{
		{
			name:  "comma separated",
			input: "https://example.com,https://other.com",
			want:  []string{"https://example.com", "https://other.com"},
		},
		{
			name:  "empty string",
			input: "",
			want:  nil,
		},
		{
			name:  "whitespace trimmed",
			input: " https://a.com , https://b.com ",
			want:  []string{"https://a.com", "https://b.com"},
		},
		{
			name:  "empty parts skipped",
			input: "https://a.com,,https://b.com",
			want:  []string{"https://a.com", "https://b.com"},
		},
		{
			name:  "only commas",
			input: ",,,",
			want:  nil,
		},
	}

	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			got := parseAllowedOrigins(tc.input)
			if len(got) != len(tc.want) {
				t.Fatalf("len: got %d want %d (got %v)", len(got), len(tc.want), got)
			}
			for i := range got {
				if got[i] != tc.want[i] {
					t.Fatalf("index %d: got %q want %q", i, got[i], tc.want[i])
				}
			}
		})
	}
}

func TestIsOriginAllowed_Prod(t *testing.T) {
	cfg := config.Config{Env: "prod"}

	cases := []struct {
		name    string
		origin  string
		allowed []string
		want    bool
	}{
		{
			name:    "explicit match",
			origin:  "https://localroots.com",
			allowed: []string{"https://localroots.com"},
			want:    true,
		},
		{
			name:    "not in allow list",
			origin:  "https://evil.com",
			allowed: []string{"https://localroots.com"},
			want:    false,
		},
		{
			name:    "vercel preview blocked in prod",
			origin:  "https://my-app-abc123.vercel.app",
			allowed: []string{"https://localroots.com"},
			want:    false,
		},
		{
			name:    "localhost blocked in prod",
			origin:  "http://localhost:3000",
			allowed: nil,
			want:    false,
		},
		{
			name:    "empty allow list blocks all",
			origin:  "https://anything.com",
			allowed: nil,
			want:    false,
		},
	}

	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			got := isOriginAllowed(cfg, tc.origin, tc.allowed)
			if got != tc.want {
				t.Fatalf("isOriginAllowed(%q)=%v want %v", tc.origin, got, tc.want)
			}
		})
	}
}

func TestIsOriginAllowed_Dev(t *testing.T) {
	cfg := config.Config{Env: "dev"}

	cases := []struct {
		name    string
		origin  string
		allowed []string
		want    bool
	}{
		{
			name:    "localhost:3000 allowed",
			origin:  "http://localhost:3000",
			allowed: nil,
			want:    true,
		},
		{
			name:    "127.0.0.1:3000 allowed",
			origin:  "http://127.0.0.1:3000",
			allowed: nil,
			want:    true,
		},
		{
			name:    "vercel preview allowed",
			origin:  "https://my-app-abc123.vercel.app",
			allowed: nil,
			want:    true,
		},
		{
			name:    "explicit allow list still works",
			origin:  "https://staging.localroots.com",
			allowed: []string{"https://staging.localroots.com"},
			want:    true,
		},
		{
			name:    "random origin blocked",
			origin:  "https://evil.com",
			allowed: nil,
			want:    false,
		},
		{
			name:    "http vercel blocked (not https)",
			origin:  "http://my-app.vercel.app",
			allowed: nil,
			want:    false,
		},
		{
			name:    "localhost wrong port blocked",
			origin:  "http://localhost:8080",
			allowed: nil,
			want:    false,
		},
	}

	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			got := isOriginAllowed(cfg, tc.origin, tc.allowed)
			if got != tc.want {
				t.Fatalf("isOriginAllowed(%q)=%v want %v", tc.origin, got, tc.want)
			}
		})
	}
}
