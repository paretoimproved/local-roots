# API (MVP)

Base URL (local): `http://localhost:8080`

## Health

- `GET /health`

## Public browse

- `GET /v1/stores`
- `GET /v1/stores/{storeId}`
- `GET /v1/stores/{storeId}/pickup-windows?status=published&from=...`
- `GET /v1/pickup-windows/{pickupWindowId}`
- `GET /v1/pickup-windows/{pickupWindowId}/offerings`
- `GET /v1/stores/{storeId}/reviews`
- `GET /v1/stores/{storeId}/subscription-plans`
- `GET /v1/subscription-plans/{planId}`

## Checkout

- `POST /v1/pickup-windows/{pickupWindowId}/orders` — create walk-up order
- `POST /v1/pickup-windows/{pickupWindowId}/checkout` — start card checkout
- `POST /v1/subscription-plans/{planId}/checkout` — start subscription checkout
- `POST /v1/subscription-plans/{planId}/subscribe` — subscribe

## Buyer orders

- `GET /v1/orders/{orderId}` — get order (token-authed via `?t=`)
- `POST /v1/orders/{orderId}/review` — leave review

## Buyer subscriptions

- `GET /v1/subscriptions/{subscriptionId}`
- `POST /v1/subscriptions/{subscriptionId}/status`
- `POST /v1/subscriptions/{subscriptionId}/payment-method/setup`
- `POST /v1/subscriptions/{subscriptionId}/payment-method/confirm`

## Buyer auth

- `POST /v1/buyer/auth/magic-link` — send magic link email
- `POST /v1/buyer/auth/verify` — verify magic link token
- `GET /v1/buyer/me` — get current buyer (JWT)
- `GET /v1/buyer/orders` — list buyer orders (JWT)
- `GET /v1/buyer/subscriptions` — list buyer subscriptions (JWT)

## Seller auth

- `POST /v1/auth/register`
- `POST /v1/auth/login`
- `POST /v1/auth/google` — Google OAuth

## Seller stores

- `GET /v1/seller/stores` — list my stores (JWT)
- `POST /v1/seller/stores` — create store (JWT)
- `PATCH /v1/seller/stores/{storeId}` — update store (JWT + owner)

## Seller pickup locations

- `GET /v1/seller/stores/{storeId}/pickup-locations`
- `POST /v1/seller/stores/{storeId}/pickup-locations`
- `PATCH /v1/seller/stores/{storeId}/pickup-locations/{id}`
- `DELETE /v1/seller/stores/{storeId}/pickup-locations/{id}`

## Seller pickup windows

- `GET /v1/seller/stores/{storeId}/pickup-windows`
- `POST /v1/seller/stores/{storeId}/pickup-windows`

## Seller products & offerings

- `GET /v1/seller/stores/{storeId}/products`
- `POST /v1/seller/stores/{storeId}/products`
- `GET /v1/seller/stores/{storeId}/pickup-windows/{windowId}/offerings`
- `POST /v1/seller/stores/{storeId}/pickup-windows/{windowId}/offerings`

## Seller orders

- `GET /v1/seller/stores/{storeId}/pickup-windows/{windowId}/orders`
- `POST /v1/seller/stores/{storeId}/orders/{orderId}/status`
- `POST /v1/seller/stores/{storeId}/orders/{orderId}/confirm-pickup`

## Seller pickup confirmation (QR-URL flow)

- `GET /v1/seller/pickup/preview?order={orderId}&code={pickupCode}` — preview order for pickup (JWT, no storeId in path)
- `POST /v1/seller/pickup/confirm` — confirm pickup + capture payment (JWT, body: `{order_id, pickup_code}`)

## Seller payouts

- `GET /v1/seller/stores/{storeId}/pickup-windows/{windowId}/payout-summary`

## Seller subscription plans

- `GET /v1/seller/stores/{storeId}/subscription-plans`
- `POST /v1/seller/stores/{storeId}/subscription-plans`
- `PATCH /v1/seller/stores/{storeId}/subscription-plans/{planId}`
- `POST /v1/seller/stores/{storeId}/subscription-plans/{planId}/generate-cycle`

## Seller Stripe Connect

- `POST /v1/seller/stores/{storeId}/connect/onboard`
- `GET /v1/seller/stores/{storeId}/connect/status`
- `POST /v1/seller/stores/{storeId}/connect/refresh-link`
- `POST /v1/seller/stores/{storeId}/connect/account-session`

## Geo

- `GET /v1/places/autocomplete` — public autocomplete
- `GET /v1/geocode` — public geocode
- `POST /v1/seller/geo/places/autocomplete` — seller autocomplete (JWT)
- `POST /v1/seller/geo/places/details` — seller place details (JWT)
- `POST /v1/seller/geo/timezone` — seller timezone lookup (JWT)

## Stripe webhook

- `POST /v1/stripe/webhook`

## Internal (cron, requires secret)

- `POST /v1/internal/billing/authorize-pending`
- `POST /v1/internal/email/pickup-reminders`

