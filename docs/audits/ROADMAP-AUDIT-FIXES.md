# Audit Fix Roadmap — Prioritized by Impact & Urgency

**Date:** 2026-02-27
**Sources:** 8 audits (Security, Staff Engineer, UX/A11y, Growth, Product Manager, CFO v1/v2, Data Analyst)

---

## Priority Framework

- **P0 — Ship This Week**: Blocks real users or money, minimal effort
- **P1 — This Sprint (1-2 weeks)**: High-impact reliability/security, prevents production incidents
- **P2 — Next Sprint (2-4 weeks)**: Growth enablers, conversion fixes, retention features
- **P3 — Weeks 4-8**: Code quality, scalability, competitive parity
- **P4 — Backlog**: Polish, future-proofing, nice-to-haves

---

## P0 — Ship This Week

These are either actively dangerous or blocking real revenue.

### 1. Fix Stripe Customer Search Query Injection
**Source:** Security C-1 | Staff W-9
**Risk:** Critical — attacker can hijack another buyer's Stripe customer record
**Fix:** Replace `fmt.Sprintf("email:'%s'", email)` with Stripe List API (exact-match `email` filter). Also fixes the eventual consistency issue.
**File:** `backend/internal/payments/stripepay/stripepay.go:36`
**Effort:** 30 min

### 2. Delete Sensitive .env Files + Harden .gitignore
**Source:** Security C-2
**Risk:** Critical — production credentials on disk, one bad `git add .` from exposure
**Fix:** Delete `.env.vercel.tmp`, `.env.prod.tmp`. Add `*.tmp`, `.env.*.tmp` to `.gitignore`. Rotate any exposed keys.
**Effort:** 15 min

### 3. Fix Goroutines Using Request Context (Silent Email Failures)
**Source:** Security M-7 | Staff C-1
**Risk:** Critical — seller notification emails and cancellation emails silently fail in production
**Fix:** Replace `ctx` (from `r.Context()`) with `context.WithTimeout(context.Background(), 10*time.Second)` in all fire-and-forget goroutines.
**Files:** `orders.go:373`, `subscriptions.go:803`, `buyer_subscriptions.go:332`
**Effort:** 30 min

### 4. Add Timeout to Email HTTP Client
**Source:** Staff C-2
**Risk:** Critical — Resend API slowdown accumulates hanging goroutines, eventual OOM
**Fix:** Replace `http.DefaultClient` with `&http.Client{Timeout: 10 * time.Second}`
**File:** `backend/internal/email/email.go:56`
**Effort:** 10 min

### 5. Remove Developer-Facing Error Messages from Production
**Source:** UX 6.2 | Growth B5
**Risk:** High — users see Postgres setup instructions; erodes trust, exposes internals
**Fix:** Gate debug instructions behind `process.env.NODE_ENV === "development"`. Show user-friendly error.
**File:** `frontend/src/app/stores/page.tsx:353-368`
**Effort:** 15 min

### 6. Verify Production Fee Configuration
**Source:** CFO v1 Finding 1 (partially resolved by v2 defaults)
**Risk:** Critical — if `BUYER_FEE_BPS` is overridden to 0 in Railway, all transactions generate zero revenue
**Fix:** Check Railway env vars. Defaults are now 700/35 in code, but any override to 0 would still apply.
**Effort:** 5 min (ops check)

---

## P1 — This Sprint (1-2 weeks)

High-impact security/reliability fixes and the biggest DRY violations.

### 7. Reduce JWT Lifetime from 30 Days → 4 Hours + Add Token Versioning
**Source:** Security H-1
**Risk:** High — stolen tokens remain valid for 30 days with no revocation
**Fix:** Reduce TTL, add `token_version` column to `users`, embed in JWT, reject stale tokens in `RequireUser`.
**Files:** `auth.go:97,160`, `buyer_auth.go:169`, `oauth.go:195`, new migration
**Effort:** 3-4 hours

### 8. Add Rate Limiting to Unprotected Endpoints
**Source:** Security H-3
**Risk:** High — order creation spam, Google Places API abuse (billing risk)
**Fix:** Apply "checkout" tier to order creation, "default" to remaining endpoints, new "geo" tier (20/min) for public geocoding.
**File:** `backend/internal/httpx/handler.go:64-76`
**Effort:** 1-2 hours

