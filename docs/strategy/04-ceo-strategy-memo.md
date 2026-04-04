# CEO Strategy Memo: Local-Roots Path to Scale

**Date:** February 2026
**Author:** CEO / Chief Strategist
**Status:** Strategic Planning Document

---

## 1. Vision & Mission

### Mission
Empower every local farmer to build a thriving direct-to-consumer subscription business with zero technical overhead.

### Vision
Local-Roots becomes the operating system for local food commerce -- the platform where every farmer in North America manages recurring revenue, and every family discovers trusted, local food within a 30-minute drive.

### The 10-Year Picture
At scale, Local-Roots is a vertical commerce platform that owns the relationship layer between local food producers and consumers. We are to local food what Shopify is to online retail: the trusted infrastructure that makes selling simple and buying delightful. The difference is that our commerce is inherently local, recurring, and trust-driven -- which means we can build density-based network effects that Shopify cannot.

**Tagline candidate:** "Your farmer, on repeat."

---

## 2. Business Model Canvas (Lean Canvas)

| Element | Description |
|---|---|
| **Problem** | Farmers waste 15-20 hours/week on manual subscription management, payment collection, and no-show logistics. Buyers want local food but find CSAs rigid and farmers markets unreliable. |
| **Customer Segments** | (1) Small-to-mid-size farms doing $50K-$500K in direct sales. (2) Health-conscious urban/suburban families willing to pay premium for local, fresh food. |
| **Unique Value Proposition** | Farmers get Shopify-simple subscription management with built-in demand. Buyers get one-tap access to local farm subscriptions with guaranteed pickup slots. |
| **Solution** | Subscription box builder, Stripe-powered recurring billing, pickup window management, QR code fulfillment verification, buyer discovery marketplace. |
| **Channels** | (1) Farmer onboarding via farmers market field sales, ag extension partnerships, word-of-mouth. (2) Buyer acquisition via local SEO, farmer cross-promotion, community partnerships. |
| **Revenue Streams** | 7% + $0.35 buyer service fee on every transaction. Future: seller SaaS tier ($29-99/mo for advanced features), promoted listings, data/insights products. |
| **Cost Structure** | Engineering (60%), farmer success/onboarding (20%), hosting and payment processing (10%), marketing (10%). |
| **Key Metrics** | GMV, active subscriptions, farmer retention, buyer retention, subscription renewal rate, pickup completion rate. |
| **Unfair Advantage** | Density-based supply lock-in: once a farmer's subscribers are on the platform, switching costs are high. Local trust graph is defensible and compounds. |

---

## 3. Unit Economics

### Per-Transaction Economics

> **Note:** All revenue figures below are **net of Stripe processing fees**, reflecting true platform contribution. Previous versions showed gross fees, which overstated unit economics.

| Metric | Value | Notes |
|---|---|---|
| Average subscription box price | $45 | Based on CSA market data |
| Buyer service fee (7% + $0.35) | $3.50 | Gross platform revenue per transaction |
| Total charged to buyer | $48.50 | Subtotal + service fee |
| Stripe processing (~2.9% + $0.30) | -$1.71 | Absorbed by platform out of service fee |
| **Net platform revenue per transaction** | **$1.79** | Service fee minus Stripe |
| Platform COGS per transaction | ~$0.15 | Hosting, support, infrastructure |
| **Net contribution per transaction** | **$1.64** | Revenue after all variable costs |

### Per-Farmer Economics

| Metric | Value | Notes |
|---|---|---|
| Average subscribers per farmer | 40 | At steady state |
| Weighted avg order frequency | 3.1x/month | 60% weekly, 25% biweekly, 15% monthly |
| Monthly GMV per farmer | $5,580 | 40 subs × 3.1 orders × $45 |
| Monthly net contribution per farmer | $213 | 40 subs × $5.33 blended contribution |
| Annual net contribution per farmer | $2,558 | |
| Farmer acquisition cost (CAC) | $300-500 | Field sales + onboarding support |
| **Farmer LTV (3-yr, 80% retention)** | **$5,247** | Discounted at 10% annual rate, net of Stripe |
| **LTV:CAC ratio** | **10.5-17.5x** | Based on net contribution (after Stripe fees) |

### Per-Buyer Economics

