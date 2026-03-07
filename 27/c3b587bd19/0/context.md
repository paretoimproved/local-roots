# Session Context

Session ID: 47432d30-2d43-4d94-b137-1872c12dd7cf
Commit Message: Implement the following plan:

# UX Overhaul Plan — LocalRoots

## Conte

## Prompts

### Prompt 1

Implement the following plan:

# UX Overhaul Plan — LocalRoots

## Context

LocalRoots is a local pickup marketplace connecting buyers with farmers. The app works but the UX feels like a developer built it, not a designer. Cards are text-heavy, layouts are single-column, and there's no visual rhythm. We're overhauling the buyer and seller experience to match the polish of best-in-class marketplaces (Airbnb, DoorDash, Etsy) while preserving LocalRoots' earthy, artisanal identity.

**Design philosophy**: Farmers and their food are the product. Imagery should dominate. Every screen should answer "what do I do next?" within 2 seconds.

**Guiding principles from top marketplaces**:
- Airbnb: Image-forward grid cards, minimal text, clear price, scannable
- DoorDash: Action-oriented item cards, inline add buttons, sticky checkout
- Etsy: Warm visual identity, grid browse, prominent pricing
- Square POS: Seller tools are dead-simple, action-first, minimal clutter

---

## Phase 1: Store Browse Grid (Highest Impact, Lowest Effort)

**Problem**: `/stores` shows farms as a single-column vertical list with full-width 16:9 images. Users must scroll endlessly to compare farms. Every successful marketplace uses a responsive grid.

**Fix**: Convert store listing to a responsive card grid with image-forward cards.

### 1A. Store browse grid layout
- **File**: `frontend/src/app/stores/page.tsx` (lines 417-468)
- Change `<ul className="grid gap-3">` to responsive grid: `grid gap-4 sm:grid-cols-2 lg:grid-cols-3`
- This is ~1 line of CSS change for massive visual improvement

### 1B. Store card redesign
- **File**: `frontend/src/app/stores/page.tsx` (lines 419-467)
- Current: full-width card, 16:9 image, text block below with name/city/description
- New layout:
  ```
  +---------------------------+
  |                           |
  |      Image (4:3)          |
  |                           |
  +---------------------------+
  | Farm Name                 |
  | City, Region     distance |
  | "Short desc..."   [New]   |
  +---------------------------+
  ```
- Change image aspect from `aspect-[16/9]` to `aspect-[4/3]` (taller images = more visual weight per card)
- Add `line-clamp-2` to description to prevent card height variance
- Keep existing hover lift effect (already good)
- Show placeholder initial letter when no image (already exists, keep it)

### 1C. Homepage featured farms consistency
- **File**: `frontend/src/app/page.tsx` (lines 117-158)
- Already uses `sm:grid-cols-3` grid (good)
- Align card structure with the new store browse card (same aspect ratio, same text layout)
- Ensures visual consistency between homepage and browse page

### 1D. Empty state for no-image farms
- When a store has no `image_url`, current placeholder is just a letter initial on a green-tinted background
- Upgrade to a more polished placeholder: farm icon or illustration with the earthy palette

**Verification**: Run `pnpm typecheck && pnpm lint`. Visual check on localhost:3000/stores and localhost:3000.

---

## Phase 2: Store Detail Page Hierarchy (High Impact, Medium Effort)

**Problem**: `/stores/[storeId]` is a long vertical scroll with no visual hierarchy. Subscription boxes, pickup locations, walk-up items, and reviews all have equal visual weight. The primary CTA (subscribe) gets lost.

**Fix**: Create clear visual hierarchy with a hero section, prominent subscription cards, and secondary sections.

### 2A. Hero section cleanup
- **File**: `frontend/src/app/stores/[storeId]/page.tsx` (lines 201-234)
- Current: 3:1 aspect image + name/description/reviews stacked below
- New: Keep the wide hero image but overlay farm name + location on the image (like Airbnb listing headers)
- Add review stars inline with the farm name
- This makes the hero more impactful and saves vertical space

### 2B. Subscription box cards — make them the star
- **File**: `frontend/src/app/stores/[storeId]/page.tsx` (lines 399-448)
- Current: vertical list of cards with chips for cadence/price/next-date
- New: Side-by-side layout on desktop (`md:grid-cols-2`), each card with:
  ```
  +---------------------------+
  |      Box Image (16:9)     |
  +---------------------------+
  | Box Title                 |
  | Weekly  $35/box           |
  | Next: Sat, Mar 15, 10am  |
  |                           |
  | [Subscribe ->]            |
  +---------------------------+
  ```
- Price should be prominent (larger font, green color)
- CTA button at bottom of each card, not floating right
- Chips are good but should be below the title, not wrapped inline

### 2C. Walk-up items — visual upgrade
- **File**: `frontend/src/app/stores/[storeId]/page.tsx` (lines 451-482)
- Current: text-only list inside a single card (product name + price + remaining)
- New: Individual item cards with product images (if available)
  ```
  +--------+--------------------+
  | [img]  | Heirloom Tomatoes  |
  | 80x80  | $4.00 / lb         |
  |        | 12 left            |
  +--------+--------------------+
  ```
