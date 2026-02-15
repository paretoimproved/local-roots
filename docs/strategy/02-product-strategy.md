# Local-Roots Product Strategy

## 1. Current Product Audit

### What Is Built

Local-Roots is a local pickup marketplace with a functional end-to-end flow for recurring farm box subscriptions.

**Seller side (strong):**
- Registration and authentication (JWT-based)
- Store creation (one store per seller)
- Pickup location setup with Google Places autocomplete and timezone handling
- Subscription plan creation: title, cadence (weekly/biweekly/monthly), price, subscriber cap, first pickup date
- Cycle generation: creates pickup windows, offerings, and orders for active subscribers automatically
- Order fulfillment dashboard: mark ready, confirm pickup with 6-digit code (manual entry or QR scan), no-show handling with configurable fee
- Farmstand QR code generation and printable poster for in-person marketing
- Pause/resume box plans
- Payout summary per pickup window (estimated seller payout, platform fee, no-show fees)
- Store settings page

**Buyer side (functional):**
- Browse stores, view boxes, subscribe via Stripe PaymentElement
- Subscription management: pause, resume, cancel, update payment card
- Order page with pickup code display and QR code for seller scan
- Post-pickup reviews (1-5 rating + comment, unlocked after pickup confirmation)
- Token-based access (no buyer accounts -- frictionless but limited)

**Payments (partially complete):**
- Stripe SetupIntent for future pickups (>7 days out), PaymentIntent with manual capture for near-term pickups
- Webhook-driven payment status synchronization
- Capture on pickup confirmation, partial capture for no-show fees
- 5% buyer service fee
- One-time orders exist at pay-at-pickup only (no card checkout for one-time)

**Infrastructure:**
- Next.js (App Router) frontend on Vercel
- Go API backend on Railway with PostgreSQL
- Well-structured schema: 12 migrations, proper constraints, composite foreign keys, concurrency-safe inventory reservation

### Strengths

1. **Subscription-first architecture.** The entire data model -- subscription plans, cycles, recurring orders -- is purpose-built for the recurring box use case. This is the right wedge; most competitors bolt subscriptions onto generic e-commerce.

2. **Low seller setup friction.** The guided setup flow (location -> box -> review -> go live) gets a farmer from registration to accepting subscribers in minutes. Google Places autocomplete eliminates manual address entry.

3. **Farmstand QR bridge.** This is a genuinely clever acquisition channel. A farmer prints a QR poster, tapes it to their booth, and walk-up market customers become recurring subscribers. This converts a one-time impulse buy into a subscription relationship -- the exact behavior that makes the unit economics work.

4. **Fulfillment completeness.** The ready -> pickup code -> confirm flow with QR scanning is operationally sound. No-show handling with fee/waive options shows mature thinking about edge cases.

5. **Payment architecture.** The SetupIntent / PaymentIntent split with manual capture is correct for this domain. Authorize early, capture on fulfillment. This protects both sides.

6. **Schema quality.** Composite foreign keys, concurrency guards on inventory, proper constraint checks -- this will scale without data integrity issues.

### Weaknesses

1. **No seller payouts.** Stripe Connect is not integrated. Sellers cannot actually receive money. This is the single biggest blocker to real-world usage. A farmer will not use the platform if money stays in the platform's Stripe account indefinitely.

2. **No buyer accounts.** Buyers access subscriptions and orders via token-based URLs. There is no login, no dashboard, no way to see all subscriptions in one place. This works for MVP but creates friction for multi-store buyers and makes re-engagement impossible (no email address tied to an account for marketing).

3. **No notifications.** No email confirmations, no pickup reminders, no subscription renewal notices. Buyers and sellers have no communication channel through the platform. This will cause missed pickups and confusion.

4. **No search or discovery.** The `/stores` page is a flat list. There is no location-based search, no filtering, no map. Buyers cannot find nearby farms. The primary acquisition channel (farmstand QR) sidesteps this, but it limits organic marketplace growth.

5. **No seller analytics.** Sellers have a payout summary per window but no trends, subscriber growth, retention, or revenue over time. Farmers need to see their business growing to stay motivated.

6. **One-time orders are incomplete.** The domain model supports one-time orders (pay-at-pickup), but there is no card checkout for one-time purchases. This leaves value on the table at pickup windows where non-subscribers want to buy.

