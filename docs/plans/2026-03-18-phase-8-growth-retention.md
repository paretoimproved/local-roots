# Phase 8: Growth & Retention — Implementation Plan

**Goal:** Transform Local Roots from a functional marketplace into a growth-ready platform with buyer retention loops, seller engagement analytics, organic acquisition via SEO, and hardened payout infrastructure.

**North Star:** Increase completed pickups per week by building the systems that keep buyers coming back and help sellers see the value of the platform.

**Architecture:** Go backend (new endpoints + cron jobs), Next.js App Router frontend (new pages + enhanced components), PostgreSQL (new queries, no schema changes expected), Resend (new email templates).

---

## Design Specifications (added by design review)

### Design Tokens (from globals.css — no new tokens needed)
- `--lr-bg` (#f6f1e8 sand) — page backgrounds, OG image background
- `--lr-ink` (#1c1b16 ink) — primary text, metric values
- `--lr-muted` (#4a463c peat) — labels, secondary text, timestamps
- `--lr-leaf` (#2f6b4f sage) — positive indicators, CTAs, filled stars, trend ▲
- `--lr-clay` (#b35d2e clay) — warning/error indicators, trend ▼, "Action needed"
- `lr-card` / `lr-card-strong` — standard (78%) / emphasized (92%) card opacity
- `lr-chip` — pill badges for status and cadence

### A11y: Bump `lr-btn-primary` touch targets to `py-2.5` (44px min) in globals.css.

### Analytics Page — Two-Tier Metric Layout
```
PRIMARY ROW (4 cards, lr-card-strong, 2xl values):
  Active Subs (▲/▼ delta vs 4 weeks ago) | Pickup Rate | Revenue (▲/▼ growth %) | Avg Rating (★ stars)

SECONDARY ROW (3 cards, lr-card, xl values, muted):
  Retention Rate | No-Show Rate | Churn

TOP PRODUCTS (ranked list section, not chart):
  1. Product title — qty sold — revenue

EXISTING SECTIONS (unchanged): Revenue by Cycle table, Payout History table
```
- Subscriber trend: ▲/▼ arrow with delta vs 4 weeks ago on Active Subs card
- Avg Rating: reuse ReviewSummary star component, show "No reviews yet" when null
- All trend arrows: `aria-label="Up 3 from 4 weeks ago"` for screen readers
- Empty state (new store): "Your store is brand new — metrics appear after your first pickup"

### "What's in the Box" — Buyer Display
- Placed on store detail page **above** "What's available" section
- Single `lr-card-strong` with optional photo left (200px), title + body right
- "Posted X days ago" timestamp in `--lr-muted`
- If no box update exists: section doesn't render (not an empty state)
- Mobile: photo stacks on top, text below
- Photo `alt`: store name + "box contents"

### "What's in the Box" — Seller Posting UI
- Inline on seller dashboard, near upcoming pickup (not in settings)
- Empty prompt: "Share what's in this week's box with your subscribers"
- Form: Title (single line), Body (textarea), Photo (optional, reuse `ImageUpload`)
- Post/Cancel buttons, loading state "Posting…" with disabled button
- Success: toast "Update posted!" + card appears
- Error: `ErrorAlert` with retry

### City Landing Page (`/farms/{city-region}`)
- h1: "Farm Boxes in {City}, {Region}"
- Subtitle: "Fresh local food, picked up weekly from farms near you."
- Reuse existing `StoreCard` in `sm:grid-cols-2 lg:grid-cols-3` grid
- Empty state: warm copy + waitlist email capture (reuse stores page pattern)
- Breadcrumb: Farms → {City}, {Region}

### Waitlist Form (stores page)
- Already partially built (notifyEmail/notifySubmitted state exists)
- Enhancement: submit geo coords (lat/lng from search context) to `POST /v1/waitlist`
- Success: "You're on the list!" with green checkmark (existing pattern)
- Duplicate: "You're already on our list"

### Payout Status Chips (4 states)
- Transferred: `--lr-leaf` bg/10, leaf text (existing)
- Processing: amber bg, amber text (new)
- Retrying: `--lr-clay` bg/10, clay text (new)
- Action needed: `--lr-clay` bg/10, clay text, bold (new)

### OG Image (`/stores/{storeId}/opengraph-image`)
- Background: `--lr-bg` sand
- Left accent bar: `--lr-leaf` sage (4px)
- Text: `--lr-ink` — store name (large), price range, review stars if available
- No gradients, no stock photos — branded fallback when no hero image
- Built with Next.js `ImageResponse` API

### Responsive Breakpoints
| Surface | Desktop | Tablet | Mobile |
|---------|---------|--------|--------|
| Analytics primary row | `md:grid-cols-4` | `grid-cols-2` | `grid-cols-2` |
| Analytics secondary row | `grid-cols-3` | `grid-cols-3` | `grid-cols-1` |
| Box update card (buyer) | Image left, text right | Same | Image top, text bottom |
| City landing grid | `lg:grid-cols-3` | `sm:grid-cols-2` | `grid-cols-1` |
| Location picker | Radio inline | Same | Stack vertical |

### Interaction State Coverage
| Feature | Loading | Empty | Error | Success |
|---------|---------|-------|-------|---------|
| Analytics (enhanced) | "Loading analytics…" | "Brand new — metrics after first pickup" | Toast | Two-tier cards |
| Box update (buyer) | N/A (SSR) | Section hidden | Graceful degradation | Card renders |
| Box update (seller) | "Posting…" disabled | "Share what's in this week's box" | ErrorAlert | Toast + card |
| Waitlist capture | "Joining…" disabled | N/A (shows on 0 results) | Inline error | "You're on the list!" |
| City page | Skeleton cards (3) | Warm copy + waitlist | "Couldn't load" + retry | Store grid |
| Top products | Part of page load | "No orders yet" | Part of analytics | Ranked list |
| Payout status | Existing table | Existing | Existing | 4-state chips |
| Multi-location mgmt | "Saving…" | "Add first pickup location" | ErrorAlert | Toast |

---

## Overview: What Exists vs. What's New

| Area | Already Built | Phase 8 Adds |
|------|--------------|-------------|
| **Payouts** | Auto-transfer on pickup/no-show, payout history, summary per window | Transfer failure recovery, retry mechanism, aggregated payout dashboard, expected next payout |
| **Analytics** | Subscriber count, revenue by cycle, pickup rate, payout history | Trend sparklines, review score integration, retention rate, subscriber cohort metrics, "last active" tracking |
| **Re-engagement** | 11 transactional emails, pickup reminders, billing cron | Lapsed subscriber detection, win-back emails, post-pickup review prompt, subscription renewal nudges |
| **Multi-location** | 1:N store→pickup_locations schema, geo search | Seller multi-location management UI, buyer location picker on subscription checkout |
| **SEO / Profiles** | Store detail page with generateMetadata, basic OG tags | Rich public profiles, city landing pages, structured data (JSON-LD), sitemap.xml, robots.txt, OG images |

---

## Priority Order

1. **Buyer Re-engagement** — Directly impacts retention (the #1 metric). Zero infrastructure exists.
2. **Enhanced Seller Analytics** — Keeps sellers engaged, shows them value of platform.
3. **Public Store Profiles / SEO** — Unlocks organic buyer acquisition channel.
4. **Payout Hardening** — Important but not blocking (transfers already work).
5. **Multi-location UX** — Lowest urgency (schema exists, few farmers need it at early stage).

---

## Task 1: Buyer Re-engagement — Lapsed Subscriber Detection

**Files:**
- Create: `backend/internal/api/v1/internal_reengagement.go`
- Modify: `backend/internal/scheduler/scheduler.go` (add cron job)
- Modify: `backend/internal/email/templates.go` (add 3 new templates)
- Modify: `backend/internal/httpx/handler.go` (register internal endpoint)

### Step 1: Define "lapsed" criteria

A subscriber is considered lapsed when:
- Status is `active` (not paused or canceled)
- Their last picked-up order was 2+ cycles ago (based on plan cadence)
- They have not been sent a re-engagement email in the last 14 days

### Step 2: Add re-engagement tracking column

Create migration `backend/migrations/XXXX_reengagement_tracking.sql`:
```sql
-- +goose Up
ALTER TABLE subscriptions ADD COLUMN last_reengagement_email_at TIMESTAMPTZ;

-- +goose Down
ALTER TABLE subscriptions DROP COLUMN last_reengagement_email_at;
```

### Step 3: Build lapsed subscriber query

```sql
SELECT s.id, s.buyer_email, s.buyer_name, sp.title as plan_title,
       sp.cadence, st.name as store_name, st.id as store_id
FROM subscriptions s
JOIN subscription_plans sp ON sp.id = s.plan_id
JOIN stores st ON st.id = s.store_id
WHERE s.status = 'active'
  AND (s.last_reengagement_email_at IS NULL
       OR s.last_reengagement_email_at < NOW() - INTERVAL '14 days')
  AND NOT EXISTS (
    SELECT 1 FROM orders o
    WHERE o.subscription_id = s.id
      AND o.status = 'picked_up'
      AND o.picked_up_at > NOW() - (
        CASE sp.cadence
          WHEN 'weekly' THEN INTERVAL '14 days'
          WHEN 'biweekly' THEN INTERVAL '28 days'
          WHEN 'monthly' THEN INTERVAL '60 days'
        END
      )
  )
LIMIT 50;
```

### Step 4: Add email templates

Three new templates in `templates.go`:
1. **LapsedSubscriberNudge** — "We miss you at {store_name}! Your next {plan_title} box is waiting."
2. **PostPickupReviewPrompt** — "How was your box from {store_name}?" (sent 2 hours after pickup confirmation)
3. **UpcomingPickupExcitement** — "Your {plan_title} box is ready tomorrow! Here's what to expect." (enhancement of existing reminder with richer content)

### Step 5: Build cron job

Add `RunReengagement()` to scheduler, running every 6 hours:
- Query lapsed subscribers (limit 50 per run to avoid email bursts)
- Send `LapsedSubscriberNudge` email
- Update `last_reengagement_email_at`

### Step 6: Add post-pickup review prompt

In `pickup_execute.go`, after the pickup confirmation + payment receipt email, schedule a delayed review prompt:
- Add `review_prompt_sent_at` column to orders (migration)
- Cron job checks for orders picked up 2+ hours ago with no review and no prompt sent
- Sends `PostPickupReviewPrompt` email with link to review page

### Step 7: Tests

- Test lapsed query logic with mock data (active sub, no recent pickups)
- Test email template rendering
- Test cron idempotency (re-running doesn't re-send)
- Test edge cases: paused subs excluded, canceled subs excluded, recently engaged excluded

### Step 8: Verification

```bash
cd backend && go test ./...
```

---

## Task 2: Enhanced Seller Analytics

**Files:**
- Modify: `backend/internal/api/v1/seller_analytics.go` (enhance response)
- Modify: `frontend/src/app/seller/stores/[storeId]/analytics/page.tsx` (add visualizations)
- Modify: `frontend/src/lib/seller-api.ts` (update types)

### Step 1: Enhance analytics endpoint response

Add to `AnalyticsResponse`:
```go
type AnalyticsResponse struct {
    // ... existing fields ...

    // New fields
    RetentionRate      float64              `json:"retention_rate"`       // subscribers retained over last 30 days
    AvgRating          *float64             `json:"avg_rating"`           // average review score (nullable)
    ReviewCount        int                  `json:"review_count"`         // total reviews
    SubscriberTrend    []TrendPoint         `json:"subscriber_trend"`     // last 12 weeks subscriber count snapshots
    RevenueGrowthPct   *float64             `json:"revenue_growth_pct"`   // revenue change vs prior period
    TopProducts        []TopProduct         `json:"top_products"`         // top 5 ordered products
    NoShowRate         float64              `json:"no_show_rate"`         // no_show / total non-canceled
}

type TrendPoint struct {
    Date  string `json:"date"`
    Value int    `json:"value"`
}

type TopProduct struct {
    Title    string `json:"title"`
    Quantity int    `json:"quantity"`
    Revenue  int    `json:"revenue_cents"`
}
```

### Step 2: Add review aggregation query

```sql
SELECT COALESCE(AVG(r.rating), 0), COUNT(r.id)
FROM reviews r WHERE r.store_id = $1;
```

### Step 3: Add retention rate calculation

```sql
-- Subscribers who were active 30 days ago and are still active
WITH cohort AS (
    SELECT COUNT(*) as total
    FROM subscriptions
    WHERE store_id = $1 AND created_at < NOW() - INTERVAL '30 days'
      AND status != 'canceled'
)
SELECT
    CASE WHEN cohort.total = 0 THEN 0
    ELSE (
        SELECT COUNT(*)::float / cohort.total
        FROM subscriptions
        WHERE store_id = $1 AND created_at < NOW() - INTERVAL '30 days'
          AND status = 'active'
    ) END as retention_rate
FROM cohort;
```

### Step 4: Add top products query

```sql
SELECT oi.product_title, SUM(oi.quantity) as total_qty,
       SUM(oi.price_cents * oi.quantity) as total_revenue
FROM order_items oi
JOIN orders o ON o.id = oi.order_id
WHERE o.store_id = $1 AND o.status = 'picked_up'
GROUP BY oi.product_title
ORDER BY total_qty DESC
LIMIT 5;
```

### Step 5: Frontend — Enhance analytics page

See "Design Specifications → Analytics Page" above for full layout spec.

Update the analytics page to show:
1. **Primary metric row** (4 cards, `lr-card-strong`, `md:grid-cols-4`) — Active Subs (▲/▼ vs 4w), Pickup Rate, Revenue (▲/▼ growth %), Avg Rating (stars via ReviewSummary)
2. **Secondary metric row** (3 cards, `lr-card`, `grid-cols-3`) — Retention Rate, No-Show Rate, Churn
3. **Top products** — Ranked list section below secondary row (not a chart)
4. **Revenue by cycle** — Keep existing table
5. **Payout history** — Enhance status chips to 4-state system (Transferred/Processing/Retrying/Action needed)

### Step 6: Tests

- Test new analytics queries return correct aggregations
- Test edge cases: no reviews (null avg), no orders, new store with zero data
- Frontend: `pnpm typecheck && pnpm lint`

### Step 7: Verification

```bash
cd backend && go test ./...
pnpm typecheck && pnpm lint
```

---

## Task 3: Public Store Profiles & SEO Infrastructure

**Files:**
- Create: `frontend/src/app/farms/[city]/page.tsx` (city landing page)
- Create: `frontend/src/app/sitemap.ts` (dynamic sitemap)
- Create: `frontend/src/app/robots.ts` (robots.txt)
- Modify: `frontend/src/app/stores/[storeId]/page.tsx` (rich profile, structured data)
- Modify: `frontend/src/app/stores/page.tsx` (enhanced meta)
- Modify: `backend/internal/api/v1/public.go` (add cities endpoint)

### Step 1: Add public cities endpoint

```go
// GET /v1/cities — returns distinct cities with active stores
// Response: [{ "city": "Austin", "region": "TX", "store_count": 5 }]
```

### Step 2: Enhance store detail page with structured data

Add JSON-LD to the store detail page:
```typescript
const jsonLd = {
  "@context": "https://schema.org",
  "@type": "LocalBusiness",
  "name": store.name,
  "description": store.description,
  "address": { "@type": "PostalAddress", ... },
  "geo": { "@type": "GeoCoordinates", ... },
  "aggregateRating": reviews.length > 0 ? {
    "@type": "AggregateRating",
    "ratingValue": avgRating,
    "reviewCount": reviews.length
  } : undefined
};
```

### Step 3: Create city landing pages

`/farms/[city]` — server-rendered pages showing farms in a city:
- Dynamic metadata: "Farm Boxes in {City}, {Region} — Local Roots"
- Lists stores with live plans in that city
- Structured data for the collection
- Links to individual store pages

### Step 4: Create dynamic sitemap

`frontend/src/app/sitemap.ts`:
```typescript
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const stores = await api.listStores();
  const cities = await api.listCities();
  return [
    { url: 'https://localroots.com', changeFrequency: 'weekly', priority: 1 },
    { url: 'https://localroots.com/stores', changeFrequency: 'daily', priority: 0.9 },
    ...cities.map(c => ({
      url: `https://localroots.com/farms/${c.city.toLowerCase()}`,
      changeFrequency: 'weekly' as const,
      priority: 0.8,
    })),
    ...stores.map(s => ({
      url: `https://localroots.com/stores/${s.id}`,
      changeFrequency: 'weekly' as const,
      priority: 0.7,
    })),
  ];
}
```

### Step 5: Create robots.ts

```typescript
export default function robots(): MetadataRoute.Robots {
  return {
    rules: { userAgent: '*', allow: '/', disallow: ['/seller/', '/buyer/', '/auth/'] },
    sitemap: 'https://localroots.com/sitemap.xml',
  };
}
```

### Step 6: Enhance store cards with richer data

On `/stores` and city landing pages, show:
- Store image (hero)
- Price range ("Boxes from $XX/wk")
- Next pickup date
- Review stars (if reviews exist)
- Distance badge (if geo available)

### Step 7: Tests

- Test cities endpoint returns correct aggregation
- Test sitemap generates valid XML
- Test structured data renders correctly
- Frontend: `pnpm typecheck && pnpm lint`

---

## Task 4: Payout Hardening

**Files:**
- Modify: `backend/internal/api/v1/order_helpers.go` (add retry logic)
- Create: `backend/internal/api/v1/internal_transfer_retry.go` (retry cron)
- Modify: `backend/internal/scheduler/scheduler.go` (register retry job)
- Modify: `frontend/src/app/seller/stores/[storeId]/analytics/page.tsx` (payout status UI)

### Step 1: Track transfer failures

Add migration for transfer attempt tracking:
```sql
-- +goose Up
ALTER TABLE orders ADD COLUMN transfer_attempted_at TIMESTAMPTZ;
ALTER TABLE orders ADD COLUMN transfer_error TEXT;

-- +goose Down
ALTER TABLE orders DROP COLUMN transfer_attempted_at;
ALTER TABLE orders DROP COLUMN transfer_error;
```

### Step 2: Update transferToSeller to record failures

Instead of silently no-oping on failure, record the attempt:
```go
func transferToSeller(...) error {
    // ... existing logic ...
    if err != nil {
        // Record failure for retry
        db.Exec(ctx, `UPDATE orders SET transfer_attempted_at = NOW(), transfer_error = $1 WHERE id = $2`,
            err.Error(), orderID)
        return err
    }
    // Record success
    db.Exec(ctx, `UPDATE orders SET stripe_transfer_id = $1, transfer_attempted_at = NOW(), transfer_error = NULL WHERE id = $2`,
        transfer.ID, orderID)
    return nil
}
```

### Step 3: Build retry cron job

`RunTransferRetry()` — runs every hour:
- Finds orders with `transfer_attempted_at IS NOT NULL AND stripe_transfer_id IS NULL AND transfer_error IS NOT NULL`
- Retries transfer up to 3 times (check attempt count or age)
- After 3 failures, flag for manual intervention

### Step 4: Frontend — Show transfer status more clearly

On the payout history page:
- "Transferred" (green) — has transfer_id
- "Processing" (amber) — no transfer_id, attempted < 1 hour ago
- "Failed — Retrying" (red) — has error, under retry limit
- "Action needed" (red) — exceeded retry limit

### Step 5: Tests

- Test transfer failure recording
- Test retry logic doesn't double-transfer
- Test retry limit enforcement

---

## Task 5: Multi-location Seller UX

**Files:**
- Modify: `frontend/src/app/seller/stores/[storeId]/settings/page.tsx` (manage locations)
- Modify: `frontend/src/components/subscribe-form.tsx` (buyer location picker)
- Modify: `backend/internal/api/v1/seller.go` (CRUD for additional locations)

### Step 1: Seller — Add/manage multiple locations

On the seller settings page, add a "Pickup Locations" section:
- List all locations with edit/delete
- "Add location" button with Google Places autocomplete
- Each location shows: label, address, timezone
- Existing location from setup wizard is shown as primary

### Step 2: Buyer — Location picker on subscription checkout

When a store has multiple locations:
- Show a location selector on the subscribe form
- Default to nearest location (if geo available)
- Display location details: address, map pin, instructions

### Step 3: Backend — Location CRUD endpoints

- `POST /v1/seller/stores/{storeId}/locations` — add location
- `PUT /v1/seller/stores/{storeId}/locations/{locationId}` — update
- `DELETE /v1/seller/stores/{storeId}/locations/{locationId}` — remove (only if no future pickup windows)

### Step 4: Tests

- Test location CRUD with ownership validation
- Test deletion prevention when active windows exist
- Test buyer location selection flow
- Frontend: `pnpm typecheck && pnpm lint`

---

## Verification Checklist

After all tasks:
```bash
cd backend && go test ./...
pnpm typecheck && pnpm lint
```

Visual verification:
- [ ] Lapsed subscriber email sends correctly (test with seed data)
- [ ] Post-pickup review prompt arrives ~2 hours after confirmation
- [ ] Seller analytics page shows new metrics (retention, reviews, trends)
- [ ] `/farms/{city}` renders with correct stores
- [ ] `sitemap.xml` is accessible and valid
- [ ] Structured data validates in Google Rich Results Test
- [ ] Payout history shows correct transfer statuses
- [ ] Multi-location settings page allows add/edit/delete
- [ ] Subscription checkout shows location picker for multi-location stores

---

## Summary

| Task | Backend Changes | Frontend Changes | New Migrations | New Emails |
|------|----------------|-----------------|----------------|------------|
| 1. Re-engagement | New cron + endpoint | None | 2 columns | 3 templates |
| 2. Analytics | Enhanced endpoint | Richer page | None | None |
| 3. SEO | Cities endpoint | 3 new pages/files | None | None |
| 4. Payout hardening | Retry cron + tracking | Status UI | 2 columns | None |
| 5. Multi-location UX | Location CRUD | Settings + checkout | None | None |
