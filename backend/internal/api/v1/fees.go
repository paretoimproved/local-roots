package v1

// computeBuyerFee calculates the buyer service fee and total from a subtotal,
// a percentage component (basis points), and a flat-cents component.
// All inputs are clamped to zero so the result is never negative.
func computeBuyerFee(subtotalCents, bps, flatCts int) (feeCents, totalCents int) {
	if subtotalCents < 0 {
		subtotalCents = 0
	}
	if bps < 0 {
		bps = 0
	}
	if flatCts < 0 {
		flatCts = 0
	}
	fee := (subtotalCents * bps) / 10000
	fee += flatCts
	if fee < 0 {
		fee = 0
	}
	total := subtotalCents + fee
	if total < 0 {
		total = 0
	}
	return fee, total
}