7. **No onboarding content or help.** No tooltips, no empty-state guidance beyond basic prompts. A first-time farmer will need hand-holding.

---

## 2. MVP Feature Prioritization (MoSCoW)

The goal: validate product-market fit with 5-10 real farmers and their buyers within the first market season.

### Must Have (ship before first real farmer)

| Feature | Rationale |
|---|---|
| **Stripe Connect seller payouts** | Without this, the product does not function as a marketplace. Sellers must receive their money. Use Express onboarding for simplicity. |
| **Email notifications (transactional)** | Subscription confirmation, pickup reminder (24h before), order ready notification. Minimum viable communication. Use a transactional provider (Resend, Postmark, or SES). |
| **Buyer signup/login (lightweight)** | Even email-only magic link auth. Buyers need a single place to see all their subscriptions. Also enables re-engagement and reduces token-URL fragility. |

### Should Have (ship within first 4-6 weeks of live usage)

| Feature | Rationale |
|---|---|
| **Location-based store discovery** | Let buyers search by zip code or city. The lat/lng columns already exist on pickup_locations. Add a PostGIS radius query or simple bounding box filter. |
| **One-time card checkout** | Enable walk-up or browse-only buyers to pay by card for a single order. Captures revenue from non-subscribers. |
| **Seller analytics dashboard** | Subscriber count over time, revenue per cycle, retention rate. Keep it simple: 3-4 key metrics. Sellers need to see the value of the platform. |
| **Pickup reminder push (SMS or email)** | Reduce no-show rate. A reminder the day before pickup is the single highest-leverage retention mechanism. |

### Could Have (Phase 2, after initial PMF signal)

| Feature | Rationale |
|---|---|
| **Box customization** | Let buyers choose/swap items within a box. 70% of CSA members prefer customizable boxes (industry data). Significantly increases retention. |
| **Seller messaging / updates** | Let sellers post weekly notes ("This week's box includes..."). Builds trust and anticipation. |
| **Referral program** | Give subscribers a referral link with a small credit. Word-of-mouth is the primary growth channel for local food. |
| **Multi-location support** | Some farmers sell at multiple markets. Allow one plan to have multiple pickup locations. |

### Won't Have (not now)

| Feature | Rationale |
|---|---|
| **Delivery** | Local pickup only is the right constraint. Delivery adds massive ops complexity (routing, cold chain, driver management). |
| **Wholesale / restaurant sales** | Different buyer persona, different pricing, different fulfillment. Stay focused on direct-to-consumer. |
| **Mobile app** | The web app works on mobile already. A native app adds dev cost without proportional value at this stage. |
| **AI-driven crop planning** | Interesting for scale, irrelevant for PMF validation. |

---

## 3. User Personas

### Farmer Personas

**Persona 1: Sarah -- The Saturday Market Farmer**
- 32, runs a 5-acre organic vegetable operation outside Austin, TX
- Sells at 2 farmers markets per week, grossing $1,200/week in peak season
- Jobs to be done:
  - Convert one-time market customers into recurring revenue so she has predictable income
  - Reduce waste by knowing how many boxes to pack before harvest
  - Spend less time on logistics (payment collection, customer communication) and more time farming
- Pain points: Chasing Venmo payments, no-shows who reserved produce, hand-written sign-up sheets that get lost
- Why Local-Roots: The farmstand QR turns her busiest market day into a subscriber acquisition event. She prints a poster, and walk-up buyers become weekly subscribers with card on file.

**Persona 2: Mike -- The Established CSA Operator**
- 48, runs a 20-acre diversified farm in the Hudson Valley, NY
- Has run a CSA for 8 years with 80 members. Uses spreadsheets and email chains.
- Jobs to be done:
  - Modernize his CSA without losing the personal relationship with members
  - Reduce administrative overhead (tracking payments, managing member communication)
  - Grow beyond 80 members without proportionally increasing admin work
- Pain points: Members who forget pickup days, manual payment tracking, no easy way for members to pause/resume
- Why Local-Roots: Replaces his spreadsheets with a system that handles payments, sends reminders, and lets members self-manage their subscriptions.