- Link to pickup window page for checkout

### 2D. Pickup location cards — tighter layout
- **File**: `frontend/src/app/stores/[storeId]/page.tsx` (lines 237-383)
- Current: large cards with map/photo side panel, lots of vertical space
- Simplify: Compact card with address, next pickup time, and a small map thumbnail
- Move "upcoming pickups" list into an expandable section (don't show 6 dates by default)

**Verification**: Visual check on `/stores/{id}`. Run `pnpm typecheck && pnpm lint`.

---

## Phase 3: Buyer Dashboard (Medium Impact, Medium Effort)

**Problem**: `/buyer` is three stacked sections (subscriptions, upcoming pickups, past orders) with small text rows. No images, no visual appeal, no sense of urgency for upcoming pickups.

### 3A. Hero upcoming pickup card
- **File**: `frontend/src/app/buyer/page.tsx` (lines 171-223)
- Current: small row cards with pickup code embedded inline
- New: The next upcoming pickup should be a large hero card:
  ```
  +---------------------------------------+
  |  YOUR NEXT PICKUP                     |
  |  Farm Box Name              Sat Mar 8 |
  |  Green Valley Farm          10:00 AM  |
  |                                       |
  |  [Pickup Code: 847291]      [Ready]   |
  |                                       |
  |  123 Farm Rd, Springfield             |
  +---------------------------------------+
  ```
- Remaining upcoming pickups below in compact cards
- Past orders collapsed by default, expandable

### 3B. Active subscriptions — card upgrade
- **File**: `frontend/src/app/buyer/page.tsx` (lines 136-169)
- Current: small row with plan title, cadence, price, status badge
- New: Slightly larger cards with store image (if available), next pickup date prominent
- Add quick actions: "Skip next" or "Manage" buttons visible

### 3C. Status badge consistency
- **File**: `frontend/src/app/buyer/page.tsx` (lines 17-34)
- Current: `statusBadge()` function uses hardcoded Tailwind colors
- Reuse `StatusPill` from `frontend/src/components/seller/status-pills.tsx` for consistency
- Or extract a shared status badge component

**Verification**: Visual check on `/buyer`. Run `pnpm typecheck && pnpm lint`.

---

## Phase 4: Checkout Flow Polish (Medium Impact, Low-Medium Effort)

**Problem**: Checkout forms work but feel dense. Quantity selection uses raw number inputs instead of +/- steppers.

### 4A. Quantity stepper component
- **File**: `frontend/src/components/checkout-form.tsx` (lines 248-280)
- Replace `<input type="number">` with a custom +/- stepper component
- Pattern: `[ - ]  2  [ + ]` with disabled states at min/max
- Used by DoorDash, Instacart, every food marketplace

### 4B. Checkout summary — sticky on desktop
- **File**: `frontend/src/app/pickup-windows/[pickupWindowId]/page.tsx` (line 180)
- Already has `md:sticky md:top-6` — verify this works well
- Ensure the checkout card has clear visual separation from the item list

### 4C. Subscribe form — reduce friction
- **File**: `frontend/src/components/subscribe-form.tsx`
- Name and phone are optional but take equal visual weight as email
- Collapse optional fields behind a "Add name/phone (optional)" toggle
- This reduces perceived form complexity

**Verification**: Visual check on checkout flows. Run `pnpm typecheck && pnpm lint`.

---

## Phase 5: Seller Dashboard Simplification (Medium Impact, Higher Effort)

**Problem**: Seller dashboard is information-dense. Financial details on every order card, QR codes taking space, too many action buttons visible at once. Farmers at a farmstand need simplicity.

### 5A. Order list — action-first redesign
- **File**: `frontend/src/components/seller/order-list.tsx`
- Current: each order shows buyer name, email, status, payment status, total, subtotal, service fee, no-show fee, item list, AND action buttons
- New: Compact order rows with progressive disclosure
  ```
  +------------------------------------------+
  | Jane D.  |  $35.00  |  Placed  | [Ready] |
  | 2x Tomatoes, 1x Lettuce     [v Expand]   |
  +------------------------------------------+
  ```
- Financial details (payout estimate, fees) move into expandable detail
- Primary action button (Mark ready / Confirm pickup) is always visible and prominent
- Secondary actions (Cancel, No-show) behind a "..." menu or expandable

### 5B. Subscription plan cards — reduce QR prominence
- **File**: `frontend/src/components/seller/subscription-plan-list.tsx`
- QR code (140x140) dominates the card — move it behind a "Show QR" toggle or smaller thumbnail
- Keep "Print poster" and "Copy link" as the primary actions
- Plan status and next cycle info should be the focus

### 5C. Pickup window selector — simplify
- **File**: `frontend/src/components/seller/pickup-window-list.tsx`
- Ensure the selector is clean and doesn't take too much vertical space
- Auto-select the most relevant window (next upcoming)

**Verification**: Visual check on seller dashboard. Run `pnpm typecheck && pnpm lint`. Run `cd backend && go test ./...`.

---

## Phase 6: Shared Component Extraction (Foundation)

**Problem**: Card patterns are reimplemented inline across ~10 pages. Iterating on design requires changing every page.

### 6A. `<StoreCard>` component
- Extract from `/stores` page and homepage
- Props: store data, size variant (compact/full), showDistance
- Single source of truth for store card rendering

### 6B. `<BoxCard>` component
- Extract from store detail and store boxes pages
- Props: plan data, showSubscribeButton, variant

### 6C. `<StatusBadge>` shared component
- Unify `statusBadge()` in buyer page with `StatusPill` in seller components
- Single component with consistent color mapping

### 6D. `<QuantityStepper>` component
- Reusable +/- quantity input for checkout flows

**Verification**: `pnpm typecheck && pnpm lint`. Ensure all pages using extracted components render correctly.

---

## Execution Order (Impact/Effort Priority)

| Priority | Phase | Est. Scope | Impact |
|----------|-------|-----------|--------|
| 1st | 1A: Grid layout | ~5 min | Massive visual improvement |
| 2nd | 1B: Store card redesign | ~30 min | Browse feels like a real marketplace |
| 3rd | 2B: Subscription box cards | ~30 min | Primary conversion path looks great |
| 4th | 3A: Hero upcoming pickup | ~45 min | Buyer dashboard feels useful |
| 5th | 2C: Walk-up items visual | ~30 min | Products look appetizing |
| 6th | 4A: Quantity stepper | ~30 min | Checkout feels modern |
| 7th | 5A: Order list simplify | ~1 hr | Seller dashboard is usable at farmstand |
| 8th | 6A-D: Component extraction | ~1 hr | Foundation for future iteration |
| 9th | Remaining phases | Varies | Polish and consistency |

---

## Files to Modify (Quick Reference)

**Buyer pages:**
- `frontend/src/app/page.tsx` — homepage
- `frontend/src/app/stores/page.tsx` — store browse
- `frontend/src/app/stores/[storeId]/page.tsx` — store detail
- `frontend/src/app/stores/[storeId]/boxes/page.tsx` — store boxes
- `frontend/src/app/boxes/[planId]/page.tsx` — box detail / subscribe
- `frontend/src/app/pickup-windows/[pickupWindowId]/page.tsx` — walk-up checkout
- `frontend/src/app/buyer/page.tsx` — buyer dashboard
- `frontend/src/app/orders/[orderId]/page.tsx` — order detail
- `frontend/src/app/subscriptions/[subscriptionId]/page.tsx` — subscription mgmt

**Seller pages:**
- `frontend/src/app/seller/stores/[storeId]/page.tsx` — seller dashboard
- `frontend/src/components/seller/subscription-plan-list.tsx` — box management
- `frontend/src/components/seller/order-list.tsx` — order management
- `frontend/src/components/seller/subscriber-list.tsx` — subscriber list
- `frontend/src/components/seller/pickup-window-list.tsx` — window selector

**Shared components:**
- `frontend/src/components/checkout-form.tsx` — walk-up checkout
- `frontend/src/components/subscribe-form.tsx` — subscription checkout
- `frontend/src/app/globals.css` — design tokens

**Design system (existing):**
- CSS classes: `lr-card`, `lr-card-strong`, `lr-chip`, `lr-btn`, `lr-btn-primary`, `lr-field`, `lr-animate`
- Colors: `--lr-bg` (sand), `--lr-ink` (ink), `--lr-muted` (peat), `--lr-leaf` (sage), `--lr-clay`, `--lr-water`
- Fonts: Spline Sans (body), Fraunces (headings), Geist Mono (code)
- Hover pattern: `transition hover:-translate-y-0.5 hover:shadow-[0_22px_60px_rgba(38,28,10,0.14)]`


If you need specific details from before exiting plan mode (like exact code snippets, error messages, or content you generated), read the full transcript at: /Users/brandonqueener/.claude/projects/-Users-brandonqueener-Cursor-Projects-Local-Roots/4577cb2a-852e-48f1-b117-e6e5f1ad7969.jsonl

If this plan can be broken down into multiple independent tasks, consider using the TeamCreate tool to create a team and parallelize the work.

## Summary



All 5 phase agents are now running in parallel, each in an isolated git worktree. Here's what's happening:

| Agent | Phase | Files | What it's doing |
|-------|-------|-------|-----------------|
| `phase1-browse` | 1 | `stores/page.tsx`, `page.tsx` | Responsive grid, 4:3 cards, no-image placeholders |
| `phase2-detail` | 2 | `stores/[storeId]/page.tsx` | Hero overlay, subscription cards, walk-up items |
| `phase3-buyer` | 3 | `buyer/page.tsx` | Hero pickup card, StatusPill unification, collapsible past orders |
| `phase4-checkout` | 4 | `checkout-form.tsx`, `subscribe-form.tsx` | QuantityStepper component, optional field toggle |
| `phase5-seller` | 5 | `order-list.tsx`, `subscription-plan-list.tsx` | Compact orders with progressive disclosure, QR toggle |

Task #6 (final verification) is blocked until all 5 complete. I'll merge the worktree branches and run verification once the agents finish. Waiting for results now.
