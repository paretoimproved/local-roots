# Session Context

Session ID: 2def5933-7d7d-48c7-9c80-b3730c4d8579
Commit Message: <task-notification>
<task-id>a16f0b874f57a6e67</task-id>
<tool-use-id>to

## Prompts

### Prompt 1

<task-notification>
<task-id>a16f0b874f57a6e67</task-id>
<tool-use-id>toolu_01Gak3GE6QwaeUZv74FNuwwa</tool-use-id>
<output-file>/private/tmp/claude-502/-Users-brandonqueener-Cursor-Projects-Local-Roots/2def5933-7d7d-48c7-9c80-b3730c4d8579/tasks/a16f0b874f57a6e67.output</output-file>
<status>completed</status>
<summary>Agent "Explore Stripe Connect payout state" completed</summary>
<result>Perfect! Now I have a comprehensive understanding. Let me create a summary of my findings:

## Research Summary: Stripe Connect Payouts Integration

Based on my thorough investigation of the codebase, here's the current state of Stripe Connect integration:

### 1. **Stripe Connect Integration (Onboarding & Account Management)**

**Backend Implementation:**
- **File**: `/Users/brandonqueener/Cursor Projects/Local-Roots/backend/internal/api/v1/seller_connect.go`
- **Endpoints**:
  - `POST /v1/seller/stores/{storeId}/connect/onboard` — Creates a Stripe Connect Express account and returns an onboarding URL (legacy endpoint, still supported)
  - `GET /v1/seller/stores/{storeId}/connect/status` — Fetches and syncs the Connect account status from Stripe
  - `POST /v1/seller/stores/{storeId}/connect/refresh-link` — Generates a fresh onboarding link
  - `POST /v1/seller/stores/{storeId}/connect/account-session` — Creates an Account Session for embedded Stripe Connect components

**Account Status States**: `"none" | "onboarding" | "active" | "restricted"`

**Frontend Implementation:**
- **Onboarding Component**: `/Users/brandonqueener/Cursor Projects/Local-Roots/frontend/src/components/stripe-connect-onboarding.tsx`
  - Uses `@stripe/react-connect-js` for embedded onboarding (no popups/redirects)
  - Loads ConnectAccountOnboarding component inline
  
- **Setup Page**: `/Users/brandonqueener/Cursor Projects/Local-Roots/frontend/src/app/seller/stores/[storeId]/setup/payouts/page.tsx`
  - Flow: None → Onboarding → Active
  - Shows progress states and handles embedded Stripe forms
  - Allows sellers to proceed through setup before verification completes

**Database Schema** (from migration `0013_stripe_connect.sql`):
- `stores.stripe_account_id` — The Stripe Connect account ID
- `stores.stripe_account_status` — Current account status (none/onboarding/active/restricted)
- `orders.stripe_transfer_id` — Records the Stripe Transfer ID when funds are transferred

---

### 2. **Automatic Payout/Transfer Logic**

**The system does NOT have a manual transfer trigger endpoint.** Transfers happen automatically in two scenarios:

