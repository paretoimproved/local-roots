# Eugene Launch Safety Net — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make Local Roots launch-ready for Eugene, OR soft launch by building critical safety-net features (refund flow, admin dashboard, refresh tokens, email unsubscribe, FAQ page) plus small UX expansions.

**Architecture:** Go backend (new endpoints + migrations) + Next.js App Router frontend (new pages + components). All new code follows existing patterns: `RequireUser`/`RequireStoreOwner` middleware, `resp.*` helpers, `lr-card`/`lr-btn` design tokens, Vitest for frontend unit tests, Go `testing` for backend.

**Tech Stack:** Go 1.22+, Next.js 16 (App Router), PostgreSQL (goose migrations), Stripe Go SDK v78, Resend, Tailwind CSS, Vitest, Playwright

**Design spec:** `docs/designs/eugene-soft-launch.md` — all design decisions are there. Reference it for tokens, layouts, interaction states, responsive behavior, and a11y.

**Branch:** `phase-9-eugene-launch-safety-net`

---

## File Structure

### New files to create:
```
backend/migrations/0032_refresh_tokens.sql          (B4)
backend/migrations/0033_email_marketing_opt_out.sql  (B5)
backend/internal/api/v1/admin.go                     (B3)
backend/internal/api/v1/admin_test.go                (B3)
backend/internal/api/v1/unsubscribe.go               (B5)
backend/internal/api/v1/unsubscribe_test.go          (B5)
frontend/src/app/help/page.tsx                       (B1)
frontend/src/app/admin/page.tsx                      (B3)
frontend/src/app/not-found.tsx                       (E5)
frontend/src/app/stores/[storeId]/not-found.tsx      (E5)
frontend/src/components/refund-modal.tsx              (B2)
frontend/src/components/how-it-works.tsx              (E4)
```

### Existing files to modify:
```
backend/internal/payments/stripepay/stripepay.go     (B2: add Refund method)
backend/internal/api/v1/stripe_webhook.go            (B2: charge.refunded + transition map)
backend/internal/api/v1/seller_orders.go             (B2: refund endpoint)
backend/internal/api/v1/auth.go                      (B4: refresh token issuance + endpoint)
backend/internal/api/v1/buyer_auth.go                (B4: refresh token on magic link verify)
backend/internal/api/v1/oauth.go                     (B4: refresh token on OAuth)
backend/internal/api/v1/public.go                    (E1: next_pickup_date in store list)
backend/internal/httpx/handler.go                    (B2,B3,B4,B5: new routes)
backend/internal/email/templates.go                  (B5: unsubscribe links in marketing)
backend/internal/email/templates_test.go             (B5: test unsubscribe link presence)
backend/internal/api/v1/webhook_logic_test.go        (B2: extend transition tests)
backend/internal/api/v1/auth_test.go                 (B4: refresh token tests)
backend/internal/api/v1/internal_email.go            (B5: check opt-out before sending)
backend/internal/api/v1/internal_cron_test.go        (B5: nil-guard for opt-out check)
frontend/src/app/globals.css                         (lr-btn-destructive token)
frontend/src/components/footer.tsx                   (B1: add Help link)
frontend/src/app/stores/page.tsx                     (E1: badge + E4: explainer)
frontend/src/app/stores/[storeId]/page.tsx           (E5: notFound() call)
frontend/src/lib/api.ts                              (E1: next_pickup_date type)
frontend/src/lib/seller-api.ts                       (B2: refundOrder method)
frontend/src/lib/session.ts                          (B4: refresh token storage)
frontend/src/app/seller/stores/[storeId]/page.tsx    (B2: refund button on orders)
frontend/src/app/seller/stores/[storeId]/setup/box/page.tsx  (E3: tips)
frontend/src/app/farms/[city]/page.tsx               (E2: Eugene content)
docs/strategy/03-go-to-market.md                     (Eugene pivot)
docs/strategy/04-ceo-strategy-memo.md                (Eugene pivot)
```

---

## Task 1: Database Migrations

**Files:**
- Create: `backend/migrations/0032_refresh_tokens.sql`
- Create: `backend/migrations/0033_email_marketing_opt_out.sql`

- [ ] **Step 1: Create refresh_tokens migration**

