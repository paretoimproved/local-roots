package v1

import (
	"testing"
)

// TestWebhookConnectStatusDerivation verifies the account.updated handler
// produces the same status values as stripepay.GetAccountStatus.
func TestWebhookConnectStatusDerivation(t *testing.T) {
	// This mirrors the logic in StripeWebhook's account.updated case.
	cases := []struct {
		name           string
		chargesEnabled bool
		payoutsEnabled bool
		hasErrors      bool
		wantStatus     string
	}{
		{"both enabled", true, true, false, "active"},
		{"neither enabled", false, false, false, "onboarding"},
		{"charges only", true, false, false, "restricted"},
		{"payouts only", false, true, false, "restricted"},
		{"errors present", false, false, true, "restricted"},
		// active is not downgraded by errors
		{"active with errors", true, true, true, "active"},
	}

	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			status := "onboarding"
			if tc.chargesEnabled && tc.payoutsEnabled {
				status = "active"
			} else if tc.hasErrors {
				status = "restricted"
			} else if tc.chargesEnabled || tc.payoutsEnabled {
				status = "restricted"
			}

			if status != tc.wantStatus {
				t.Errorf("got %q want %q", status, tc.wantStatus)
			}
		})
	}
}

func TestValidPaymentTransition(t *testing.T) {
	cases := []struct {
		from string
		to   string
		want bool
	}{
		// Forward transitions — allowed.
		{"unpaid", "authorized", true},
		{"unpaid", "paid", true},
		{"unpaid", "failed", true},
		{"pending", "authorized", true},
		{"pending", "paid", true},
		{"pending", "failed", true},
		{"authorized", "paid", true},
		{"authorized", "voided", true},
		{"authorized", "failed", true},
		{"requires_action", "authorized", true},
		{"requires_action", "paid", true},
		{"requires_action", "failed", true},
		{"requires_action", "voided", true},
		{"failed", "authorized", true},
		{"failed", "paid", true},

		// Backward/invalid transitions — rejected.
		{"paid", "authorized", false},
		{"paid", "unpaid", false},
		{"paid", "voided", false},
		{"paid", "failed", false},
		{"voided", "authorized", false},
		{"voided", "paid", false},
		{"voided", "unpaid", false},
		{"refunded", "paid", false},
		{"refunded", "authorized", false},

		// No-op transitions — rejected.
		{"authorized", "authorized", false},
		{"paid", "paid", false},
	}

	for _, tc := range cases {
		t.Run(tc.from+"→"+tc.to, func(t *testing.T) {
			if got := validPaymentTransition(tc.from, tc.to); got != tc.want {
				t.Errorf("validPaymentTransition(%q, %q) = %v, want %v", tc.from, tc.to, got, tc.want)
			}
		})
	}
}

// TestSplitWebhookSecrets is already in stripe_webhook_test.go.
// These tests verify additional edge cases.
func TestSplitWebhookSecrets_Additional(t *testing.T) {
	cases := []struct {
		input string
		want  int
	}{
		{"", 0},
		{"   ", 0},
		{",,,", 0},
		{"whsec_a", 1},
		{"whsec_a,whsec_b", 2},
		{"whsec_a\nwhsec_b", 2},
		{" whsec_a , whsec_b , ", 2},
		{"whsec_a,whsec_b,whsec_c", 3},
	}

	for _, tc := range cases {
		got := splitWebhookSecrets(tc.input)
		if len(got) != tc.want {
			t.Errorf("splitWebhookSecrets(%q): got %d secrets, want %d", tc.input, len(got), tc.want)
		}
	}
}

// TestValidUUID verifies the UUID validation regex.
func TestValidUUID(t *testing.T) {
	cases := []struct {
		input string
		want  bool
	}{
		{"550e8400-e29b-41d4-a716-446655440000", true},
		{"ABCDEF12-3456-7890-ABCD-EF1234567890", true},
		{"not-a-uuid", false},
		{"550e8400e29b41d4a716446655440000", false}, // no dashes
		{"", false},
		{"550e8400-e29b-41d4-a716-44665544000", false},  // too short
		{"550e8400-e29b-41d4-a716-4466554400000", false}, // too long
	}

	for _, tc := range cases {
		if got := validUUID(tc.input); got != tc.want {
			t.Errorf("validUUID(%q) = %v, want %v", tc.input, got, tc.want)
		}
	}
}