**A. After Pickup Confirmation (Normal Orders)**
- **File**: `/Users/brandonqueener/Cursor Projects/Local-Roots/backend/internal/api/v1/pickup_execute.go` (lines 162)
- **Flow**:
  1. Seller confirms pickup with 6-digit code
  2. Order status → `picked_up`, payment_status → `paid`
  3. Transaction commits
  4. Stripe authorization is captured (via `CaptureAuthorization`)
  5. **Automatic transfer** to seller's Connect account via `transferToSeller()`:
     - Amount = `subtotal_cents` (seller's share, before platform fees)
     - Transfer is idempotent using `"transfer-" + orderID` as idempotency key

**B. After No-Show Marking (No-Show Fee Orders)**
- **File**: `/Users/brandonqueener/Cursor Projects/Local-Roots/backend/internal/api/v1/seller_orders.go` (line 358)
- **Flow**:
  1. Seller marks order `no_show` (only from `ready` status)
  2. No-show fee is captured from the card:
     - Default fee: `500` cents ($5), configurable via `NO_SHOW_FEE_CENTS` (currently set to `0`)
  3. Fee is split between platform and seller:
     - Platform gets: `fee * NO_SHOW_PLATFORM_SPLIT_BPS / 10000` (default 30%)
     - Seller gets: remaining amount
  4. **Automatic transfer** of seller's share to their Connect account via `transferToSeller()`:
     - Amount = seller's share of the no-show fee
     - Transfer is idempotent using `"noshow-transfer-" + orderID`

**Transfer Function** (`transferToSeller()` in `order_helpers.go`):
```go
func transferToSeller(ctx context.Context, db *pgxpool.Pool, sc *stripepay.Client, 
                     storeID, orderID, piID string, amount int, idempotencyPrefix string)
```
- **Silently no-ops** if:
  - Amount ≤ 0
  - Stripe client not configured
  - Store has no Connect account
  - Connect account status ≠ "active"
- **Success**: Updates `orders.stripe_transfer_id` with the Stripe Transfer ID
- Uses `CreateTransfer()` from Stripe client (stripepay.go, line 364)

---

### 3. **Stripe Payments Client Integration**

**File**: `/Users/brandonqueener/Cursor Projects/Local-Roots/backend/internal/payments/stripepay/stripepay.go`

**Key Connect Methods**:
- `CreateConnectAccount()` — Creates Stripe Connect Express account with pre-filled business info
- `CreateAccountLink()` — Generates onboarding/refresh URL (legacy)
- `CreateAccountSession()` — Generates client secret for embedded `<ConnectAccountOnboarding>`
- `GetAccountStatus()` — Fetches account status from Stripe API
- **`CreateTransfer()`** (line 364) — Transfers funds to seller's Connect account
  - Params: amount, destination Connect account, source charge ID, idempotency key
  - Supports partial transfers via Stripe's transfer API
- `GetChargeIDFromPaymentIntent()` — Retrieves charge ID from a captured PaymentIntent for transfer source

---

### 4. **Webhook Handler**

**File**: `/Users/brandonqueener/Cursor Projects/Local-Roots/backend/internal/api/v1/stripe_webhook.go`

**Endpoint**: `POST /v1/stripe/webhook`

**Events Processed**:
1. **Payment Intent Events** (for buyer orders):
   - `payment_intent.requires_capture` → updates to `authorized`
   - `payment_intent.succeeded` → updates to `paid`
   - `payment_intent.canceled` → updates to `voided`
   - `payment_intent.payment_failed` → updates to `failed`
   - If payment fails while order is `placed` (before pickup), automatically cancels order

2. **Connect Account Events**:
   - `account.updated` → syncs seller's Connect account status:
     - `active` = both `charges_enabled` AND `payouts_enabled`
     - `restricted` = one but not both, or requirements.errors exist
     - `onboarding` = default state

**No transfer/payout events are processed** — transfers are created synchronously, so no webhook reconciliation needed.

---

### 5. **Payout Data Exposed to Frontend**

**API Endpoints**:
- `GET /v1/seller/stores/{storeId}/payouts` — Returns payout history (last 50 records)
- `GET /v1/seller/stores/{storeId}/pickup-windows/{windowId}/payout-summary` — Returns summary for a specific pickup window

**Payout History Entry Structure** (type `PayoutHistoryEntry`):
```typescript
{
  order_id: string;
  pickup_date: Date;
  total_cents: number;
  seller_payout_cents: number;      // subtotal (seller's gross)
  platform_fee_cents: number;        // buyer's service fee
  status: string;                    // "picked_up" or "no_show"
  transfer_id: string | null;        // Stripe Transfer ID if transferred
}
```

**Payout Summary Structure** (type `PickupWindowPayoutSummary`):
```typescript
{
  store_id: string;
  pickup_window_id: string;
  seller_payout_cents: number;       // Total seller payout (all orders)
  platform_fee_cents: number;        // Total platform fees
  gross_captured_cents: number;      // Total amount captured
  picked_up_count: number;
  no_show_count: number;
  canceled_count: number;
  open_count: number;
  payout_picked_up_cents: number;    // Seller's share from picked-up orders
  payout_no_show_cents: number;      // Seller's share from no-show fees
  transferred_count: number;         // Orders with stripe_transfer_id set
}
```

**Frontend Display** (`analytics/page.tsx`):
- Shows **Recent Payouts** table with:
  - Date, Your Payout, Platform Fee, Total
  - Status badge: **"Transferred"** (green, if `transfer_id` exists) or **"Pending"** (orange, if null)
- Payout summary component shows estimated totals per pickup window

---

### 6. **Key Configuration**

**Backend Environment Variables**:
- `STRIPE_SECRET_KEY` — Required to enable all Stripe functionality
- `STRIPE_WEBHOOK_SECRET` — Required to enable webhook endpoint
- `BUYER_FEE_BPS` / `BUYER_FEE_FLAT_CENTS` — Buyer service fee (7% + $0.35 default)
- `NO_SHOW_FEE_CENTS` — No-show penalty (default 500¢, currently 0)
- `NO_SHOW_PLATFORM_SPLIT_BPS` — Platform's share of no-show fee (default 3000 = 30%)
- `FRONTEND_URL` — For onboarding redirect URLs

**Frontend Environment Variables**:
- `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` — Required for Connect.js and card elements

---

### 7. **Current Limitations / Gaps**

1. **No manual payout/batch transfer trigger** — All transfers happen synchronously after pickup or no-show marking. There's no bulk payout endpoint or scheduled batch transfers.

2. **No Stripe payout schedule configuration** — The system relies entirely on Stripe's default payout schedule (typically 2-3 business days), not configurable per seller.

3. **No transfer failure recovery UI** — If a transfer fails (e.g., due to invalid bank account), the order record shows it attempted (`stripe_transfer_id = null`) but there's no retry mechanism or seller notification flow.

4. **Transfer status is one-way** — Once `stripe_transfer_id` is set, it's never updated. Failed transfers won't be reconciled if Stripe eventually succeeds.

5. **No payout dashboard beyond basic history** — Sellers see a flat list of individual order payouts, but no aggregated payout schedule or "expected next payout" date.

---

### File Locations Summary

**Backend**:
- Connect onboarding: `/Users/brandonqueener/Cursor Projects/Local-Roots/backend/internal/api/v1/seller_connect.go`
- Payout summary: `/Users/brandonqueener/Cursor Projects/Local-Roots/backend/internal/api/v1/seller_payouts.go`
- Payout history: `/Users/brandonqueener/Cursor Projects/Local-Roots/backend/internal/api/v1/seller_analytics.go`
- Transfer logic: `/Users/brandonqueener/Cursor Projects/Local-Roots/backend/internal/api/v1/order_helpers.go`
- Pickup flow: `/Users/brandonqueener/Cursor Projects/Local-Roots/backend/internal/api/v1/pickup_execute.go`
- No-show flow: `/Users/brandonqueener/Cursor Projects/Local-Roots/backend/internal/api/v1/seller_orders.go`
- Stripe client: `/Users/brandonqueener/Cursor Projects/Local-Roots/backend/internal/payments/stripepay/stripepay.go`
- Webhook handler: `/Users/brandonqueener/Cursor Projects/Local-Roots/backend/internal/api/v1/stripe_webhook.go`

**Frontend**:
- Onboarding component: `/Users/brandonqueener/Cursor Projects/Local-Roots/frontend/src/components/stripe-connect-onboarding.tsx`
- Payouts setup page: `/Users/brandonqueener/Cursor Projects/Local-Roots/frontend/src/app/seller/stores/[storeId]/setup/payouts/page.tsx`
- Payout summary card: `/Users/brandonqueener/Cursor Projects/Local-Roots/frontend/src/components/seller/payout-summary.tsx`
- Analytics/payouts display: `/Users/brandonqueener/Cursor Projects/Local-Roots/frontend/src/app/seller/stores/[storeId]/analytics/page.tsx`
- Seller API: `/Users/brandonqueener/Cursor Projects/Local-Roots/frontend/src/lib/seller-api.ts`

**Migrations**:
- Stripe payments schema: `/Users/brandonqueener/Cursor Projects/Local-Roots/backend/migrations/0009_stripe_payments.sql`
- Stripe Connect schema: `/Users/brandonqueener/Cursor Projects/Local-Roots/backend/migrations/0013_stripe_connect.sql`</result>
<usage><total_tokens>62821</total_tokens><tool_uses>36</tool_uses><duration_ms>143375</duration_ms></usage>
</task-notification>
Full transcript available at: /private/tmp/claude-502/-Users-brandonqueener-Cursor-Projects-Local-Roots/2def5933-7d7d-48c7-9c80-b3730c4d8579/tasks/a16f0b874f57a6e67.output

## Summary

---

```
+====================================================================+
|            MEGA PLAN REVIEW — COMPLETION SUMMARY                   |
+====================================================================+
| Mode selected        | SELECTIVE EXPANSION                         |
| System Audit         | Clean main branch, no stashes, 0 TODOs in   |
|                      | production code, Phases 1-7 complete         |
| Step 0               | SELECTIVE EXPANSION, 6/6 cherry-picks        |
|                      | accepted, 1 architecture decision resolved   |
| Section 1  (Arch)    | 1 issue found (box_updates schema — resolved) |
| Section 2  (Errors)  | 11 error paths mapped, 0 GAPS                |
| Section 3  (Security)| 7 threats evaluated, 0 High severity         |
| Section 4  (Data/UX) | 10 edge cases mapped, 0 unhandled            |
|                      | 1 decision (digest timezone — resolved)      |
| Section 5  (Quality) | 2 notes (DRY analytics, cron organization)   |
| Section 6  (Tests)   | Diagram produced, 0 gaps                     |
| Section 7  (Perf)    | 1 index needed (noted for implementation)    |
| Section 8  (Observ)  | 0 gaps, logging spec produced                |
| Section 9  (Deploy)  | 0 risks, rollback plan documented             |
| Section 10 (Future)  | Reversibility: 5/5, debt items: 0            |
| Section 11 (Design)  | State coverage mapped, no blocking issues    |
+--------------------------------------------------------------------+
| NOT in scope         | written (9 items)                            |
| What already exists  | written (7 reusable subsystems)              |
| Dream state delta    | written (~60% of gap closed)                 |
| Error/rescue registry| 11 methods, 0 CRITICAL GAPS                  |
| Failure modes        | 13 total, 0 CRITICAL GAPS                    |
| TODOS.md updates     | 1 item added (next pickup badge)             |
| Scope proposals      | 6 proposed, 6 accepted                       |
| CEO plan             | written                                      |
| Lake Score           | 6/6 recommendations chose complete option   |
| Diagrams produced    | 3 (system architecture, re-engagement flow,  |
|                      | data flow with shadow paths)                 |
| Stale diagrams found | 0                                            |
| Unresolved decisions | 0                                            |
+====================================================================+
```

```
+====================================================================+
|                    REVIEW READINESS DASHBOARD                       |
+====================================================================+
| Review          | Runs | Last Run            | Status    | Required |
|-----------------|------|---------------------|-----------|----------|
| Eng Review      |  0   | —                   | —         | YES      |
| CEO Review      |  1   | 2026-03-18 15:30    | CLEAR     | no       |
| Design Review   |  0   | —                   | —         | no       |
+--------------------------------------------------------------------+
| VERDICT: NOT CLEARED — Eng Review not yet run                       |
+====================================================================+
```

---

`★ Insight ─────────────────────────────────────`
**Why re-engagement before analytics:** The plan prioritizes buyer re-engagement (Task 1) over seller analytics (Task 2) even though analytics endpoints already exist. This follows the **North Star metric** principle — completed pickups per week is driven more by buyers actually showing up than by sellers looking at dashboards. A lapsed subscriber nudge email has a direct, measurable path to the North Star. Analytics enhancement is important for seller retention, but it's a second-order effect.

**Cron as growth engine:** Notice how 6 of the 8 scheduler jobs after Phase 8 are email-related. The in-process cron + Resend pattern is becoming the platform's primary retention mechanism. At scale (1000+ sellers), this will need to evolve into a proper job queue with observability — but for Phase 8's scale, the simple scheduler is the right choice.
`─────────────────────────────────────────────────`

---

The plan is reviewed and clean. **Next step:** Run `/plan-eng-review` on the Phase 8 plan to clear the Eng Review gate before implementation. Would you like to proceed with that, or start implementing?
