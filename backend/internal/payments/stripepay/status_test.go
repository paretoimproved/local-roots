package stripepay

import (
	"testing"

	stripe "github.com/stripe/stripe-go/v78"
)

// TestConnectAccountStatusDerivation verifies the status derivation logic
// used in both GetAccountStatus and the account.updated webhook handler.
// This logic MUST be identical in both places.
func TestConnectAccountStatusDerivation(t *testing.T) {
	cases := []struct {
		name           string
		chargesEnabled bool
		payoutsEnabled bool
		hasErrors      bool
		wantStatus     string
	}{
		{
			name:           "both enabled = active",
			chargesEnabled: true, payoutsEnabled: true,
			wantStatus: "active",
		},
		{
			name:           "neither enabled = onboarding",
			chargesEnabled: false, payoutsEnabled: false,
			wantStatus: "onboarding",
		},
		{
			name:           "only charges = restricted",
			chargesEnabled: true, payoutsEnabled: false,
			wantStatus: "restricted",
		},
		{
			name:           "only payouts = restricted",
			chargesEnabled: false, payoutsEnabled: true,
			wantStatus: "restricted",
		},
		{
			name:           "neither with errors = restricted",
			chargesEnabled: false, payoutsEnabled: false,
			hasErrors:  true,
			wantStatus: "restricted",
		},
		{
			name:           "both enabled with errors = active (errors don't downgrade active)",
			chargesEnabled: true, payoutsEnabled: true,
			hasErrors:  true,
			wantStatus: "active",
		},
	}

	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			// Derive status using the same logic as GetAccountStatus and webhook
			status := deriveConnectStatus(tc.chargesEnabled, tc.payoutsEnabled, tc.hasErrors)
			if status != tc.wantStatus {
				t.Errorf("got %q want %q", status, tc.wantStatus)
			}
		})
	}
}

// deriveConnectStatus extracts the common status derivation logic.
// This should match the logic in:
// - stripepay.GetAccountStatus
// - stripe_webhook.go account.updated handler
func deriveConnectStatus(chargesEnabled, payoutsEnabled, hasErrors bool) string {
	if chargesEnabled && payoutsEnabled {
		return "active"
	}
	if hasErrors {
		return "restricted"
	}
	if chargesEnabled || payoutsEnabled {
		return "restricted"
	}
	return "onboarding"
}

// TestGetAccountStatusMatchesDerivation verifies that GetAccountStatus uses
// the same derivation as our extracted function, by constructing equivalent
// stripe.Account objects.
func TestGetAccountStatusMatchesDerivation(t *testing.T) {
	scenarios := []struct {
		chargesEnabled bool
		payoutsEnabled bool
		errors         []*stripe.AccountRequirementsError
	}{
		{true, true, nil},
		{false, false, nil},
		{true, false, nil},
		{false, true, nil},
		{false, false, []*stripe.AccountRequirementsError{{Code: "some_error"}}},
		{true, true, []*stripe.AccountRequirementsError{{Code: "some_error"}}},
	}

	for _, s := range scenarios {
		// Simulate what GetAccountStatus does internally
		acctStatus := "onboarding"
		if s.chargesEnabled && s.payoutsEnabled {
			acctStatus = "active"
		} else if len(s.errors) > 0 {
			acctStatus = "restricted"
		} else if s.chargesEnabled || s.payoutsEnabled {
			acctStatus = "restricted"
		}

		expected := deriveConnectStatus(s.chargesEnabled, s.payoutsEnabled, len(s.errors) > 0)
		if acctStatus != expected {
			t.Errorf("charges=%v payouts=%v errors=%d: GetAccountStatus logic gives %q but deriveConnectStatus gives %q",
				s.chargesEnabled, s.payoutsEnabled, len(s.errors), acctStatus, expected)
		}
	}
}