| Metric | Value | Notes |
|---|---|---|
| Monthly spend per active subscriber | $140 | 3.1 orders × $45 |
| Monthly gross service fee per subscriber | $10.85 | 3.1 orders × $3.50 |
| Monthly net contribution per subscriber | $5.33 | After Stripe fees and infrastructure |
| Annual net contribution per subscriber | $63.96 | |
| Buyer CAC | $8-15 | Organic/referral-heavy model |
| **Subscriber LTV (12.5 mo avg lifetime, 8% churn)** | **$60** | Discounted at 10% annual rate |
| **LTV:CAC ratio** | **4.0-7.5x** | Strong for marketplace; based on net contribution |

### Break-Even Analysis

> **Note:** "Monthly Net Contribution" is revenue after Stripe processing fees and infrastructure costs. Previous versions showed gross fees, which overstated unit economics.

| Scale | Farmers | Subscribers | Monthly GMV | Monthly Net Contribution | Monthly Costs | Status |
|---|---|---|---|---|---|---|
| Pre-seed (now) | 20 | 200 | $28K | $1.1K | $15K | -$13.9K/mo |
| Seed milestone | 200 | 4,000 | $558K | $21.3K | $40K | -$18.7K/mo |
| Series A target | 1,000 | 25,000 | $3.5M | $133K | $80K | +$53K/mo |
| Break-even (scale team) | 610 | 24,400 | $3.4M | $130K | $130K | ~$0/mo |
| Scale (Year 4) | 10,000 | 300,000 | $41.9M | $1.6M | $400K | +$1.2M/mo |

**Key insight:** At 7% + $0.35 take rate, net of Stripe fees, break-even at scale-team costs ($130K/mo) requires ~610 farmers with ~24,400 active subscribers -- a 74% reduction from the prior 5% model. Adding a seller SaaS tier ($49/mo average) at 30% attach rate accelerates break-even to ~400 farmers.

### Revenue Model Evolution

| Phase | Revenue Source | Contribution |
|---|---|---|
| Phase 1 (Now) | 7% + $0.35 buyer service fee | 100% |
| Phase 2 (Year 2) | + Seller SaaS tier ($29-99/mo) | 60% / 40% |
| Phase 3 (Year 3) | + Promoted listings, analytics | 45% / 35% / 20% |
| Phase 4 (Year 4+) | + Financial services, insurance, logistics | Diversified |

---

## 4. Moat & Defensibility

### 4.1 Local Density Network Effects

Unlike global marketplaces, Local-Roots benefits from **density-based network effects** that are hard to replicate:

- Each new farmer in a metro area makes the platform more valuable to every buyer in that area (more choice, more pickup windows, more variety).
- Each new buyer makes the platform more valuable to every farmer (more demand, faster subscriber cap fill).
- **Critical mass per market is low** (~15-20 farmers per metro) but once achieved, the marketplace becomes self-reinforcing.

This is the "Uber playbook" applied to food: win city by city, and once you own local density, competitors face a cold-start problem in every market you dominate.

### 4.2 Subscription Lock-In (Supply Side)

Farmers using Local-Roots to manage recurring subscriptions face significant switching costs:

- **Subscriber relationship migration:** Moving 40+ active subscribers to a new platform requires re-signup, re-entry of payment info, and risks subscriber churn.
- **Operational workflow integration:** Pickup schedules, inventory planning, and fulfillment flows become embedded in daily operations.
- **Historical data dependency:** Subscription analytics, seasonal demand patterns, and buyer preferences accumulate over time.

This mirrors Shopify's merchant lock-in: technically possible to leave, but the friction is enormous once you have live customers.

### 4.3 Trust Graph

Every completed pickup, every QR verification, every review builds a **local trust graph** that is unique to Local-Roots:

- Buyer-farmer trust scores based on real fulfillment history.
- Pickup location reliability ratings.
- Seasonal quality patterns that inform future recommendations.

This data asset compounds over time and cannot be replicated by a new entrant.

### 4.4 Brand & Community

Local food is inherently emotional and community-driven. Local-Roots has the opportunity to become synonymous with "supporting your local farmer" in the same way that Etsy became synonymous with handmade goods. Brand trust in this category is powerful because:

