# Technical Roadmap (High level)

## Phase 1: Foundations

- Backend Go service skeleton + `/health`
- Postgres + migrations + schema v1
- Public browse endpoints (stores/windows/offerings)

## Phase 2: Transaction core

- Create orders (one store + pickup window)
- Inventory reservation / decrement (no oversell)

## Phase 3: Payments

- Stripe Connect Express onboarding
- Checkout + webhook-driven `PAID` transitions
- Webhook idempotency + payout release policy

## Phase 4: Fulfillment + trust

- Seller marks `READY_FOR_PICKUP` / `FULFILLED`
- Post-fulfillment reviews