### 9. Fix Buyer Token in URL Query Parameters (Referrer Leakage)
**Source:** Security H-4
**Risk:** High — auth tokens leak via Referer headers, browser history, server logs
**Fix:** Set `Referrer-Policy: no-referrer` on buyer pages. Add `rel="noreferrer"` to external links. Long-term: switch to session cookies.
**Files:** Multiple backend + frontend files
**Effort:** 2-3 hours (quick mitigation); larger for cookie migration

### 10. Add Brute Force Protection on Pickup Code Verification
**Source:** Security H-5
**Risk:** High — no rate limit or lockout on pickup code attempts
**Fix:** Rate limit confirmation endpoints (5 attempts/min/order), progressive delays after 3 failures.
**Files:** `seller_orders.go:464`, `pickup_confirm.go:255`
**Effort:** 1-2 hours

### 11. Add Security Headers Middleware
**Source:** Security M-3
**Risk:** Medium — missing HSTS, nosniff, X-Frame-Options, Referrer-Policy
**Fix:** Add middleware setting standard security headers.
**File:** `backend/internal/httpx/handler.go`
**Effort:** 30 min

### 12. Consolidate Pickup Confirmation Logic (DRY)
**Source:** Staff C-3
**Risk:** Critical code quality — two ~150-line functions with identical logic will diverge
**Fix:** Extract shared `executePickupConfirm()` function, both handlers call it after input validation.
**Files:** `seller_orders.go:410-540`, `pickup_confirm.go:185-391`
**Effort:** 2-3 hours

### 13. Extract `computeBuyerFee` to Shared Location
**Source:** Staff C-4
**Risk:** Critical — fee formula in 3 places; mismatch = payment bugs
**Fix:** Move `computeBuyerFee` to shared file/package, replace inline copies.
**Files:** `subscriptions.go:370`, `orders.go:280`, `order_checkout.go:122`
**Effort:** 30 min

### 14. Move Buyer Record Linking to Login (Not Every Page Load)
**Source:** Staff C-5
**Risk:** Critical performance — UPDATE on every dashboard visit, worsens with scale
**Fix:** Run `linkBuyerRecords()` in `Verify()` and `GoogleLogin()`, make `ListOrders`/`ListSubscriptions` pure reads.
**Files:** `buyer_auth.go:209-215,271-277`
**Effort:** 1 hour

### 15. Add `role="alert"` to ErrorAlert + Focus Indicators on Buttons/Fields
**Source:** UX 1.1, 1.2, 1.3, 1.7
**Risk:** Critical accessibility — keyboard users can't see focus, errors not announced to screen readers
**Fix:** Add `:focus-visible` styles to `.lr-btn`, `.lr-field`, `.lr-chip`, `.lr-card`. Add `role="alert"` to ErrorAlert.
**Files:** `globals.css`, `error-alert.tsx`
**Effort:** 1 hour

### 16. Fix Color Contrast for `--lr-muted`
**Source:** UX 1.4
**Risk:** Critical a11y — muted text fails WCAG 1.4.3 at small sizes (used everywhere)
**Fix:** Darken `--lr-muted` from `#5a5549` to `#4a463c` (~5.2:1 contrast ratio)
**File:** `frontend/src/app/globals.css:3-14`
**Effort:** 5 min

---

## P2 — Next Sprint (2-4 weeks)

Growth enablers, conversion improvements, and essential new features.

### 17. Add SEO Infrastructure (sitemap, robots.txt, per-page metadata, OG tags)
**Source:** Growth SEO1-SEO4, SEO7-SEO10
**Risk:** High growth blocker — pages invisible to search engines, shared links show no preview
**Fix:** Add `app/sitemap.ts`, `app/robots.ts`. Add `export const metadata` to all public pages. Add Open Graph tags.
**Effort:** 1 day

### 18. Fix Dead Footer Links
**Source:** Growth X4 | UX 3.1
**Risk:** High trust — every footer link goes to `#`
**Fix:** Link Policies to `/policies`, add real contact email, remove dead links until content exists.
**File:** `frontend/src/components/footer.tsx`
**Effort:** 30 min