```sql
-- +goose Up
create table refresh_tokens (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,
  token_hash text not null,
  expires_at timestamptz not null,
  used boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_refresh_tokens_token_hash on refresh_tokens(token_hash);
create index idx_refresh_tokens_user_id on refresh_tokens(user_id);

-- +goose Down
drop table if exists refresh_tokens;
```

- [ ] **Step 2: Create email_marketing_opt_out migration**

```sql
-- +goose Up
alter table users add column email_marketing_opt_out boolean not null default false;

-- +goose Down
alter table users drop column if exists email_marketing_opt_out;
```

- [ ] **Step 3: Run migrations locally**

Run: `pnpm db:up && pnpm migrate:up`
Expected: Both migrations apply successfully. Verify with `pnpm migrate:status`.

- [ ] **Step 4: Commit**

```bash
git add backend/migrations/0032_refresh_tokens.sql backend/migrations/0033_email_marketing_opt_out.sql
git commit -m "feat: add refresh_tokens table and email_marketing_opt_out column"
```

---

## Task 2: Design Token — lr-btn-destructive

**Files:**
- Modify: `frontend/src/app/globals.css`

- [ ] **Step 1: Add destructive button token**

After the `.lr-btn-primary:focus-visible` block in globals.css, add:

```css
.lr-btn-destructive {
  border-color: rgba(179, 93, 46, 0.35);
  background: linear-gradient(135deg, rgba(179, 93, 46, 0.94), rgba(179, 93, 46, 0.82));
  color: #fbfbf8;
  min-height: 44px;
}

.lr-btn-destructive:hover {
  background: linear-gradient(135deg, rgba(179, 93, 46, 0.98), rgba(179, 93, 46, 0.88));
}

.lr-btn-destructive:focus-visible {
  outline: none;
  box-shadow: 0 0 0 4px rgba(179, 93, 46, 0.3);
}
```

- [ ] **Step 2: Verify build**

Run: `pnpm build`
Expected: No errors.

- [ ] **Step 3: Commit**

```bash
git add frontend/src/app/globals.css
git commit -m "feat: add lr-btn-destructive design token for refund actions"
```

---

## Task 3: Email Unsubscribe (B5)

**Files:**
- Create: `backend/internal/api/v1/unsubscribe.go`
- Create: `backend/internal/api/v1/unsubscribe_test.go`
- Modify: `backend/internal/httpx/handler.go` (add route)
- Modify: `backend/internal/email/templates.go` (add unsubscribe links)
- Modify: `backend/internal/email/templates_test.go` (test link presence)
- Modify: `backend/internal/api/v1/internal_email.go` (check opt-out)

- [ ] **Step 1: Write unsubscribe endpoint tests**

Create `backend/internal/api/v1/unsubscribe_test.go` with:
- `TestGenerateUnsubscribeToken` — generates valid HMAC token
- `TestValidateUnsubscribeToken` — valid token passes, expired/invalid fails
- `TestUnsubscribeHandler_NilDB` — nil guard returns 503

Pattern: follow `internal_cron_test.go` for nil-guard pattern.
The token is an HMAC-SHA256 of `email + expiry` signed with `JWTSecret`.

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd backend && go test ./internal/api/v1/ -run TestUnsubscribe -v`
Expected: FAIL (functions don't exist yet)

- [ ] **Step 3: Implement unsubscribe endpoint**

Create `backend/internal/api/v1/unsubscribe.go`:
- `UnsubscribeAPI` struct with `DB *pgxpool.Pool`, `JWTSecret string`
- `generateUnsubscribeToken(email string, secret string) string` — HMAC token with 30-day expiry
- `validateUnsubscribeToken(token string, secret string) (email string, err error)` — parse and verify
- `Unsubscribe(w, r)` handler — GET /v1/unsubscribe?token=... → set `email_marketing_opt_out = true`
- `UnsubscribeLink(email, frontendURL, secret string) string` — helper for templates

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd backend && go test ./internal/api/v1/ -run TestUnsubscribe -v`
Expected: PASS

- [ ] **Step 5: Add unsubscribe links to marketing templates**

In `backend/internal/email/templates.go`, add unsubscribe footer to:
- `MilestoneCelebration`
- `LapsedSubscriberNudge`
- `WaitlistNotification`

Each template's HTML body gets: `<p style="..."><a href="{unsubscribe_url}">Unsubscribe from marketing emails</a></p>`

