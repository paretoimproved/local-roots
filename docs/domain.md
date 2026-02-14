# Domain Model (MVP)

## Wedge

- Produce/food only
- Local pickup only
- Seller chooses pickup date/time/location + order cutoff
- One order is limited to one seller and one pickup window

## Core entities

- User
- Store (seller storefront)
- PickupLocation (address + timezone)
- PickupWindow (start/end + cutoff + location)
- Product (canonical item)
- Offering (product inventory scoped to a pickup window)
- Order + OrderItem (snapshots of offerings at time of purchase)
- Payment + Refund (future; Stripe references)
- Review (1 per order, only after fulfillment)

## Order state machine

Current implementation (Go backend + Postgres) uses:

- `placed` -> `ready` -> `picked_up`
- `placed` -> `canceled`
- `ready` -> `no_show`

Notes:

- `payment_method` is currently `pay_at_pickup`.
- `payment_status` exists (`unpaid`/`paid`/`refunded`) but is currently not driven by Stripe.

Planned payments mapping (Phase 3):

- Keep fulfillment-oriented `status` values (`placed`/`ready`/`picked_up`/etc).
- Drive online payments via `payment_method = stripe` and `payment_status` transitions (webhook-driven).

Rules:

- Order items cannot change after pickup is finalized (`picked_up`).
- Reviews only allowed for completed orders (`picked_up`).
- Offering quantity must not oversell under concurrency.
