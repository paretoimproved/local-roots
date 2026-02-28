# Cancellation & Refund Policy — Internal Reference

Last updated: February 2026

---

## Cancellation Rules

| Timing | Subscription | One-Time Order |
|--------|-------------|----------------|
| Before cutoff | Cancel/pause freely — upcoming cycle not charged | Authorization voided in full |
| After cutoff | Current cycle non-refundable; future cycles stop | Non-refundable — box is prepared |

**Cutoff** = the pickup-window cutoff time set by the seller (typically 24-48 hours before the window opens).

- Buyers can cancel, pause, or resume subscriptions at any time via their dashboard.
- "Pause" stops future cycles but does not refund the current one (if past cutoff).
- "Resume" reactivates starting from the next available cycle.

---

## No-Show Handling

**Current behavior:** If a buyer doesn't pick up, the order stays in `ready` status until the pickup window closes. The seller can mark it as a no-show.

- **No additional fee** is charged to the buyer beyond forfeiting the box.
- The card authorization for that cycle is captured normally (the seller prepared the food).
- What happens to the unclaimed box is at the seller's discretion (donate, sell walk-up, compost).

**Rationale:** A separate no-show fee adds friction and support burden disproportionate to the revenue it generates at our scale. The forfeited box is itself the consequence. We can revisit a no-show fee once volume justifies the operational overhead.

> Note: `NO_SHOW_FEE_CENTS` env var exists in backend config (default `500`) but is effectively unused in the current flow. If we reintroduce a no-show fee, this is where it lives.

---

## Refund Scenarios

| Scenario | Who initiates | Buyer outcome | Seller outcome | Platform absorbs |
|----------|--------------|---------------|----------------|-----------------|
| Buyer cancels before cutoff | Buyer | Full void | No payout | Nothing |
| Buyer cancels after cutoff | Buyer | Non-refundable | Full payout (full subtotal) | Nothing |
| Buyer no-show | — | Box forfeited, charged normally | Full payout (full subtotal) | Nothing |
| Seller cancels order | Seller | Full refund | No payout | Stripe refund fees (~$0.25) |
| Quality dispute (post-pickup) | Buyer | Case-by-case | Case-by-case | Potential partial refund |
| Fraudulent charge | Buyer's bank | Chargeback | See below | Stripe chargeback fee ($15) |

---

## Chargeback Mitigation Checklist

1. **Clear descriptor** — Stripe charge descriptor should read "LOCALROOTS *{StoreName}" so buyers recognize the charge.
2. **Pre-auth email** — Buyer receives a pickup reminder email 24h before the window with the charge amount.
3. **Confirmation receipt** — On pickup confirmation, buyer gets an email with the final captured amount.
4. **Cancel before cutoff** — Make the cancel/pause flow prominent and easy. The retention interstitial offers pause first, reducing involuntary churn that leads to chargebacks.
5. **Respond fast** — Stripe disputes have a ~7-day response window. Include: order details, pickup confirmation timestamp, buyer email confirmation.
6. **Refund proactively** — If a buyer complains before filing a dispute, refund immediately. A $15 chargeback fee is worse than a $25 refund.

---

## Cost Allocation

| Fee type | Buyer pays | Seller pays | Platform pays |
|----------|-----------|-------------|---------------|
| Box price | Yes (at checkout) | — | — |
| 7% + $0.35 service fee | Yes (added to total) | **Nothing** | Receives this |
| Stripe processing (~2.9% + $0.30) | — | — | Deducted from platform revenue |
| Stripe refund fee (~$0.25) | — | — | Yes (on seller-initiated cancel) |
| Chargeback fee ($15) | — | — | Yes |
| No-show penalty | None (box forfeited) | Keeps payout | Nothing |

**Key principle:** Sellers never pay platform fees. The buyer service fee (7% + $0.35) is the sole revenue line. Stripe processing is absorbed by the platform out of that fee — seller receives full subtotal via Stripe transfer.

---

## Implementation Notes

- `buyerApi.updateSubscriptionStatus()` accepts `"active" | "paused" | "canceled"`.
- Frontend cancel flow: 2-step interstitial (pause offer → exit survey) before calling `setStatus("canceled")`.
- Exit survey reason is logged to `console.log` at MVP. Future: send to analytics or a `cancellation_reasons` table.
- Subscription status transitions: `active ↔ paused`, `active → canceled`, `paused → canceled`, `paused → active`. There is no `canceled → active` (buyer must re-subscribe).