Do NOT add to transactional templates: `PickupReminder`, `OrderConfirmation`, `SubscriptionConfirmation`, `PostPickupReviewPrompt`, `SellerWeeklyDigest`.

- [ ] **Step 6: Extend template tests**

In `backend/internal/email/templates_test.go`, add to the `TestTemplatesReturnNonEmpty` table:
- Verify `MilestoneCelebration` body contains "Unsubscribe"
- Verify `LapsedSubscriberNudge` body contains "Unsubscribe"
- Verify `WaitlistNotification` body contains "Unsubscribe"
- Verify `PickupReminder` body does NOT contain "Unsubscribe"

- [ ] **Step 7: Add opt-out check to marketing email send paths**

In `internal_email.go` and cron functions that send marketing emails, add a DB check:
```go
var optedOut bool
_ = db.QueryRow(ctx, `SELECT email_marketing_opt_out FROM users WHERE lower(email) = lower($1)`, email).Scan(&optedOut)
if optedOut { continue }
```

- [ ] **Step 8: Wire route in handler.go**

Add to `handler.go`:
```go
unsub := v1.UnsubscribeAPI{DB: deps.DB, JWTSecret: deps.Config.JWTSecret}
mux.HandleFunc("GET /v1/unsubscribe", unsub.Unsubscribe)
```

- [ ] **Step 9: Run all backend tests**

Run: `cd backend && go test ./...`
Expected: ALL PASS

- [ ] **Step 10: Commit**

```bash
git add backend/internal/api/v1/unsubscribe.go backend/internal/api/v1/unsubscribe_test.go \
  backend/internal/email/templates.go backend/internal/email/templates_test.go \
  backend/internal/api/v1/internal_email.go backend/internal/httpx/handler.go
git commit -m "feat: email unsubscribe with signed tokens (CAN-SPAM compliance)"
```

---

## Task 4: Next Pickup Badge (E1)

**Files:**
- Modify: `backend/internal/api/v1/public.go` (add next_pickup_date to store list query)
- Modify: `frontend/src/lib/api.ts` (add type)
- Modify: `frontend/src/app/stores/page.tsx` (render badge)

- [ ] **Step 1: Add next_pickup_date to backend store list query**

In `public.go` `ListStores`, modify the SQL query to include a lateral join:
```sql
LEFT JOIN LATERAL (
  SELECT start_at FROM pickup_windows
  WHERE pickup_windows.store_id = s.id
    AND status = 'published'
    AND start_at > now()
  ORDER BY start_at LIMIT 1
) npw ON true
```
Add `npw.start_at as next_pickup_date` to the SELECT. Return it in the JSON response.

- [ ] **Step 2: Update frontend Store type**

In `frontend/src/lib/api.ts`, add `next_pickup_date?: string` to the Store type.

- [ ] **Step 3: Render badge on store cards**

In `frontend/src/app/stores/page.tsx`, in the store card rendering, add:
```tsx
{store.next_pickup_date && (
  <span className="lr-chip px-2.5 py-0.5 text-xs font-medium" style={{ color: 'var(--lr-leaf)' }}>
    Next: {new Date(store.next_pickup_date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
  </span>
)}
```

If no `next_pickup_date`, omit the badge entirely (subtraction default).

- [ ] **Step 4: Verify with typecheck + lint**

