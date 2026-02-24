# CODEX.md (repo guidance)

This file provides guidance to Codex and Claude Code when working in this repository.
The filename remains `CLAUDE.md` for tooling compatibility.

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

