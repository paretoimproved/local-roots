# Local-Roots: Metrics & Instrumentation Audit

**Date:** 2026-02-27
**Scope:** Full database schema review, KPI framework, production SQL queries, instrumentation gap analysis, dashboard design, cohort analysis framework

---

## 1. Database Schema Summary

Derived from migrations `0001` through `0023` in `backend/migrations/`.

### Core Tables

| Table | Purpose | Key Columns |
|---|---|---|
| `users` | All users (buyer, seller, admin) | `id`, `email`, `role`, `password_hash`, `oauth_provider`, `oauth_provider_id`, `created_at` |
| `stores` | Farmer storefronts | `id`, `owner_user_id`, `name`, `is_active`, `is_demo`, `stripe_account_id`, `stripe_account_status`, `image_url`, `created_at` |
| `pickup_locations` | Physical pickup spots | `id`, `store_id`, `lat`, `lng`, `city`, `region`, `timezone`, `instructions`, `photo_url` |
| `pickup_windows` | Scheduled pickup time slots | `id`, `store_id`, `pickup_location_id`, `start_at`, `end_at`, `cutoff_at`, `status` (draft/published/canceled/completed) |
| `products` | Items/boxes farmers sell | `id`, `store_id`, `title`, `unit`, `is_perishable`, `is_active` |
| `product_images` | Product photos | `id`, `product_id`, `url`, `sort_order` |
| `offerings` | Product availability at a pickup window | `id`, `store_id`, `pickup_window_id`, `product_id`, `price_cents`, `quantity_available`, `quantity_reserved`, `status` (active/sold_out/hidden) |
| `orders` | All purchases (walk-up and subscription) | `id`, `store_id`, `pickup_window_id`, `subscription_id`, `buyer_user_id`, `buyer_email`, `status`, `payment_method`, `payment_status`, `subtotal_cents`, `buyer_fee_cents`, `total_cents`, `captured_cents`, `deposit_cents`, `pickup_code`, `buyer_token`, `stripe_payment_intent_id`, `stripe_transfer_id`, `reminder_sent_at`, `created_at`, `updated_at` |
| `order_items` | Line items per order | `id`, `order_id`, `offering_id`, `product_title`, `product_unit`, `price_cents`, `quantity`, `line_total_cents` |
| `reviews` | Post-pickup reviews (1 per order) | `id`, `order_id`, `store_id`, `rating` (1-5), `body`, `created_at` |
| `subscription_plans` | Recurring box configurations | `id`, `store_id`, `pickup_location_id`, `product_id`, `title`, `cadence` (weekly/biweekly/monthly), `price_cents`, `subscriber_limit`, `first_start_at`, `duration_minutes`, `cutoff_hours`, `is_active`, `is_live`, `deposit_cents`, `image_url` |
| `subscriptions` | Buyer enrollment in a plan | `id`, `plan_id`, `store_id`, `buyer_user_id`, `buyer_email`, `status` (active/paused/canceled), `stripe_customer_id`, `stripe_payment_method_id`, `buyer_token`, `created_at` |
| `subscription_cycles` | Generated recurring pickups | `id`, `plan_id`, `store_id`, `pickup_window_id`, `start_at` |
| `magic_link_tokens` | Buyer passwordless auth | `id`, `email`, `token`, `expires_at`, `used_at` |

### Order Status Lifecycle

```
placed --> ready --> picked_up   (happy path)
placed --> canceled              (seller cancels or buyer cancels before cutoff)
ready  --> no_show               (buyer doesn't show up)
```

### Payment Status Values

`unpaid`, `pending`, `authorized`, `paid`, `voided`, `refunded`, `failed`, `requires_action`

### Key Relationships

- `orders.subscription_id` links subscription orders to `subscriptions` (NULL for walk-up orders)
- `orders.buyer_user_id` links to authenticated buyers (NULL for anonymous/token-only buyers)
- `subscription_cycles` connects `subscription_plans` to `pickup_windows` via generated cycles
- `offerings` is the junction between `products` and `pickup_windows`

---

## 2. KPI Framework

### North Star Metric

**Completed pickups per week** -- orders reaching `status = 'picked_up'`, aggregated weekly.

This metric captures the entire value chain: a farmer listed a box, a buyer subscribed or purchased, payment cleared, and both parties showed up for the handoff. It is the single best proxy for marketplace health.

### Primary Metrics (Health Indicators)

These are the top-level vital signs that directly feed or explain the north star.

| # | Metric | Definition | Why It Matters |
|---|--------|-----------|----------------|
| P1 | **Active stores** | Stores with `is_active = true` AND at least one `is_live = true` plan | Supply side -- no stores, no pickups |
| P2 | **Active subscriptions** | Subscriptions with `status = 'active'` | Demand side -- recurring revenue engine |
| P3 | **Pickup rate** | `picked_up / (placed + ready)` per pickup window | Measures fulfillment reliability; target >80% |
| P4 | **Gross merchandise value (GMV)** | `SUM(captured_cents)` for paid orders per period | Revenue health |
| P5 | **Platform revenue** | `SUM(buyer_fee_cents)` for picked_up orders | Business model viability |