Run: `pnpm typecheck && pnpm lint`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add backend/internal/api/v1/public.go frontend/src/lib/api.ts frontend/src/app/stores/page.tsx
git commit -m "feat: next pickup date badge on store cards"
```

---

## Task 5: FAQ/Help Page (B1)

**Files:**
- Create: `frontend/src/app/help/page.tsx`
- Modify: `frontend/src/components/footer.tsx` (add Help link)

- [ ] **Step 1: Create help page**

Create `frontend/src/app/help/page.tsx`. Static server component.
Design spec from plan: 2-column (buyer/seller) on desktop, stacked mobile. `lr-card` sections with serif headings. Flat list. Contact email at bottom.

Buyer questions: How do I pick up my box? How do I pause/cancel? What if something is wrong?
Seller questions: How do I set up my store? How do I get paid? How do refunds work?

Bottom CTA: "Still need help? Email us at hello@localroots.com"

- [ ] **Step 2: Add Help link to footer**

In `frontend/src/components/footer.tsx`, add `{ label: "Help", href: "/help" }` to the nav links array.

- [ ] **Step 3: Verify**

Run: `pnpm typecheck && pnpm lint`
Expected: PASS

- [ ] **Step 4: Commit**

```bash
git add frontend/src/app/help/page.tsx frontend/src/components/footer.tsx
git commit -m "feat: FAQ/help page with buyer and seller guidance"
```

---

## Task 6: Not-Found Pages (E5)

**Files:**
- Create: `frontend/src/app/not-found.tsx`
- Create: `frontend/src/app/stores/[storeId]/not-found.tsx`

- [ ] **Step 1: Create global not-found page**

`frontend/src/app/not-found.tsx`: Centered `lr-card-strong` with Local Roots logo, serif 2xl heading "Page not found", muted body text, `lr-btn-primary` linking to `/stores`.

- [ ] **Step 2: Create store-specific not-found**

`frontend/src/app/stores/[storeId]/not-found.tsx`: "This farm isn't on Local Roots yet" + browse CTA. Call `notFound()` from the store page when API returns 404.

- [ ] **Step 3: Update store detail page to trigger notFound()**

In `frontend/src/app/stores/[storeId]/page.tsx`, when the API returns a 404 for the store, call `notFound()` from `next/navigation`.

- [ ] **Step 4: Verify**

Run: `pnpm typecheck && pnpm lint`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add frontend/src/app/not-found.tsx frontend/src/app/stores/\[storeId\]/not-found.tsx \
  frontend/src/app/stores/\[storeId\]/page.tsx
git commit -m "feat: custom 404 pages for global and store routes"
```

---

## Task 7: "How It Works" Explainer (E4)

**Files:**
- Create: `frontend/src/components/how-it-works.tsx`
- Modify: `frontend/src/app/stores/page.tsx`

- [ ] **Step 1: Create component**

3-step explainer: "1. Subscribe to a farm box. 2. Pick up weekly at the farm. 3. Fresh, local food on repeat."
Serif numbered headings, base body text. 3-column on desktop (grid-cols-3), stacked on mobile. No icons.

- [ ] **Step 2: Add to stores browse page**

Insert `<HowItWorks />` above the store list in `frontend/src/app/stores/page.tsx`.

- [ ] **Step 3: Commit**

```bash
git add frontend/src/components/how-it-works.tsx frontend/src/app/stores/page.tsx
git commit -m "feat: how-it-works explainer on store browse page"
```

---

## Task 8: Seller Onboarding Tips (E3) + Eugene Landing (E2)

**Files:**
- Modify: `frontend/src/app/seller/stores/[storeId]/setup/box/page.tsx` (E3)
- Modify: `frontend/src/app/farms/[city]/page.tsx` (E2)

- [ ] **Step 1: Add inline tips to box setup**

In the box creation form, add tip text in `--lr-muted` below relevant fields:
- Title: "Tip: Keep it descriptive — 'Weekly Veggie Box' or 'Farm Fresh Egg Share'"
- Description: "Tip: Mention specific items like 'seasonal greens, fresh eggs, and honey'"
- Price: "Tip: Most farm boxes in your area are $35-55/week"

- [ ] **Step 2: Add Eugene-specific content to city page**

In `frontend/src/app/farms/[city]/page.tsx`, add conditional:
```tsx
{slug === 'eugene-or' && (
  <section className="lr-card p-6 mb-8">
    <h2 className="font-serif text-xl mb-2">Local Food in Eugene</h2>
    <p className="text-[--lr-muted] text-sm">
      Eugene's Willamette Valley is home to some of Oregon's finest small farms.
      From the Lane County Farmers Market to neighborhood farm stands, local food
      is part of the culture here. Subscribe to a farm box and pick up fresh,
      seasonal food on your schedule.
    </p>
  </section>
)}
```

- [ ] **Step 3: Commit**

```bash
git add frontend/src/app/seller/stores/\[storeId\]/setup/box/page.tsx \
  frontend/src/app/farms/\[city\]/page.tsx
git commit -m "feat: seller onboarding tips and Eugene landing page content"
```

---

## Task 9: Admin Dashboard (B3)

**Files:**
- Create: `backend/internal/api/v1/admin.go`
- Create: `backend/internal/api/v1/admin_test.go`
- Modify: `backend/internal/httpx/handler.go`
- Create: `frontend/src/app/admin/page.tsx`

- [ ] **Step 1: Write admin middleware + endpoint tests**

