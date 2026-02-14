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
- Payment + Refund (Stripe references)
- Review (1 per order, only after fulfillment)

## Order state machine

- `PENDING_PAYMENT` -> `PAID`
- `PAID` -> `READY_FOR_PICKUP` -> `FULFILLED`
- `PAID` -> `CANCELED` (only before `cutoff_at`, unless admin)
- `CANCELED` -> `REFUNDED` (if captured)

Rules:

- Order items cannot change after `PAID`.
- Reviews only allowed for `FULFILLED` orders.
- Offering quantity must not oversell under concurrency.