- Food is personal -- buyers want to trust the source.
- Farmers want to associate with a platform that genuinely serves their interests (not extract maximum fees).
- The buyer-side-only fee (zero seller fees) signals farmer-first alignment.

### 4.5 What Makes This "10x Better"

Compared to the status quo (manual CSAs, Square invoices, Facebook groups, spreadsheets):

| Current Approach | Local-Roots |
|---|---|
| Manual subscriber tracking | Automated subscription management |
| Cash/check/Venmo payment collection | Stripe recurring billing, card on file |
| Text/email pickup coordination | Structured pickup windows with QR verification |
| No demand generation | Built-in buyer marketplace |
| No analytics | Subscription and demand analytics |
| 0% platform fee but 100% of the work | 7% + $0.35 buyer fee, 90% less operational burden |

---

## 5. Fundraising Narrative

### The Pitch Story

> "The $17.5 billion direct-to-consumer farm market is growing at 4.6% annually, but it runs on spreadsheets, cash, and hope. Local-Roots is building the Shopify for local food -- a subscription commerce platform that gives every farmer recurring revenue and every family a trusted local food source. We are starting with the highest-intent wedge (subscription pickup boxes) and expanding into the full farmer commerce stack."

### Comparable Companies & Valuations

| Company | Category | Valuation / Exit | Relevance |
|---|---|---|---|
| **Shopify** | Commerce infrastructure | $130B+ public | End-state vision: infrastructure for a seller category |
| **Faire** | Wholesale marketplace | $12.4B (2022) | B2B marketplace with local density dynamics |
| **Instacart** | Grocery marketplace | ~$10B (IPO 2023) | Local food logistics + marketplace model |
| **Etsy** | Artisan marketplace | ~$7B public | Community-driven, trust-based marketplace |
| **Barn2Door** | Farm e-commerce SaaS | $19.5M raised, ~$3.1M ARR | Direct competitor, SaaS model only |
| **Toast** | Restaurant commerce | $14B+ public | Vertical SaaS + payments for a food category |

### Milestone Targets

**Pre-Seed (Current)**
- Raise: $500K-$750K
- Milestones: 50 active farmers, 1,000 active buyers, 3 metro areas, product-market fit signals (>60% monthly subscription renewal)
- Valuation target: $5-8M pre-money

**Seed Round (Month 12-15)**
- Raise: $2-3M
- Milestones: 300 farmers, 8,000 buyers, 10 metro areas, $300K monthly GMV, 70%+ farmer 6-month retention
- Valuation target: $15-20M pre-money

**Series A (Month 24-30)**
- Raise: $8-12M
- Milestones: 1,500 farmers, 50,000 buyers, 30+ metro areas, $2M+ monthly GMV, clear path to profitability, SaaS tier launched
- Valuation target: $50-80M pre-money

### Investor Narrative by Stage

**Pre-Seed:** "We have built the product, signed early farmers, and proven the subscription model works in Eugene, OR. We need capital to hire a farmer success team and expand to 3 markets."

**Seed:** "We have product-market fit. Farmers who join stay (80%+ retention). Buyers renew subscriptions at 70%+ rates. We need capital to build density in 10 metros and launch our SaaS tier."

**Series A:** "We have a repeatable city-launch playbook, blended take rate approaching 8-10%, and a clear path to $50M ARR. We need capital to expand nationally and build platform services."

---

## 6. Risk Analysis: Top 5 Existential Risks

### Risk 1: Cold Start / Chicken-and-Egg Problem
**Severity:** Critical
**Description:** Marketplace requires both farmers and buyers simultaneously. Without farmers, buyers leave. Without buyers, farmers leave.
**Mitigation:**
- Launch market-by-market with a "supply-first" strategy: onboard 15-20 farmers before launching buyer-side marketing.
- Offer free onboarding and migration of existing subscriber lists to give farmers immediate value even without new buyer acquisition.
- Each farmer brings their existing customer base -- this is "bring your own demand" which partially solves the cold start.

### Risk 2: Competitive Response from Incumbents
**Severity:** High
**Description:** Barn2Door ($19.5M raised), Local Line, Harvie, or a new Shopify vertical could target this exact space. A well-funded competitor with existing farmer relationships could move fast.
**Mitigation:**
- Competitors are SaaS-only (no marketplace/demand generation). Local-Roots' marketplace component is the differentiator.
- Move fast to lock in density in core markets. Once a farmer's subscribers are on-platform, switching costs are high.
- Build community and brand that competitors cannot replicate with features alone.
- The buyer-side fee at 7% + $0.35 (vs. $99-299/mo SaaS fees) is more farmer-friendly for smaller operations.