### Secondary Metrics (Diagnostic)

These help diagnose problems when primary metrics move.

| # | Metric | Definition |
|---|--------|-----------|
| S1 | **Subscription churn rate** | Subscriptions moving to `canceled` / active subscriptions at period start |
| S2 | **No-show rate** | `no_show` orders / total non-canceled orders per window |
| S3 | **Average order value (AOV)** | `AVG(total_cents)` for completed orders |
| S4 | **Orders per subscription** | Count of `picked_up` orders per active subscription (lifetime) |
| S5 | **Subscribers per store** | Active subscriptions per store |
| S6 | **Payment failure rate** | Orders with `payment_status IN ('failed', 'requires_action')` / total orders |
| S7 | **Cancellation rate** | Canceled orders / total orders per period |
| S8 | **Review rate** | Orders with a review / picked_up orders |
| S9 | **Average review rating** | `AVG(rating)` across all reviews |
| S10 | **Seller onboarding completion** | Stores with `stripe_account_status = 'active'` / total stores |

### Leading Indicators (Predictive)

These signal future changes before they show up in the primary metrics.

| # | Metric | Definition | Predicts |
|---|--------|-----------|----------|
| L1 | **New store registrations/week** | New `users` with `role = 'seller'` per week | Future supply growth |
| L2 | **New subscriptions/week** | New `subscriptions` created per week | Future pickup volume |
| L3 | **Checkout-to-subscribe conversion** | Subscriptions created / checkout sessions initiated | Funnel health |
| L4 | **Subscription pause rate** | `paused` transitions / active subscriptions | Early churn signal |
| L5 | **Reminder email open rate** | (Requires Resend webhook tracking) | Pickup attendance prediction |
| L6 | **Days since last cycle generated** | Per plan, time since last `subscription_cycles.created_at` | Farmer engagement / inactivity risk |
| L7 | **Billing authorization failure rate** | Failed authorizations / total candidates in billing cron | Payment churn signal |

---

## 3. Production SQL Queries

All queries use actual table and column names from the schema. Replace `$1`, `$2` etc. with parameters, or substitute literal values for ad-hoc use.

### 3.1 North Star: Completed Pickups Per Week

```sql
-- Completed pickups per ISO week, trailing 12 weeks
SELECT
    date_trunc('week', o.updated_at)::date AS week_start,
    COUNT(*)                                AS completed_pickups
FROM orders o
WHERE o.status = 'picked_up'
  AND o.updated_at >= now() - interval '12 weeks'
GROUP BY 1
ORDER BY 1 DESC;
```

### 3.2 Active Stores (with at least one live plan)

```sql
SELECT
    s.id,
    s.name,
    s.created_at,
    s.stripe_account_status,
    COUNT(DISTINCT sp.id) AS live_plans,
    COUNT(DISTINCT sub.id) FILTER (WHERE sub.status = 'active') AS active_subscribers
FROM stores s
JOIN subscription_plans sp ON sp.store_id = s.id AND sp.is_active = true AND sp.is_live = true
LEFT JOIN subscriptions sub ON sub.plan_id = sp.id
WHERE s.is_active = true
  AND s.is_demo = false
GROUP BY s.id
ORDER BY active_subscribers DESC;
```

### 3.3 Active Subscriptions Over Time

```sql
-- Weekly snapshot of active subscriptions (trailing 12 weeks)
WITH weeks AS (
    SELECT generate_series(
        date_trunc('week', now() - interval '12 weeks'),
        date_trunc('week', now()),
        '1 week'::interval
    )::date AS week_start
)
SELECT
    w.week_start,
    COUNT(s.id) AS active_subscriptions
FROM weeks w
LEFT JOIN subscriptions s
    ON s.created_at < w.week_start + interval '7 days'
    AND (s.status = 'active' OR s.updated_at >= w.week_start)
    -- Approximation: subscription was active during this week if it was created before week end
    -- and either still active or was changed after week start
WHERE s.status IS NULL OR s.created_at < w.week_start + interval '7 days'
GROUP BY 1
ORDER BY 1;
```

### 3.4 Pickup Rate Per Pickup Window

```sql
SELECT
    pw.id                                                        AS pickup_window_id,
    s.name                                                       AS store_name,
    pw.start_at,
    COUNT(*) FILTER (WHERE o.status = 'picked_up')               AS picked_up,
    COUNT(*) FILTER (WHERE o.status = 'no_show')                 AS no_shows,
    COUNT(*) FILTER (WHERE o.status = 'canceled')                AS canceled,
    COUNT(*) FILTER (WHERE o.status IN ('placed', 'ready'))      AS pending,
    COUNT(*)                                                     AS total_orders,
    ROUND(
        100.0 * COUNT(*) FILTER (WHERE o.status = 'picked_up')
        / NULLIF(COUNT(*) FILTER (WHERE o.status != 'canceled'), 0),
        1
    )                                                            AS pickup_rate_pct
FROM orders o
JOIN pickup_windows pw ON pw.id = o.pickup_window_id
JOIN stores s ON s.id = o.store_id
WHERE pw.start_at >= now() - interval '30 days'
  AND pw.start_at <= now()
GROUP BY pw.id, s.name, pw.start_at
ORDER BY pw.start_at DESC;
```

