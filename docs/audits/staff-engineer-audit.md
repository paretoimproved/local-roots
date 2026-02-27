# Staff Engineer Code Quality Audit

**Date:** 2026-02-27
**Scope:** Full monorepo (`backend/`, `frontend/`, `e2e/`)
**Auditor:** Staff Engineer (automated deep review)

---

## Table of Contents

1. [Executive Summary](#executive-summary)
2. [Critical Findings](#critical-findings)
3. [Warning Findings](#warning-findings)
4. [Suggestions](#suggestions)
5. [Overall Code Health Assessment](#overall-code-health-assessment)
6. [Top 5 Priority Items](#top-5-priority-items)

---

## Executive Summary

The LocalRoots codebase is well-structured for its stage: clean separation of concerns, consistent HTTP response helpers, good transactional integrity for inventory management, and solid Stripe integration patterns. The monorepo layout is clear, and the backend's struct-based API handler pattern provides good dependency injection.

That said, the audit surfaces **5 Critical**, **11 Warning**, and **10 Suggestion** findings across the six audit dimensions. The most urgent issues are goroutines using request-scoped contexts after handlers return (data loss risk in production), duplicated pickup confirmation logic (bug divergence risk), and the email client using `http.DefaultClient` without a timeout (potential goroutine hangs under load).

---

## Critical Findings

### C-1. Goroutines using request context after handler returns

**Category:** Error Handling Gap
**Severity:** Critical
**Impact:** Cancelled context causes silent failures for seller notification emails and subscription emails in production under load. The HTTP handler returns, Go's `net/http` cancels `r.Context()`, and the goroutine's DB query or email send fails silently.

**Files affected:**

| File | Line | Description |
|------|------|-------------|
| `backend/internal/api/v1/orders.go` | 373 | Seller new-order notification goroutine uses `ctx` (derived from `r.Context()`) |
| `backend/internal/api/v1/subscriptions.go` | 803 | Seller new-subscriber notification goroutine uses `ctx` (derived from `r.Context()`) |
| `backend/internal/api/v1/buyer_subscriptions.go` | 332 | Cancellation email goroutine uses `r.Context()` directly |

**Before** (`backend/internal/api/v1/orders.go:373`):
```go
go func() {
    var sellerEmail, storeName string
    err := a.DB.QueryRow(ctx, `  // ctx is r.Context() — will be cancelled
        SELECT u.email, s.name
        FROM stores s JOIN users u ON u.id = s.owner_user_id
        WHERE s.id = $1::uuid
    `, storeID).Scan(&sellerEmail, &storeName)
    // ...
}()
```

**After:**
```go
go func() {
    bgCtx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
    defer cancel()
    var sellerEmail, storeName string
    err := a.DB.QueryRow(bgCtx, `
        SELECT u.email, s.name
        FROM stores s JOIN users u ON u.id = s.owner_user_id
        WHERE s.id = $1::uuid
    `, storeID).Scan(&sellerEmail, &storeName)
    // ...
}()
```

Apply the same pattern to `subscriptions.go:803` and `buyer_subscriptions.go:332`.

---

### C-2. Email client uses `http.DefaultClient` with no timeout

**Category:** Performance / Reliability
**Severity:** Critical
**Impact:** If Resend's API is slow or unresponsive, every `SendAsync` goroutine hangs indefinitely. Under load (e.g., billing cron sending dozens of emails), this accumulates goroutines that never complete, eventually exhausting memory.

**File:** `backend/internal/email/email.go:56`

**Before:**
```go
resp, err := http.DefaultClient.Do(req)
```

**After:**
```go
// At package level or as a Client field:
var httpClient = &http.Client{Timeout: 10 * time.Second}

// In Send():
resp, err := httpClient.Do(req)
```

---

### C-3. Duplicated pickup confirmation logic (seller_orders.go vs pickup_confirm.go)

**Category:** DRY Violation
**Severity:** Critical
**Impact:** `ConfirmPickup` in `seller_orders.go` (line 410, ~130 lines) and `Confirm` in `pickup_confirm.go` (line 185, ~200 lines) implement near-identical logic: lock order, verify pickup code, verify ownership, check status, adjust offerings, update to `picked_up`, capture Stripe authorization, transfer to seller, send receipt email. Any bug fix or behavior change must be applied in both places or they diverge silently.

**Files:**
- `backend/internal/api/v1/seller_orders.go:410-540` (ConfirmPickup)
- `backend/internal/api/v1/pickup_confirm.go:185-391` (Confirm)

**Before** (two separate ~150-line functions with identical core logic):
```go
// seller_orders.go
func (a SellerOrdersAPI) ConfirmPickup(w http.ResponseWriter, r *http.Request, u AuthUser, sc StoreContext) {
    // 130 lines of: validate -> lock -> verify code -> update -> capture -> transfer -> email
}

// pickup_confirm.go
func (a PickupConfirmAPI) Confirm(w http.ResponseWriter, r *http.Request, u AuthUser) {
    // 200 lines of: validate -> lock -> verify code -> verify ownership -> update -> capture -> transfer -> email
}
```

**After** (extract shared core):
```go
// pickup_logic.go
type PickupConfirmDeps struct {
    DB      *pgxpool.Pool
    Stripe  *stripepay.Client
    Email   *email.Client
    FrontendURL string
}

type PickupResult struct {
    OrderID        string
    StoreID        string
    PickupWindowID string
    Status         string
    BuyerName      *string
    BuyerEmail     string
    Items          []OrderItem
    TotalCents     int
    SubtotalCents  int
    ConfirmedAt    time.Time
}

func executePickupConfirm(ctx context.Context, deps PickupConfirmDeps, orderID, pickupCode, ownerUserID string) (*PickupResult, error) {
    // Single implementation of the core logic
}

// Both handlers call executePickupConfirm after their respective input validation
```

---

### C-4. Buyer fee calculation duplicated with inline formula

**Category:** DRY Violation
**Severity:** Critical
**Impact:** The buyer fee formula exists in three places. If the fee model changes (e.g., tiered fees, caps), missing one location causes checkout amount mismatches between walk-up orders and subscriptions.

**Files:**
- `backend/internal/api/v1/subscriptions.go:370-373` — canonical `computeBuyerFee()` function
- `backend/internal/api/v1/orders.go:280-283` — inline duplication
- `backend/internal/api/v1/order_checkout.go:122-125` — inline duplication

**Before** (`orders.go:280`):
```go
// Calculate buyer fee.
buyerFee := (subtotal * a.BuyerFeeBps) / 10000
if a.BuyerFeeFlatCts > 0 {
    buyerFee += a.BuyerFeeFlatCts
}
```

**After** (`orders.go:280`):
```go
buyerFee := computeBuyerFee(subtotal, a.BuyerFeeBps, a.BuyerFeeFlatCts)
```

Move `computeBuyerFee` from `subscriptions.go` to a shared location (e.g., a `fees` package or a shared file in `v1/`) and use it in all three call sites.

---

### C-5. `ListOrders` and `ListSubscriptions` run UPDATE before every read

**Category:** Performance
**Severity:** Critical
**Impact:** Every time a buyer opens their dashboard, two `UPDATE ... WHERE` statements scan the `orders` and `subscriptions` tables to link records by email. With buyer growth, these become write-hot operations on every page load. In production with connection pooling, this adds write latency to a read path.

**Files:**
- `backend/internal/api/v1/buyer_auth.go:209-215` — `ListOrders` UPDATE
- `backend/internal/api/v1/buyer_auth.go:271-277` — `ListSubscriptions` UPDATE

**Before:**
```go
func (a BuyerAuthAPI) ListOrders(w http.ResponseWriter, r *http.Request, u AuthUser) {
    // Link any orders placed after the buyer last signed in.
    if _, err := a.DB.Exec(r.Context(), `
        update orders set buyer_user_id = $1::uuid
        where lower(buyer_email) = lower($2) and buyer_user_id is null
    `, u.ID, u.Email); err != nil {
        // ...
    }
    // Then SELECT ...
}
```

**After** (run linking once at login, not on every page load):
```go
// In buyer_auth.go Verify() and GoogleLogin() — run once at authentication:
func linkBuyerRecords(ctx context.Context, db *pgxpool.Pool, userID, email string) {
    db.Exec(ctx, `UPDATE orders SET buyer_user_id = $1::uuid WHERE lower(buyer_email) = lower($2) AND buyer_user_id IS NULL`, userID, email)
    db.Exec(ctx, `UPDATE subscriptions SET buyer_user_id = $1::uuid WHERE lower(buyer_email) = lower($2) AND buyer_user_id IS NULL`, userID, email)
}

// ListOrders/ListSubscriptions become pure reads:
func (a BuyerAuthAPI) ListOrders(w http.ResponseWriter, r *http.Request, u AuthUser) {
    rows, err := a.DB.Query(r.Context(), `SELECT ... WHERE o.buyer_user_id = $1::uuid ...`, u.ID)
    // ...
}
```

---

## Warning Findings

### W-1. Rate limiter cleanup goroutines never terminate

**Category:** Performance (goroutine leak)
**Severity:** Warning
**File:** `backend/internal/httpx/ratelimit.go:67-80`

Each call to `newTierLimiters()` spawns a goroutine that runs a `time.Ticker` forever. There are currently 4 tiers, so this leaks 4 goroutines per process lifetime. Not a crisis, but the cleanup goroutine ignores context cancellation and cannot be stopped during graceful shutdown.

**Before:**
```go
func (tl *tierLimiters) cleanup() {
    ticker := time.NewTicker(5 * time.Minute)
    defer ticker.Stop()
    for range ticker.C {
        // ...
    }
}
```

**After:**
```go
func newTierLimiters(ctx context.Context, tier RateLimitTier) *tierLimiters {
    tl := &tierLimiters{limiters: make(map[string]*ipLimiter), tier: tier}
    go tl.cleanup(ctx)
    return tl
}

func (tl *tierLimiters) cleanup(ctx context.Context) {
    ticker := time.NewTicker(5 * time.Minute)
    defer ticker.Stop()
    for {
        select {
        case <-ctx.Done():
            return
        case <-ticker.C:
            tl.mu.Lock()
            cutoff := time.Now().Add(-5 * time.Minute)
            for ip, entry := range tl.limiters {
                if entry.lastSeen.Before(cutoff) {
                    delete(tl.limiters, ip)
                }
            }
            tl.mu.Unlock()
        }
    }
}
```

---

### W-2. `statusWriter` does not implement `http.Flusher`

**Category:** Consistency / Correctness
**Severity:** Warning
**File:** `backend/internal/httpx/logging.go:9-27`

The `statusWriter` wraps `http.ResponseWriter` but does not delegate `Flush()`. If Server-Sent Events or streaming responses are ever added, they will silently fail to flush. This is a forward-compatibility concern.

**Before:**
```go
type statusWriter struct {
    http.ResponseWriter
    status int
    bytes  int
}
```

**After:**
```go
type statusWriter struct {
    http.ResponseWriter
    status int
    bytes  int
}

func (w *statusWriter) Flush() {
    if f, ok := w.ResponseWriter.(http.Flusher); ok {
        f.Flush()
    }
}

// Ensure interface compliance:
var _ http.Flusher = (*statusWriter)(nil)
```

---

### W-3. `validUUID` defined in `orders.go` but used across the entire `v1` package

**Category:** Code Organization
**Severity:** Warning
**File:** `backend/internal/api/v1/orders.go:21-25`

`validUUID()` and `uuidRe` are defined in `orders.go` but called from `store_middleware.go`, `subscriptions.go`, `buyer_orders.go`, `buyer_subscriptions.go`, `pickup_confirm.go`, `seller_orders.go`, and others. This creates a misleading dependency: it looks like an orders-specific utility but is actually package-level infrastructure.

**After:** Move `validUUID` and `uuidRe` to a dedicated `backend/internal/api/v1/validate.go` file.

---

### W-4. Subscription plan query duplicated between ListStorePlans and GetPlan

**Category:** DRY Violation
**Severity:** Warning
**File:** `backend/internal/api/v1/subscriptions.go:77-167` (ListStorePlans) and `181-255` (GetPlan)

Both endpoints construct nearly identical SQL queries with the same SELECT columns, JOINs, and scan targets. The difference is only the WHERE clause (`store_id` vs `plan_id`). This means column additions require synchronized changes in two places.

**Before** (two ~80-line query blocks with identical column lists):
```go
// ListStorePlans
rows, err := a.DB.Query(r.Context(), `
    select sp.id::text, sp.store_id::text, sp.title, sp.description, sp.cadence,
           sp.price_cents, sp.subscriber_limit, sp.first_start_at, ...
    from subscription_plans sp
    join pickup_locations pl on pl.id = sp.pickup_location_id
    left join lateral (...) pi on true
    where sp.store_id = $1::uuid and sp.is_active = true
    order by sp.created_at desc
`, storeID)

// GetPlan (nearly identical query)
err := a.DB.QueryRow(r.Context(), `
    select sp.id::text, sp.store_id::text, sp.title, sp.description, sp.cadence,
           sp.price_cents, sp.subscriber_limit, sp.first_start_at, ...
    from subscription_plans sp
    join pickup_locations pl on pl.id = sp.pickup_location_id
    left join lateral (...) pi on true
    where sp.id = $1::uuid
    limit 1
`, planID)
```

**After** (extract query builder or constant):
```go
const planSelectCols = `
    sp.id::text, sp.store_id::text, sp.title, sp.description, sp.cadence,
    sp.price_cents, sp.subscriber_limit, sp.first_start_at, sp.duration_minutes,
    sp.cutoff_hours, sp.is_active, sp.is_live, sp.deposit_cents,
    pl.id::text, pl.label, pl.address1, pl.city, pl.region, pl.postal_code,
    pl.timezone, COALESCE(sp.image_url, pi.url), pl.photo_url
`

const planFromJoin = `
    from subscription_plans sp
    join pickup_locations pl on pl.id = sp.pickup_location_id
    left join lateral (
        select pimg.url from product_images pimg
        where pimg.product_id = sp.product_id
        order by pimg.sort_order asc limit 1
    ) pi on true
`

func scanPlan(scanner interface{ Scan(...any) error }) (SubscriptionPlanPublic, error) {
    var sp SubscriptionPlanPublic
    err := scanner.Scan(&sp.ID, &sp.StoreID, &sp.Title, /* ... */)
    return sp, err
}
```

---

### W-5. `cadenceLabel()` duplicated across 7 frontend files

**Category:** DRY Violation
**Severity:** Warning

**Files where `cadenceLabel` is independently defined:**
- `frontend/src/components/subscribe-form.tsx:15-20`
- `frontend/src/app/buyer/page.tsx:18-23`
- `frontend/src/app/stores/[storeId]/page.tsx`
- `frontend/src/app/boxes/[planId]/page.tsx`
- `frontend/src/app/stores/[storeId]/boxes/page.tsx`
- `frontend/src/app/seller/stores/[storeId]/setup/review/page.tsx`
- `frontend/src/app/boxes/[planId]/qr/page.tsx`

**Before** (repeated in each file):
```typescript
function cadenceLabel(c: string) {
  if (c === "weekly") return "Weekly";
  if (c === "biweekly") return "Every two weeks";
  if (c === "monthly") return "Monthly";
  return c;
}
```

**After** (add to `frontend/src/lib/ui.ts`):
```typescript
export function cadenceLabel(c: string): string {
  if (c === "weekly") return "Weekly";
  if (c === "biweekly") return "Every two weeks";
  if (c === "monthly") return "Monthly";
  return c;
}
```

Then import from `@/lib/ui` in all 7 files.

---

### W-6. `DB == nil` guard repeated in nearly every handler

**Category:** DRY Violation / Code Organization
**Severity:** Warning

Nearly every handler starts with:
```go
if a.DB == nil {
    resp.ServiceUnavailable(w, "database not configured")
    return
}
```

This is repeated in `GetStore`, `ListStores`, `ListStorePickupWindows`, `ListPickupWindowOfferings`, `ListStorePlans`, `GetPlan`, `ListStoreReviews`, and at least 10 other handlers.

**After:** Add a middleware that checks for nil DB once at the mux level:

```go
func requireDB(db *pgxpool.Pool, next http.HandlerFunc) http.HandlerFunc {
    return func(w http.ResponseWriter, r *http.Request) {
        if db == nil {
            resp.ServiceUnavailable(w, "database not configured")
            return
        }
        next(w, r)
    }
}
```

Apply it to route groups in `handler.go` rather than in each handler.

---

### W-7. Stripe `CaptureAuthorization` error silently discarded after commit

**Category:** Error Handling Gap
**Severity:** Warning

**Files:**
- `backend/internal/api/v1/pickup_confirm.go:315`
- `backend/internal/api/v1/seller_orders.go:340` (approx.)

**Before:**
```go
if err := tx.Commit(ctx); err != nil {
    resp.Internal(w, err)
    return
}
// Capture after commit — error discarded:
_ = a.Stripe.CaptureAuthorization(ctx, trimPI, "capture-"+in.OrderID)
```

**After** (log the error at minimum, consider a retry queue):
```go
if err := a.Stripe.CaptureAuthorization(ctx, trimPI, "capture-"+in.OrderID); err != nil {
    log.Printf("stripe capture failed order=%s pi=%s: %v", in.OrderID, trimPI, err)
    // The webhook will reconcile payment_status, but logging ensures visibility.
}
```

---

### W-8. Seller store dashboard page is 966 lines

**Category:** Code Organization
**Severity:** Warning
**File:** `frontend/src/app/seller/stores/[storeId]/page.tsx` (966 lines)

This single file contains the entire seller store management UI: pickup windows list, orders list with filtering, order status management, manual pickup code entry, QR generation, payout summaries, subscription plans, products, offerings, and pickup locations. It should be decomposed into focused components.

**After:** Extract into sub-components:
- `components/seller/pickup-window-list.tsx`
- `components/seller/order-list.tsx`
- `components/seller/manual-pickup-entry.tsx`
- `components/seller/payout-summary.tsx`
- `components/seller/subscription-plan-list.tsx`

---

### W-9. `FindOrCreateCustomer` uses Stripe Search API (eventual consistency)

**Category:** Correctness
**Severity:** Warning
**File:** `backend/internal/payments/stripepay/stripepay.go:29-47`

Stripe's Customer Search API is eventually consistent. If a customer is created and then immediately searched for (e.g., user retries checkout quickly), the search may not find them, resulting in a duplicate customer.

**Before:**
```go
func (c *Client) FindOrCreateCustomer(ctx context.Context, email string, ...) (string, error) {
    searchParams := &stripe.CustomerSearchParams{}
    searchParams.Query = fmt.Sprintf("email:'%s'", email)
    iter := c.api.Customers.Search(searchParams)
    if iter.Next() {
        return iter.Customer().ID, nil
    }
    // ... create new
}
```

**After** (use List with email filter, which is consistent):
```go
func (c *Client) FindOrCreateCustomer(ctx context.Context, email string, ...) (string, error) {
    listParams := &stripe.CustomerListParams{Email: stripe.String(email)}
    listParams.Context = ctx
    listParams.Filters.AddFilter("limit", "", "1")
    iter := c.api.Customers.List(listParams)
    if iter.Next() {
        return iter.Customer().ID, nil
    }
    // ... create new
}
```

---

### W-10. `BuyerFeeBps`/`BuyerFeeFlatCts` passed to 4 separate API structs

**Category:** DRY Violation / Code Organization
**Severity:** Warning
**File:** `backend/internal/httpx/handler.go:43-71`

The same fee config values are wired into `SubscriptionAPI`, `OrdersAPI`, `OrderCheckoutAPI`, and `SellerSubscriptionAPI`:

```go
sub := v1.SubscriptionAPI{BuyerFeeBps: deps.Config.BuyerFeeBps, BuyerFeeFlatCts: deps.Config.BuyerFeeFlatCents, ...}
orders := v1.OrdersAPI{BuyerFeeBps: deps.Config.BuyerFeeBps, BuyerFeeFlatCts: deps.Config.BuyerFeeFlatCents, ...}
orderCheckout := v1.OrderCheckoutAPI{BuyerFeeBps: deps.Config.BuyerFeeBps, BuyerFeeFlatCts: deps.Config.BuyerFeeFlatCents, ...}
sellerSub := v1.SellerSubscriptionAPI{BuyerFeeBps: deps.Config.BuyerFeeBps, BuyerFeeFlatCts: deps.Config.BuyerFeeFlatCents, ...}
```

**After:** Extract a `FeeConfig` struct:
```go
type FeeConfig struct {
    BuyerFeeBps     int
    BuyerFeeFlatCts int
}

func (fc FeeConfig) ComputeBuyerFee(subtotalCents int) int {
    fee := (subtotalCents * fc.BuyerFeeBps) / 10000
    if fc.BuyerFeeFlatCts > 0 {
        fee += fc.BuyerFeeFlatCts
    }
    return fee
}
```

This also solves C-4 (duplicated fee calculation) by centralizing it.

---

### W-11. `config.FromEnv` repeats int-parsing pattern 4 times

**Category:** DRY Violation
**Severity:** Warning
**File:** `backend/internal/config/config.go:49-81`

**Before:**
```go
noShowFeeCents := 500
if v := os.Getenv("NO_SHOW_FEE_CENTS"); v != "" {
    if n, err := strconv.Atoi(v); err == nil && n >= 0 {
        noShowFeeCents = n
    }
}
buyerFeeBps := 0
if v := os.Getenv("BUYER_FEE_BPS"); v != "" {
    if n, err := strconv.Atoi(v); err == nil && n >= 0 {
        buyerFeeBps = n
    }
}
// ... repeated 2 more times
```

**After:**
```go
func envInt(key string, defaultVal int) int {
    v := os.Getenv(key)
    if v == "" {
        return defaultVal
    }
    n, err := strconv.Atoi(v)
    if err != nil || n < 0 {
        return defaultVal
    }
    return n
}

// Usage:
noShowFeeCents := envInt("NO_SHOW_FEE_CENTS", 500)
buyerFeeBps := envInt("BUYER_FEE_BPS", 0)
buyerFeeFlatCents := envInt("BUYER_FEE_FLAT_CENTS", 0)
noShowPlatformSplitBps := envInt("NO_SHOW_PLATFORM_SPLIT_BPS", 3000)
```

---

## Suggestions

### S-1. `ListStoreReviews` makes 2 separate DB queries

**Category:** Performance
**File:** `backend/internal/api/v1/public.go` (ListStoreReviews)

The handler first queries `AVG(rating)` and `COUNT(*)`, then separately queries the review list. These can be combined into a single query using a window function or CTE.

**After:**
```sql
WITH stats AS (
    SELECT avg(rating)::numeric(3,2) as avg_rating, count(*) as total
    FROM reviews WHERE store_id = $1::uuid
)
SELECT s.avg_rating, s.total, r.id::text, r.rating, r.comment, r.buyer_name, r.created_at
FROM stats s
LEFT JOIN reviews r ON r.store_id = $1::uuid
ORDER BY r.created_at DESC
LIMIT 20
```

---

### S-2. `buyerSession` deprecated shim still exported

**Category:** Dead Code
**File:** `frontend/src/lib/session.ts:44-55`

The `buyerSession` export is marked `@deprecated` but remains in the codebase. If no callers still use it, remove it.

**Action:** Search for `buyerSession` imports. If none exist, delete lines 40-55.

---

### S-3. Seller store page has unused state setters

**Category:** Dead Code
**File:** `frontend/src/app/seller/stores/[storeId]/page.tsx`

The page destructures state setters that are set during data loading but never used elsewhere in the component for mutations or updates:

```typescript
const [, setLocations] = useState<SellerPickupLocation[]>([]);
const [, setProducts] = useState<SellerProduct[]>([]);
const [, setOfferings] = useState<SellerOffering[]>([]);
```

If these values are only read (not mutated after initial load), they can be replaced with `useRef` or derived from the fetch result directly.

---

### S-4. Toast IDs use `Date.now()` (collision risk)

**Category:** Consistency / Correctness
**File:** `frontend/src/components/toast.tsx`

Using `Date.now()` for toast IDs means two rapid-fire toasts in the same millisecond share an ID, causing the second to overwrite the first.

**After:**
```typescript
let nextId = 0;
function makeToastId() { return ++nextId; }
```

---

### S-5. `extractBuyerToken` defined in `orders.go` but used across multiple files

**Category:** Code Organization
**File:** `backend/internal/api/v1/orders.go:27-35`

Like `validUUID` (W-3), `extractBuyerToken` is orders-specific in location but package-wide in usage. Move it alongside `validUUID` to a shared `validate.go` or `helpers.go` file.

---

### S-6. Dual-auth WHERE clause repeated across buyer queries

**Category:** DRY Violation
**File:** Multiple buyer endpoint handlers

The pattern `($2::text is not null AND buyer_token = $2) OR ($3::uuid is not null AND buyer_user_id = $3)` appears in at least 6 SQL queries across `buyer_orders.go` and `buyer_subscriptions.go`. Consider extracting it as a named SQL fragment or a Go helper that builds the WHERE clause.

---

### S-7. `subscriptions.go` is 1,780 lines

**Category:** Code Organization
**File:** `backend/internal/api/v1/subscriptions.go` (1,780 lines)

This file contains public plan listing, plan detail, checkout, subscribe, seller plan CRUD, and cycle generation. Consider splitting into:
- `subscription_public.go` — ListStorePlans, GetPlan
- `subscription_checkout.go` — Checkout, Subscribe
- `subscription_seller.go` — seller plan CRUD, GenerateNextCycle

---

### S-8. `checkout-form.tsx` and `subscribe-form.tsx` share ~80% structural overlap

**Category:** DRY Violation
**File:** `frontend/src/components/checkout-form.tsx` and `frontend/src/components/subscribe-form.tsx`

Both forms share: buyer info fields (email, name, phone), fee breakdown display, Stripe Elements integration, "Continue to payment" / "Complete payment below" button pattern, error handling, and success state. The primary differences are: one sends items to a pickup window, the other subscribes to a plan.

**After:** Extract a shared `CheckoutShell` component that handles the common UI skeleton (buyer fields, fee display, Stripe card, button states), and have each form provide only the domain-specific parts (items vs plan).

---

### S-9. No request timeout on the HTTP server

**Category:** Performance / Security
**File:** `backend/cmd/api/main.go:42-46`

The server sets `ReadHeaderTimeout: 5 * time.Second` but no `ReadTimeout`, `WriteTimeout`, or `IdleTimeout`. Slow clients can hold connections open indefinitely.

**After:**
```go
srv := &http.Server{
    Addr:              cfg.Addr,
    Handler:           httpx.NewHandler(...),
    ReadHeaderTimeout: 5 * time.Second,
    ReadTimeout:       30 * time.Second,
    WriteTimeout:      60 * time.Second,
    IdleTimeout:       120 * time.Second,
}
```

---

### S-10. `transferToSeller` and `fetchOrderEmailInfo` defined in `seller_orders.go` but used in `pickup_confirm.go`

**Category:** Code Organization
**File:** `backend/internal/api/v1/seller_orders.go`

These are cross-cutting helpers used by multiple API handlers. They should live in a shared file (e.g., `order_helpers.go`) to make the dependency explicit.

---

## Overall Code Health Assessment

| Dimension | Grade | Notes |
|-----------|-------|-------|
| **DRY** | B- | Several significant duplications (pickup confirm, fee calculation, cadenceLabel, plan queries). The codebase grew feature-by-feature and the refactoring pass to consolidate shared logic hasn't happened yet. |
| **Error Handling** | B | Generally solid with `resp.*` helpers and consistent patterns. The critical gap is goroutines using cancelled contexts and silently swallowed Stripe errors. |
| **Performance** | B | Good transactional integrity with SELECT FOR UPDATE. The UPDATE-on-every-read pattern for buyer linking is the main concern. DB query count is reasonable for the current scale. |
| **Code Organization** | B- | Clean package structure and consistent API handler pattern. However, several files exceed comfortable review size (subscriptions.go at 1,780 lines, seller store page at 966 lines), and shared utilities live in arbitrary files. |
| **Dead Code** | A- | Very little dead code. The deprecated `buyerSession` shim and unused state setters are minor. |
| **Consistency** | B+ | Response patterns, error messages, and auth middleware are applied consistently. Minor inconsistencies in UUID validation (some handlers validate, others don't) and error message phrasing. |

**Overall: B**

The codebase is in good shape for an early-stage product moving fast. The architecture is sound, the patterns are clear, and the code is readable. The findings above represent the natural technical debt of rapid feature development. The critical items (C-1, C-2, C-3) should be addressed before scaling to avoid production incidents.

---

## Top 5 Priority Items

1. **Fix goroutines using request context (C-1)** — This is a silent data loss bug in production. Every seller notification email and cancellation confirmation email may fail under normal load. Replace `r.Context()` with `context.Background()` + timeout in all fire-and-forget goroutines. **Effort: 30 minutes. Impact: Prevents silent email failures.**

2. **Add timeout to email HTTP client (C-2)** — A single Resend API slowdown can accumulate hundreds of hanging goroutines (especially during billing cron runs). Replace `http.DefaultClient` with a client that has a 10-second timeout. **Effort: 10 minutes. Impact: Prevents goroutine exhaustion under load.**

3. **Consolidate pickup confirmation logic (C-3)** — Two ~150-line functions doing the same thing is the highest-risk DRY violation. Any Stripe capture, inventory adjustment, or email logic change must be applied twice. Extract shared core. **Effort: 2-3 hours. Impact: Eliminates bug divergence risk.**

4. **Move buyer record linking to login (C-5)** — Running UPDATE statements on every dashboard page load is a performance concern that worsens with user growth. Move the linking logic to the authentication flow (magic link verify, Google OAuth login). **Effort: 1 hour. Impact: Removes write operations from the read path.**

5. **Extract `computeBuyerFee` to a shared location and use it everywhere (C-4)** — Three places compute the same fee differently (one function, two inline copies). A fee model change that misses one location causes checkout amount mismatches. **Effort: 30 minutes. Impact: Prevents payment amount bugs.**