**Persona 3: Elena -- The Hobby-Scale Homesteader**
- 28, grows specialty produce (microgreens, heirloom tomatoes) on 0.5 acres in a suburban backyard in Portland, OR
- Sells informally via Instagram DMs and a neighborhood WhatsApp group
- Jobs to be done:
  - Formalize her sales without the overhead of a "real" business platform
  - Offer a simple subscription to her most loyal customers
  - Look professional to attract new customers beyond her social circle
- Pain points: Managing orders via DMs is chaotic, feels awkward asking friends to pay on time
- Why Local-Roots: Dead-simple setup. She creates a box, shares the link on Instagram, and buyers subscribe with a card. No invoicing, no chasing payments.

### Buyer Personas

**Persona 1: Jess -- The Intentional Consumer**
- 35, works remotely as a UX designer in Denver, CO
- Shops at the farmers market most Saturdays, spends $40-60/week on produce
- Jobs to be done:
  - Support local farmers in a meaningful, ongoing way (not just transactional)
  - Get fresh, seasonal produce without the decision fatigue of shopping
  - Have a reliable weekly rhythm -- know what she's getting, when, and where
- Pain points: Forgets which farmers she liked, inconsistent availability at markets, guilt when she skips a week and "her farmer" doesn't get paid
- Why Local-Roots: She scans a QR at the market, subscribes in 60 seconds, and gets a weekly box with pickup reminders. She can pause when she travels.

**Persona 2: David -- The Busy Family Shopper**
- 41, two kids, works as an accountant in suburban Charlotte, NC
- Wants fresh produce but rarely makes it to the market
- Jobs to be done:
  - Feed his family better without adding another errand to the weekend
  - Know the cost upfront (no surprise grocery bills)
  - Pickup on a schedule that fits his routine
- Pain points: CSAs he's tried felt rigid -- all-or-nothing for a full season, paid upfront, couldn't pause
- Why Local-Roots: No long-term commitment. Subscribe week by week. Pause or cancel anytime. Pickup location is on his commute.

**Persona 3: Aisha -- The Neighborhood Connector**
- 55, retired teacher, active in her community garden in Atlanta, GA
- Buys from multiple local producers (eggs, honey, bread, vegetables)
- Jobs to be done:
  - Keep track of her various local food subscriptions in one place
  - Share great farmers with friends and neighbors
  - Feel connected to the people growing her food
- Pain points: Juggles multiple Venmo subscriptions, spreadsheet tracking, different pickup days
- Why Local-Roots: One platform for all her local subscriptions. Reviews and QR sharing let her evangelize to neighbors.

---

## 4. Key Differentiators

### Local-Roots vs. Traditional CSAs

| Dimension | Traditional CSA | Local-Roots |
|---|---|---|
| Commitment | Seasonal upfront payment ($400-800) | Subscribe per cycle, pause/cancel anytime |
| Payment | Check, Venmo, cash at signup | Card on file, auto-authorized per pickup |
| Flexibility | Fixed share, no customization | Flexible cadence (weekly/biweekly/monthly) |
| Management | Spreadsheets, email chains | Self-service dashboard for sellers and buyers |
| No-show handling | Lost produce, no recourse | Configurable no-show fee with auto-capture |
| Acquisition | Word of mouth, website signup | Farmstand QR + digital discovery |

### Local-Roots vs. Existing Platforms (Local Line, Farmigo, GrazeCert)

| Dimension | Existing Platforms | Local-Roots |
|---|---|---|
| Pricing model | Monthly SaaS fee ($50-300/mo) | Free for sellers. 5% buyer service fee. |
| Core focus | General farm e-commerce (one-time, wholesale, delivery, CSA) | Subscription-first, pickup-only. Opinionated and simple. |
| Seller onboarding | Multi-step setup, feature-heavy dashboards | 3-step guided setup. Live in 5 minutes. |
| Buyer acquisition | Seller drives all traffic to their store | Farmstand QR converts in-person impulse buyers + marketplace discovery |
| Payment model | Seller pays for the platform | Buyer pays service fee. Sellers have zero cost to try. |
| Fulfillment | Varies (delivery, shipping, pickup) | Pickup-only with code-verified handoff. No delivery ops. |

### Core Differentiators (summary)

1. **Zero seller cost.** Seller pays nothing. The buyer service fee funds the platform. This eliminates the #1 barrier to farmer adoption: "I can't afford another subscription tool."

