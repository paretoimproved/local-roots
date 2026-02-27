# Local-Roots Product Manager Audit

**Date:** February 27, 2026
**Scope:** Full codebase review, strategy alignment, competitive analysis, feature gap analysis, and prioritized roadmap
**North star metric:** Completed pickups per week

---

## Table of Contents

1. [Current Product Inventory](#1-current-product-inventory)
2. [Strategy Alignment Check](#2-strategy-alignment-check)
3. [Competitive Landscape (2026)](#3-competitive-landscape-2026)
4. [Feature Gap Analysis](#4-feature-gap-analysis)
5. [Prioritized Roadmap (RICE)](#5-prioritized-roadmap-rice)
6. [Recommendations](#6-recommendations)
7. [Sources](#7-sources)

---

## 1. Current Product Inventory

### 1.1 Buyer Flows (Complete)

| Feature | Status | Files |
|---------|--------|-------|
| **Homepage** (hero, how-it-works, featured farms, seller pitch) | Shipped | `frontend/src/app/page.tsx` |
| **Store discovery** with geo search (Google Places autocomplete, radius filter, geolocation) | Shipped | `frontend/src/app/stores/page.tsx` |
| **Store detail page** (hero image, pickup locations with maps/photos, subscription boxes, walk-up items, reviews) | Shipped | `frontend/src/app/stores/[storeId]/page.tsx` |
| **Subscription box detail** (plan info, pickup details, review summary, subscribe form) | Shipped | `frontend/src/app/boxes/[planId]/page.tsx` |
| **Subscribe flow** (email/name/phone, Stripe checkout with fee breakdown, card authorization) | Shipped | `frontend/src/components/subscribe-form.tsx` |
| **Walk-up checkout** (one-time card purchase from pickup window offerings) | Shipped | `frontend/src/app/pickup-windows/[pickupWindowId]/page.tsx`, `frontend/src/components/checkout-form.tsx` |
| **Order detail page** (status, items, pickup code with QR, payment info, review form) | Shipped | `frontend/src/app/orders/[orderId]/page.tsx` |
| **Subscription management** (pause, resume, cancel with retention flow, update card) | Shipped | `frontend/src/app/subscriptions/[subscriptionId]/page.tsx` |
| **Buyer dashboard** (active subscriptions, upcoming pickups with codes, past orders) | Shipped | `frontend/src/app/buyer/page.tsx` |
| **Buyer auth** (magic link + Google OAuth, unified session across buyer/seller) | Shipped | `frontend/src/app/buyer/login/page.tsx`, `frontend/src/app/buyer/auth/verify/page.tsx` |
| **Cancellation retention flow** (2-step: pause offer, then exit survey with 5 reasons) | Shipped | Embedded in `subscriptions/[subscriptionId]/page.tsx` |
| **Policies page** (subscriptions, one-time orders, payments, pickup, refunds, data) | Shipped | `frontend/src/app/policies/page.tsx` |
| **Post-pickup reviews** (1-5 stars + comment, unlocked after pickup confirmation) | Shipped | Part of order detail page |
| **QR-based short URL** (`/b/[planId]` redirect to box page) | Shipped | `frontend/src/app/b/[planId]/page.tsx` |
| **Demo mode** (`?demo=true` for admin-only preview of seed data) | Shipped | Query param in stores page |

### 1.2 Seller Flows (Complete)

| Feature | Status | Files |
|---------|--------|-------|
| **Seller registration** (email/password + Google OAuth) | Shipped | `frontend/src/app/seller/register/page.tsx` |
| **Seller login** (with `?next=` redirect for QR scan flow) | Shipped | `frontend/src/app/seller/login/page.tsx` |
| **Seller dashboard** (store list, admin section, store creation) | Shipped | `frontend/src/app/seller/page.tsx` |
| **4-step setup wizard** (location, box, payouts, review/go-live) | Shipped | `frontend/src/app/seller/stores/[storeId]/setup/*` |
| **Store management dashboard** (pickup window selector, order management, payout summary, subscription boxes with QR) | Shipped | `frontend/src/app/seller/stores/[storeId]/page.tsx` |
| **Settings page** (store details, pickup spot, farm box, payouts, advanced tools) | Shipped | `frontend/src/app/seller/stores/[storeId]/settings/page.tsx` |
| **Stripe Connect Express** (embedded onboarding with farmer data pre-fill) | Shipped | `frontend/src/components/stripe-connect-onboarding.tsx` |
| **Order lifecycle** (placed, ready, picked_up, no_show, canceled) | Shipped | Seller store page |
| **Pickup confirmation** (manual 6-digit code entry + QR-to-URL scan flow) | Shipped | Seller dashboard + `frontend/src/app/pickup/confirm/page.tsx` |
| **No-show handling** (charge fee or waive) | Shipped | Seller dashboard |
| **Cycle generation** (auto-creates pickup windows + orders for subscribers) | Shipped | Seller dashboard |
| **Pause/resume subscription plans** | Shipped | Seller dashboard |
| **Farmstand QR code** (printable poster, shareable link) | Shipped | Seller dashboard + `frontend/src/app/boxes/[planId]/qr/page.tsx` |
| **Photo uploads** (store cover, box/product photo, pickup spot photo via Supabase Storage) | Shipped | `frontend/src/components/seller/image-upload.tsx` |
| **Google Places address autocomplete** for pickup locations | Shipped | `frontend/src/components/seller/address-autocomplete.tsx` |
| **Payout summary** per pickup window (picked up revenue, no-show fees, platform fee) | Shipped | Seller dashboard |

### 1.3 Backend Architecture

| Component | Status | Details |
|-----------|--------|---------|
| **Go API** with PostgreSQL | Shipped | 23 migrations, well-structured schema |
| **JWT auth** (seller email/password + Google OAuth, buyer magic link + Google OAuth) | Shipped | `backend/internal/auth/` |
| **Stripe integration** (PaymentIntent, SetupIntent, manual capture, Connect Express) | Shipped | `backend/internal/payments/stripepay/` |
| **Transactional email** via Resend (magic links, pickup reminders, subscription confirmations) | Shipped | `backend/internal/email/` |
| **Internal cron endpoints** (billing authorization, reminder dispatch) | Shipped | `backend/internal/api/v1/internal_billing.go`, `internal_email.go` |
| **Webhook-driven payment status** (Stripe webhook with idempotency) | Shipped | `backend/internal/api/v1/stripe_webhook.go` |
| **Buyer service fee** (configurable bps + flat) | Shipped | Environment-configurable |
| **Geo search** (radius-based store discovery, Google Places integration) | Shipped | `backend/internal/api/v1/geo_google_places.go` |
| **Comprehensive test suite** | Shipped | Backend: Go unit + integration tests; Frontend: Vitest; E2E: Playwright |

### 1.4 What Is NOT Built

| Feature | Impact on North Star |
|---------|---------------------|
| **Seller analytics dashboard** (subscriber trends, revenue over time, retention) | Medium - keeps sellers engaged |
| **Box customization** (buyer swaps items within a box) | High - reduces churn 25%+ per industry data |
| **"What's in the box" weekly update/preview** (seller posts contents before pickup) | High - builds anticipation, reduces no-shows |
| **Referral program** (subscriber gives $5 / gets $5) | Medium - organic growth amplifier |
| **Buyer re-engagement emails** (lapsed subscriber nudges) | High - recovers churned revenue |
| **Multi-location support** (one plan, multiple pickup points) | Medium - serves farmers at multiple markets |
| **SEO-optimized pages** (`/farms/[city]`, individual farm profiles) | Medium - organic discovery |
| **Seller CRM / messaging** (broadcast to all subscribers) | Medium-High - builds relationship, reduces churn |
| **SMS notifications** (pickup reminders, order ready) | Medium - higher open rates than email |
| **Gift subscriptions** | Low-Medium - seasonal revenue spikes |
| **EBT/SNAP acceptance** | Low now, High later - food access, large market |
| **Stripe Connect payout automation** (automatic transfers post-pickup) | High - currently listed as "next up" in roadmap |
| **Public store profiles / SEO pages** | Medium - organic buyer acquisition |

---

## 2. Strategy Alignment Check

### 2.1 Strategy Doc vs. Codebase: What's Delivered

The strategy docs (`docs/strategy/02-product-strategy.md`) outlined a 3-phase product roadmap. Here is alignment:

**Phase 1 "Must Have" (ship before first real farmer):**

| Strategy Requirement | Status | Notes |
|---------------------|--------|-------|
| Stripe Connect seller payouts | DONE | Embedded onboarding with pre-fill. Payout summary per window exists. Automated payout transfers are in Phase 8 (next up). |
| Email notifications (transactional) | DONE | Resend: subscription confirm, pickup reminder (24h), order ready. |
| Buyer signup/login (lightweight) | DONE | Magic link + Google OAuth, unified session, buyer dashboard. |

**Phase 2 "Should Have" (first 4-6 weeks of live usage):**

| Strategy Requirement | Status | Notes |
|---------------------|--------|-------|
| Location-based store discovery | DONE | Geo search with autocomplete, radius filter, geolocation. |
| One-time card checkout | DONE | Walk-up checkout with card payment, fee breakdown. |
| Seller analytics dashboard | NOT DONE | Only payout summary per window. No trends, retention, or growth charts. |
| Pickup reminder push (SMS or email) | PARTIALLY DONE | Email reminders shipped. SMS not built. |

**Phase 3 "Could Have" (after initial PMF signal):**

| Strategy Requirement | Status | Notes |
|---------------------|--------|-------|
| Box customization | NOT DONE | No swap/choice within a box. |
| Seller messaging / updates | NOT DONE | No broadcast or "what's in the box" posts. |
| Referral program | NOT DONE | No referral links or credits. |
| Multi-location support | NOT DONE | One pickup location per store. |

### 2.2 Key Observation

The codebase has executed Phase 1 completely and most of Phase 2. The product is genuinely ready for early live usage with real farmers. The critical remaining gap before scaling is **seller analytics** (farmers need to see their business growing) and **"what's in the box" communication** (the single highest-leverage retention mechanism).

---

## 3. Competitive Landscape (2026)

### 3.1 Active Competitors

| Platform | Model | Pricing (Farmer Pays) | Key Strengths | Key Weaknesses | Status |
|----------|-------|----------------------|---------------|----------------|--------|
| **Barn2Door** | SaaS | $99-$299/mo + $399-$599 setup | Full-service (website, POS, marketing coaching); flexible subscriptions (ongoing, seasonal, rolling); patent-pending pro-rata mid-season payments; saves farms 20-30 hrs/mo | Expensive for small farms; farmer must drive all demand; no marketplace/discovery | Active, ~$19.5M raised |
| **Local Line** | SaaS | $49-$199+/mo (no commission) | Leading platform (8,000+ farms, 8 countries); 23% avg sales increase; strong B2B + B2C; flexible box swaps; POS ($399 hardware); wholesale support | Complex for simple operations; no demand generation; SaaS cost regardless of sales | Active, market leader |
| **GrazeCart** | SaaS | $69-$149+/mo | Excellent for meat/perishable (weight-based pricing); no-code website builder; nationwide shipping support; POS; delivery zones | Skews toward meat/protein; delivery-oriented (not pickup-first); monthly cost | Active |
| **GrownBy** | Cooperative marketplace | 2% flat fee on sales (no monthly) | Farmer-owned cooperative model; customizable CSA shares; USDA SNAP-approved; wholesale marketplace (CIA partnership); 64K orders fulfilled in 2025 | Small scale; limited geographic coverage; cooperative governance adds complexity | Active, growing |
| **Locally Grown** | Marketplace | Free for farmers; 6% buyer checkout fee | Always free for farmers; marketplace-native; mobile POS (2.7% + $0.05); 500+ farms; $2M+/mo in farm sales | Higher buyer fee (6% vs Local-Roots 5%); less subscription-focused; smaller brand | Active, growing |
| **Local Food Marketplace** | SaaS | ~$149/mo + custom | Comprehensive (farms, food hubs, CSAs); multi-channel (DTC + wholesale); strong food hub features | Enterprise-oriented; expensive for small farms; complex | Active |
| **CSAware** | SaaS | Varies | Purpose-built for CSA management; affordable; flexible subscriptions | CSA-only; limited e-commerce; no marketplace | Active, niche |
| **Farmigo** | SaaS | Varies | CSA-specific; mobile-first member signup | Acquired by GrubMarket 2021; uncertain trajectory; reduced development | Uncertain |

### 3.2 Dead/Shuttered Competitors

| Platform | What Happened | Relevance |
|----------|--------------|-----------|
| **Harvie** | Shut down December 2024. Farms migrating primarily to Local Line. | Harvie's AI-driven customization addressed the #1 CSA complaint (no choice) but at 10% total take rate. The customization feature was genuinely valuable; their pricing was not sustainable. Local-Roots can learn from their customization approach without the punitive take rate. |
| **Farmdrop** (UK) | Collapsed December 2021. Ran out of funding. Owed suppliers for Christmas orders. | Farmdrop tried to be a full delivery marketplace (the Instacart of local food). Delivery economics killed it. Validates Local-Roots' pickup-only approach. |
| **WhatsGood** | Minimal recent activity. Last significant press from 2019. App still exists but unclear operational status. | Closest conceptual match to Local-Roots (marketplace for local food with multiple fulfillment options). Appears to have stalled, leaving the marketplace wedge open. |

### 3.3 Competitive Positioning Matrix

```
                    MARKETPLACE (demand generation)
                           ^
                           |
                   GrownBy |  Local-Roots (target)
              Locally Grown |
                           |
    SaaS TOOLS <-----------+-----------> DEMAND + TOOLS
                           |
              Local Line    |
              Barn2Door     |
              GrazeCart      |
                           |
                    SELLER-ONLY (no demand)
```

**Where Local-Roots sits:** The only platform that combines (1) zero seller cost, (2) subscription-first architecture, (3) marketplace demand generation, and (4) pickup-only with QR verification. This is a genuinely unoccupied position.

### 3.4 Competitor Feature Comparison

| Feature | Local-Roots | Barn2Door | Local Line | GrazeCart | GrownBy | Locally Grown |
|---------|------------|-----------|------------|-----------|---------|---------------|
| Free for sellers | YES | No ($99-299/mo) | No ($49-199/mo) | No ($69-149/mo) | YES (2% fee) | YES (6% buyer fee) |
| Subscription management | YES | YES | YES | YES | YES | Limited |
| Box customization | NO | YES | YES | Limited | YES | NO |
| Marketplace discovery | YES (geo search) | NO | NO | NO | YES | YES |
| QR physical-to-digital bridge | YES | NO | NO | NO | NO | NO |
| Pickup verification (code/QR) | YES | NO | NO | NO | NO | NO |
| Delivery support | NO | YES | YES | YES | YES | YES |
| Wholesale / B2B | NO | YES | YES | NO | YES | NO |
| POS / In-person sales | NO | YES | YES | YES | NO | YES |
| SNAP/EBT | NO | NO | NO | NO | YES | NO |
| Website builder | NO | YES | YES | YES | NO | NO |
| Mobile native app | NO | YES (POS) | NO | NO | YES | YES |
| Seller analytics | NO (payout only) | YES | YES | YES | Basic | Basic |
| Seller CRM / messaging | NO | YES | YES | NO | YES | NO |
| Photo uploads | YES | YES | YES | YES | YES | YES |

---

## 4. Feature Gap Analysis

### 4.1 Critical Gaps for PMF (Pre-Scale)

These gaps directly threaten the ability to retain the first 5-10 farmers and their subscribers:

**Gap 1: No "What's in the Box" Communication**

Every competitor with subscription support allows sellers to post weekly updates about box contents. This is the single most impactful retention mechanism for subscription produce boxes:
- Builds anticipation before pickup (reduces no-shows)
- Lets buyers plan meals (increases perceived value)
- Creates a recurring engagement touchpoint beyond the transaction
- Industry data: farms that send weekly "what's in the box" emails see 15-30% higher retention

**Gap 2: No Seller Analytics**

Farmers currently see only per-window payout summaries. They cannot see:
- Subscriber growth over time
- Revenue trends (trailing 4/8/12 weeks)
- Pickup rate (% of orders completed)
- Churn rate / retention metrics

Without this, farmers cannot see the value of staying on the platform. Every competitor (Barn2Door, Local Line, GrazeCart) provides seller-facing analytics.

**Gap 3: No Payout Automation**

Stripe Connect is set up for onboarding, but there is no automated payout transfer after pickup confirmation. This is listed in the roadmap (Phase 8) but is a hard blocker for real money movement. Farmers need to see money hit their bank account automatically.

**Gap 4: No Buyer Re-engagement**

There is no mechanism to win back lapsed subscribers. The email system (Resend) exists but is only used for transactional messages. Lapsed subscriber nudge emails ("We miss you," "Your farmer has new boxes this week") are a high-ROI retention lever.

### 4.2 Growth Gaps (Post-PMF)

These features become critical once the first 10-20 farmers are live and the product has validated retention:

**Gap 5: No Box Customization**

70% of CSA members prefer customizable boxes (industry data). Harvie's entire value proposition was algorithmic customization. Without at least basic item swaps within a box, Local-Roots will lose subscribers to platforms that offer choice. This is the #1 driver of CSA churn.

**Gap 6: No Referral Program**

The strategy docs identify referral as a high-priority growth channel (trigger after 3rd successful pickup, "Give $5, get $5"). The QR poster is the primary acquisition channel, but referrals compound it. Word-of-mouth is the dominant growth vector for local food.

**Gap 7: No SEO / Public Profiles**

There are no `/farms/[city]` landing pages or SEO-optimized farm profiles. Organic search ("farm subscription box [city]", "CSA near me") is a significant buyer acquisition channel that costs nothing once built.

**Gap 8: No Multi-Location Support**

Farmers who sell at multiple markets cannot offer the same subscription at different pickup points. This limits the addressable farmer segment to single-location operations.

### 4.3 Differentiation Gaps (vs. Specific Competitors)

| Competitor Advantage | Local-Roots Lacks | Impact |
|---------------------|-------------------|--------|
| Barn2Door: full website builder + POS | No POS, no custom website | Low (not the wedge) |
| Local Line: wholesale + B2B channels | No wholesale support | Low (not the wedge) |
| GrownBy: SNAP/EBT acceptance | No SNAP/EBT | Medium (food access) |
| GrownBy: cooperative farmer ownership | Platform-owned model | Low (different values, both valid) |
| Locally Grown: native mobile app | Web-only (responsive) | Low (mobile web works at this stage) |
| All SaaS competitors: seller analytics | No seller analytics | High (must fix) |
| Barn2Door + Local Line + GrownBy: box customization | No customization | High (must build) |

---

## 5. Prioritized Roadmap (RICE)

RICE scoring: **R**each (how many users affected per quarter) x **I**mpact (effect on north star: 0.25/0.5/1/2/3) x **C**onfidence (% certainty) / **E**ffort (person-weeks).

North star reminder: **Completed pickups per week.**

### Rank 1: "What's in the Box" Weekly Preview

| Factor | Score | Rationale |
|--------|-------|-----------|
| Reach | 100% of active subscribers | Every subscriber sees it before every pickup |
| Impact | 3 (massive) | Directly reduces no-shows (our biggest leak) and increases anticipation. Industry data: 15-30% retention improvement. |
| Confidence | 90% | Proven across every CSA and subscription box platform |
| Effort | 2 weeks | Seller posts text/photo update per plan. Display on buyer-facing box page + include in pickup reminder email. Backend: new `box_updates` table + endpoints. Frontend: seller form + buyer display. |
| **RICE Score** | **135** | |

**Spec:** Seller can post a short text note + optional photo for each upcoming cycle ("This week: heirloom tomatoes, sweet corn, basil, summer squash"). Display on the box detail page. Include in the 24h pickup reminder email. Buyer dashboard shows a preview of their next box contents.

### Rank 2: Seller Analytics Dashboard

| Factor | Score | Rationale |
|--------|-------|-----------|
| Reach | 100% of sellers | Every farmer uses the dashboard |
| Impact | 2 (high) | Farmers who can see their business growing stay on the platform. Without analytics, sellers cannot quantify the value of Local-Roots. |
| Confidence | 85% | Standard for all SaaS/marketplace platforms. Every competitor has it. |
| Effort | 3 weeks | 4-6 key metrics: active subscribers (trend line), revenue per cycle (trailing 8 weeks), pickup rate, churn rate, total pickups completed, subscriber cap utilization. Backend: aggregation queries. Frontend: simple charts (could use Recharts or similar). |
| **RICE Score** | **57** | |

**Spec:** New `/seller/stores/[storeId]/analytics` page. Metrics: (1) Active subscribers over time, (2) Revenue per cycle (last 8 cycles), (3) Pickup completion rate (%), (4) Subscriber retention (4-week cohort), (5) Total completed pickups, (6) Subscriber cap utilization. Use simple bar/line charts. No enterprise complexity.

### Rank 3: Payout Automation (Stripe Connect Transfers)

| Factor | Score | Rationale |
|--------|-------|-----------|
| Reach | 100% of sellers | Every farmer needs to get paid |
| Impact | 3 (massive) | Without automated payouts, money sits in the platform Stripe account. This is a trust-breaker. Farmers will not use a platform that does not pay them automatically. |
| Confidence | 95% | Required for basic marketplace function. Already in Phase 8 roadmap. |
| Effort | 3 weeks | Stripe Connect transfer API on pickup confirmation. Handle partial captures, no-show fees, platform fee deduction. Seller-facing payout ledger. |
| **RICE Score** | **95** | |

**Spec:** After pickup confirmation (status = `picked_up`), automatically initiate a Stripe Connect transfer to the seller's connected account. Deduct platform fee. Show transfer status in payout summary. Send seller a payout notification email.

### Rank 4: Buyer Re-engagement Emails

| Factor | Score | Rationale |
|--------|-------|-----------|
| Reach | 30-50% of churned subscribers | Targets lapsed subscribers who did not actively cancel |
| Impact | 2 (high) | Recovers 10-15% of churned subscribers per industry benchmarks. Directly increases completed pickups. |
| Confidence | 80% | Proven email marketing pattern. Resend infrastructure already exists. |
| Effort | 1.5 weeks | Identify lapsed subscribers (no order in 2+ cycles despite active subscription). Send automated email sequence: (1) "We miss you" with box preview, (2) "Your farmer has new boxes this week." Backend: cron job + email templates. |
| **RICE Score** | **43** | |

**Spec:** Cron endpoint identifies subscribers who have been active but have not had an order placed in 2+ consecutive cycles. Send a personalized email with the farmer's name, next box preview (if available), and a one-tap link to resume or browse. Cadence: one email per lapsed cycle, max 3 before stopping.

### Rank 5: Referral Program

| Factor | Score | Rationale |
|--------|-------|-----------|
| Reach | 60-80% of active subscribers (eligible to refer) | Triggered after 3rd successful pickup |
| Impact | 2 (high) | Word-of-mouth is the #1 growth channel for local food. Referral compounds the QR poster effect. Each referral = new completed pickups. |
| Confidence | 75% | Standard marketplace growth mechanic. Strategy docs specify "Give $5, get $5." |
| Effort | 3 weeks | Referral link generation, tracking, credit application, anti-gaming. Backend: `referrals` table. Frontend: share prompt after 3rd pickup, referral dashboard. |
| **RICE Score** | **30** | |

**Spec:** After a buyer's 3rd completed pickup, show a referral prompt: "Love your farm box? Share with a friend. You both get $5 off your next box." Unique referral link per subscriber. Credit applied to next service fee (not box price, to preserve seller revenue). Track: referral source, conversion, credit redemption.

### Rank 6: Box Customization (Basic)

| Factor | Score | Rationale |
|--------|-------|-----------|
| Reach | 100% of subscribers | Every subscriber can customize |
| Impact | 3 (massive) | 70% of CSA members prefer customizable boxes. #1 driver of CSA churn is lack of choice. Harvie proved the value (15-30% retention improvement). |
| Confidence | 70% | High-value but significant complexity. Requires inventory management changes. Harvie's approach was complex; start simpler. |
| Effort | 5 weeks | Seller defines "base items" + "swap options" per cycle. Buyer can swap N items before cutoff. Backend: swap logic, inventory impact. Frontend: buyer-facing swap UI, seller-facing configuration. |
| **RICE Score** | **42** | |

**Spec (Phase 1 - Basic):** Seller lists 6-8 items in the box + 2-3 "swap options." Buyer can swap up to 2 items before the cutoff. No algorithmic recommendation (that is Harvie territory). Simple swap UI on the order detail page. Seller sees aggregated swap data for packing.

### Rank 7: SEO Landing Pages

| Factor | Score | Rationale |
|--------|-------|-----------|
| Reach | New buyers (organic search) | Captures "farm box [city]", "CSA near me" queries |
| Impact | 1 (medium) | Compound growth channel. Slow to build but persistent. Does not directly increase pickups from existing subscribers but adds new subscribers. |
| Confidence | 80% | Standard SEO playbook. Strategy docs already outline the approach. |
| Effort | 2 weeks | `/farms/[city]` pages with store listings, meta tags, structured data. Farm profile pages with reviews, photos, location. |
| **RICE Score** | **40** | |

**Spec:** Generate `/farms/[city]` pages for each metro area with active stores. Include: list of stores, map, featured boxes, review excerpts. Add JSON-LD structured data for local business. Optimize meta titles: "Farm Subscription Boxes in [City] | LocalRoots."

### Rank 8: SMS Pickup Reminders

| Factor | Score | Rationale |
|--------|-------|-----------|
| Reach | 80% of subscribers with phone numbers | Only those who provided phone at signup |
| Impact | 2 (high) | SMS open rates are 98% vs 20% for email. Directly reduces no-shows, which directly increases completed pickups. |
| Confidence | 75% | Proven channel. Requires Twilio/similar integration. |
| Effort | 2 weeks | Integration with Twilio or similar. Send SMS 24h before pickup window. Include: "Your farm box from [Farm] is ready for pickup tomorrow at [Time] at [Location]." |
| **RICE Score** | **48** | |

**Spec:** Opt-in SMS reminders for buyers who provided a phone number. Single message 24h before pickup window opens. Content: farm name, pickup time, location. Unsubscribe via reply "STOP." Use Twilio. Cost: ~$0.01/message.

### Rank 9: Multi-Location Support

| Factor | Score | Rationale |
|--------|-------|-----------|
| Reach | 20-30% of farmers (those at multiple markets) | Specific segment, but high-value farmers |
| Impact | 1 (medium) | Unlocks a segment of farmers who are currently excluded. Each added location = more pickup windows = more completed pickups. |
| Confidence | 70% | Architecture partially supports it (pickup_locations already plural). Needs plan-level association. |
| Effort | 3 weeks | One plan can be offered at multiple pickup locations. Buyer chooses preferred location at subscription time. Cycle generation creates windows at all locations. |
| **RICE Score** | **14** | |

### Rank 10: Seller Broadcast Messaging

| Factor | Score | Rationale |
|--------|-------|-----------|
| Reach | 100% of sellers x their subscribers | Amplified reach through seller |
| Impact | 1.5 (medium-high) | Builds farmer-subscriber relationship. Reduces churn through personal connection. Partially overlaps with "what's in the box" feature. |
| Confidence | 65% | Messaging is standard for CSA platforms but adds moderation/abuse concerns. |
| Effort | 2.5 weeks | Seller composes message, platform sends to all active subscribers via email. No reply mechanism (one-way broadcast). Moderation: manual review at first. |
| **RICE Score** | **26** | |

### Summary: Top 10 Ranked

| Rank | Feature | RICE | Effort | When |
|------|---------|------|--------|------|
| 1 | "What's in the Box" weekly preview | 135 | 2 wk | **Immediately** |
| 2 | Payout automation (Stripe Connect transfers) | 95 | 3 wk | **Immediately** |
| 3 | Seller analytics dashboard | 57 | 3 wk | **Next 4 weeks** |
| 4 | SMS pickup reminders | 48 | 2 wk | **Next 4 weeks** |
| 5 | Buyer re-engagement emails | 43 | 1.5 wk | **Next 6 weeks** |
| 6 | Box customization (basic) | 42 | 5 wk | **Weeks 6-10** |
| 7 | SEO landing pages | 40 | 2 wk | **Weeks 6-10** |
| 8 | Referral program | 30 | 3 wk | **Weeks 8-12** |
| 9 | Seller broadcast messaging | 26 | 2.5 wk | **Weeks 8-12** |
| 10 | Multi-location support | 14 | 3 wk | **Weeks 10-14** |

---

## 6. Recommendations

### 6.1 Immediate Priorities (Before Onboarding First Farmers)

1. **Ship payout automation.** This is a hard blocker. Real farmers will not use a platform where money does not automatically reach their bank account. This must be live before any real-world usage.

2. **Ship "what's in the box" preview.** This is the single highest-leverage retention feature. It takes 2 weeks to build and directly reduces no-shows (the north star's biggest enemy). Every pickup reminder email should include box contents.

### 6.2 Strategic Observations

**Local-Roots' positioning is correct and unoccupied.** No competitor combines zero seller cost + subscription-first + marketplace demand generation + pickup-only with QR verification. This is a genuine wedge.

**The competitive threat is not features, it is density.** Barn2Door and Local Line have more features but no marketplace. GrownBy and Locally Grown have marketplace models but weaker subscription infrastructure. Local-Roots' risk is not being out-featured; it is failing to achieve local density before a competitor copies the model.

**Harvie's death is an opportunity.** Harvie shut down in December 2024, leaving CSA-focused farms searching for alternatives. Many migrated to Local Line, but Local Line's SaaS pricing is a barrier for small farms. Local-Roots' zero-cost model is a compelling alternative for Harvie refugees.

**GrownBy is the closest philosophical match** (farmer-cooperative, low take rate, marketplace model, SNAP-approved). Their 2% fee is lower than Local-Roots' 5%. However, their cooperative structure limits scale and velocity. Local-Roots can move faster as a traditional startup.

**Locally Grown is the closest structural match** (free for farmers, buyer checkout fee, marketplace). Their 6% fee is higher than Local-Roots' 5%. They have 500+ farms and $2M+/mo in sales, proving the model works. Their weakness is that they are not subscription-first.

### 6.3 Risk Assessment

| Risk | Severity | Mitigation |
|------|----------|------------|
| Farmers do not see value without analytics | High | Ship seller analytics within 4 weeks of launch |
| Subscribers churn without box preview | High | Ship "what's in the box" before first real subscriber |
| Payout delays erode farmer trust | Critical | Ship payout automation before onboarding farmers |
| Barn2Door or Local Line adds marketplace | Medium | Move fast on local density; win farmers with zero-cost model before competitors react |
| Locally Grown copies subscription-first approach | Medium | QR verification and subscription architecture are 6+ months of engineering lead |
| Seasonal drop-off kills retention | High | Promote year-round producers (meat, eggs, dairy); introduce biweekly/monthly cadences in winter |

### 6.4 Metrics to Track at Launch

| Metric | Target | Measures |
|--------|--------|----------|
| **Completed pickups per week** (north star) | Growing week-over-week | Overall product health |
| Pickup completion rate | >80% | Are subscribers actually showing up? |
| Subscriber 4-week retention | >65% | Are subscribers staying? |
| Farmer weekly active rate | >80% | Are farmers using the dashboard? |
| QR scan-to-subscribe conversion | >5% | Is the physical-to-digital bridge working? |
| Time from farmer signup to first subscriber | <7 days | Is onboarding fast enough? |
| No-show rate | <15% | Are reminders working? |
| Average revenue per farmer per month | >$500 | Is the platform meaningful to farmers? |

---

## 7. Sources

### Competitor Pricing and Features
- [Barn2Door Pricing](https://www.barn2door.com/pricing)
- [Barn2Door vs GrazeCart Comparison (2026)](https://www.barn2door.com/blog-all/a-2025-comparison-of-barn2door-and-grazecart)
- [Local Line Pricing for Farms](https://www.localline.co/suppliers/pricing)
- [Local Line 2025 Year in Review](https://www.localline.co/blog/2025-local-line-highlights)
- [Local Line: Best CSA Software Platforms (2026)](https://www.localline.co/blog/top-csa-software-platforms)
- [GrazeCart Plans and Pricing](https://www.grazecart.com/pricing)
- [GrazeCart: E-Commerce for Farmers](https://www.grazecart.com/blog/ecommerce-for-farmers)
- [GrownBy Pricing (Farm Generations Cooperative)](https://coop.grownby.com/pricing)
- [GrownBy 2025 Year in Review](https://coop.grownby.com/post/a-year-in-review-growing-together-in-2025)
- [Locally Grown POS for Farmers Market](https://www.locallygrown.app/farm-pos-app)
- [Local Food Marketplace Pricing](https://home.localfoodmarketplace.com/pricing/)

### Competitor Closures and Status
- [Harvie Alternative for CSAs (Local Line)](https://www.localline.co/blog/harvie-alternative)
- [Farmdrop Closes Its Doors (Abel & Cole)](https://www.abelandcole.co.uk/Blog/post/farmdrop-closes-its-doors)
- [WhatsGood Farm-to-Table App](https://www.pymnts.com/news/retail/2019/whatsgood-farm-to-table-app/)

### Industry and Market Data
- [Farm POS Systems Compared 2025](https://www.locallygrown.app/blog/2025-06-16-farm-pos-systems-compared-square-vs-local-line-vs-barn2door-vs-locally-grown)
- [Top 5 Ecommerce for Farmers Platforms (2026)](https://agtech.folio3.com/blogs/top-5-ecommerce-for-farmers-platforms/)
- [Community Supported Agriculture Software: 2026 Trends (Farmonaut)](https://farmonaut.com/blogs/community-supported-agriculture-software-2026-trends)
- [Best E-commerce Platforms for Farms (2025, Local Line)](https://www.localline.co/blog/best-e-commerce-platforms-for-farms)
- [Online Farm Store Trends (2026, GrazeCart)](https://www.grazecart.com/blog/online-farm-store-trends)