### 3.5 Weekly GMV and Platform Revenue

```sql
SELECT
    date_trunc('week', o.updated_at)::date AS week_start,
    SUM(o.captured_cents)                  AS gmv_cents,
    SUM(o.buyer_fee_cents)
        FILTER (WHERE o.status = 'picked_up') AS platform_revenue_cents,
    SUM(o.subtotal_cents)
        FILTER (WHERE o.status = 'picked_up') AS seller_revenue_cents,
    COUNT(*) FILTER (WHERE o.status = 'picked_up') AS completed_orders
FROM orders o
WHERE o.status = 'picked_up'
  AND o.updated_at >= now() - interval '12 weeks'
GROUP BY 1
ORDER BY 1 DESC;
```

### 3.6 Subscription Churn Rate (Weekly)

```sql
WITH weekly_active AS (
    SELECT
        date_trunc('week', w.week_start) AS week_start,
        COUNT(DISTINCT s.id) AS active_start
    FROM generate_series(
        date_trunc('week', now() - interval '12 weeks'),
        date_trunc('week', now()),
        '1 week'::interval
    ) w(week_start)
    CROSS JOIN subscriptions s
    WHERE s.created_at < w.week_start
      AND (s.status = 'active' OR s.updated_at >= w.week_start)
    GROUP BY 1
),
weekly_canceled AS (
    SELECT
        date_trunc('week', s.updated_at) AS week_start,
        COUNT(*) AS cancellations
    FROM subscriptions s
    WHERE s.status = 'canceled'
      AND s.updated_at >= now() - interval '12 weeks'
    GROUP BY 1
)
SELECT
    wa.week_start::date,
    wa.active_start,
    COALESCE(wc.cancellations, 0) AS cancellations,
    ROUND(
        100.0 * COALESCE(wc.cancellations, 0) / NULLIF(wa.active_start, 0), 2
    ) AS churn_rate_pct
FROM weekly_active wa
LEFT JOIN weekly_canceled wc ON wc.week_start = wa.week_start
ORDER BY wa.week_start DESC;
```

### 3.7 No-Show Rate

```sql
SELECT
    date_trunc('week', pw.start_at)::date AS week_start,
    COUNT(*) FILTER (WHERE o.status = 'no_show') AS no_shows,
    COUNT(*) FILTER (WHERE o.status != 'canceled') AS non_canceled_orders,
    ROUND(
        100.0 * COUNT(*) FILTER (WHERE o.status = 'no_show')
        / NULLIF(COUNT(*) FILTER (WHERE o.status != 'canceled'), 0),
        1
    ) AS no_show_rate_pct
FROM orders o
JOIN pickup_windows pw ON pw.id = o.pickup_window_id
WHERE pw.start_at >= now() - interval '12 weeks'
  AND pw.start_at <= now()
GROUP BY 1
ORDER BY 1 DESC;
```

### 3.8 Average Order Value (AOV) by Type

```sql
SELECT
    CASE WHEN o.subscription_id IS NOT NULL THEN 'subscription' ELSE 'walk_up' END AS order_type,
    COUNT(*) AS total_orders,
    ROUND(AVG(o.total_cents) / 100.0, 2) AS avg_order_value_usd,
    ROUND(AVG(o.subtotal_cents) / 100.0, 2) AS avg_subtotal_usd,
    ROUND(AVG(o.buyer_fee_cents) / 100.0, 2) AS avg_fee_usd
FROM orders o
WHERE o.status = 'picked_up'
  AND o.created_at >= now() - interval '30 days'
GROUP BY 1;
```

### 3.9 Subscribers Per Store (Top Stores)

```sql
SELECT
    s.id AS store_id,
    s.name AS store_name,
    COUNT(DISTINCT sub.id) FILTER (WHERE sub.status = 'active') AS active_subscribers,
    COUNT(DISTINCT sub.id) FILTER (WHERE sub.status = 'canceled') AS canceled_subscribers,
    COUNT(DISTINCT sub.id) AS total_subscribers,
    COUNT(DISTINCT sp.id) FILTER (WHERE sp.is_live = true) AS live_plans
FROM stores s
LEFT JOIN subscription_plans sp ON sp.store_id = s.id AND sp.is_active = true
LEFT JOIN subscriptions sub ON sub.plan_id = sp.id
WHERE s.is_active = true AND s.is_demo = false
GROUP BY s.id
ORDER BY active_subscribers DESC;
```

### 3.10 Payment Failure Rate

