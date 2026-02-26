# CODEX.md (repo guidance)

This file provides guidance to Codex and Claude Code when working in this repository.
The filename remains `CLAUDE.md` for compatibility with existing tooling.

## Overview

LocalRoots is a local pickup marketplace.

This repo is a small monorepo with:

- `frontend/`: Next.js (App Router) + TypeScript, deployed on Vercel
- `backend/`: Go HTTP API + PostgreSQL, deployed as a small service (e.g. Railway)
- `docs/`: lightweight product + API notes
- `legacy/ts-stack/`: prior TypeScript prototype (reference only)

## Commands (from repo root)

- `pnpm dev`: run frontend dev server
- `pnpm build`: build frontend
- `pnpm lint`: lint frontend
- `pnpm typecheck`: TypeScript typecheck (frontend)
- `pnpm dev:backend`: run Go API locally
- `pnpm db:up` / `pnpm db:down`: start/stop local Postgres via Docker
- `pnpm migrate:up` / `pnpm migrate:status`: run/check DB migrations
- `pnpm seed`: seed demo data

Backend-only equivalents:

- `cd backend && go run ./cmd/api`
- `cd backend && go run ./cmd/migrate up`
- `cd backend && go run ./cmd/seed`

## Local Dev Setup

Frontend:

- Start with `pnpm dev` and open `http://localhost:3000`.

Backend + DB:

- `pnpm db:up`
- `export DATABASE_URL="postgres://localroots:localroots@localhost:5432/localroots?sslmode=disable"`
- `pnpm migrate:up`
- `pnpm seed`
- `pnpm dev:backend` (defaults to `:8080`)

## Environment Variables

Backend (`backend/`):

- `DATABASE_URL`: Postgres connection string
- `JWT_SECRET`: required for auth endpoints
- `CORS_ALLOW_ORIGINS`: comma-separated explicit allowlist (required in `ENV=prod`)
- `FRONTEND_URL`: frontend origin for email links and Connect redirect URLs
- `GOOGLE_PLACES_API_KEY`: required for seller geo endpoints and public autocomplete
- `GOOGLE_OAUTH_CLIENT_ID`: required for Google Sign-In (buyer + seller)
- `STRIPE_SECRET_KEY`: Stripe API secret key
- `STRIPE_WEBHOOK_SECRET`: required for `/v1/stripe/webhook`
- `RESEND_API_KEY`: required for transactional email (magic links, reminders)
- `EMAIL_FROM`: sender address for transactional email
- `INTERNAL_CRON_SECRET`: protects internal cron endpoints (billing, reminders)
- `BUYER_FEE_BPS`: buyer service fee in basis points (optional, default `0`)
- `BUYER_FEE_FLAT_CENTS`: buyer flat fee in cents (optional, default `0`)
- `NO_SHOW_FEE_CENTS`: no-show penalty in cents (optional, default `500`)
- `NO_SHOW_PLATFORM_SPLIT_BPS`: platform share of no-show fee in bps (optional)
- `ADDR`: listen address (default `:8080`)
- `ENV`: `dev` (default) or `prod`

Frontend (`frontend/`):

- `NEXT_PUBLIC_API_BASE_URL`: defaults to `http://localhost:8080`
- `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`: Stripe publishable key (required for checkout + Connect onboarding)
- `NEXT_PUBLIC_SUPABASE_URL`: Supabase project URL (required for photo uploads)
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`: Supabase public anon key (required for photo uploads)

## CORS Policy

- In `ENV=prod`, the backend only enables browser CORS for origins explicitly listed in `CORS_ALLOW_ORIGINS`.
- In non-prod, localhost `:3000` and `https://*.vercel.app` are allowed for convenience.

## Deployment Notes

- Vercel is configured with `rootDirectory = frontend` (see `.vercel/project.json`).
- The Go backend can be built via the repo root `Dockerfile` or `backend/Dockerfile`.

## Migrations