### 19. Rewrite Hero Copy + Landing Page Improvements
**Source:** Growth L1-L6
**Risk:** High conversion — hero fails the 5-second test, no social proof anywhere
**Fix:** Update headline to "Subscribe to your farmer", add farm count, rewrite CTA to first-person.
**File:** `frontend/src/app/page.tsx`
**Effort:** 2-3 hours

### 20. Add Skip-to-Content Link + Nav aria-labels
**Source:** UX 1.5, 1.6, 3.4
**Risk:** High a11y — keyboard users can't bypass navigation, screen readers can't distinguish navs
**Fix:** Add skip link as first child of body, add `aria-label` to all `<nav>` elements, add breadcrumb labels.
**Files:** `layout.tsx`, store/box/pickup-window detail pages
**Effort:** 1 hour

### 21. Replace Token Jargon with Sign-In Prompts
**Source:** UX 3.3 | Growth B22-B23
**Risk:** High usability — buyers see "Paste the token" developer language
**Fix:** Replace with "Sign in to view this order" + sign-in buttons.
**Files:** `orders/[orderId]/page.tsx`, `subscriptions/[subscriptionId]/page.tsx`
**Effort:** 2-3 hours

### 22. Add Pickup Info to Post-Checkout Success
**Source:** UX 5.1
**Risk:** High user flow — buyers don't know when/where to pick up after ordering
**Fix:** Show pickup date/time and location on checkout success view.
**File:** `frontend/src/components/checkout-form.tsx:141-198`
**Effort:** 1-2 hours

### 23. Add Analytics DB Columns (canceled_at, cancel_reason, picked_up_at)
**Source:** Data Analyst 4.4
**Risk:** Medium — cancellation reasons are captured in UI but discarded; no precise lifecycle timestamps
**Fix:** Migration to add `canceled_at`, `cancel_reason`, `paused_at` to subscriptions; `picked_up_at` to orders.
**Effort:** 1-2 hours (migration + backend updates)

### 24. Persist Cancellation Reasons to Database
**Source:** Data Analyst G20
**Risk:** Medium — churn diagnosis impossible without reasons
**Fix:** Send selected cancel reason from frontend retention dialog to backend, save in `cancel_reason` column.
**Files:** Frontend subscription page, backend subscription status endpoint
**Effort:** 1-2 hours

### 25. Add Empty-State Email Capture on /stores
**Source:** Growth B4
**Risk:** Medium growth — visitors who see no stores bounce permanently
**Fix:** When no stores found, show "Leave your email and we'll notify you when a farm joins" + email capture.
**File:** `frontend/src/app/stores/page.tsx`
**Effort:** 3-4 hours

### 26. Validate JWT_SECRET Minimum Length at Startup
**Source:** Security H-2
**Risk:** High — weak JWT secret = complete auth bypass
**Fix:** Reject JWT_SECRET < 32 characters on startup.
**File:** `backend/internal/config/config.go:43`
**Effort:** 15 min

### 27. Use Constant-Time Comparison for Cron Secret
**Source:** Security M-4
**Fix:** Replace `!=` with `subtle.ConstantTimeCompare` in `requireSecret`.
**Files:** `internal_billing.go:216`, `internal_email.go:155`
**Effort:** 10 min

---

## P3 — Weeks 4-8

Product features for retention, code organization, and scalability.

### 28. Ship "What's in the Box" Weekly Preview
**Source:** PM Rank 1 (RICE 135)
**Impact:** Massive — directly reduces no-shows, builds anticipation, 15-30% retention improvement
**Spec:** Seller posts text + optional photo per cycle. Show on box detail page + include in pickup reminder email.
**Effort:** 2 weeks

### 29. Ship Payout Automation (Stripe Connect Transfers)
**Source:** PM Rank 2 (RICE 95)
**Impact:** Critical for trust — farmers need money to hit their bank automatically
**Spec:** Stripe Connect transfer on pickup confirmation, deduct platform fee, show transfer status.
**Effort:** 3 weeks

### 30. Ship Seller Analytics Dashboard
**Source:** PM Rank 3 (RICE 57)
**Impact:** High — farmers can't see their business growing without it
**Spec:** Active subscribers over time, revenue per cycle, pickup rate, churn, subscriber cap utilization.
**Effort:** 3 weeks