2. **Subscription-first, not subscription-added.** The entire UX is built around recurring boxes. It's not a general store with subscriptions bolted on. Every screen reinforces the recurring relationship.

3. **Farmstand QR as acquisition channel.** This is unique. No competitor offers a printed QR that converts walk-up market customers into digital subscribers in 60 seconds. It bridges the physical-digital gap that plagues local food.

4. **Pickup-only with code verification.** No delivery logistics. The 6-digit code + QR scan creates a verified handoff that protects both seller and buyer. Simple, trustworthy, low-cost.

5. **Flexible commitment.** Unlike seasonal CSAs that demand hundreds upfront, Local-Roots lets buyers subscribe per-cycle with pause/cancel anytime. This lowers the bar for new subscribers and reduces the anxiety of commitment.

---

## 5. Product Roadmap

### Phase 1: Validate (Weeks 1-8) -- "Can we get 5 farmers paid?"

**Goal:** Get 5-10 real farmers live, each with 5+ paying subscribers, and successfully process end-to-end payments.

**Must-ship features:**

1. **Stripe Connect Express onboarding** (Week 1-2)
   - Seller dashboard prompts Stripe Connect setup before going live
   - Automatic payout after pickup confirmation (T+2 or weekly batch)
   - Payout summary shows actual vs. estimated earnings

2. **Transactional email notifications** (Week 2-3)
   - Subscription confirmation email with link to manage
   - Pickup reminder (24h before window opens)
   - Order ready notification (when seller marks ready)
   - Payment receipt after capture

3. **Buyer authentication (magic link)** (Week 3-4)
   - Email-based magic link login (no passwords)
   - Buyer dashboard: list of active subscriptions, upcoming pickups, order history
   - Migrate from token-only access to authenticated access (keep token as fallback)

4. **Hardening and polish** (Week 4-6)
   - Error handling audit across all flows
   - Loading states, empty states, edge case messaging
   - Mobile responsiveness audit (most buyers will use phones at the market)

5. **Seed farmer onboarding** (Week 6-8)
   - Recruit 5-10 farmers through direct outreach (farmers markets, local ag networks)
   - White-glove onboarding: help them set up stores, print QR posters
   - Collect qualitative feedback weekly

**PMF signal:** At least 3 farmers renew usage after their first 4 pickup cycles. At least 50% of their subscribers complete 3+ pickups.

### Phase 2: Grow (Months 3-6) -- "Can buyers find us without a QR code?"

**Goal:** Organic buyer acquisition beyond farmstand QR. 50+ farmers, 500+ active subscribers.

**Features:**

1. **Location-based store discovery**
   - Zip code / city search on the buyer-facing stores page
   - Map view using lat/lng from pickup_locations
   - Filter by cadence, price range

2. **One-time card checkout**
   - Buyers who aren't ready to subscribe can buy a single box with card payment
   - Upsell to subscription after checkout ("Subscribe and save 10%")

3. **Seller analytics dashboard**
   - Subscriber count, churn rate, revenue per cycle (trailing 4 weeks)
   - Top-performing boxes, no-show rate
   - Simple charts, no enterprise complexity

4. **Box preview / what's in the box**
   - Sellers post a weekly note or photo of what's in the upcoming box
   - Displayed on the buyer-facing box page and in the pickup reminder email
   - Builds anticipation and reduces churn

5. **Referral program (simple)**
   - Subscribers get a shareable link
   - New subscriber from referral gives both parties a small credit ($5)
   - Track referral source for seller analytics

6. **SEO and landing pages**
   - `/farms/[city]` pages for local search traffic
   - Store profile pages with reviews, photos, location
   - Blog content: "Best farm boxes in [city]"

### Phase 3: Scale (Months 6-12) -- "Can this be a real business?"

**Goal:** 200+ farmers, 5,000+ active subscribers, path to $1M GMV run rate.

**Features:**

1. **Box customization**
   - Buyers choose/swap items within a box (with seller-defined constraints)
   - Increases retention by 25% based on industry data

2. **Multi-location support**
   - Farmers with multiple market locations can offer the same plan at different pickup points
   - Buyers choose their preferred location