Create `backend/internal/api/v1/admin_test.go`:
- `TestRequireAdmin_AdminAllowed` — JWT with role=admin passes
- `TestRequireAdmin_SellerDenied` — JWT with role=seller returns 403
- `TestRequireAdmin_NoJWT` — missing auth returns 401
- `TestAdminDashboard_NilDB` — nil guard returns 503

Pattern: follow `auth_test.go` for JWT creation, `internal_cron_test.go` for nil guards.

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd backend && go test ./internal/api/v1/ -run TestRequireAdmin -v && go test ./internal/api/v1/ -run TestAdminDashboard -v`
Expected: FAIL

- [ ] **Step 3: Implement admin.go**

Create `backend/internal/api/v1/admin.go`:
- `AdminAPI` struct with `DB`, `JWTSecret`
- `RequireAdmin(next func(w, r, AuthUser)) http.HandlerFunc` — like `RequireUser` but also checks `u.Role == "admin"`
- `Dashboard(w, r, u AuthUser)` — aggregated query returning:
  ```json
  {
    "active_stores": 12,
    "total_subscribers": 142,
    "recent_orders": [...],
    "pickup_completion_rate": 0.94,
    "total_revenue_cents": 45000
  }
  ```
- Aggregate SQL: count stores (is_live=true), count subscriptions (status='active'), recent 20 orders with store name, pickup rate from last 30 days, sum captured_cents.

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd backend && go test ./internal/api/v1/ -run "TestRequireAdmin|TestAdminDashboard" -v`
Expected: PASS

- [ ] **Step 5: Wire routes in handler.go**

```go
admin := v1.AdminAPI{DB: deps.DB, JWTSecret: deps.Config.JWTSecret}
mux.HandleFunc("GET /v1/admin/dashboard", admin.RequireAdmin(admin.Dashboard))
```

- [ ] **Step 6: Create frontend admin page**

Create `frontend/src/app/admin/page.tsx`. Client component with:
- Auth check (redirect non-admin users)
- 4 `lr-card-strong` metric cards in a grid
- Recent orders table in `lr-card`
- Empty state: "No activity yet. Metrics appear after your first pickup."
- Skeleton loading state
- `lr-animate` on content render

- [ ] **Step 7: Run all tests**

Run: `cd backend && go test ./... && cd ../frontend && pnpm typecheck && pnpm lint`
Expected: ALL PASS

- [ ] **Step 8: Commit**

```bash
git add backend/internal/api/v1/admin.go backend/internal/api/v1/admin_test.go \
  backend/internal/httpx/handler.go frontend/src/app/admin/page.tsx
git commit -m "feat: read-only admin dashboard with metrics"
```

---

## Task 10: Seller-Initiated Refund (B2)

**Files:**
- Modify: `backend/internal/payments/stripepay/stripepay.go` (Refund method)
- Modify: `backend/internal/api/v1/seller_orders.go` (refund endpoint)
- Modify: `backend/internal/api/v1/stripe_webhook.go` (charge.refunded handler + transition)
- Modify: `backend/internal/api/v1/webhook_logic_test.go` (extend transition tests)
- Modify: `backend/internal/httpx/handler.go` (route)
- Modify: `frontend/src/lib/seller-api.ts` (refundOrder method)
- Create: `frontend/src/components/refund-modal.tsx`
- Modify: `frontend/src/app/seller/stores/[storeId]/page.tsx` (refund button)

- [ ] **Step 1: Write transition test for paid → refunded**

In `backend/internal/api/v1/webhook_logic_test.go`, add to the `TestValidPaymentTransition` table:
```go
{"paid", "refunded", true},
{"refunded", "paid", false},    // no backward
{"authorized", "refunded", false}, // must be paid first
```

- [ ] **Step 2: Run test to verify paid→refunded fails**

Run: `cd backend && go test ./internal/api/v1/ -run TestValidPaymentTransition -v`
Expected: FAIL on `{"paid", "refunded", true}`

- [ ] **Step 3: Update validPaymentTransition map**

In `stripe_webhook.go`, add to the `allowed` map:
```go
"paid": {"refunded": true},
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd backend && go test ./internal/api/v1/ -run TestValidPaymentTransition -v`
Expected: PASS

- [ ] **Step 5: Add Refund method to Stripe client**