### 31. Integrate Lightweight Analytics (PostHog or Similar)
**Source:** Data Analyst Phase 1
**Impact:** High — zero client-side or server-side event tracking currently; checkout abandonment is invisible
**Fix:** Add JS snippet to `layout.tsx`, emit server-side events for subscribe/cancel/pickup/order.
**Effort:** 1-2 days

### 32. Wrap `useSearchParams()` Pages in Suspense
**Source:** UX 6.4
**Fix:** Wrap subscription and order pages using same pattern as `stores/page.tsx`.
**Effort:** 30 min

### 33. Add `<form>` Elements to Checkout Forms
**Source:** UX 3.2
**Fix:** Wrap checkout and subscribe forms in `<form onSubmit>`, change submit buttons to `type="submit"`.
**Files:** `subscribe-form.tsx`, `checkout-form.tsx`
**Effort:** 1 hour

### 34. Decompose 966-Line Seller Store Page
**Source:** Staff W-8
**Fix:** Extract into `pickup-window-list`, `order-list`, `manual-pickup-entry`, `payout-summary`, `subscription-plan-list` components.
**File:** `frontend/src/app/seller/stores/[storeId]/page.tsx`
**Effort:** 3-4 hours

### 35. Extract `cadenceLabel()` to Shared lib/ui.ts
**Source:** Staff W-5 | UX 8.5
**Fix:** Move to `lib/ui.ts`, replace all 7 duplicated definitions.
**Effort:** 30 min

### 36. Extract `validUUID` / `extractBuyerToken` to validate.go
**Source:** Staff W-3, S-5
**Fix:** Move package-wide utilities from `orders.go` to `validate.go`.
**Effort:** 20 min

### 37. Add HTTP Server Timeouts
**Source:** Staff S-9
**Fix:** Add `ReadTimeout: 30s`, `WriteTimeout: 60s`, `IdleTimeout: 120s`.
**File:** `backend/cmd/api/main.go:42-46`
**Effort:** 10 min

### 38. Fix Stripe CaptureAuthorization Error Silently Discarded
**Source:** Staff W-7
**Fix:** Log capture errors; the webhook reconciles payment_status, but logging ensures visibility.
**Files:** `pickup_confirm.go:315`, `seller_orders.go:~340`
**Effort:** 15 min

### 39. Correct Cancellation Policy Cost Allocation Table
**Source:** CFO v1 Finding 6
**Fix:** Update `docs/ops/cancellation-policy.md` — seller does NOT pay Stripe processing; platform absorbs it.
**Effort:** 15 min

### 40. Update Strategy Memo Unit Economics
**Source:** CFO v1 Finding 2, v2 Still Open
**Fix:** Rewrite strategy memo LTV/LTV:CAC using net contribution (after Stripe), not gross fees. Numbers are now much better at 7%+$0.35.
**Effort:** 1-2 hours

---

## P4 — Backlog

Polish, forward-compatibility, and lower-impact improvements.

### Code Quality
- [ ] Add `requireDB` middleware instead of per-handler nil checks (Staff W-6)
- [ ] Extract shared plan query builder for `ListStorePlans`/`GetPlan` (Staff W-4)
- [ ] Extract `FeeConfig` struct with `ComputeBuyerFee` method (Staff W-10)
- [ ] Extract `envInt()` helper for config parsing (Staff W-11)
- [ ] Add `http.Flusher` implementation to `statusWriter` (Staff W-2)
- [ ] Pass context to rate limiter cleanup goroutines (Staff W-1)
- [ ] Combine `ListStoreReviews` into single CTE query (Staff S-1)
- [ ] Remove deprecated `buyerSession` shim (Staff S-2)
- [ ] Remove unused state setters in seller store page (Staff S-3)
- [ ] Fix toast ID collision with counter instead of `Date.now()` (Staff S-4)
- [ ] Split `subscriptions.go` (1,780 lines) into 3 files (Staff S-7)
- [ ] Extract shared `CheckoutShell` from checkout-form + subscribe-form (Staff S-8)
- [ ] Move `transferToSeller`/`fetchOrderEmailInfo` to `order_helpers.go` (Staff S-10)