### Risk 3: Take Rate Ceiling
**Severity:** Medium
**Description:** At 7% + $0.35 buyer-side, net contribution per transaction is $1.64 on a $45 box. While break-even is now achievable at realistic scale (~610 farmers), further revenue growth requires diversification.
**Mitigation:**
- Revenue diversification roadmap: SaaS tier, promoted listings, financial services, logistics.
- The 7% + $0.35 fee is the wedge, not the ceiling. As platform value increases, blended take rate should reach 8-12% through additional services.
- Marketplace models historically expand take rates as they add services (Shopify: subscriptions to payments to capital to fulfillment).

### Risk 4: Seasonality and Geographic Limitations
**Severity:** Medium-High
**Description:** Farming is seasonal. Northern markets may see 4-6 months of reduced activity. This creates revenue volatility and buyer churn during off-seasons.
**Mitigation:**
- Eugene/Willamette Valley has a long growing season (approximately 9-10 months) and strong year-round production of meat, eggs, dairy, and preserved goods, partially offsetting seasonal risk. For subsequent national expansion, prioritize year-round production areas (California, Pacific Northwest, Southeast) before colder northern markets.
- Expand product scope beyond produce to include meat, dairy, eggs, preserved goods, and value-added products that have year-round availability.
- Introduce "winter shares" and partnerships with greenhouse/indoor farms.
- Seasonal slowdown in one region can be offset by expansion into counter-seasonal regions.

### Risk 5: Regulatory and Food Safety Liability
**Severity:** Medium
**Description:** Food safety incidents on the platform could create liability exposure, regulatory scrutiny, or reputational damage. Cottage food laws and direct-sale regulations vary by state.
**Mitigation:**
- Platform is a marketplace, not a food handler -- maintain clear legal separation.
- Require farmers to attest to applicable licenses and food safety certifications.
- Build in food safety best practices into onboarding (cold chain guidance, labeling requirements).
- Maintain comprehensive insurance coverage as platform scales.
- Proactive engagement with state agriculture departments.

### Risk 6: Off-Platform Payment / Disintermediation
**Severity:** High
**Description:** Since buyer and farmer meet in person at every pickup, buyers have an obvious opportunity to bypass the platform and pay the farmer directly (cash, Venmo, etc.) to avoid the 7% + $0.35 service fee. This is the classic marketplace disintermediation risk, amplified by the in-person nature of every transaction.

**Why it's partially self-mitigating:**
- The fee is buyer-side. The farmer gets their full amount regardless of whether payment goes through the platform. The farmer has **zero financial incentive** to encourage off-platform payment.
- The farmer actively **wants** buyers on-platform because it eliminates admin burden: automatic recurring billing, subscription management, no-show fee protection, pickup verification, and analytics. Going off-platform means going back to spreadsheets and Venmo chasing.
- $3.50 on a $45 box is below most people's "bother threshold," especially when the platform provides card-on-file convenience, scheduling, reminders, and one-tap pause/cancel.

**Where the risk is highest:**
- High-value boxes ($80+) where the fee exceeds $6 and feels visible
- Long-term loyal buyers who already have the farmer's contact info and don't need the platform's discovery or scheduling value
- Cash-friendly buyer demographics

**Design mitigations:**
1. **Don't surface farmer contact info to buyers.** Communication goes through the platform. No phone/email on buyer-facing pages.
2. **Frame the fee as value, not a tax.** Position as "Platform fee includes pickup scheduling, reminders, and payment protection" rather than a bare line item. Consider embedding the fee in the price (farmer sets buyer price, platform takes 7% + $0.35 from the gross) so the buyer never sees a separate fee.
3. **Lock operational value into the platform.** The 6-digit pickup code verification flow is key -- if the farmer relies on it for fulfillment tracking and no-show management, taking a buyer off-platform creates an operational gap.
4. **Build retention features that only work on-platform.** Pause/resume, subscription history, pickup reminders, reviews, referral credits. The more the buyer's "local food life" lives on Local-Roots, the less they think about the fee.
5. **Cap the service fee.** Cap at $5-6 per transaction so high-value boxes don't feel punitive. This costs very little revenue (most boxes are $35-55) but removes worst-case optics.

