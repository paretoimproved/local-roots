# LocalRoots (Marketplace Reboot)

LocalRoots is a produce/food marketplace for local pickup.

## MVP rules (to keep this shippable)

- Pickup only. Sellers define `date + time window + location`.
- One order is restricted to one seller and one pickup window.
- Seller is responsible for fulfillment; buyers can review only after fulfillment.

## Repo layout

- `frontend/`: Next.js + TypeScript (Vercel)
- `backend/`: Go API (Railway) + Postgres
- `legacy/ts-stack/`: prior TypeScript prototype preserved for reference

## Local dev

Frontend:

```sh
pnpm dev
```

Database (optional, for backend endpoints/migrations):

```sh
docker compose up -d
export DATABASE_URL="postgres://localroots:localroots@localhost:5432/localroots?sslmode=disable"
pnpm migrate:up
pnpm seed
```

Backend (requires Go 1.24+ installed):

```sh
pnpm dev:backend
```

## Next milestones

- Schema + order state machine (pickup-window centric)
- Stripe Connect (Express) onboarding + checkout + webhook idempotency
- Seller fulfillment UI + post-fulfillment reviews

