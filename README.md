# LocalRoots (Marketplace Reboot)


## Screenshots

![Local Roots](docs/screenshots/app-preview.png)


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

## Current status

Core marketplace is live: subscription plans, Stripe checkout + Connect payouts, pickup
fulfillment with QR codes, buyer reviews, and seller analytics dashboard.

Recent additions (v0.8.0):
- Seller analytics (subscribers, revenue, pickup rate, retention, top products)
- Growth crons (re-engagement, review prompts, milestones, weekly digest)
- SEO (city landing pages, sitemap, OG images, JSON-LD)
- Payout hardening (transfer retry with error tracking)
- Waitlist email capture