- Uses [goose](https://github.com/pressly/goose). Files live in `backend/migrations/`.
- Annotations **must** be `-- +goose Up` / `-- +goose Down` (case-sensitive). Do **not** use `-- +migrate up/down`.

## Testing / Verification

- Frontend: `pnpm lint` and `pnpm typecheck`
- Backend: `cd backend && go test ./...`
- Always run frontend verification (`pnpm typecheck && pnpm lint`) after any frontend change
- Always run `go test ./...` after any backend change
- New features require tests. Bug fixes require a regression test that would have caught the bug.
- Tests mock all external services (Stripe, Resend, Google APIs). Never make real API calls in tests.

---

## Session Protocol

### Start of Session
1. Check `git status` and `git log --oneline -5` — know what changed recently
2. If backend changed recently, run `cd backend && go test ./...` — confirm baseline is green
3. If frontend changed recently, run `pnpm typecheck && pnpm lint`

### End of Session
1. Run `pnpm typecheck && pnpm lint` (frontend) and/or `cd backend && go test ./...` (backend) — verify nothing is broken
2. Commit or stash any in-progress work — never leave a dirty working tree
3. If corrections were made by the user, add to Common Mistakes table below

---

## Common Mistakes

> **Living document**: After ANY correction from the user, add the mistake here to prevent recurrence.

| Date | Mistake | Fix |
|------|---------|-----|
| 2026-02 | Used `-- +migrate up/down` in migration | Must be `-- +goose Up` / `-- +goose Down` (case-sensitive) |
| 2026-02 | Forgot `await params` in Next.js server components | Next.js 15+ requires `await params` in server components |
| 2026-02 | Omitted `payment_method` from walk-up order creation | `CreateOrderInput` requires `payment_method: "card"` — backend rejects without it |

---

## Constraints — Things to Never Do

- **Never hardcode API keys or secrets** — all via environment variables
- **Never modify the database schema** without creating a goose migration
- **Never use `-- +migrate`** — goose requires `-- +goose Up` / `-- +goose Down`
- **Never add a dependency without checking** if an existing one already handles it
- **Never commit `.env`** — it's gitignored for a reason
- **Never add seller fees** — zero-cost-to-farmer is the core differentiator
- **Never skip verification** — run typecheck + lint (frontend) and go test (backend) before marking work complete

---

## Key Conventions

- **Seller pages**: use `useParams()` (client components)
- **Buyer browse pages**: use `await params` (server components)
- **Error handling**: use `parseApiError` / `mapApiError` from `lib/ui.ts`
- **Toast notifications**: use `useToast()` hook (top-right, 4s dismiss)
- **Payments**: Stripe card-only — no pay-at-pickup
- **Auth**: JWT — seller (email/password + Google OAuth), buyer (magic link + Google OAuth)
- **Order creation**: `CreateOrderInput` requires `payment_method: "card"` — backend validates this field
- **Fee breakdown**: checkout forms (walk-up and subscription) show subtotal / service fee / total. Before Stripe loads: fee = "Calculated at checkout", total = "$X + fee". After: exact amounts. Reference: `subscribe-form.tsx`
- **Checkout button pattern**: after checkout starts, primary button becomes disabled "Complete payment below" and `AuthorizeCard` renders below it (not instead of it)
- **Buyer-facing order links**: include `?t=` auth token for shareability (e.g. `/orders/${id}?t=${token}`)
- **Card hover effect**: `transition hover:-translate-y-0.5 hover:shadow-[0_22px_60px_rgba(38,28,10,0.14)]` — standard lift for clickable cards
- **Pickup confirmation**: QR encodes a URL (`/pickup/confirm?order=...&code=...`) — seller scans with native phone camera, not in-browser scanner. Manual code entry available on seller dashboard for both placed and ready orders
- **Seller login redirect**: `?next=/path` query param returns user to that path after login (sanitized to paths starting with `/`)

---

## Workflow

### Plan First
- Enter plan mode for ANY non-trivial task (3+ steps or architectural decisions)
- If something goes sideways, STOP and re-plan — don't keep pushing

### Verification Before Done
- Never mark a task complete without proving it works
- Run tests, check types, demonstrate correctness

### Autonomous Bug Fixing
- When given a bug report: investigate and fix it. Don't ask for hand-holding.
- Point at logs, errors, failing tests — then resolve them

### When Stuck
- Don't brute force. If an approach isn't working after 2 attempts, step back and reconsider.
- Read the actual error message. Read the actual code. Don't guess.
- If blocked by something outside your control, say so clearly and suggest alternatives.