```sql
SELECT
    date_trunc('week', o.created_at)::date AS week_start,
    COUNT(*) AS total_orders,
    COUNT(*) FILTER (WHERE o.payment_status IN ('failed', 'requires_action')) AS payment_failures,
    ROUND(
        100.0 * COUNT(*) FILTER (WHERE o.payment_status IN ('failed', 'requires_action'))
        / NULLIF(COUNT(*), 0), 2
    ) AS failure_rate_pct
FROM orders o
WHERE o.created_at >= now() - interval '12 weeks'
GROUP BY 1
ORDER BY 1 DESC;
```

### 3.11 Review Rate and Average Rating Per Store

```sql
SELECT
    s.id AS store_id,
    s.name AS store_name,
    COUNT(DISTINCT o.id) FILTER (WHERE o.status = 'picked_up') AS completed_orders,
    COUNT(DISTINCT r.id) AS reviews,
    ROUND(
        100.0 * COUNT(DISTINCT r.id)
        / NULLIF(COUNT(DISTINCT o.id) FILTER (WHERE o.status = 'picked_up'), 0), 1
    ) AS review_rate_pct,
    ROUND(AVG(r.rating)::numeric, 2) AS avg_rating
FROM stores s
LEFT JOIN orders o ON o.store_id = s.id
LEFT JOIN reviews r ON r.order_id = o.id
WHERE s.is_active = true AND s.is_demo = false
GROUP BY s.id
ORDER BY completed_orders DESC;
```

### 3.12 Seller Onboarding Funnel

```sql
SELECT
    COUNT(*) AS total_sellers,
    COUNT(*) FILTER (WHERE s.id IS NOT NULL) AS created_store,
    COUNT(*) FILTER (WHERE s.stripe_account_status = 'active') AS stripe_connected,
    COUNT(*) FILTER (WHERE EXISTS (
        SELECT 1 FROM subscription_plans sp
        WHERE sp.store_id = s.id AND sp.is_active = true
    )) AS has_plan,
    COUNT(*) FILTER (WHERE EXISTS (
        SELECT 1 FROM subscription_plans sp
        WHERE sp.store_id = s.id AND sp.is_live = true
    )) AS has_live_plan,
    COUNT(*) FILTER (WHERE EXISTS (
        SELECT 1 FROM subscriptions sub
        WHERE sub.store_id = s.id AND sub.status = 'active'
    )) AS has_active_subscriber,
    COUNT(*) FILTER (WHERE EXISTS (
        SELECT 1 FROM orders o
        WHERE o.store_id = s.id AND o.status = 'picked_up'
    )) AS has_completed_pickup
FROM users u
LEFT JOIN stores s ON s.owner_user_id = u.id
WHERE u.role IN ('seller', 'admin');
```

### 3.13 New Subscriptions and Cancellations Per Week

```sql
SELECT
    date_trunc('week', d)::date AS week_start,
    COALESCE(new_subs, 0) AS new_subscriptions,
    COALESCE(cancels, 0) AS cancellations,
    COALESCE(new_subs, 0) - COALESCE(cancels, 0) AS net_change
FROM generate_series(
    date_trunc('week', now() - interval '12 weeks'),
    date_trunc('week', now()),
    '1 week'::interval
) d
LEFT JOIN (
    SELECT date_trunc('week', created_at) AS w, COUNT(*) AS new_subs
    FROM subscriptions
    GROUP BY 1
) ns ON ns.w = date_trunc('week', d)
LEFT JOIN (
    SELECT date_trunc('week', updated_at) AS w, COUNT(*) AS cancels
    FROM subscriptions
    WHERE status = 'canceled'
    GROUP BY 1
) c ON c.w = date_trunc('week', d)
ORDER BY 1 DESC;
```

### 3.14 PMF Signal: Farmers With Renewals After 4+ Cycles

```sql
-- Farmers where at least one subscriber has completed 3+ pickups
-- (proxy for "3+ farmers renew after 4 cycles")
SELECT
    s.id AS store_id,
    s.name AS store_name,
    sub.id AS subscription_id,
    sub.buyer_email,
    sub.created_at AS subscribed_at,
    COUNT(DISTINCT o.id) FILTER (WHERE o.status = 'picked_up') AS completed_pickups
FROM subscriptions sub
JOIN stores s ON s.id = sub.store_id
LEFT JOIN orders o ON o.subscription_id = sub.id
WHERE sub.status = 'active'
  AND s.is_demo = false
GROUP BY s.id, s.name, sub.id, sub.buyer_email, sub.created_at
HAVING COUNT(DISTINCT o.id) FILTER (WHERE o.status = 'picked_up') >= 3
ORDER BY completed_pickups DESC;
```

### 3.15 Break-Even Progress Tracker

```sql
SELECT
    (SELECT COUNT(*) FROM stores WHERE is_active = true AND is_demo = false) AS total_active_stores,
    (SELECT COUNT(DISTINCT buyer_email)
     FROM subscriptions WHERE status = 'active') AS total_active_buyers,
    (SELECT ROUND(SUM(buyer_fee_cents) / 100.0, 2)
     FROM orders WHERE status = 'picked_up'
       AND created_at >= date_trunc('month', now())) AS platform_revenue_this_month_usd,
    (SELECT ROUND(SUM(captured_cents) / 100.0, 2)
     FROM orders WHERE status = 'picked_up'
       AND created_at >= date_trunc('month', now())) AS gmv_this_month_usd,
    (SELECT ROUND(
        100.0 * SUM(buyer_fee_cents) / NULLIF(SUM(subtotal_cents), 0), 2
     ) FROM orders WHERE status = 'picked_up'
       AND created_at >= date_trunc('month', now())) AS effective_take_rate_pct;
```

