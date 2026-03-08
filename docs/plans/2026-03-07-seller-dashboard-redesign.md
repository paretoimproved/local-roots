# Seller Dashboard Redesign

## Problem

The seller store page (`/seller/stores/[storeId]`) serves four competing purposes: pickup confirmation, order management, subscription plan setup, and subscriber administration. A farmer at a farmstand needs one thing: confirm this buyer's pickup. Everything else is noise during that moment.

## Solution

Split the page into two tabs: **Pickups** (default, farmstand mode) and **Manage** (admin mode). Add a global pickup code entry at the top of the Pickups tab. Add a new backend endpoint to look up orders by pickup code.

## Tab Structure

### Pickups Tab (default)

1. **Auto-selected pickup window** — show current/next window with human-readable label ("Today - Farm Rd - 10am-12pm"), small switch control if needed
2. **Global code entry** (hero) — single 6-digit input + Confirm button. Calls new lookup endpoint, shows preview, then confirms via existing endpoint
3. **Compact earnings line** — "Today: $245 from 7 pickups" (replaces full PayoutSummaryCard)
4. **Orders grouped by state** — Ready (green accent, these people are HERE), Waiting (placed), Completed (collapsed by default). No filter buttons. Expand/collapse for details, secondary actions in expanded view only.

### Manage Tab

1. Subscription plans (QR codes, go live, pause/resume, copy link)
2. Subscribers (filter, cancel)
3. Full payout breakdown
4. Pickup window history/selector

## Backend Change

New endpoint: `POST /v1/seller/stores/{storeId}/orders/lookup-by-code`

- Request: `{ "pickup_code": "847291" }`
- Response: order object (same shape as seller order list item)
- Query: `SELECT ... FROM orders WHERE store_id = $1 AND pickup_code = $2 AND status IN ('placed', 'ready') LIMIT 1`
- 404 if no matching confirmable order found
- Tests: valid code, wrong code, wrong store, already-picked-up code

## Technical Debt Cleanup

- Delete support popover (~50 lines of positioning + resize/scroll listeners). Move Store ID to Settings page.
- Delete `pickupCodeByOrderId` state map and per-order code handlers.
- Remove `ManualPickupEntry` from order cards (replaced by global entry).
- Replace 6-button order filter bar with grouped sections.
- State naturally splits between tabs, reducing the 15+ useState declarations per render path.

## Files

Backend:
- `backend/internal/api/v1/seller_orders.go` — new LookupByCode handler
- `backend/internal/httpx/handler.go` — register route
- `backend/internal/api/v1/seller_orders_test.go` — tests

Frontend:
- `frontend/src/app/seller/stores/[storeId]/page.tsx` — tab architecture, split content
- `frontend/src/components/seller/order-list.tsx` — grouped sections, remove per-order code entry
- `frontend/src/components/seller/pickup-window-list.tsx` — simplified auto-select display
- `frontend/src/components/seller/global-pickup-entry.tsx` — new component
- `frontend/src/lib/seller-api.ts` — add lookupByCode method
- `frontend/src/app/seller/stores/[storeId]/settings/page.tsx` — add Store ID section
