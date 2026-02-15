package v1

import "testing"

func TestIsAllowedTransition(t *testing.T) {
	cases := []struct {
		from string
		to   string
		want bool
	}{
		// Valid transitions
		{"placed", "ready", true},
		{"placed", "canceled", true},

		// Invalid from placed
		{"placed", "no_show", false},
		{"placed", "picked_up", false}, // requires ConfirmPickup handshake.

		// Valid from ready
		{"ready", "no_show", true},

		// Invalid from ready
		{"ready", "picked_up", false}, // requires ConfirmPickup handshake.
		{"ready", "canceled", false},

		// Terminal states: picked_up -> anything = false
		{"picked_up", "placed", false},
		{"picked_up", "ready", false},
		{"picked_up", "canceled", false},
		{"picked_up", "no_show", false},

		// Terminal states: no_show -> anything = false
		{"no_show", "placed", false},
		{"no_show", "ready", false},
		{"no_show", "canceled", false},
		{"no_show", "picked_up", false},

		// Terminal states: canceled -> anything = false
		{"canceled", "ready", false},
		{"canceled", "placed", false},
		{"canceled", "no_show", false},
		{"canceled", "picked_up", false},

		// Unknown/empty from state
		{"", "ready", false},
		{"unknown", "ready", false},
		{"invalid", "placed", false},
	}

	for _, tc := range cases {
		if got := isAllowedTransition(tc.from, tc.to); got != tc.want {
			t.Fatalf("isAllowedTransition(%q,%q)=%v want %v", tc.from, tc.to, got, tc.want)
		}
	}
}