---

## 4. Instrumentation Gaps

### Current State

The application has **zero client-side analytics** and **zero server-side event tracking** beyond basic HTTP access logs (`httpx/logging.go`). There is no analytics provider integrated (no PostHog, Mixpanel, Amplitude, Segment, or Google Analytics). The scheduler logs billing and reminder results to stdout.

This means the following critical user behaviors are completely invisible:

### 4.1 High-Priority Gaps (Must Have)

| # | Event | Where to Instrument | Why |
|---|-------|---------------------|-----|
| G1 | **Store page view** | Frontend: `/stores/[storeId]` server component | Measures demand interest; essential for conversion funnel |
| G2 | **Box/plan page view** | Frontend: `/boxes/[planId]` | Top of subscription funnel |
| G3 | **Checkout initiated** | Backend: `POST /subscription-plans/{planId}/checkout` and `POST /pickup-windows/{id}/checkout` | Funnel step; checkout abandonment = revenue leak |
| G4 | **Checkout completed (subscribe/order)** | Backend: `POST /subscribe` and `POST /orders` | Funnel completion |
| G5 | **Checkout abandoned** | Frontend: user leaves page after checkout initiated but before subscribe/order | Critical funnel gap |
| G6 | **QR code scanned (pickup confirm preview)** | Backend: `GET /seller/pickup/preview` | Measures in-person handoff attempts |
| G7 | **Pickup confirmed** | Backend: `POST /seller/pickup/confirm` and `POST /seller/stores/{id}/orders/{id}/confirm-pickup` | Already trackable via DB, but should emit structured event |
| G8 | **Subscription canceled** | Backend: `POST /subscriptions/{id}/status` where status = 'canceled' | Churn tracking; needs reason codes in structured events |
| G9 | **Subscription paused** | Backend: `POST /subscriptions/{id}/status` where status = 'paused' | Early churn indicator |
| G10 | **Seller registration** | Backend: `POST /auth/register` | Supply funnel |
| G11 | **Seller setup wizard step completion** | Frontend: each step of the 4-step wizard | Seller onboarding funnel |
| G12 | **Magic link sent / clicked / verified** | Backend: `POST /buyer/auth/magic-link` and `POST /buyer/auth/verify` | Auth funnel, buyer activation |

### 4.2 Medium-Priority Gaps (Should Have)

| # | Event | Where to Instrument | Why |
|---|-------|---------------------|-----|
| G13 | **Store search / geo discovery** | Frontend: `/stores` page with lat/lng params | Measures discovery behavior |
| G14 | **Pickup window page view** | Frontend: `/pickup-windows/[id]` | Walk-up conversion funnel |
| G15 | **Review submitted** | Backend: `POST /orders/{id}/review` | Engagement quality |
| G16 | **Payment method updated** | Backend: `POST /subscriptions/{id}/payment-method/confirm` | Retention signal |
| G17 | **Billing authorization failed** | Backend: `internal_billing.go` (already logged but not structured) | Revenue risk |
| G18 | **Email sent / delivered / opened / clicked** | Resend webhook integration | Email effectiveness |
| G19 | **Stripe Connect onboarding started / completed** | Backend: `POST /seller/stores/{id}/connect/onboard` and status changes | Seller activation funnel |
| G20 | **Cancellation reason** | Frontend: cancellation retention flow (radio reasons are captured in UI but not persisted to DB) | Churn diagnosis |

### 4.3 Low-Priority Gaps (Nice to Have)

| # | Event | Where |
|---|-------|-------|
| G21 | **Photo uploaded** | Frontend: `image-upload.tsx` |
| G22 | **QR code downloaded/shared** | Frontend: `/boxes/[planId]/qr` |
| G23 | **Product added to cart (walk-up)** | Frontend: pickup window offerings page |
| G24 | **Policies page viewed** | Frontend: `/policies` |
| G25 | **Buyer dashboard viewed** | Frontend: `/buyer/me` or buyer dashboard page |

### 4.4 Missing Database Columns for Analytics

| Table | Missing Column | Purpose |
|---|---|---|
| `subscriptions` | `canceled_at` (timestamptz) | Currently relies on `updated_at` which is overwritten by any change |
| `subscriptions` | `cancel_reason` (text) | The retention dialog captures reasons but they are not persisted |
| `subscriptions` | `paused_at` (timestamptz) | Same issue as canceled_at |
| `orders` | `picked_up_at` (timestamptz) | Currently relies on `updated_at`; a dedicated column enables precise pickup time analysis |
| `orders` | `canceled_at` (timestamptz) | Same pattern -- explicit lifecycle timestamps |
| `stores` | `first_live_at` (timestamptz) | When the store first went live; currently not tracked |
| `users` | `last_login_at` (timestamptz) | Login recency for engagement scoring |

