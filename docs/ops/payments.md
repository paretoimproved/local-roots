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
  - If seller marks an order `no_show`, we capture a small fee (default `$5`) unless the seller waives.

## Environment Variables (Backend)

- `STRIPE_SECRET_KEY`
- `STRIPE_WEBHOOK_SECRET` (required to enable `/v1/stripe/webhook`)
- `INTERNAL_CRON_SECRET` (protects the internal authorizer endpoint)
- `NO_SHOW_FEE_CENTS` (optional, default `500`)

## Webhook

Endpoint: `POST /v1/stripe/webhook`

We use the webhook to synchronize `orders.payment_status` and `orders.captured_cents` from Stripe events.

## Local Testing (Stripe CLI)

1. Run backend locally and expose it on `localhost:8080`.
2. Forward events:
   - `stripe listen --forward-to localhost:8080/v1/stripe/webhook`
3. Use the printed signing secret as `STRIPE_WEBHOOK_SECRET`.

