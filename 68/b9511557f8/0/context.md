# Session Context

Session ID: b2250eec-f49c-4aa6-93a5-e4285ef25f9a
Commit Message: <teammate-message teammate_id="team-lead">
You are the Payout Visibility

## Prompts

### Prompt 1

<teammate-message teammate_id="team-lead">
You are the Payout Visibility + Seller Analytics Dashboard agent. Implement items #29 and #30 from the P3 audit.

Project root: "/Users/brandonqueener/Cursor Projects/Local-Roots"
Backend: Go + PostgreSQL. Frontend: Next.js 16, React 19.

## YOUR EXCLUSIVE FILES
- `backend/internal/api/v1/seller_analytics.go` (new)
- `backend/internal/api/v1/seller_payouts.go` (may need updates)
- `backend/internal/httpx/handler.go` — add routes ONLY for analytics endpoints (coordinate: box-preview agent also adds routes here — add yours in a DIFFERENT section, e.g., after the payout routes)
- `frontend/src/app/seller/stores/[storeId]/analytics/page.tsx` (new)
- `frontend/src/lib/seller-api.ts` — add analytics API functions ONLY

DO NOT TOUCH: seller store main page, checkout-form, subscribe-form, layout.tsx, docs, main.go, orders.go, pickup_execute.go

## Item #29 — Payout Automation / Visibility

### 1. Investigate what exists
Read these files to understand the current payout flow:
- `backend/internal/api/v1/seller_payouts.go` — existing payout summary endpoint
- `backend/internal/api/v1/pickup_execute.go` — `transferToSeller` is already called here
- `backend/internal/api/v1/seller_orders.go` — `transferToSeller` function definition
- `backend/internal/httpx/handler.go` — existing payout routes

The transfer automation is ALREADY implemented (runs on pickup confirmation). What's likely missing is:
- A payout history/listing endpoint showing all transfers for a store
- Transfer status visibility

### 2. Add payout history if missing
If `seller_payouts.go` doesn't already have a payout history/listing endpoint, add one:
- `GET /v1/seller/stores/{storeId}/payouts` — list transfers (pulled from orders table: orders with `status='picked_up'` and their `captured_cents`, `subtotal_cents`, dates)
- Return: array of `{ order_id, pickup_date, total_cents, seller_payout_cents (subtotal), platform_fee_cents, status }`

## Item #30 — Seller Analytics Dashboard

### 3. Create `backend/internal/api/v1/seller_analytics.go`
A single endpoint that returns all analytics for a store:

`GET /v1/seller/stores/{storeId}/analytics`

Returns JSON with:
```json
{
  "active_subscribers": 12,
  "total_subscribers": 18,
  "churn_count": 3,
  "total_revenue_cents": 24500,
  "total_orders": 45,
  "picked_up_count": 40,
  "pickup_rate": 0.889,
  "revenue_by_cycle": [
    { "cycle_date": "2026-02-21", "revenue_cents": 4800, "orders": 8, "pickups": 7 },
    ...
  ]
}
```

Use SQL queries against existing tables:
- `active_subscribers`: COUNT from subscriptions WHERE store's plans AND status = 'active'
- `total_subscribers`: COUNT all subscriptions for store's plans
- `churn_count`: COUNT subscriptions with status = 'canceled'
- `total_revenue_cents`: SUM of `captured_cents` from orders WHERE status = 'picked_up' and store_id
- `picked_up_count` / `total_orders`: COUNTs from orders
- `revenue_by_cycle`: GROUP BY pickup window date, aggregate revenue and counts

Read the schema carefully to understand the relationships between stores → subscription_plans → subscriptions, and stores → pickup_windows → orders.

### 4. Register routes in `handler.go`
Add after the existing seller payout routes:
```go
sellerAnalytics := v1.SellerAnalyticsAPI{DB: deps.DB}
mux.HandleFunc("GET /v1/seller/stores/{storeId}/analytics", authAPI.RequireUser(v1.RequireStoreOwner(deps.DB, sellerAnalytics.GetAnalytics)))
```

Also register the payout history endpoint if you created one.

### 5. Create frontend seller analytics page
Create `frontend/src/app/seller/stores/[storeId]/analytics/page.tsx`

A "use client" page that:
- Fetches analytics data from the API
- Shows key metrics as cards at the top: Active Subscribers, Pickup Rate, Total Revenue, Churn
- Shows a revenue-by-cycle table below
- If a payout history endpoint exists, show recent payouts in a table

Use the existing design system: `.lr-card`, `.lr-btn`, CSS variables, `useToast()` for errors.
Add a link to this page from somewhere accessible (e.g., you can add it to the seller nav or just make the page accessible by URL for now).

### 6. Add API functions to `seller-api.ts`
Read the file first. Add functions for:
- `getStoreAnalytics(token, storeId)` → GET analytics
- `getPayoutHistory(token, storeId)` → GET payouts (if endpoint created)

## Verification
After changes:
- `cd "/Users/brandonqueener/Cursor Projects/Local-Roots/backend" && go build ./... && go test ./...`
- `cd "/Users/brandonqueener/Cursor Projects/Local-Roots" && pnpm typecheck && pnpm lint`

When done, mark task #6 as completed using TaskUpdate.
</teammate-message>

## Summary

You've hit your limit · resets 10am (America/Los_Angeles)