In `stripepay.go`, add:
```go
func (c *Client) Refund(ctx context.Context, paymentIntentID string) (string, error) {
    if !c.Enabled() { return "", ErrNotConfigured }
    params := &stripe.RefundParams{
        PaymentIntent: stripe.String(paymentIntentID),
    }
    params.Context = ctx
    r, err := c.api.Refunds.New(params)
    if err != nil { return "", err }
    return r.ID, nil
}
```

Full refund only (no amount parameter — refunds entire PaymentIntent).

- [ ] **Step 6: Add charge.refunded webhook handler**

In `stripe_webhook.go`, add a new case in the switch:
```go
case "charge.refunded":
    var ch stripe.Charge
    if err := json.Unmarshal(ev.Data.Raw, &ch); err == nil && ch.PaymentIntent != nil {
        if err := a.updatePaymentByPI(ctx, ch.PaymentIntent.ID, "refunded", nil, false); err != nil {
            resp.Internal(w, err)
            return
        }
    }
```

Note: `charge.refunded` contains a Charge object, not a PaymentIntent. Access PI via `ch.PaymentIntent.ID`.

- [ ] **Step 7: Add refund endpoint to seller_orders.go**

Add `RefundOrder(w, r, u AuthUser, sc StoreContext)` method to `SellerOrdersAPI`:
- Parse orderId from URL path
- Query order with `for update`: check `payment_status = 'paid'` AND `status in ('picked_up', 'ready')`
- If already refunded, return 200 (idempotent)
- If not refundable, return 400 with reason
- Call `a.Stripe.Refund(ctx, stripePaymentIntentID)`
- On Stripe error, return 500 (DB state unchanged — webhook-only update pattern)
- On success, return 200 `{"ok": true, "message": "Refund initiated"}`
- The actual `payment_status` update to `refunded` happens via the `charge.refunded` webhook

- [ ] **Step 8: Wire route in handler.go**

```go
mux.HandleFunc("POST /v1/seller/stores/{storeId}/orders/{orderId}/refund",
    authAPI.RequireUser(v1.RequireStoreOwner(deps.DB, sellerOrders.RefundOrder)))
```

- [ ] **Step 9: Run backend tests**

Run: `cd backend && go test ./...`
Expected: ALL PASS

- [ ] **Step 10: Add refundOrder to frontend seller API**

In `frontend/src/lib/seller-api.ts`, add:
```typescript
async refundOrder(storeId: string, orderId: string): Promise<{ ok: boolean; message: string }> {
    return requestJSON(`/v1/seller/stores/${storeId}/orders/${orderId}/refund`, {
        method: 'POST', token: this.token,
    });
}
```

- [ ] **Step 11: Create refund confirmation modal**

Create `frontend/src/components/refund-modal.tsx`:
- Props: `isOpen`, `onClose`, `onConfirm`, `orderAmount`, `buyerName`, `loading`
- Frosted glass backdrop, `lr-card-strong` content, focus trap
- "Refund this order?" heading, order details, warning text
- Cancel (lr-btn) + Refund $X (lr-btn-destructive) buttons
- `aria-modal="true"`, `role="dialog"`, `Escape` closes
- Button disabled + spinner while loading

- [ ] **Step 12: Add refund button to seller order detail**

In the seller dashboard order view, show "Refund" button (lr-btn ghost style) only when `payment_status === 'paid'` AND `status === 'picked_up' || status === 'ready'`.
Clicking opens RefundModal. On confirm, call `refundOrder()`, show success/error toast.

- [ ] **Step 13: Verify**

Run: `pnpm typecheck && pnpm lint`
Expected: PASS

- [ ] **Step 14: Commit**

```bash
git add backend/internal/payments/stripepay/stripepay.go \
  backend/internal/api/v1/seller_orders.go backend/internal/api/v1/stripe_webhook.go \
  backend/internal/api/v1/webhook_logic_test.go backend/internal/httpx/handler.go \
  frontend/src/lib/seller-api.ts frontend/src/components/refund-modal.tsx \
  frontend/src/app/seller/stores/\[storeId\]/page.tsx
git commit -m "feat: seller-initiated refund flow with Stripe integration"
```

---

## Task 11: Refresh Token Rotation (B4) ⚠️ HIGHEST RISK

