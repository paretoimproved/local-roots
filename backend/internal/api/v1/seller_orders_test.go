package v1

import "testing"

func TestIsAllowedTransition(t *testing.T) {
	cases := []struct {
		from string
		to   string
		want bool
	}{
		{"placed", "ready", true},
		{"placed", "canceled", true},
		{"placed", "no_show", false},
		{"placed", "picked_up", false}, // requires ConfirmPickup handshake.
		{"ready", "no_show", true},
		{"ready", "picked_up", false},  // requires ConfirmPickup handshake.
		{"ready", "canceled", false},
		{"canceled", "ready", false},
		{"", "ready", false},
	}

	for _, tc := range cases {
		if got := isAllowedTransition(tc.from, tc.to); got != tc.want {
			t.Fatalf("isAllowedTransition(%q,%q)=%v want %v", tc.from, tc.to, got, tc.want)
		}
	}
}