---

## 5. Dashboard Design

### 5.1 Executive Dashboard (Daily Refresh)

```
+-------------------------------------------------------------+
|  LOCAL-ROOTS OPERATIONAL DASHBOARD                          |
|  Last refreshed: {timestamp}                                |
+-------------------------------------------------------------+

+---NORTH STAR-------------------------------------------------+
|                                                               |
|  [LARGE NUMBER]  Completed Pickups This Week                  |
|  [SPARKLINE]     12-week trend (weekly)                       |
|  [DELTA]         vs. prior week: +X%                          |
|                                                               |
+---------------------------------------------------------------+

+---PRIMARY HEALTH (4 cards, single row)------------------------+
|                                                               |
|  Active     Active         Pickup    Weekly                   |
|  Stores     Subscriptions  Rate      GMV                      |
|  [12]       [87]           [84%]     [$2,340]                 |
|  +2 WoW     +5 WoW        -2pp WoW  +12% WoW                |
|                                                               |
+---------------------------------------------------------------+

+---SUPPLY SIDE (left half)-----+---DEMAND SIDE (right half)----+
|                               |                               |
|  Seller Onboarding Funnel     |  Subscription Funnel          |
|  [Horizontal bar chart]       |  [Horizontal bar chart]       |
|  Registered: 15               |  Store Views: ???*            |
|  Created Store: 12            |  Box Views: ???*              |
|  Stripe Connected: 10         |  Checkouts Started: ???*      |
|  Has Live Plan: 8             |  Subscribed: 87               |
|  Has Subscriber: 6            |  Completed 1+ Pickup: 62     |
|                               |  Completed 3+ Pickups: 34    |
+-------------------------------+-------------------------------+

+---PICKUP WINDOWS (last 7 days)--------------------------------+
|                                                               |
|  [Table: sorted by start_at DESC]                             |
|  Store | Window Date | Orders | Picked Up | No-Show | Rate   |
|  ------|-------------|--------|-----------|---------|------   |
|  Farm A| Feb 26 10am |   12   |    10     |    1    | 91%    |
|  Farm B| Feb 25 9am  |    8   |     7     |    0    | 100%   |
|  ...                                                          |
|                                                               |
+---------------------------------------------------------------+

+---REVENUE (left)----+---------+---CHURN (right)--------------+
|                     |         |                               |
|  Weekly GMV         |         |  Net Subscriptions (weekly)   |
|  [Bar chart, 12w]   |         |  [Stacked bar: new vs cancel] |
|                     |         |                               |
|  Platform Rev       |         |  Churn Rate (weekly)          |
|  [Line chart, 12w]  |         |  [Line chart, 12w]            |
|                     |         |                               |
+---------------------+---------+-------------------------------+

* Items marked ??? require frontend instrumentation (see Section 4)
```

### 5.2 Refresh Rates

| Dashboard Section | Recommended Refresh | Rationale |
|---|---|---|
| North star number | Every 1 hour | Near real-time for the most important metric |
| Primary health cards | Every 4 hours | Stable enough; avoids unnecessary DB load |
| Pickup window table | Every 30 minutes | Operationally relevant during business hours |
| Revenue charts | Daily at 6am UTC | Financial data benefits from daily snapshots |
| Funnel charts | Daily at 6am UTC | Behavioral data accumulates over a day |
| Churn metrics | Weekly (Monday 6am UTC) | Weekly cadence aligns with subscription cycles |

### 5.3 Alerting Thresholds

| Alert | Condition | Channel |
|---|---|---|
| Pickup rate drop | Any window < 60% pickup rate | Slack / email to ops |
| Payment failure spike | Weekly failure rate > 5% | Slack to engineering |
| Zero pickups in 48h | No `picked_up` orders in rolling 48h window | Slack to CEO |
| Billing cron failure | Scheduler log shows consecutive errors | PagerDuty to engineering |
| Churn spike | Weekly churn > 15% | Email to CEO |

---

## 6. Cohort Analysis Framework

### 6.1 Farmer Cohorts (by signup week)

Track how each wave of farmer signups progresses through activation milestones.

