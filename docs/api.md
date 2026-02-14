# API (MVP, Public Browse)

Base URL (local): `http://localhost:8080`

## Health

- `GET /health`

## Public browse

- `GET /v1/stores`
- `GET /v1/stores/{storeId}/pickup-windows?status=published&from=2026-01-01T00:00:00Z`
- `GET /v1/pickup-windows/{pickupWindowId}/offerings`

