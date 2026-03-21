# CODEX.md (repo guidance)

This file provides guidance to Codex and Claude Code when working in this repository.
The filename remains `CLAUDE.md` for compatibility with existing tooling.

## Overview

LocalRoots is a local pickup marketplace.

This repo is a small monorepo with:

- `frontend/`: Next.js 16 (App Router) + TypeScript, deployed on Vercel
- `backend/`: Go HTTP API + PostgreSQL, deployed on Railway
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
- `INTERNAL_CRON_SECRET`: protects internal cron HTTP endpoints — optional, cron jobs run in-process in prod
- `BUYER_FEE_BPS`: buyer service fee in basis points (optional, default `700` = 7%)
- `BUYER_FEE_FLAT_CENTS`: buyer flat fee in cents (optional, default `35` = $0.35)
- `NO_SHOW_FEE_CENTS`: no-show penalty in cents (optional, default `500` — set to `0` in prod per no-fee policy)
- `NO_SHOW_PLATFORM_SPLIT_BPS`: platform share of no-show fee in bps (optional — unused when fee is `0`)
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

## Deployment

- **Frontend**: Vercel auto-deploys on merge to `main` (`rootDirectory = frontend`, see `.vercel/project.json`)
- **Backend**: Railway auto-deploys from `main`. Run `pnpm migrate:up` on Railway if new migrations are included.

## Migrations

- Uses [goose](https://github.com/pressly/goose). Files live in `backend/migrations/`.
- Annotations **must** be `-- +goose Up` / `-- +goose Down` (case-sensitive). Do **not** use `-- +migrate up/down`.

## Testing / Verification

- Frontend: `pnpm typecheck && pnpm lint`
- Backend: `cd backend && go test ./...`
- Always run verification after changes before marking work complete
- New features require tests. Bug fixes require a regression test.
- Tests mock all external services (Stripe, Resend, Google APIs). Never make real API calls in tests.
- **Email templates**: new templates in `backend/internal/email/templates.go` require corresponding tests in `templates_test.go` — test subject line content, body content, and the `TestTemplatesReturnNonEmpty` table
- **Cron functions**: new cron functions in `backend/internal/api/v1/internal_*.go` require nil-guard tests (nil DB, nil email client)

---

## Constraints — Things to Never Do

- **Never hardcode API keys or secrets** — all via environment variables
- **Never modify the database schema** without creating a goose migration
- **Never add a dependency without checking** if an existing one already handles it
- **Never commit `.env`** — it's gitignored for a reason
- **Never add seller fees** — zero-cost-to-farmer is the core differentiator
- **Never commit to `main`** — always use a feature branch and merge via PR (enforced by hook)

---

## Key Conventions

- **Feature branches**: branch before any work (`git checkout -b phase-N-name` / `fix/name` / `chore/name`). Ship via `/ship`. Sync after merge: `git checkout main && git pull origin main`.
- **Seller pages**: use `useParams()` (client components)
- **Buyer browse pages**: use `await params` (server components — Next.js 16 requires this)
- **`useSearchParams()` pages**: wrap default export in `<Suspense>`, move component body to inner function (required for static generation)
- **Error handling**: use `parseApiError` / `mapApiError` from `lib/ui.ts`
- **Toast notifications**: use `useToast()` hook (top-right, 4s dismiss). `showToast` is unstable — use a ref guard in effects to prevent re-render loops.
- **Auth**: JWT — seller (email/password + Google OAuth), buyer (magic link + Google OAuth). Auth pages (`/login`, `/register`, `/auth/*`) must be excluded from 401 session-expiry redirects.
- **Payments**: Stripe card-only — `CreateOrderInput` requires `payment_method: "card"`
- **Fee breakdown**: checkout forms show subtotal / service fee / total. Before Stripe loads: fee = "Calculated at checkout". Reference: `subscribe-form.tsx`
- **Checkout button pattern**: after checkout starts, primary button becomes disabled "Complete payment below" and `AuthorizeCard` renders below it
- **Buyer-facing order links**: include `?t=` auth token for shareability
- **Card hover effect**: `transition hover:-translate-y-0.5 hover:shadow-[0_22px_60px_rgba(38,28,10,0.14)]`
- **Pickup confirmation**: QR encodes a URL (`/pickup/confirm?order=...&code=...`) — seller scans with phone camera. Manual code entry on seller dashboard for placed and ready orders.
- **Seller login redirect**: `?next=/path` query param returns user to that path after login (sanitized to paths starting with `/`)

---

## Common Mistakes

> After ANY correction from the user, add the mistake here to prevent recurrence.

| Date | Mistake | Fix |
|------|---------|-----|
| 2026-02 | Omitted `payment_method` from walk-up order creation | `CreateOrderInput` requires `payment_method: "card"` |
| 2026-03 | 401 interceptor redirected auth pages to themselves (Google OAuth loop) | Auth pages must be excluded from 401 session-expiry redirects |
| 2026-03 | `showToast` in useEffect deps caused infinite re-render loop | Use a ref guard to fire toast only once |

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
