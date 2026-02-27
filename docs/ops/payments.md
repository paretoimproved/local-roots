# Payments (MVP)

Local Roots uses Stripe card payments with a "capture on pickup confirmation" model.

## Key Behavior

- Buyer subscribes to a seller's box:
  - If the next pickup is within ~7 days, we create a `PaymentIntent` with `capture_method=manual` and authorize immediately.
  - If the pickup is further out, we collect a card via `SetupIntent` and authorize closer to pickup.
- Seller fulfillment:
  - Seller marks order `ready`.
  - Seller confirms pickup with a 6-digit pickup code (QR-assisted). On confirmation, we capture the authorization.
- No-show:
  - If seller marks an order `no_show`, the card authorization is voided (no additional fee). The buyer forfeits the box.
  - The backend supports a configurable `NO_SHOW_FEE_CENTS` (default `500`), but current policy sets this to `0`.

## Stripe Connect (Seller Payouts)

Sellers onboard via Stripe Connect Express. The flow:

1. Seller hits "Connect your bank account" in the setup wizard.
2. Backend creates an Express account via `CreateConnectAccount`, pre-filling:
   - Business name (from store name)
   - Owner first/last name (from user display_name)
   - Business address (from first pickup location, if any)
3. Backend creates an Account Session via `CreateAccountSession`.
4. Frontend renders the embedded `<ConnectAccountOnboarding>` component inline (no popup, no redirect).
5. On completion, frontend re-checks status via `GET /connect/status`.
6. Once `charges_enabled && payouts_enabled`, status is `active` and the seller can go live.

Key endpoints:
- `POST /v1/seller/stores/{storeId}/connect/onboard` — create Connect account + account link (backwards compat)
- `POST /v1/seller/stores/{storeId}/connect/account-session` — create Account Session for embedded components
- `GET /v1/seller/stores/{storeId}/connect/status` — fetch + sync account status from Stripe
- `POST /v1/seller/stores/{storeId}/connect/refresh-link` — generate fresh onboarding link (legacy)

## Environment Variables (Backend)

- `STRIPE_SECRET_KEY`
- `STRIPE_WEBHOOK_SECRET` (required to enable `/v1/stripe/webhook`)
- `INTERNAL_CRON_SECRET` (protects internal HTTP endpoints for manual triggers — optional, billing runs in-process in prod)
- `NO_SHOW_FEE_CENTS` (optional, default `500` — set to `0` per current no-fee policy)
- `NO_SHOW_PLATFORM_SPLIT_BPS` (platform share of no-show fee, optional — unused when fee is `0`)
- `BUYER_FEE_BPS` / `BUYER_FEE_FLAT_CENTS` (buyer service fee, optional)

Frontend:
- `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` (required for Stripe Elements + Connect.js)

## Billing Authorization (In-Process Cron)

Billing authorization runs as an in-process goroutine inside the Go API (`internal/scheduler`).
In production (`ENV=prod`), the scheduler starts automatically and runs billing every 30 minutes.

The HTTP endpoint (`POST /v1/internal/billing/authorize-pending`) remains available for manual
triggers and debugging, gated behind `INTERNAL_CRON_SECRET`.

## Webhook

Endpoint: `POST /v1/stripe/webhook`

We use the webhook to synchronize `orders.payment_status` and `orders.captured_cents` from Stripe events.

## Local Testing (Stripe CLI)

1. Run backend locally and expose it on `localhost:8080`.
2. Forward events:
   - `stripe listen --forward-to localhost:8080/v1/stripe/webhook`
3. Use the printed signing secret as `STRIPE_WEBHOOK_SECRET`.