### Security (Lower Priority)
- [ ] Document role auto-upgrade as accepted risk or add admin approval (Security M-5)
- [ ] Implement server-side Supabase upload validation (Security M-6)
- [ ] Consider password complexity improvements (Security M-2)
- [ ] Bind magic link tokens to IP/user-agent (Security L-1)
- [ ] Add account lockout after repeated failed logins (Security L-2)
- [ ] Restrict non-prod CORS to project-specific Vercel prefix (Security L-4)
- [ ] Sanitize Google Places API error messages (Security L-3)

### Accessibility & UX Polish
- [ ] Add loading state `role="status"` announcements (UX 2.5)
- [ ] Fix `ConfirmDialog` auto-focus for destructive actions (UX 2.4)
- [ ] Add label to seller store window picker `<select>` (UX 2.1)
- [ ] Add `aria-hidden="true"` to decorative star SVGs (UX 2.7)
- [ ] Add `aria-hidden="true"` to store placeholder letters (UX 2.6)
- [ ] Standardize heading hierarchy on buyer dashboard (UX 2.8)
- [ ] Group order filter buttons with `role="group"` (UX 2.9)
- [ ] Guard `staticMapUrl` null lat/lng call (UX 6.3)
- [ ] Add back navigation to setup wizard steps (UX 5.4)
- [ ] Add `prefers-reduced-motion` media query (UX 9.6)
- [ ] Remove `console.log` in cancel flow (UX 9.7)
- [ ] Add favicon and PWA manifest (UX 9.3 | Growth SEO8)
- [ ] Add toast entrance animation (UX 9.2)
- [ ] Add unsaved changes warning on seller settings (UX 9.5)
- [ ] Increase mobile touch targets for nav buttons (UX 4.1)
- [ ] Standardize card padding (UX 8.1) and heading scale (UX 8.2)
- [ ] Create `.lr-btn-destructive` class for consistency (UX 8.4)
- [ ] Unify error display patterns to `<ErrorAlert>` everywhere (UX 8.3)

### Growth & Conversion
- [ ] Reduce subscribe form to email-only (Growth B14, B21)
- [ ] Add social proof (farm count, subscriber count) to homepage + store pages (Growth X1, L4)
- [ ] Add "Powered by Stripe" badge on payment pages (Growth X2)
- [ ] Add seller onboarding checklist after going live (Growth S19)
- [ ] Show subscriber count on seller dashboard box cards (Growth S27)
- [ ] Add structured data (JSON-LD) to store and box pages (Growth SEO6)
- [ ] Convert `/stores` to SSR for initial render (Growth SEO5)

### Product Features (Post-PMF)
- [ ] Buyer re-engagement emails (PM Rank 4, RICE 43)
- [ ] SMS pickup reminders via Twilio (PM Rank 4, RICE 48)
- [ ] Box customization — basic item swaps (PM Rank 6, RICE 42)
- [ ] Referral program — "Give $5, get $5" (PM Rank 5, RICE 30)
- [ ] SEO landing pages — `/farms/[city]` (PM Rank 7, RICE 40)
- [ ] Seller broadcast messaging (PM Rank 10, RICE 26)
- [ ] Multi-location support (PM Rank 9, RICE 14)

### Data & Instrumentation
- [ ] Set up Resend webhook integration for email open/click tracking (Data G18)
- [ ] Add `first_live_at` to stores, `last_login_at` to users (Data 4.4)
- [ ] Build operational dashboard with Metabase or similar (Data 5.1)
- [ ] Set up alerting thresholds (pickup rate <60%, payment failures >5%, etc.) (Data 5.3)

---

## Summary: Effort Estimates by Priority

| Priority | Items | Total Effort | When | Status |
|----------|-------|-------------|------|--------|
| **P0** | 6 | ~2 hours | This week | **DONE** (2026-02-28) |
| **P1** | 10 | ~2-3 days | This sprint | **DONE** (2026-02-28) |
| **P2** | 11 | ~1 week | Next sprint | **DONE** (2026-02-28) |
| **P3** | 13 | ~6-8 weeks | Weeks 4-8 | **DONE** (2026-02-28) |
| **P4** | 40+ | Ongoing | Backlog | Pending |

**P0-P3 (40 items) completed 2026-02-28. P4 backlog remains.**