3. **Seller CRM and communication**
   - Seller can send messages to all subscribers (weekly update, seasonal note)
   - Subscriber segments (new, loyal, at-risk)

4. **Payment flexibility**
   - Prepaid bundles (buy 4 pickups, get 1 free)
   - Gift subscriptions
   - EBT/SNAP acceptance (partnership-dependent, important for food access)

5. **Food hub / multi-vendor boxes**
   - Allow a food hub or market manager to create a multi-vendor box
   - One box, multiple farms contributing items
   - Hub takes a cut, each farmer gets paid their portion via Connect

6. **API for integrations**
   - Public API for farmers to integrate with POS systems, accounting tools
   - Webhook notifications for third-party integrations

---

## 6. Success Metrics

### Phase 1 KPIs (Validate)

| Metric | Target | Why It Matters |
|---|---|---|
| Live farmers | 5-10 | Enough to test diverse use cases (scale, crop type, market type) |
| Active subscribers per farmer | 5+ | Minimum viable subscriber base to test fulfillment flow |
| Subscriber pickup rate | >80% | Subscribers actually show up. Below 80% signals a product or reminder problem. |
| Seller weekly active rate | >80% | Sellers are using the dashboard and fulfilling orders, not abandoning the tool. |
| Time to first live box | <30 min | Onboarding friction. If it takes longer, the setup flow needs simplification. |
| NPS (seller) | >40 | Sellers recommend the platform to other farmers. |
| Gross payment volume | Track only | Too early for a target, but establishes baseline. |

### Phase 2 KPIs (Grow)

| Metric | Target | Why It Matters |
|---|---|---|
| Monthly farmer signups | 10-15 | Organic inbound without paid acquisition |
| Subscriber growth rate | 15-20% MoM | Compound growth from QR, referral, and discovery |
| Subscriber retention (4-week) | >65% | Subscribers who stay past 4 cycles are high-LTV |
| One-time to subscription conversion | >15% | One-time buyers convert to subscribers (validates upsell) |
| Referral rate | >10% | Subscribers who refer at least one new subscriber |
| GMV per farmer per month | $500+ | Revenue threshold where the platform is meaningful to the farmer |
| Platform take rate | ~5% | Stable buyer fee with no seller churn due to pricing |

### Phase 3 KPIs (Scale)

| Metric | Target | Why It Matters |
|---|---|---|
| Total GMV (monthly) | $80K+ | Path to $1M annual GMV |
| Active farmers | 200+ | Geographic density matters for marketplace effects |
| Active subscribers | 5,000+ | Critical mass for word-of-mouth growth |
| Subscriber LTV | >$200 | Average revenue per subscriber over their lifetime |
| CAC (blended) | <$15 | Cost to acquire a subscriber (should be very low given QR + referral) |
| LTV:CAC ratio | >10:1 | Healthy unit economics for a marketplace |
| Seller churn (monthly) | <5% | Farmers stay because the platform makes them money |
| No-show rate | <10% | Reminders and payment commitment reduce no-shows |

### North Star Metric

**Completed pickups per week.** This single metric captures the health of both sides of the marketplace. It requires sellers to be live, subscribers to be active, and fulfillment to work. If completed pickups per week is growing, the product is working.

---

## Appendix: Competitive Landscape Reference

- **Local Line**: Leading farm e-commerce platform. SaaS model ($50-300/mo). General-purpose (CSA, one-time, wholesale, delivery). Strong product but expensive for small farmers. Farms using Local Line grew sales 33% YoY in 2025.
- **Farmigo**: Farm-to-consumer marketplace with CSA support. Community-focused. Less actively developed.
- **GrazeCert / GrazeCart**: E-commerce for farms, focused on meat and specialty producers. Delivery-oriented.
- **Harvie**: CSA management platform. Closed in 2025. Farms migrating to Local Line.
- **Local Food Marketplace**: Comprehensive platform for farms, food hubs, CSAs. Multi-channel (DTC + wholesale).
- **Generic e-commerce (Shopify, Square)**: Farms use these but lack subscription management, pickup workflow, and farmstand QR. Not purpose-built.

The key gap Local-Roots fills: **a zero-cost, subscription-first platform for farmers who sell at pickup (markets, farmstands) and want to convert walk-up buyers into recurring subscribers.** No competitor targets this exact wedge with this pricing model.