**Files:**
- Modify: `backend/internal/api/v1/auth.go` (refresh endpoint + token issuance)
- Modify: `backend/internal/api/v1/buyer_auth.go` (issue refresh on verify)
- Modify: `backend/internal/api/v1/oauth.go` (issue refresh on OAuth)
- Modify: `backend/internal/api/v1/auth_test.go` (refresh tests)
- Modify: `backend/internal/httpx/handler.go` (route)
- Modify: `frontend/src/lib/session.ts` (refresh token storage)
- Modify: `frontend/src/lib/api.ts` or create `frontend/src/lib/auth-refresh.ts` (401 intercept)

- [ ] **Step 1: Write refresh token tests**

In `backend/internal/api/v1/auth_test.go`, add:
- `TestGenerateRefreshToken` — generates 32-byte hex token
- `TestHashRefreshToken` — SHA256 hash is deterministic
- `TestRefreshEndpoint_HappyPath` — valid refresh returns new JWT + new refresh token (requires DB)
- `TestRefreshEndpoint_ExpiredToken` — returns 401
- `TestRefreshEndpoint_UsedToken` — replay returns 401
- `TestRefreshEndpoint_MissingToken` — returns 400

Note: Happy path test requires real DB (integration test pattern). Use `DATABASE_URL` env var with isolated schema like `orders_integration_test.go`.

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd backend && go test ./internal/api/v1/ -run TestRefresh -v`
Expected: FAIL

- [ ] **Step 3: Implement refresh token helpers in auth.go**

Add to `auth.go`:
```go
func generateRefreshToken() (string, error) {
    b := make([]byte, 32)
    if _, err := rand.Read(b); err != nil { return "", err }
    return hex.EncodeToString(b), nil
}

func hashRefreshToken(token string) string {
    h := sha256.Sum256([]byte(token))
    return hex.EncodeToString(h[:])
}
```

Add `issueTokenPair(ctx, w, db, jwtSecret, userID, role, tokenVersion)` helper:
- Signs JWT (4h TTL, same as today)
- Generates refresh token, stores hash in DB with 30-day expiry
- Returns `AuthResponse` with `token` (JWT) and `refresh_token` (opaque)

Update `AuthResponse`:
```go
type AuthResponse struct {
    Token        string   `json:"token"`
    RefreshToken string   `json:"refresh_token,omitempty"`
    User         AuthUser `json:"user"`
}
```

- [ ] **Step 4: Implement Refresh endpoint**

Add `Refresh(w, r)` to `AuthAPI`:
- Parse `{ "refresh_token": "..." }` from body
- Hash the token, query DB: `SELECT id, user_id, used, expires_at FROM refresh_tokens WHERE token_hash = $1`
- If not found → 401
- If `used = true` → 401 (replay attack)
- If `expires_at < now()` → 401
- Mark as used: `UPDATE refresh_tokens SET used = true, updated_at = now() WHERE id = $1`
- Look up user: `SELECT id, email, role, display_name, token_version FROM users WHERE id = $1`
- Issue new token pair via `issueTokenPair`
- Return new `AuthResponse`

- [ ] **Step 5: Update all token issuance paths**

Modify these to use `issueTokenPair` instead of just `auth.SignJWT`:
- `auth.go:Login` (line ~100)
- `auth.go:Register` (line ~166)
- `buyer_auth.go:Verify` (line ~172)
- `oauth.go:issueToken` (line ~196)

- [ ] **Step 6: Wire route in handler.go**

```go
mux.HandleFunc("POST /v1/auth/refresh", WithRateLimit("auth", authAPI.Refresh))
```

- [ ] **Step 7: Run backend tests**

Run: `cd backend && go test ./...`
Expected: ALL PASS

- [ ] **Step 8: Update frontend session storage**

In `frontend/src/lib/session.ts`, add:
```typescript
getRefreshToken(): string | null { return localStorage.getItem('localroots_refresh_token') },
setRefreshToken(token: string) { localStorage.setItem('localroots_refresh_token', token) },
clearRefreshToken() { localStorage.removeItem('localroots_refresh_token') },
```

Update `clearToken` to also clear refresh token.
Update all login/auth response handlers to store both tokens.

- [ ] **Step 9: Add 401 refresh interceptor**

In `frontend/src/lib/api.ts` (or new `auth-refresh.ts`), modify the 401 handler:
- Before redirecting to login, check if refresh token exists
- If yes, attempt `POST /v1/auth/refresh` with the refresh token
- If refresh succeeds, store new tokens, retry original request
- If refresh fails, clear all tokens and redirect to login
- Auth pages (regex: `/^\/(seller|buyer)\/(login|register|auth)/) are excluded — their 401s are login failures, not session expiry (documented in CLAUDE.md Common Mistakes)

