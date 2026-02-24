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

- `payment_method` is `card` (all orders require card payment).
- `payment_status` tracks payment lifecycle (`unpaid`/`authorized`/`paid`/`refunded`), driven by Stripe.

Rules:

- Order items cannot change after pickup is finalized (`picked_up`).
- Reviews only allowed for completed orders (`picked_up`).
- Offering quantity must not oversell under concurrency.