**Structural mitigation -- Deposit / No-Show Fee Split:**

The most powerful anti-disintermediation mechanism is to embed the platform in the financial structure of the transaction, not just the convenience layer. The proposed model:

- Every subscription requires a **deposit hold** on the buyer's card (e.g., $5-10) that serves as a no-show guarantee.
- If the buyer completes their pickup, the deposit is released and only the standard box price is charged.
- If the buyer no-shows, the deposit is **split between the farmer and the platform** (e.g., 70/30 or 60/40).
- The farmer benefits because they receive partial compensation for wasted produce. The platform benefits because it earns revenue from the enforcement mechanism.

This creates a dynamic where:
- **The farmer actively wants buyers on-platform** because the platform protects them from no-show losses. Off-platform buyers have no deposit, no accountability, and cost the farmer money when they flake.
- **The buyer accepts the deposit** because it's refundable on pickup and demonstrates their commitment. It's the same mechanic as hotel reservations or ClassPass credits.
- **The platform's revenue is partially tied to enforcement**, not just transaction flow. Even if a buyer tried to pay the box price directly to the farmer, the deposit/no-show infrastructure only works through the platform.
- **It aligns all three parties:** buyers are incentivized to show up, farmers are protected when they don't, and the platform earns its fee by providing the enforcement layer.

This transforms the platform's value proposition from "convenient payment processing" (replaceable) to "financial accountability infrastructure" (structural). A farmer who has experienced no-show protection will never voluntarily take buyers off-platform.

---

## 7. Path to Scale: From Local Pickup to Billion-Dollar Platform

### Phase 1: Win the Wedge (Months 0-18) -- $0-$500K ARR

**Strategy:** Nail the subscription pickup box use case in 3-5 metro areas.

- Focus: Subscription box creation, Stripe billing, pickup management, QR verification.
- Markets: Launch in Eugene, OR as the first market, then expand to 2-3 similar Pacific Northwest metros (e.g., Corvallis, Bend, Salem). Eugene was selected for its right-sized population (~175K), strong local food culture, Lane County Farmers Market (100+ vendors, 11 months/year), 75+ Willamette Valley farms, 24+ CSAs in Lane County, and lack of a dominant local CSA platform. The smaller city size makes it easier to achieve network density before scaling.
- Farmer acquisition: Farmers market field sales, agricultural extension partnerships, local food organization referrals.
- Buyer acquisition: Organic through farmer cross-promotion (each farmer brings 20-50 existing customers).

**Key bet:** Farmers will migrate existing customers onto the platform for the operational simplicity, giving us a "bring your own demand" advantage over traditional cold-start marketplace problems.

### Phase 2: Build Density (Months 18-36) -- $500K-$3M ARR

**Strategy:** Achieve critical mass in 15-25 metro areas. Launch SaaS tier.

- Expand to top 25 farm-direct metros by population and farm density.
- Launch seller SaaS tier ($29-99/mo) with advanced analytics, CRM, and multi-location management.
- Build city-launch playbook: repeatable process for entering a new market with 15+ farmers in 60 days.
- Introduce buyer retention features: favorites, seasonal recommendations, subscription bundling across farmers.

**Key bet:** City-by-city density creates defensible local market positions that national competitors cannot easily replicate.

### Phase 3: Platform Expansion (Months 36-60) -- $3M-$15M ARR

**Strategy:** Expand beyond pickup boxes into the full farmer commerce stack.

- **Product expansion:** Add one-time purchases, market-day sales (non-subscription), wholesale/restaurant channels.
- **Logistics layer:** Optional delivery coordination for farmers who want to offer home delivery (partner model, not first-party).
- **Financial services:** Working capital advances for farmers (revenue-based financing against subscription receivables), crop insurance partnerships.
- **Data products:** Demand forecasting, pricing optimization, seasonal planning tools.
- **Promoted listings:** Paid placement in buyer search and discovery.

**Key bet:** Farmers who start with subscriptions expand their use of the platform as we add more tools, increasing ARPU and lock-in.

