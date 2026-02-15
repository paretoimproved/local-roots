# Smoke Test (MVP)

Run this checklist before inviting real sellers/buyers.

## Seller Flow

1. Register + login as seller.
2. Create store.
3. On store setup:
   - Add pickup location using address autocomplete.
   - Create a subscription box.
   - Go live (generate first cycle).
4. Confirm the generated pickup window appears and is selected.
5. Print/scan the farmstand QR to open the buyer page.

## Buyer Flow (Card)

1. Open buyer box page from farmstand QR.
2. Start subscription.
3. Complete Stripe authorization (or setup intent if pickup is > 7 days away).
4. Confirm:
   - Subscription page loads with token.
   - Order page loads with token.

## Fulfillment Flow

1. Seller opens Orders list for the active pickup window.
2. Mark an order `ready`.
3. Confirm pickup with the 6-digit pickup code (manual input or QR scan).
4. Confirm payment status shows `paid`.

## No-Show Flow

1. For a `ready` order, mark `no_show (charge fee)`.
2. Confirm:
   - order status becomes `no_show`
   - payment captured shows a small fee amount on seller + buyer order page
3. Repeat with `no_show (waive)` and confirm payment is voided.

## Failure Modes

- Backend returns 502:
  - Check Railway logs for migration failures and missing env vars.
- Webhook not configured:
  - `/v1/stripe/webhook` will return `503` until `STRIPE_WEBHOOK_SECRET` is set.

