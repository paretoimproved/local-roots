# Backend (Go)

## Local dev

Prerequisite: Go 1.24+

```sh
export ADDR=":8080"
export ENV=dev
export DATABASE_URL="postgres://localroots:localroots@localhost:5432/localroots?sslmode=disable"

go run ./cmd/api
```

## Migrations

```sh
export DATABASE_URL="postgres://localroots:localroots@localhost:5432/localroots?sslmode=disable"
go run ./cmd/migrate up
go run ./cmd/migrate status
```

Endpoints:
- `GET /health`