### Phase 4: National Platform (Months 60-84) -- $15M-$80M ARR

**Strategy:** Become the default infrastructure for direct-to-consumer farm sales in North America.

- 100+ metro areas, 15,000+ active farmers, 500,000+ active buyers.
- Launch Local-Roots Capital (revenue-based financing for farmers).
- Enterprise tier for farm cooperatives and multi-farm operations.
- API platform: let third-party developers build on Local-Roots data and infrastructure.
- International expansion: begin with Canada, explore UK and Australia (similar farming structures).
- Blended take rate: 10-12% through diversified revenue streams.

### Phase 5: Category Platform (Year 7+) -- $80M+ ARR, Path to $1B

**Strategy:** Expand the platform model beyond farms to adjacent local/artisan commerce.

- **Category expansion:** Local bakeries, artisan food producers, small-batch beverages, specialty goods.
- **B2B marketplace:** Farmer-to-restaurant, farmer-to-retailer channels.
- **Consumer brand:** "Powered by Local-Roots" becomes a trust signal for local food, similar to "Sold on Etsy."
- **Acquisition targets:** Complementary tools (farm management software, cold chain logistics, local delivery networks).

### The $1B Valuation Math

| Scenario | Farmers | Avg Rev/Farmer | ARR | Revenue Multiple | Valuation |
|---|---|---|---|---|---|
| Conservative (Year 5) | 10,000 | $4,000 | $40M | 10x | $400M |
| Base case (Year 7) | 25,000 | $5,500 | $137M | 8x | $1.1B |
| Upside (Year 7) | 30,000 | $7,000 | $210M | 8x | $1.7B |

The base case assumes:
- 25,000 active farmers (out of ~130,000 US farms doing direct sales)
- ~19% market penetration of digitally-active direct-sale farms
- Blended ARPU of $5,500/farmer/year (subscriptions + SaaS + services)
- 8x forward revenue multiple (in line with vertical SaaS/marketplace comps)

### Potential Acquirers & Strategic Partners

| Company | Strategic Rationale |
|---|---|
| **Shopify** | Expands into perishable/local commerce vertical they cannot serve with current tools |
| **Square/Block** | Extends farmer seller ecosystem (already strong in farmers markets via Square POS) |
| **Instacart** | Adds subscription/recurring model and farm-direct supply to their grocery platform |
| **DoorDash** | Local food infrastructure complements their delivery network |
| **Amazon (Whole Foods)** | Local sourcing pipeline and community brand they cannot build internally |
| **Toast** | Extends from restaurant commerce into farm-to-table supply chain |

---

## 8. Strategic Priorities (Next 12 Months)

1. **Ship Stripe integration and launch paid transactions** -- The product must handle real money before anything else matters.
2. **Onboard first 50 farmers in 2-3 metros** -- Prove supply-side acquisition and retention in concentrated markets.
3. **Achieve 60%+ monthly subscription renewal rate** -- This is the single most important product-market fit signal.
4. **Raise pre-seed round ($500-750K)** -- Fund 12-18 months of runway for team of 3-4.
5. **Build the farmer success playbook** -- Repeatable onboarding process that gets a farmer from signup to first subscriber in under 7 days.

---

## 9. Why Now?

Three macro tailwinds converge to make this the right moment:

1. **Post-COVID consumer behavior shift is permanent.** Direct-to-consumer farm sales grew 35% in 2020 and have not reverted. The farm subscription box market is now valued at $8.2B with 19% annual growth. Consumers discovered local food during COVID and many have not gone back.

2. **Farmers are digitizing, but tools are fragmented.** Barn2Door, Local Line, and Harvie have proven farmers will adopt software, but no one has built the marketplace layer. Farmer e-commerce is where restaurant tech was before Toast: SaaS tools exist, but no integrated commerce platform has emerged.

3. **Subscription commerce infrastructure is mature.** Stripe's subscription billing, identity verification, and Connect platform make it possible for a small team to build enterprise-grade payment infrastructure. Five years ago, this would have required 10x the engineering investment.

The window is open. The market is growing. The tools are ready. The competition is fragmented. The next 18 months determine whether Local-Roots captures this opportunity or someone else does.

---

*This document should be revisited quarterly and updated as market conditions and company metrics evolve.*
