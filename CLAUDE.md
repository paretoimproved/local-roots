# CODEX.md (repo guidance)

This file provides guidance to Codex when working in this repository.
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
- `GOOGLE_PLACES_API_KEY`: required for seller geo endpoints
- `ADDR`: listen address (default `:8080`)
- `ENV`: `dev` (default) or `prod`

Frontend (`frontend/`):

- `NEXT_PUBLIC_API_BASE_URL`: defaults to `http://localhost:8080`

## CORS Policy

- In `ENV=prod`, the backend only enables browser CORS for origins explicitly listed in `CORS_ALLOW_ORIGINS`.
- In non-prod, localhost `:3000` and `https://*.vercel.app` are allowed for convenience.

## Deployment Notes

- Vercel is configured with `rootDirectory = frontend` (see `.vercel/project.json`).
- The Go backend can be built via the repo root `Dockerfile` or `backend/Dockerfile`.

## Testing / Verification

- Frontend: `pnpm lint` and `pnpm typecheck`
- Backend: `cd backend && go test ./...`