Keep it simple: no request queuing. One refresh attempt. If it fails, redirect.

- [ ] **Step 10: Verify frontend**

Run: `pnpm typecheck && pnpm lint`
Expected: PASS

- [ ] **Step 11: Commit**

```bash
git add backend/internal/api/v1/auth.go backend/internal/api/v1/auth_test.go \
  backend/internal/api/v1/buyer_auth.go backend/internal/api/v1/oauth.go \
  backend/internal/httpx/handler.go \
  frontend/src/lib/session.ts frontend/src/lib/api.ts
git commit -m "feat: refresh token rotation with 30-day lifetime"
```

---

## Task 12: Sentry Integration

**Files:**
- Modify: `backend/cmd/api/main.go` (Sentry init)
- Modify: `frontend/next.config.ts` or add Sentry config files

- [ ] **Step 1: Add Sentry Go SDK**

Run: `cd backend && go get github.com/getsentry/sentry-go`

- [ ] **Step 2: Initialize Sentry in main.go**

Add at top of `main()`:
```go
if dsn := os.Getenv("SENTRY_DSN"); dsn != "" {
    if err := sentry.Init(sentry.ClientOptions{Dsn: dsn, Environment: cfg.Env}); err != nil {
        log.Printf("sentry init: %v", err)
    }
    defer sentry.Flush(2 * time.Second)
}
```

- [ ] **Step 3: Add @sentry/nextjs to frontend**

Run: `cd frontend && pnpm add @sentry/nextjs`
Follow Next.js App Router Sentry setup: create `sentry.client.config.ts`, `sentry.server.config.ts`, update `next.config.ts` with `withSentryConfig`.

- [ ] **Step 4: Verify builds**

Run: `cd backend && go build ./cmd/api && cd ../frontend && pnpm build`
Expected: PASS (Sentry init is no-op without SENTRY_DSN env var)

- [ ] **Step 5: Commit**

```bash
git add backend/cmd/api/main.go backend/go.mod backend/go.sum \
  frontend/sentry.client.config.ts frontend/sentry.server.config.ts \
  frontend/next.config.ts frontend/package.json frontend/pnpm-lock.yaml
git commit -m "feat: Sentry error tracking (free tier) for backend and frontend"
```

---

## Task 13: Strategy Docs Update

**Files:**
- Modify: `docs/strategy/03-go-to-market.md`
- Modify: `docs/strategy/04-ceo-strategy-memo.md`

- [ ] **Step 1: Update go-to-market doc**

Replace Austin, TX references with Eugene, OR. Update farmer acquisition playbook to reference Lane County Farmers Market. Keep the strategy framework intact.

- [ ] **Step 2: Update CEO strategy memo**

Update target city references. Add note about Eugene as first market with rationale (smaller city, stronger local food culture, easier density).

- [ ] **Step 3: Commit**

```bash
git add docs/strategy/03-go-to-market.md docs/strategy/04-ceo-strategy-memo.md
git commit -m "docs: update strategy docs for Eugene, OR launch target"
```

---

## Task 14: Final Verification

- [ ] **Step 1: Run all backend tests**

Run: `cd backend && go test ./...`
Expected: ALL PASS

- [ ] **Step 2: Run frontend typecheck + lint**

Run: `pnpm typecheck && pnpm lint`
Expected: PASS

- [ ] **Step 3: Build frontend**

Run: `pnpm build`
Expected: PASS with no errors

- [ ] **Step 4: Manual smoke test**

Start local dev: `pnpm db:up && pnpm migrate:up && pnpm seed && pnpm dev:backend` (terminal 1) + `pnpm dev` (terminal 2)
Verify:
- `/help` page loads with buyer/seller FAQ sections
- `/stores` shows "How it works" explainer + next pickup badges
- `/admin` shows dashboard (login as admin first)
- 404 page renders for `/stores/nonexistent-uuid`
- Store browse in Eugene shows local content

- [ ] **Step 5: Final commit (if any fixes needed)**

```bash
git add -A
git commit -m "fix: address issues found in smoke testing"
```
