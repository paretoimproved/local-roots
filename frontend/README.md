# LocalRoots Frontend

Next.js app for the LocalRoots marketplace.

## Prereqs

- Node 20+ (Vercel uses Node 22.x for this project)
- `pnpm`

## Local Dev

From repo root:

```sh
pnpm dev
```

By default the frontend expects the API at `http://localhost:8080`.

## Environment Variables

- `NEXT_PUBLIC_API_BASE_URL`
  - Example: `http://localhost:8080`
  - Optional (defaults to `http://localhost:8080`)

## Common Workflows

Lint + typecheck (from repo root):

```sh
pnpm lint
pnpm typecheck
```

## Testing

There is currently no dedicated frontend unit/integration test runner in this repo.
For now, lint + TypeScript typechecking are the gating checks.

## Backend Notes

If you want real data locally, start Postgres + run migrations + seed, then run the Go API:

```sh
pnpm db:up
export DATABASE_URL="postgres://localroots:localroots@localhost:5432/localroots?sslmode=disable"
pnpm migrate:up
pnpm seed
pnpm dev:backend
```