```sql
-- Farmer cohort analysis: activation milestones by signup week
WITH farmer_cohorts AS (
    SELECT
        u.id AS user_id,
        date_trunc('week', u.created_at)::date AS cohort_week,
        s.id AS store_id,
        s.created_at AS store_created_at,
        s.stripe_account_status,
        MIN(sp.created_at) AS first_plan_created_at,
        MIN(sp.created_at) FILTER (WHERE sp.is_live = true) AS first_plan_live_at,
        MIN(sub.created_at) AS first_subscriber_at,
        MIN(o.created_at) FILTER (WHERE o.status = 'picked_up') AS first_completed_pickup_at
    FROM users u
    LEFT JOIN stores s ON s.owner_user_id = u.id
    LEFT JOIN subscription_plans sp ON sp.store_id = s.id
    LEFT JOIN subscriptions sub ON sub.store_id = s.id AND sub.status != 'canceled'
    LEFT JOIN orders o ON o.store_id = s.id
    WHERE u.role IN ('seller', 'admin')
    GROUP BY u.id, u.created_at, s.id, s.created_at, s.stripe_account_status
)
SELECT
    cohort_week,
    COUNT(DISTINCT user_id) AS cohort_size,
    COUNT(DISTINCT store_id) AS created_store,
    COUNT(*) FILTER (WHERE stripe_account_status = 'active') AS connected_stripe,
    COUNT(*) FILTER (WHERE first_plan_created_at IS NOT NULL) AS created_plan,
    COUNT(*) FILTER (WHERE first_plan_live_at IS NOT NULL) AS went_live,
    COUNT(*) FILTER (WHERE first_subscriber_at IS NOT NULL) AS got_subscriber,
    COUNT(*) FILTER (WHERE first_completed_pickup_at IS NOT NULL) AS completed_pickup,
    -- Time-to-X metrics (median days)
    PERCENTILE_CONT(0.5) WITHIN GROUP (
        ORDER BY EXTRACT(EPOCH FROM first_plan_live_at - store_created_at) / 86400.0
    ) AS median_days_to_live,
    PERCENTILE_CONT(0.5) WITHIN GROUP (
        ORDER BY EXTRACT(EPOCH FROM first_subscriber_at - first_plan_live_at) / 86400.0
    ) AS median_days_to_first_subscriber
FROM farmer_cohorts
GROUP BY cohort_week
ORDER BY cohort_week;
```

### 6.2 Buyer Cohorts (by first purchase week)

Track how each wave of buyers progresses through retention milestones.

```sql
-- Buyer cohort: retention by first-purchase week
WITH buyer_first AS (
    SELECT
        buyer_email,
        MIN(created_at) AS first_order_at,
        date_trunc('week', MIN(created_at))::date AS cohort_week
    FROM orders
    WHERE status != 'canceled'
    GROUP BY buyer_email
)
SELECT
    bf.cohort_week,
    COUNT(DISTINCT bf.buyer_email) AS cohort_size,

    -- Week 1-4 retention (at least one picked_up order in each week offset)
    COUNT(DISTINCT bf.buyer_email) FILTER (
        WHERE EXISTS (
            SELECT 1 FROM orders o
            WHERE o.buyer_email = bf.buyer_email
              AND o.status = 'picked_up'
              AND o.created_at >= bf.first_order_at + interval '1 week'
              AND o.created_at < bf.first_order_at + interval '2 weeks'
        )
    ) AS retained_week_2,

    COUNT(DISTINCT bf.buyer_email) FILTER (
        WHERE EXISTS (
            SELECT 1 FROM orders o
            WHERE o.buyer_email = bf.buyer_email
              AND o.status = 'picked_up'
              AND o.created_at >= bf.first_order_at + interval '2 weeks'
              AND o.created_at < bf.first_order_at + interval '3 weeks'
        )
    ) AS retained_week_3,

    COUNT(DISTINCT bf.buyer_email) FILTER (
        WHERE EXISTS (
            SELECT 1 FROM orders o
            WHERE o.buyer_email = bf.buyer_email
              AND o.status = 'picked_up'
              AND o.created_at >= bf.first_order_at + interval '3 weeks'
              AND o.created_at < bf.first_order_at + interval '4 weeks'
        )
    ) AS retained_week_4,

    -- Cumulative: completed 3+ pickups total
    COUNT(DISTINCT bf.buyer_email) FILTER (
        WHERE (
            SELECT COUNT(*)
            FROM orders o
            WHERE o.buyer_email = bf.buyer_email AND o.status = 'picked_up'
        ) >= 3
    ) AS completed_3_plus_pickups

FROM buyer_first bf
GROUP BY bf.cohort_week
ORDER BY bf.cohort_week;
```

### 6.3 Subscription Cohort: Lifecycle by Subscribe Week

```sql
-- Subscription lifecycle cohort
WITH sub_cohorts AS (
    SELECT
        s.id,
        s.buyer_email,
        s.store_id,
        s.status,
        date_trunc('week', s.created_at)::date AS cohort_week,
        s.created_at,
        s.updated_at,
        (SELECT COUNT(*) FROM orders o
         WHERE o.subscription_id = s.id AND o.status = 'picked_up') AS completed_pickups,
        (SELECT COUNT(*) FROM orders o
         WHERE o.subscription_id = s.id AND o.status = 'no_show') AS no_shows,
        (SELECT COUNT(*) FROM orders o
         WHERE o.subscription_id = s.id) AS total_orders
    FROM subscriptions s
)
SELECT
    cohort_week,
    COUNT(*) AS cohort_size,
    COUNT(*) FILTER (WHERE status = 'active') AS still_active,
    COUNT(*) FILTER (WHERE status = 'paused') AS paused,
    COUNT(*) FILTER (WHERE status = 'canceled') AS canceled,
    ROUND(100.0 * COUNT(*) FILTER (WHERE status = 'active') / COUNT(*), 1) AS retention_rate_pct,
    ROUND(AVG(completed_pickups), 1) AS avg_completed_pickups,
    ROUND(AVG(no_shows)::numeric, 2) AS avg_no_shows,
    COUNT(*) FILTER (WHERE completed_pickups >= 3) AS reached_3_pickups,
    ROUND(
        100.0 * COUNT(*) FILTER (WHERE completed_pickups >= 3) / COUNT(*), 1
    ) AS pct_reached_3_pickups
FROM sub_cohorts
GROUP BY cohort_week
ORDER BY cohort_week;
```

