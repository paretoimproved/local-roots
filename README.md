# Local Roots — Community-Supported Agriculture Marketplace

Local Roots is a full-stack marketplace that connects local farms with community members through CSA (Community-Supported Agriculture) subscriptions. Buyers browse nearby farms, subscribe to weekly produce pickups, and pay seamlessly through Stripe. Sellers manage their storefronts, fulfill orders at scheduled pickup windows, and track business growth through a built-in analytics dashboard. The backend is a Go API backed by PostgreSQL; the frontend is a Next.js/TypeScript app.

## Features

- **Subscription management** — buyers subscribe to farms and receive recurring produce boxes on a flexible schedule
- **Pickup scheduling** — sellers define date, time window, and location; buyers confirm and check in via QR code
- **Seller onboarding with Stripe Connect** — full payout flow including transfer retry and error tracking
- **Buyer magic-link auth & Google OAuth** — passwordless sign-in for low-friction onboarding
- **Order lifecycle** — creation, payment, fulfillment, and post-pickup review flow
- **Real-time notifications** — re-engagement emails, review prompts, milestone alerts, and weekly digests
- **Admin dashboard** — manage users, orders, and platform health at a glance
- **Seller analytics** — subscribers, revenue, pickup rate, retention, and top-product breakdowns
- **SEO** — city landing pages, dynamic sitemap, Open Graph images, and JSON-LD structured data

## Tech Stack

| Layer       | Technology                        |
|-------------|-----------------------------------|
| Backend API | Go 1.24+                          |
| Frontend    | Next.js / TypeScript              |
| Database    | PostgreSQL 16                     |
| Payments    | Stripe Connect                    |
| E2E Tests   | Playwright                        |
| Infra       | Docker, Railway (API), Vercel (UI)|

## Architecture

The project follows a clean frontend/backend split. The Go API (`backend/`) owns all business logic, database access, and Stripe integration, exposing a RESTful JSON API. The Next.js app (`frontend/`) consumes that API and handles SSR, routing, and client-side state. The two services communicate exclusively over HTTP, making them independently deployable.

## Getting Started

**Prerequisites:** Node.js 20+, pnpm, Go 1.24+, Docker

1. **Start the database:**

```sh
docker compose up -d
```

2. **Run migrations and seed data:**

```sh
export DATABASE_URL="postgres://localroots:localroots@localhost:5432/localroots?sslmode=disable"
pnpm migrate:up
pnpm seed
```

3. **Start the backend API:**

```sh
pnpm dev:backend
```

4. **Start the frontend (in a second terminal):**

```sh
pnpm dev
```

The frontend runs on `localhost:3000` and proxies API requests to the Go backend.

## Testing

End-to-end tests are written with Playwright and cover critical user flows (buyer sign-up, subscription checkout, pickup fulfillment, seller onboarding).

```sh
# Run all e2e tests headlessly
pnpm e2e

# Run with the Playwright UI for debugging
pnpm e2e:ui
```

Integration tests for the backend:

```sh
pnpm test:integration
```

## License

See [LICENSE](LICENSE).
