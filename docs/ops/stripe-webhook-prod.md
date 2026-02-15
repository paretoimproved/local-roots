# Stripe Webhook (Production Setup)

The backend webhook endpoint is:

- `POST https://backend-production-f31a.up.railway.app/v1/stripe/webhook`

It is disabled until `STRIPE_WEBHOOK_SECRET` is set on Railway.

## Recommended: Configure In Stripe Dashboard

1. Open Stripe Dashboard (live mode).
2. Go to **Developers** -> **Webhooks**.
3. Click **Add endpoint**.
4. Set the endpoint URL to:
   - `https://backend-production-f31a.up.railway.app/v1/stripe/webhook`
5. Select these events:
   - `payment_intent.requires_capture`
   - `payment_intent.succeeded`
   - `payment_intent.canceled`
   - `payment_intent.payment_failed`
6. Save the endpoint.
7. Copy the **Signing secret** (starts with `whsec_...`).

## Set Railway Environment Variable

Set `STRIPE_WEBHOOK_SECRET` on the Railway `backend` service (production env) to the signing secret.

Notes:
- Secrets are sensitive; avoid pasting them into chat or committing them.
- The backend supports secret rotation: you can set multiple secrets as a comma-separated list in `STRIPE_WEBHOOK_SECRET`.

## Quick Verification

If `STRIPE_WEBHOOK_SECRET` is set:
- `POST /v1/stripe/webhook` without a valid Stripe signature should return `400 invalid signature` (not `503`).