### 6.4 Store Cohort: Revenue Maturation

```sql
-- Store revenue maturation: how quickly does revenue grow per store cohort?
WITH store_cohorts AS (
    SELECT
        s.id AS store_id,
        s.name,
        date_trunc('week', s.created_at)::date AS cohort_week,
        s.created_at AS store_created_at
    FROM stores s
    WHERE s.is_active = true AND s.is_demo = false
)
SELECT
    sc.cohort_week,
    COUNT(DISTINCT sc.store_id) AS stores_in_cohort,

    -- Revenue in first 30 days
    ROUND(
        SUM(o.captured_cents) FILTER (
            WHERE o.status = 'picked_up'
              AND o.created_at < sc.store_created_at + interval '30 days'
        ) / 100.0, 2
    ) AS revenue_first_30d_usd,

    -- Revenue in first 60 days
    ROUND(
        SUM(o.captured_cents) FILTER (
            WHERE o.status = 'picked_up'
              AND o.created_at < sc.store_created_at + interval '60 days'
        ) / 100.0, 2
    ) AS revenue_first_60d_usd,

    -- Revenue in first 90 days
    ROUND(
        SUM(o.captured_cents) FILTER (
            WHERE o.status = 'picked_up'
              AND o.created_at < sc.store_created_at + interval '90 days'
        ) / 100.0, 2
    ) AS revenue_first_90d_usd

FROM store_cohorts sc
LEFT JOIN orders o ON o.store_id = sc.store_id
GROUP BY sc.cohort_week
ORDER BY sc.cohort_week;
```

---

## 7. Implementation Recommendations (Priority Order)

### Phase 1: Quick Wins (Week 1-2)

1. **Add a `canceled_at` and `cancel_reason` column to `subscriptions`** -- single migration, captures churn reasons from the existing retention dialog.
2. **Add a `picked_up_at` column to `orders`** -- set alongside the `status = 'picked_up'` update. Enables precise pickup time analysis.
3. **Set up a lightweight analytics provider** (PostHog recommended for self-hosted/free tier). Add the JS snippet to `layout.tsx`. This immediately captures page views for every route.
4. **Emit server-side events for key actions**: subscribe, cancel, pickup-confirm, order-create. PostHog has a Go SDK, or use a simple HTTP POST to their `/capture` endpoint.

### Phase 2: Funnel Visibility (Week 3-4)

5. **Track checkout initiated vs. completed** -- emit events at `Checkout()` and `Subscribe()` / `CreateOrder()` endpoints. This unlocks checkout abandonment analysis.
6. **Integrate Resend webhooks** for email delivery/open/click tracking. Resend supports webhook events for `email.delivered`, `email.opened`, `email.clicked`.
7. **Create the operational dashboard** using the SQL queries above. Recommended tool: Metabase (open-source, connects directly to PostgreSQL, supports scheduled snapshots).

### Phase 3: Deep Analytics (Week 5-8)

8. **Run the cohort queries weekly** and store snapshots in a `metrics_snapshots` table for historical trend analysis.
9. **Build the alerting system** using Metabase alerts or a simple cron that runs threshold queries and sends Slack notifications.
10. **Frontend event tracking** for the full buyer funnel: store browse -> store view -> box view -> checkout start -> payment -> subscribe.

---

## 8. Key Risks Identified

1. **No visibility into checkout abandonment.** The system creates Stripe PaymentIntents/SetupIntents but has no way to know how many buyers started checkout and never completed. This is likely the single largest revenue leak and is completely invisible today.

2. **Cancellation reasons are discarded.** The frontend retention dialog captures 5 radio button reasons, but these are never sent to the backend or persisted. This data is essential for understanding and reducing churn.

3. **No store page view tracking.** Without knowing how many people view a store or box page, it is impossible to calculate conversion rates or identify underperforming listings.

4. **Subscription status changes overwrite `updated_at`.** There is no dedicated `canceled_at` or `paused_at` timestamp, making it difficult to analyze churn timing. The `updated_at` column is overwritten by any subsequent update (e.g., a canceled subscription whose payment method is later cleaned up).

5. **No farmer engagement tracking.** There is no way to identify farmers who signed up but became inactive. The `last_login_at` column does not exist, and the seller dashboard does not track visit frequency.

---

*End of audit. All SQL queries are based on the actual schema as of migration 0023. Queries are ready to run against the production PostgreSQL database.*
