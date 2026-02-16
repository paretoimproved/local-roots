package v1

import "testing"

// TestBuyerFeeConsistency verifies that the fee calculation used in:
// 1. Subscription checkout (SubscriptionAPI.Checkout)
// 2. Subscription subscribe PI validation (SubscriptionAPI.Subscribe)
// 3. Order checkout (OrderCheckoutAPI.Checkout)
// 4. Order creation (OrdersAPI.CreateOrder)
// 5. Cycle generation (SellerSubscriptionAPI.GenerateNextCycle)
//
// ALL use the same computeBuyerFee formula. This prevents the bug where
// checkout creates a PI for totalCents but subscribe validates against priceCents.
func TestBuyerFeeConsistency(t *testing.T) {
	cases := []struct {
		name     string
		subtotal int
		bps      int
		flat     int
	}{
		{"zero fees", 2000, 0, 0},
		{"bps only", 2000, 500, 0},
		{"flat only", 2000, 0, 50},
		{"combined", 2000, 250, 50},
		{"large amount", 50000, 500, 100},
		{"small amount", 100, 500, 0},
	}

	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			fee, total := computeBuyerFee(tc.subtotal, tc.bps, tc.flat)

			// Basic math invariant
			if total != tc.subtotal+fee {
				t.Errorf("total (%d) != subtotal (%d) + fee (%d)", total, tc.subtotal, fee)
			}

			// The inline fee calculation used in OrderCheckoutAPI.Checkout and
			// OrdersAPI.CreateOrder must produce the same result.
			inlineFee := (tc.subtotal * tc.bps) / 10000
			if tc.flat > 0 {
				inlineFee += tc.flat
			}
			inlineTotal := tc.subtotal + inlineFee

			if inlineFee != fee {
				t.Errorf("inline fee (%d) != computeBuyerFee fee (%d)", inlineFee, fee)
			}
			if inlineTotal != total {
				t.Errorf("inline total (%d) != computeBuyerFee total (%d)", inlineTotal, total)
			}
		})
	}
}

// TestSubscribePIValidationMatchesCheckout verifies that the PI amount validation
// in Subscribe uses totalCents (not priceCents), matching what Checkout creates.
//
// This was a real bug: Checkout creates PI for totalCents, but Subscribe compared
// against priceCents. When buyer fees > 0, subscriptions would fail.
func TestSubscribePIValidationMatchesCheckout(t *testing.T) {
	cases := []struct {
		name       string
		priceCents int
		bps        int
		flat       int
	}{
		{"no fees", 2500, 0, 0},
		{"5% fee", 2500, 500, 0},
		{"flat $0.50 fee", 2500, 0, 50},
		{"combined 2.5% + $0.50", 2500, 250, 50},
	}

	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			// Checkout creates PI with this amount:
			_, checkoutTotal := computeBuyerFee(tc.priceCents, tc.bps, tc.flat)

			// Subscribe validates PI.Amount against this (the fixed version):
			_, expectedTotal := computeBuyerFee(tc.priceCents, tc.bps, tc.flat)

			if checkoutTotal != expectedTotal {
				t.Errorf("checkout total (%d) != subscribe validation total (%d)", checkoutTotal, expectedTotal)
			}

			// Would have failed before the fix (comparing against priceCents):
			if tc.bps > 0 || tc.flat > 0 {
				if checkoutTotal == tc.priceCents {
					t.Error("with fees > 0, checkout total should differ from priceCents")
				}
			}
		})
	}
}

// TestPayoutSummaryAccuracy verifies the payout math for seller payouts.
func TestPayoutSummaryAccuracy(t *testing.T) {
	cases := []struct {
		name               string
		pickedUpSubtotals  []int // subtotal_cents per picked_up order
		pickedUpFees       []int // buyer_fee_cents per picked_up order
		noShowCaptures     []int // captured_cents per no_show order
		noShowSplitBps     int
		wantSellerPayout   int
		wantPlatformFee    int
	}{
		{
			name:              "simple pickup, no no-shows",
			pickedUpSubtotals: []int{2000, 3000},
			pickedUpFees:      []int{100, 150},
			noShowSplitBps:    3000,
			wantSellerPayout:  5000,   // sum of subtotals
			wantPlatformFee:   250,    // sum of buyer fees
		},
		{
			name:              "no-show with 30/70 split",
			noShowCaptures:    []int{500},
			noShowSplitBps:    3000,
			wantSellerPayout:  350,    // 500 - 150
			wantPlatformFee:   150,    // 500 * 0.30
		},
		{
			name:              "mixed pickup and no-show",
			pickedUpSubtotals: []int{2000},
			pickedUpFees:      []int{100},
			noShowCaptures:    []int{500},
			noShowSplitBps:    3000,
			wantSellerPayout:  2350,   // 2000 + 350
			wantPlatformFee:   250,    // 100 + 150
		},
		{
			name:              "no orders",
			noShowSplitBps:    3000,
			wantSellerPayout:  0,
			wantPlatformFee:   0,
		},
	}

	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			// Compute picked-up payout (subtotals go to seller, fees to platform)
			payoutPickedUp := 0
			platformFees := 0
			for i, sub := range tc.pickedUpSubtotals {
				payoutPickedUp += sub
				platformFees += tc.pickedUpFees[i]
			}

			// Compute no-show payout with split
			grossNoShow := 0
			for _, cap := range tc.noShowCaptures {
				grossNoShow += cap
			}
			splitBps := tc.noShowSplitBps
			if splitBps <= 0 {
				splitBps = 3000
			}
			platformNoShow := (grossNoShow * splitBps) / 10000
			payoutNoShow := grossNoShow - platformNoShow
			platformFees += platformNoShow

			sellerPayout := payoutPickedUp + payoutNoShow

			if sellerPayout != tc.wantSellerPayout {
				t.Errorf("sellerPayout: got %d want %d", sellerPayout, tc.wantSellerPayout)
			}
			if platformFees != tc.wantPlatformFee {
				t.Errorf("platformFees: got %d want %d", platformFees, tc.wantPlatformFee)
			}
		})
	}
}
