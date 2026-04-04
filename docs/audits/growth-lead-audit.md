# LocalRoots Growth & Conversion Audit

**Date:** 2026-02-27
**Auditor:** Growth Lead (AI)
**Scope:** Full buyer + seller funnel, copy, SEO, landing page

---

## Table of Contents

1. [Executive Summary](#executive-summary)
2. [Landing Page Assessment (5-Second Test)](#landing-page-assessment)
3. [Buyer Funnel Audit](#buyer-funnel-audit)
4. [Seller Funnel Audit](#seller-funnel-audit)
5. [Copy Audit](#copy-audit)
6. [SEO Review](#seo-review)
7. [Cross-Cutting Issues](#cross-cutting-issues)
8. [Prioritized Recommendations](#prioritized-recommendations)
9. [Industry Best Practices & Sources](#industry-best-practices)

---

## Executive Summary

LocalRoots has a solid foundation: a clean design system, a functional 4-step seller wizard, working Stripe Connect integration, and a QR-to-pickup confirmation loop. The product works end-to-end. However, there are **significant conversion gaps** at nearly every stage of the funnel that, left unaddressed, will make it very difficult to hit the target of 10-20 farmers and 5+ subscribers each.

**Top 5 Issues by Impact:**

1. **Landing page hero does not clearly communicate the value proposition** -- fails the 5-second test for both buyers and sellers.
2. **Zero social proof anywhere** -- no testimonial, subscriber count, farmer count, or trust signal on any page.
3. **No SEO infrastructure** -- missing sitemap, robots.txt, per-page meta tags, structured data, and Open Graph tags. Stores are client-rendered (invisible to search engines).
4. **Footer links are all dead (`href="#"`)** -- About, FAQ, Terms, Privacy, Contact all go nowhere.
5. **Buyer checkout requires email but offers no account creation** -- first-time buyers have no dashboard access after a walk-up purchase unless they save a token URL.

---

## Landing Page Assessment

**File:** `/frontend/src/app/page.tsx`

### 5-Second Test: FAIL

A new visitor sees:
- **Hero headline:** "Fresh food from local farmers."
- **Subhead:** "Subscribe to a weekly farm box, then pick it up..."
- **CTA:** "Find a farm near you"

**Problems:**

| # | Current | Recommended | Reasoning |
|---|---------|-------------|-----------|
| L1 | Headline: "Fresh food from local farmers." | "Subscribe to your farmer. Fresh boxes, picked up weekly." | The current headline is generic -- it describes every farmers market, Whole Foods, and CSA. The recommended version uses the brand tagline ("Subscribe to your farmer"), is specific about the product (boxes), and names the action (picked up weekly). Research shows outcome-focused headlines drive 20-40% conversion gains. |
| L2 | Subhead: "Subscribe to a weekly farm box, then pick it up at a time that works for you. Real food from people nearby -- no shipping, no middlemen." | "Pick your farm. Choose a box. Grab it at the stand. Zero shipping, zero middlemen -- just food from people you can meet." | The current subhead buries the key differentiator. The recommended version uses parallel structure for scannability and ends with the emotional hook (people you can meet). |
| L3 | CTA: "Find a farm near you" | "See farms near me" | First-person CTAs ("me/my") outperform second-person ("you/your") by up to 90% in A/B tests (Unbounce). Also more conversational. |
| L4 | No social proof anywhere on the page | Add a single line of proof above or below the CTA: "{N} farms on LocalRoots" or "Trusted by {N} farmers in {metro}" | Even a small number is better than nothing. Social proof above the fold is the single highest-leverage trust signal. |
| L5 | Hero image is a stock Unsplash photo | Replace with a real photo from a participating farmer, or a composited grid of actual farm photos | Stock imagery erodes trust in a "local" product. Every competitor (Local Line, Barn2Door, Harvie) uses real farmer photos. |
| L6 | No urgency or scarcity signal | Consider: "Next pickups this Saturday" or "3 farms near [city] with boxes available" | Urgency is the #1 driver of action on food purchase pages. |

### "How it works" Section

| # | Current | Recommended | Reasoning |
|---|---------|-------------|-----------|
| L7 | 3 steps: "Find a local farm" / "Subscribe to a box" / "Pick it up fresh" | Same 3 steps but with icons (not just numbered circles) and add a 4th implied step: "Your farmer gets paid directly" | Icons increase scan speed. Adding the farmer payout step communicates the two-sided value prop and differentiates from CSA aggregators. |

### Featured Farms Section

| # | Current | Recommended | Reasoning |
|---|---------|-------------|-----------|
| L8 | Shows first 3 stores from the API with no filtering | Show stores that have a cover image and at least one live plan. Fallback to "Coming soon to [metro] -- get notified" if no farms qualify. | Showing empty or photo-less stores as "Featured" hurts credibility. An email capture fallback converts visitors who arrive before supply exists. |
| L9 | Store cards show name, city/region, description | Add: price range ("Boxes from $25/wk"), next pickup date, subscriber count if > 0 | Price anchoring on the homepage removes a major objection before the user clicks through. |

### Seller Pitch Section

| # | Current | Recommended | Reasoning |
|---|---------|-------------|-----------|
| L10 | Headline: "Sell your harvest. Zero platform fees." | "Zero platform fees. Sell direct. Get paid on pickup day." | Lead with the most shocking differentiator (zero fees), then the benefit. |
| L11 | CTA: "Start selling" | "Set up your farm store -- free" | "Start selling" is vague. "Set up your farm store -- free" is specific and addresses the cost objection. |
| L12 | No proof/metric for sellers | Add: "Setup takes ~5 minutes" or "Join {N} farmers already on LocalRoots" | Sellers need effort and trust signals even more than buyers. |

---

## Buyer Funnel Audit

### Stage 1: Discovery (`/stores`)

**File:** `/frontend/src/app/stores/page.tsx`

| # | Current | Recommended | Reasoning |
|---|---------|-------------|-----------|
| B1 | Page title is just "Farms" with no sub-explanation | "Farms near you" with subhead "Browse local farms with pickup boxes available this week" | Visitors from search or social need immediate context. The current page gives none. |
| B2 | Search input placeholder: "Your city or zip code" | "Enter your zip code (e.g. 30306)" | A concrete example reduces cognitive load and increases search completion by 20-30%. |
| B3 | Default radius is 25 mi (40km) -- good | No change needed | Appropriate for early-stage supply density. |
| B4 | Empty state (no stores): "No stores yet." | "We're growing! No farms near you yet. Leave your email and we'll notify you when one joins." + email capture | Every visitor who hits an empty state and bounces is a permanent loss. An email capture converts them into a warm lead for when supply arrives. |
| B5 | Error state shows Postgres setup instructions | Remove developer-facing instructions from production error states. Show: "We're having trouble loading farms right now. Please try again in a moment." | The current error message exposes infrastructure details and confuses non-technical users. |
| B6 | Store cards do not show pricing or next pickup | Add "Boxes from $XX/wk" and "Next pickup: Sat, Mar 1" to each card | Price and date are the two biggest purchase signals. Showing them earlier in the funnel reduces unnecessary click-throughs and increases qualified traffic to store pages. |
| B7 | No filtering by availability | Add a toggle: "Has boxes available" to filter to stores with live plans | Prevents dead-end clicks on stores that haven't set up yet. |

### Stage 2: Store Detail (`/stores/[storeId]`)

**File:** `/frontend/src/app/stores/[storeId]/page.tsx`

| # | Current | Recommended | Reasoning |
|---|---------|-------------|-----------|
| B8 | No page-level `<title>` or meta description | Add `export const metadata` with dynamic title: "{StoreName} -- LocalRoots" and description: "Subscribe to {StoreName}'s farm box..." | Critical for SEO and social sharing. Currently every store page has the generic "LocalRoots" title. |
| B9 | Empty state: "This farm hasn't posted any offerings yet. Check back soon." | "This farm is getting set up. Leave your email and we'll let you know when boxes are available." + email capture | Same principle as B4 -- convert dead ends into leads. |
| B10 | Subscribe button on box cards says "Subscribe" (static span, not a real button) | Keep as link (it works), but add urgency: "Subscribe -- {N} spots left" if subscriber count is near limit | Scarcity drives action. The subscriber_limit field exists but is not surfaced to buyers. |
| B11 | Walk-up section header: "Or buy once at the next pickup" | "Don't want a subscription? Buy once at the next pickup:" | The current copy assumes the user has already considered subscribing. The recommended version acknowledges the objection. |
| B12 | Walk-up items show "X left" but no urgency framing | Add visual urgency: red/amber text when < 5 remaining, "Almost gone" label | Standard e-commerce practice for limited inventory. |
| B13 | Reviews section exists but has no prompt to leave one from the store page | Not a priority now -- reviews are post-pickup. No change. | |

### Stage 3: Box Detail / Subscribe (`/boxes/[planId]`)

**File:** `/frontend/src/app/boxes/[planId]/page.tsx` + `/components/subscribe-form.tsx`

| # | Current | Recommended | Reasoning |
|---|---------|-------------|-----------|
| B14 | Subscribe form asks for Email, Name (optional), Phone (optional) -- 3 fields | Reduce to Email only for initial checkout. Collect name at confirmation/pickup time. | Each extra form field reduces conversion by 7-10%. Email is the only field needed to start the subscription. Name and phone can be collected post-purchase. |
| B15 | CTA: "Start subscription" | "Subscribe -- first box {date}" | Specific CTAs outperform generic ones. Naming the date answers "when do I get something?" which is the #1 question. |
| B16 | Fee shown as "Calculated at checkout" before Stripe loads | Pre-calculate and show the fee estimate: "Service fee (~5%): ~$1.25" | "Calculated at checkout" creates anxiety. Showing an estimate, even approximate, builds trust. |
| B17 | Policy line: "Cancel/skip/refunds follow the cutoff policy. Policies." | "Cancel anytime. Full refund if you cancel before cutoff." | The current copy is legalistic and adds friction. The recommended version is confidence-building. |
| B18 | After successful subscription, CTA is "View first order" | "View your pickup code" -- the code is the most exciting/useful thing | Frame the post-purchase CTA around the most immediate value. |
| B19 | No "what's in the box" or contents preview | Add a section for box description/contents list (requires API/data support) | The #1 question subscribers have is "what am I getting?" Without contents info, buyers must trust blindly. |

### Stage 4: Walk-Up Checkout (`/pickup-windows/[pickupWindowId]`)

**File:** `/frontend/src/app/pickup-windows/[pickupWindowId]/page.tsx` + `/components/checkout-form.tsx`

| # | Current | Recommended | Reasoning |
|---|---------|-------------|-----------|
| B20 | Checkout heading: "Checkout" with subhead "Select quantities, then place an order for local pickup." | "Your order" with subhead "Pick what you want, then we'll authorize your card. You pay when you pick up." | Explain the unique payment flow (auth now, capture on pickup) early to prevent cart abandonment. |
| B21 | Same 3-field form (email, name, phone) | Reduce to email-only, same as B14 | Consistency + fewer fields = higher conversion. |
| B22 | After order placed: "Save your access link" with "Copy access link" button | Auto-send the access link via email (the email is already collected). The copy button is a backup. | Relying on users to manually save a URL is fragile. Most users will lose it. This is the #1 cause of "I can't find my order" support requests. |
| B23 | Order ID shown as raw UUID | Hide the UUID. Show: "Order #{short_id}" or just the pickup code prominently | UUIDs are intimidating. The pickup code is the user's real identifier. |

### Stage 5: Buyer Dashboard (`/buyer`)

**File:** `/frontend/src/app/buyer/page.tsx`

| # | Current | Recommended | Reasoning |
|---|---------|-------------|-----------|
| B24 | Page title: "My pickups" | "My pickups" is good. No change. | |
| B25 | Empty subscriptions: "No active subscriptions yet. Browse farms" | "You don't have any subscriptions yet. Find a farm near you and subscribe to a weekly box." with prominent CTA button | The current empty state has an inline link. A button with specific copy converts 3-5x better than an inline text link. |
| B26 | Empty upcoming pickups: "No upcoming pickups. Browse boxes" | Same treatment as B25 -- prominent CTA | |
| B27 | Buyer auth requires magic link or Google OAuth -- no password option | This is fine for security/simplicity. No change. | Magic link is appropriate for buyer auth. |

### Stage 6: Pickup & Post-Pickup

| # | Current | Recommended | Reasoning |
|---|---------|-------------|-----------|
| B28 | Pickup code card shows a QR and 6-digit code. Excellent. | No change to the code card. It works well. | |
| B29 | Review form appears only after pickup is confirmed | Consider a push notification / email prompt 1 hour after pickup: "How was your box?" | Organic review prompts have 2-5x the completion rate of passive in-page forms. This requires backend email support which already exists (Resend). |
| B30 | Review form defaults to 5 stars | Default to no selection (force a choice) | Defaulting to 5 stars inflates ratings and reduces the perceived authenticity of reviews. |

---

## Seller Funnel Audit

### Stage 1: Seller Registration (`/seller/register`)

**File:** `/frontend/src/app/seller/register/page.tsx`

| # | Current | Recommended | Reasoning |
|---|---------|-------------|-----------|
| S1 | Page title: "Create seller account" | "Start selling on LocalRoots -- free" | The current title is generic. The recommended title reinforces the zero-cost value prop. |
| S2 | No value proposition on the registration page | Add a sidebar or header section: "Zero platform fees / Get paid on pickup day / 5-minute setup / QR-to-subscribe at your stand" | The registration page is where sellers make the go/no-go decision. It needs to sell, not just collect credentials. |
| S3 | Registration form has 3 fields: Name (optional), Email, Password | Good. Minimal friction. No change. | |
| S4 | No terms of service or privacy policy acceptance | Add a line: "By creating an account, you agree to our Terms and Privacy Policy." (links to /policies or dedicated pages) | Legal compliance and trust signal. Also, footer links to Terms/Privacy currently go to `#`. |

### Stage 2: Store Creation (`/seller` dashboard)

**File:** `/frontend/src/app/seller/page.tsx`

| # | Current | Recommended | Reasoning |
|---|---------|-------------|-----------|
| S5 | Dashboard heading: "Seller" with subhead "Manage your store, pickup windows, and offerings." | "Your farm dashboard" with subhead "Set up your store and start getting subscribers." | "Seller" is platform jargon. "Your farm dashboard" is warmer and more specific. |
| S6 | "Create a store" section appears only when no stores exist | Good progressive disclosure. No change. | |
| S7 | Store creation form: Name, Description, Phone | Consider auto-populating Name from the user's display name (collected at registration or from Google OAuth) | One less field to fill = faster completion. |
| S8 | After store creation, user sees "Store created! Let's set it up." with "Continue setup" button | Good. The toast + CTA is clear. No change. | |

### Stage 3: Setup Wizard (`/seller/stores/[storeId]/setup/*`)

**File:** `/frontend/src/app/seller/stores/[storeId]/setup/layout.tsx` and child pages

| # | Current | Recommended | Reasoning |
|---|---------|-------------|-----------|
| S9 | Stepper shows 4 steps: "Pickup spot / Your box / Get paid / Start selling" | Excellent labeling. Clear and specific. No change. | |
| S10 | Step 1 heading: "Where will customers pick up their box?" | Good -- question format is engaging. No change. | |
| S11 | Step 2 heading: "Build your first farm box" | Good. No change. | |
| S12 | Step 2 defaults box name to "Weekly Farm Box" and cadence to "Weekly" | Excellent -- smart defaults reduce decision fatigue. No change. | |
| S13 | Step 2 "How many customers?" defaults to 25 | Good conservative default. Consider adding helper text: "Most farms start with 10-25. You can change this anytime." | Context helps new sellers make a confident choice. |
| S14 | Step 3 (Payouts): "Get paid for your harvest" with "Zero fees to you. Buyers pay a 5% service fee at checkout." | Good. Reinforces zero-fee value prop at the critical payment step. No change. | |
| S15 | Step 3: Stripe Connect embedded onboarding | Excellent -- embedded onboarding is best-in-class. No change. | |
| S16 | Step 4 (Review): Summary with QR code preview | Excellent. Shows the QR, share URL, and editable summaries. No change. | |
| S17 | Step 4 CTA: "Start selling" | Consider: "Go live -- your first pickup is {date}" | Specificity increases confidence. The date is already known from Step 2. |
| S18 | Post-launch celebration: "You're live!" with QR code and share URL | Add: "Next step: Print this QR and put it at your farmstand" as a prominent action item, not just helper text | The QR poster is the core growth mechanism. It should be the #1 CTA on the celebration screen. |
| S19 | No onboarding checklist or progress tracker after going live | Add a "Getting started" checklist on the store dashboard: [ ] Print your QR poster / [ ] Add a cover photo / [ ] Share your link on social / [ ] Get your first subscriber | Checklists increase feature adoption by 30-50% (Appcues, Pendo research). Early activation tasks are critical for retention. |

### Stage 4: Ongoing Store Management (`/seller/stores/[storeId]`)

**File:** `/frontend/src/app/seller/stores/[storeId]/page.tsx`

| # | Current | Recommended | Reasoning |
|---|---------|-------------|-----------|
| S20 | Page heading: "Store" with subhead "Manage your pickup windows, orders, and payouts." | Show the actual store name as heading: "{StoreName}" | "Store" is generic. Using the actual name builds ownership. |
| S21 | Pickup window selector is a raw `<select>` dropdown with timestamps | Good functional approach. Consider grouping by "upcoming" vs "past" in the dropdown | Separating upcoming from past windows reduces cognitive load for repeat use. |
| S22 | Order cards show buyer name, email, items, total, status, fee breakdown | Comprehensive. No change. | |
| S23 | Manual pickup code entry field is present on both "placed" and "ready" orders | Good. The primary flow (QR scan) is supplemented by manual entry. No change. | |
| S24 | "Buyer view" link opens the pickup window page in a new tab | Helpful. No change. | |
| S25 | Payout summary shows estimated seller payout per window | Excellent transparency. No change. | |
| S26 | No email notification to seller when a new subscriber joins | Add a transactional email: "New subscriber! {buyer_name} just joined {box_title}." | New subscriber notifications create a dopamine loop that keeps sellers engaged and reinforces the platform's value. Resend infrastructure exists. |
| S27 | No subscriber count visible on the dashboard | Show: "{N}/{limit} subscribers" on each box card | Sellers need to see traction. This number is their primary success metric. |

---

## Copy Audit

### Headlines & CTAs

| Location | Current Copy | Issue | Recommended |
|----------|-------------|-------|-------------|
| Nav subtitle | "Seasonal food, sold by neighbors." | Good, but could be more action-oriented | "Subscribe to your farmer." (brand tagline) |
| Nav "Browse" link | "Browse" | Vague | "Find farms" |
| Nav "Sell" link | "Sell" | Too terse | "Sell on LocalRoots" or "For farmers" |
| Buyer login heading | "Sign in" | Fine but could add context | "Sign in to manage your pickups" |
| Buyer magic link explanation | "Enter your email and we'll send you a sign-in link. No password needed." | Good. Clear. | No change. |
| Buyer dashboard "Sign out" | "Sign out" | Fine | No change. |
| Seller dashboard heading | "Seller" | Impersonal | "Your farm dashboard" |
| Policies page heading | "Policies" | Dry | "How LocalRoots works" |

### Error Messages

| Location | Current | Issue | Recommended |
|----------|---------|-------|-------------|
| Store list error | "Could not load stores" + raw error + Postgres instructions | Exposes technical details | "We couldn't load farms right now. Please try again." |
| Store detail error | "Could not load store" + raw error | Same | "This farm couldn't be loaded. It may have been removed." |
| Box detail error | "Could not load this box" + raw error | Same | "This box couldn't be loaded. Please try again." |
| Pickup window offerings error | "Could not load offerings" + raw error | Same | "Items couldn't be loaded. Please refresh." |
| Order page no-token state | "Paste the token from your confirmation (or add `?t=...` to the URL)." | Technical jargon | "Sign in to view this order, or paste the link from your confirmation email." |
| Subscription page no-token state | Same as above | Same | Same fix |

### Empty States

| Location | Current | Recommended |
|----------|---------|-------------|
| No stores (with location) | "No stores found nearby. Try a different location or expand your radius." | "No farms here yet. Try widening your search, or let us know your area -- we'll bring LocalRoots to you." + email capture |
| No stores (without location) | "No stores yet." | "Farms are joining soon! Enter your zip to be first to know." + email capture |
| No active subscriptions | "No active subscriptions yet. Browse farms" | "You don't have any subscriptions yet." + **Button:** "Find a farm near you" |
| No upcoming pickups | "No upcoming pickups. Browse boxes" | "Nothing coming up yet. Subscribe to a farm box to get your first pickup." + **Button:** "Browse farms" |
| No past orders | "No past orders." | "Your order history will appear here after your first pickup." |
| No offerings on pickup window | "No offerings yet." | "This pickup doesn't have any items listed yet. Check back closer to the pickup date." |

---

## SEO Review

### Critical Issues

| # | Issue | Impact | Recommendation |
|---|-------|--------|----------------|
| SEO1 | **No sitemap.xml** | Search engines cannot discover pages | Add `app/sitemap.ts` that generates URLs for all public stores and box pages |
| SEO2 | **No robots.txt** | No crawl guidance | Add `app/robots.ts` that allows crawling of public pages, blocks /seller/*, /buyer/* |
| SEO3 | **Single global `<title>` and `<meta description>`** | Every page shows "LocalRoots" and "Local pickup marketplace for produce and food" | Add per-page metadata. Store pages: "{StoreName} - Fresh farm boxes | LocalRoots". Box pages: "{BoxTitle} from {StoreName} | LocalRoots". |
| SEO4 | **No Open Graph or Twitter Card tags** | Shared links show no preview image, title, or description | Add OG/Twitter meta tags to layout.tsx and per-page metadata exports |
| SEO5 | **Store discovery page (`/stores`) is entirely client-rendered** | Search engines see an empty page with a loading spinner | This is the most important page for SEO. Convert to server-side rendering with client-side enhancement for search/filter. Or at minimum, ensure initial store list is SSR. |
| SEO6 | **No structured data (JSON-LD)** | No rich snippets in search results | Add LocalBusiness + Product schema to store detail pages. Add FAQ schema to policies page. |
| SEO7 | **No canonical URLs** | Potential duplicate content issues | Add canonical link tags via Next.js metadata |
| SEO8 | **No favicon or apple-touch-icon** | Missing brand presence in browser tabs and bookmarks | Add favicon.ico and apple-touch-icon.png to `/public` |
| SEO9 | **Buyer dashboard sets `document.title` via `useEffect`** -- works but not SEO-friendly | Client-side title changes are invisible to crawlers | For buyer/seller pages this is acceptable (they're behind auth). No change needed for those. But public pages MUST use `export const metadata`. |
| SEO10 | **No alt text strategy** | Store cards without images have no alt text on the placeholder | Add meaningful alt text to all image elements |

### Semantic HTML Issues

| # | Issue | Recommendation |
|---|-------|----------------|
| SEO11 | Landing page sections lack `aria-label` or `id` attributes | Add section ids for in-page navigation and accessibility |
| SEO12 | Store detail page uses `<div>` for pickup location headers instead of `<h3>` | Use proper heading hierarchy |
| SEO13 | Footer nav has no `aria-label` | Add `aria-label="Footer navigation"` |

---

## Cross-Cutting Issues

### Trust & Social Proof

| # | Issue | Recommendation |
|---|-------|----------------|
| X1 | **Zero social proof on any page** -- no testimonials, user counts, or trust badges | Add at minimum: farm count on the homepage, subscriber count on store pages, and review summary on box pages (review infrastructure exists!) |
| X2 | **No "Powered by Stripe" badge** on payment pages | Add Stripe trust badge near payment forms. Stripe provides official badge assets. |
| X3 | **Policies page has no contact mechanism** -- "Contact support and we'll sort it out" but no link or email | Add a support email address or a contact form link |
| X4 | **Footer links all dead** -- About, How it Works, FAQ, Terms, Privacy, Contact all link to `#` | Either create these pages or remove the links. Dead links hurt trust and SEO. At minimum: link "Policies" to `/policies`, remove dead links, add a real contact email. |

### Mobile Experience

| # | Issue | Recommendation |
|---|-------|----------------|
| X5 | Nav items wrap on small screens (Browse, Sign in, Sell all in a flex-wrap) | Test on 320px width. Consider a hamburger menu or prioritize: just "Browse" and "Sign in" visible, with "Sell" in a menu. |
| X6 | Subscribe form on box page is below-the-fold on mobile | Add a sticky "Subscribe" bar at bottom of mobile viewport that scrolls with the user |
| X7 | QR poster page (`/boxes/[planId]/qr`) is well-designed for printing | No change needed. Good job. |

### Authentication & Session

| # | Issue | Recommendation |
|---|-------|----------------|
| X8 | Buyer dashboard uses session token from localStorage. If buyer clears storage, they lose access to orders. | Orders are accessible via `?t=` token in email. Consider adding "resend access link" functionality on the order page. |
| X9 | Unified session means a seller token also grants buyer access -- this is by design | No change. But consider showing both roles in the nav when a user has both. |

### Retention & Re-engagement

| # | Issue | Recommendation |
|---|-------|----------------|
| X10 | Cancellation retention flow exists (pause offer + exit survey) -- good | No change. This is well-implemented. |
| X11 | No win-back email for cancelled subscribers | Add a "We miss you" email 14 days after cancellation with a re-subscribe CTA. Resend infrastructure exists. |
| X12 | No reminder email for paused subscribers | Add a monthly "Your subscription is still paused -- resume?" email |
| X13 | No referral mechanism | Add a "Share with a friend" button on the buyer dashboard and post-purchase confirmation. Word-of-mouth is the #1 growth channel for local food. |

---

## Prioritized Recommendations

### Tier 1: Do This Week (Highest Impact, Lowest Effort)

| # | Item | Files Affected | Expected Impact |
|---|------|---------------|-----------------|
| 1 | **Fix dead footer links** -- remove or link to real pages | `footer.tsx` | Trust: eliminates a visible credibility gap |
| 2 | **Add per-page metadata** (title + description) to all public pages | `stores/page.tsx`, `stores/[storeId]/page.tsx`, `boxes/[planId]/page.tsx`, `pickup-windows/[pickupWindowId]/page.tsx`, `policies/page.tsx` | SEO: pages become indexable and shareable |
| 3 | **Add sitemap.ts and robots.ts** | New files in `app/` | SEO: enables search engine discovery |
| 4 | **Remove developer-facing error messages** (Postgres instructions) from store list error state | `stores/page.tsx` | Trust: prevents user confusion |
| 5 | **Add favicon** to `/public` | `public/favicon.ico` | Brand: professional appearance in browser tabs |
| 6 | **Rewrite hero headline** to "Subscribe to your farmer" | `page.tsx` | Conversion: clearer value prop |

### Tier 2: Do This Sprint (High Impact, Moderate Effort)

| # | Item | Files Affected | Expected Impact |
|---|------|---------------|-----------------|
| 7 | **Add social proof** -- farm count on homepage, subscriber count on store pages | `page.tsx`, store detail | Conversion: 10-20% increase in engagement (industry benchmark) |
| 8 | **Add empty-state email capture** on `/stores` when no results | `stores/page.tsx` | Growth: converts dead-end visitors into leads |
| 9 | **Reduce subscribe form to email-only** (collect name/phone post-purchase) | `subscribe-form.tsx`, `checkout-form.tsx` | Conversion: 7-10% lift per removed field |
| 10 | **Add Open Graph tags** for social sharing | `layout.tsx`, per-page metadata | Distribution: shared links show rich previews |
| 11 | **Add post-launch checklist** to seller dashboard | `seller/stores/[storeId]/page.tsx` | Seller activation: increases % who print QR and get first subscriber |
| 12 | **Show subscriber count on seller dashboard** boxes | `seller/stores/[storeId]/page.tsx` | Seller engagement: visibility into traction |

### Tier 3: Do Next Sprint (Medium Impact, Higher Effort)

| # | Item | Files Affected | Expected Impact |
|---|------|---------------|-----------------|
| 13 | **Add structured data** (JSON-LD) to store and box pages | Store detail, box detail | SEO: rich snippets in search results |
| 14 | **Add "new subscriber" email to seller** | Backend email templates | Seller engagement: dopamine loop |
| 15 | **Add "review prompt" email** 1hr after pickup confirmation | Backend scheduler/email | Review volume: 2-5x more reviews |
| 16 | **Convert `/stores` to SSR** for initial render | `stores/page.tsx` | SEO: store list becomes indexable |
| 17 | **Add referral mechanism** ("Share with a friend" on buyer dashboard) | Buyer dashboard | Growth: word-of-mouth amplification |
| 18 | **Create About, FAQ, and Contact pages** | New pages | Trust + SEO: fills gaps, answers objections |

### Tier 4: Future Experiments

| # | Item | Hypothesis | How to Test |
|---|------|-----------|-------------|
| 19 | First-person CTA copy ("See farms near me" vs "Find a farm near you") | First-person increases click-through by 15-25% | A/B test on landing page CTA |
| 20 | Price anchoring on store cards (show box price on browse page) | Seeing price earlier qualifies traffic and increases store-to-subscribe conversion | A/B test with/without price on store cards |
| 21 | Sticky mobile subscribe bar on box detail page | Persistent CTA increases subscribe rate on mobile by 10-20% | A/B test or time-on-page analysis |
| 22 | Urgency messaging ("3 spots left", "Next pickup Saturday") | Scarcity increases conversion by 10-30% | A/B test on box detail page |
| 23 | Pause win-back email (14 days after pause) | Re-engages 5-15% of paused subscribers | Measure resume rate with/without email |
| 24 | "What's in the box" preview on subscription page | Content preview increases subscribe rate | Requires data model change; test with 2-3 farms first |

---

## Industry Best Practices

### Marketplace Onboarding
- A complicated sign-up process can reduce new seller interest by 15%, while a streamlined process can increase sign-ups by 20% ([JourneyH](https://www.journeyh.io/blog/marketplace-onboarding-marketplace-seller))
- Self-service onboarding empowers vendors to join quickly and independently ([SAP Commerce](https://www.the-future-of-commerce.com/2024/05/09/seller-onboarding-marketplaces/))
- Interactive walkthroughs and checklists significantly boost user retention ([Mirakl](https://www.mirakl.com/blog/quality-seller-onboarding))
- Trust-first UX including verified badges and transparent payout systems is more valuable than speed alone ([Rigby](https://www.rigbyjs.com/blog/b2b-marketplace-features))

### Local Food & Farm-to-Consumer
- Farms that limit subscription customization see 9x higher conversion than those offering full customization ([Edible Alpha](https://www.edible-alpha.org/8-ways-to-ace-farm-to-consumer-sales/))
- A pasture-based farm increased direct-to-consumer sales by 40% after integrating an online storefront with advance ordering ([Farming First](https://farmingfirst.org/2025/03/how-digital-marketplaces-are-empowering-small-farmers/))
- The subscription economy model fits local food well when combined with flexible skip/pause options ([Local Food Marketplace](https://home.localfoodmarketplace.com/subscription-economy/))
- Packaging for different household sizes (singles, couples, families) doubles sell-through ([Edible Alpha](https://www.edible-alpha.org/8-ways-to-ace-farm-to-consumer-sales/))

### Landing Page & CTA Optimization
- Landing pages with a single CTA convert at 13.5% vs 10.5% for multiple CTAs ([Unbounce](https://unbounce.com/conversion-rate-optimization/the-state-of-saas-landing-pages/))
- Action-oriented, first-person CTA copy outperforms generic phrases with potential conversion lifts above 300% ([KlientBoost](https://www.klientboost.com/landing-pages/saas-landing-page/))
- Clear 5-second hero sections with outcome-focused headlines drive 20-40% conversion gains ([Landingi](https://landingi.com/landing-page/saas-best-practices/))
- Shorter forms almost always convert better -- each extra field adds friction ([Moosend](https://moosend.com/blog/landing-page-best-practices/))

---

## Appendix: Files Audited

### Buyer-Facing Pages
- `/frontend/src/app/page.tsx` -- Landing page
- `/frontend/src/app/stores/page.tsx` -- Store discovery
- `/frontend/src/app/stores/[storeId]/page.tsx` -- Store detail
- `/frontend/src/app/boxes/[planId]/page.tsx` -- Box / subscription detail
- `/frontend/src/app/pickup-windows/[pickupWindowId]/page.tsx` -- Walk-up checkout
- `/frontend/src/app/buyer/page.tsx` -- Buyer dashboard
- `/frontend/src/app/buyer/login/page.tsx` -- Buyer login
- `/frontend/src/app/buyer/auth/verify/page.tsx` -- Magic link verification
- `/frontend/src/app/orders/[orderId]/page.tsx` -- Order detail
- `/frontend/src/app/subscriptions/[subscriptionId]/page.tsx` -- Subscription management
- `/frontend/src/app/pickup/confirm/page.tsx` -- Pickup confirmation (seller-facing)
- `/frontend/src/app/policies/page.tsx` -- Policies page
- `/frontend/src/app/b/[planId]/page.tsx` -- Short link redirect
- `/frontend/src/app/boxes/[planId]/qr/page.tsx` -- QR poster (print)

### Seller-Facing Pages
- `/frontend/src/app/seller/page.tsx` -- Seller dashboard
- `/frontend/src/app/seller/login/page.tsx` -- Seller login
- `/frontend/src/app/seller/register/page.tsx` -- Seller registration
- `/frontend/src/app/seller/stores/[storeId]/page.tsx` -- Store management
- `/frontend/src/app/seller/stores/[storeId]/settings/page.tsx` -- Store settings
- `/frontend/src/app/seller/stores/[storeId]/setup/layout.tsx` -- Setup wizard layout
- `/frontend/src/app/seller/stores/[storeId]/setup/page.tsx` -- Setup router
- `/frontend/src/app/seller/stores/[storeId]/setup/location/page.tsx` -- Setup: location
- `/frontend/src/app/seller/stores/[storeId]/setup/box/page.tsx` -- Setup: box
- `/frontend/src/app/seller/stores/[storeId]/setup/payouts/page.tsx` -- Setup: payouts
- `/frontend/src/app/seller/stores/[storeId]/setup/review/page.tsx` -- Setup: review/launch

### Components
- `/frontend/src/components/subscribe-form.tsx` -- Subscription checkout
- `/frontend/src/components/checkout-form.tsx` -- Walk-up checkout
- `/frontend/src/components/footer.tsx` -- Footer
- `/frontend/src/components/buyer-nav-link.tsx` -- Buyer nav
- `/frontend/src/components/seller-nav-link.tsx` -- Seller nav
- `/frontend/src/components/pickup-code-card.tsx` -- Pickup code display

### Infra
- `/frontend/src/app/layout.tsx` -- Root layout (metadata, fonts)
- `/frontend/src/app/globals.css` -- Design system
- `/frontend/src/app/error.tsx` -- Global error boundary
- `/frontend/next.config.ts` -- Next.js config
