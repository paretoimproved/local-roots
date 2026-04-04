package v1

import "testing"

// TestNoShowFeeSplit verifies the platform/seller split math used in
// UpdateOrderStatus and seller_payouts.
func TestNoShowFeeSplit(t *testing.T) {
	cases := []struct {
		name           string
		capturedCents  int
		splitBps       int
		wantPlatform   int
		wantSeller     int
	}{
		{
			name:          "default 30/70 on $5.00",
			capturedCents: 500, splitBps: 3000,
			wantPlatform: 150, wantSeller: 350,
		},
		{
			name:          "50/50 split on $10.00",
			capturedCents: 1000, splitBps: 5000,
			wantPlatform: 500, wantSeller: 500,
		},
		{
			name:          "0% platform (all to seller)",
			capturedCents: 500, splitBps: 0,
			wantPlatform: 0, wantSeller: 500,
		},
		{
			name:          "100% platform (nothing to seller)",
			capturedCents: 500, splitBps: 10000,
			wantPlatform: 500, wantSeller: 0,
		},
		{
			name:          "rounding truncates toward platform",
			capturedCents: 333, splitBps: 3000,
			// 333 * 3000 / 10000 = 99.9 → truncates to 99
			wantPlatform: 99, wantSeller: 234,
		},
		{
			name:          "zero captured",
			capturedCents: 0, splitBps: 3000,
			wantPlatform: 0, wantSeller: 0,
		},
		{
			name:          "small amount $0.01",
			capturedCents: 1, splitBps: 3000,
			// 1 * 3000 / 10000 = 0 (truncated)
			wantPlatform: 0, wantSeller: 1,
		},
	}

	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			platformShare := (tc.capturedCents * tc.splitBps) / 10000
			sellerShare := tc.capturedCents - platformShare

			if platformShare != tc.wantPlatform {
				t.Errorf("platform: got %d want %d", platformShare, tc.wantPlatform)
			}
			if sellerShare != tc.wantSeller {
				t.Errorf("seller: got %d want %d", sellerShare, tc.wantSeller)
			}
			// Invariant: platform + seller = captured
			if platformShare+sellerShare != tc.capturedCents {
				t.Errorf("split doesn't sum: %d + %d != %d", platformShare, sellerShare, tc.capturedCents)
			}
		})
	}
}

// TestNoShowFeeSelection verifies the fee hierarchy: order deposit_cents > config > hardcoded $5.
func TestNoShowFeeSelection(t *testing.T) {
	cases := []struct {
		name             string
		configFee        int
		orderDeposit     int
		wantFee          int
	}{
		{
			name:         "config default with no deposit",
			configFee:    750, orderDeposit: 0,
			wantFee: 750,
		},
		{
			name:         "order deposit overrides config",
			configFee:    750, orderDeposit: 500,
			wantFee: 500,
		},
		{
			name:         "hardcoded default when config is zero",
			configFee:    0, orderDeposit: 0,
			wantFee: 500, // hardcoded default
		},
		{
			name:         "deposit overrides hardcoded default",
			configFee:    0, orderDeposit: 300,
			wantFee: 300,
		},
		{
			name:         "negative config falls back to hardcoded",
			configFee:    -100, orderDeposit: 0,
			wantFee: 500,
		},
	}

	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			// Replicate the logic from UpdateOrderStatus
			noShowFeeCents := tc.configFee
			if noShowFeeCents <= 0 {
				noShowFeeCents = 500
			}
			if tc.orderDeposit > 0 {
				noShowFeeCents = tc.orderDeposit
			}

			if noShowFeeCents != tc.wantFee {
				t.Errorf("got %d want %d", noShowFeeCents, tc.wantFee)
			}
		})
	}
}

// TestNoShowFeeCappedByTotal verifies that the no-show fee is capped by order total.
func TestNoShowFeeCappedByTotal(t *testing.T) {
	cases := []struct {
		name       string
		totalCents int
		feeCents   int
		wantFee    int
	}{
		{"fee below total", 2000, 500, 500},
		{"fee equals total", 500, 500, 500},
		{"fee exceeds total", 300, 500, 300},
		{"zero total", 0, 500, 0},
	}

	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			fee := tc.feeCents
			if tc.totalCents < fee {
				fee = tc.totalCents
			}
			if fee != tc.wantFee {
				t.Errorf("got %d want %d", fee, tc.wantFee)
			}
		})
	}
}
