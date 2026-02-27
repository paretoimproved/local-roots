# LocalRoots UI/UX & Accessibility Audit

**Date:** 2026-02-27
**Scope:** Full buyer-facing and seller-facing frontend (`frontend/src/`)
**Standard:** WCAG 2.1 AA

---

## Table of Contents

1. [Critical Accessibility Issues](#1-critical-accessibility-issues)
2. [Moderate Accessibility Issues](#2-moderate-accessibility-issues)
3. [Usability Issues](#3-usability-issues)
4. [Mobile Responsiveness](#4-mobile-responsiveness)
5. [User Flow Issues](#5-user-flow-issues)
6. [Edge State Issues](#6-edge-state-issues)
7. [Microcopy Issues](#7-microcopy-issues)
8. [UI Consistency Issues](#8-ui-consistency-issues)
9. [Polish Improvements](#9-polish-improvements)

---

## 1. Critical Accessibility Issues

### 1.1 Focus indicator removed on `.lr-field` -- WCAG 2.4.7 (Focus Visible)

**File:** `/frontend/src/app/globals.css`, lines 113-115
**Severity:** Critical

The `.lr-field:focus` rule sets `outline: none`, which removes the browser's default focus indicator. Although `.lr-field:focus-visible` adds a custom box-shadow ring, `:focus-visible` is not triggered for all interaction modes. Users navigating with switch devices or assistive technology that do not trigger `:focus-visible` will see no focus indicator at all.

```css
/* Current */
.lr-field:focus {
  outline: none;
}
```

**Suggested fix:**
```css
.lr-field:focus {
  outline: 2px solid transparent; /* suppress default but keep focus ring accessible */
}

.lr-field:focus-visible {
  outline: 2px solid rgba(47, 107, 79, 0.6);
  outline-offset: 2px;
  box-shadow:
    0 0 0 4px rgba(47, 107, 79, 0.18),
    0 1px 0 rgba(255, 255, 255, 0.55) inset;
  border-color: rgba(47, 107, 79, 0.35);
}
```

### 1.2 No visible focus indicator on `.lr-btn` elements -- WCAG 2.4.7

**File:** `/frontend/src/app/globals.css`, lines 80-94
**Severity:** Critical

The `.lr-btn` class has no `:focus` or `:focus-visible` styles defined. Buttons using this class (Browse, Sign in, Sell, Search, etc.) have no keyboard focus indicator. This affects every page in the application.

**Suggested fix:** Add to `globals.css`:
```css
.lr-btn:focus-visible {
  outline: 2px solid rgba(47, 107, 79, 0.6);
  outline-offset: 2px;
}
```

### 1.3 No focus indicator on `.lr-chip` and `.lr-card` interactive elements -- WCAG 2.4.7

**File:** `/frontend/src/app/globals.css`, lines 75-78
**Severity:** Critical

Many clickable elements use `.lr-chip` or `.lr-card` classes (e.g., subscription cards in buyer dashboard, order filter buttons in seller dashboard) but have no focus styling. Keyboard-only users cannot see which element is focused.

**Suggested fix:**
```css
.lr-chip:focus-visible,
.lr-card:focus-visible {
  outline: 2px solid rgba(47, 107, 79, 0.6);
  outline-offset: 2px;
}
```

### 1.4 Color contrast insufficient for `--lr-muted` on `--lr-bg` -- WCAG 1.4.3 (Contrast Minimum)

**File:** `/frontend/src/app/globals.css`, lines 3-14
**Severity:** Critical

The muted text color `#5a5549` on the background `#f6f1e8` yields a contrast ratio of approximately 4.1:1. This barely passes for normal text (4.5:1 required) and fails for many instances where the font size is `text-xs` (12px) or `text-sm` (14px), which require the full 4.5:1 ratio.

This is used pervasively throughout the app: form labels, descriptions, breadcrumbs, policy text, help text, timestamps, etc.

**Suggested fix:** Darken `--lr-muted` to at least `#4a463c` (contrast ratio ~5.2:1):
```css
--lr-muted: #4a463c;
```

### 1.5 `<nav>` element in root layout lacks accessible label -- WCAG 1.3.1 (Info and Relationships)

**File:** `/frontend/src/app/layout.tsx`, line 54
**Severity:** Critical

The primary navigation `<nav>` has no `aria-label` or `aria-labelledby`. Screen readers announce it as simply "navigation" with no distinction from other nav elements (breadcrumbs, footer nav).

```tsx
<nav className="flex flex-wrap items-center gap-2 text-sm">
```

**Suggested fix:**
```tsx
<nav aria-label="Main navigation" className="flex flex-wrap items-center gap-2 text-sm">
```

Similarly, the footer nav at `/frontend/src/components/footer.tsx`, line 22:
```tsx
<nav className="flex flex-wrap justify-center gap-x-5 gap-y-2">
```
Should become:
```tsx
<nav aria-label="Footer" className="flex flex-wrap justify-center gap-x-5 gap-y-2">
```

### 1.6 Breadcrumb `<nav>` elements lack `aria-label="Breadcrumb"` -- WCAG 1.3.1

**Files:**
- `/frontend/src/app/stores/[storeId]/page.tsx`, line 170
- `/frontend/src/app/boxes/[planId]/page.tsx`, line 64
- `/frontend/src/app/pickup-windows/[pickupWindowId]/page.tsx`, line 70

**Severity:** Critical

All breadcrumb navigations use `<nav>` without `aria-label="Breadcrumb"`. Screen readers cannot distinguish these from the main navigation.

**Suggested fix:** Add `aria-label="Breadcrumb"` to each breadcrumb nav and wrap links in `<ol>` with proper `aria-current="page"` on the last item:
```tsx
<nav aria-label="Breadcrumb" className="text-sm text-[color:var(--lr-muted)]">
  <ol className="flex items-center">
    <li><Link href="/stores">Farms</Link></li>
    <li aria-hidden="true" className="mx-2">&rarr;</li>
    <li aria-current="page">{storeName}</li>
  </ol>
</nav>
```

### 1.7 ErrorAlert has no ARIA role -- WCAG 4.1.3 (Status Messages)

**File:** `/frontend/src/components/error-alert.tsx`, line 11
**Severity:** Critical

Error messages are not announced to screen readers. The `ErrorAlert` component renders a `<div>` without `role="alert"`.

```tsx
<div className={`rounded-xl bg-rose-50 p-4 text-sm text-rose-800 ...`}>
```

**Suggested fix:**
```tsx
<div role="alert" className={`rounded-xl bg-rose-50 p-4 text-sm text-rose-800 ...`}>
```

---

## 2. Moderate Accessibility Issues

### 2.1 Seller store page: `<select>` for window picker lacks label -- WCAG 1.3.1

**File:** `/frontend/src/app/seller/stores/[storeId]/page.tsx`, lines 467-478
**Severity:** Moderate

The pickup window select dropdown has no associated `<label>`:
```tsx
<select
  className="lr-field px-3 py-2 text-sm"
  value={selectedWindowId}
  onChange={(e) => setSelectedWindowId(e.target.value)}
>
```

**Suggested fix:**
```tsx
<label className="sr-only" htmlFor="window-select">Pickup window</label>
<select
  id="window-select"
  className="lr-field px-3 py-2 text-sm"
  ...
```

### 2.2 Status badge text uses CSS `capitalize` without explicit label -- WCAG 1.3.1

**File:** `/frontend/src/app/orders/[orderId]/page.tsx`, line 158
**Severity:** Moderate

The order status displays `{data.order.status.replace(/_/g, " ")}` with `capitalize` CSS. Screen readers will read the raw text (e.g., "picked up") without any semantic indicator that this is a status. Consider wrapping in a `<span>` with `aria-label`:

```tsx
<span aria-label={`Order status: ${data.order.status.replace(/_/g, " ")}`}>
  {data.order.status.replace(/_/g, " ")}
</span>
```

### 2.3 CancelFlow dialog does not trap focus -- WCAG 2.4.3 (Focus Order)

**File:** `/frontend/src/app/subscriptions/[subscriptionId]/page.tsx`, lines 148-230
**Severity:** Moderate

The `CancelFlow` component uses `<dialog>` with `showModal()`, which natively traps focus. However, when `step` changes from 1 to 2, focus is not moved to the new step's heading. Users tabbing through step 1 may lose context when the content changes.

**Suggested fix:** After `setStep(2)`, focus the "We're sorry to see you go" heading via a ref.

### 2.4 `ConfirmDialog` auto-focuses the confirm button for destructive actions -- WCAG 2.4.3

**File:** `/frontend/src/components/confirm-dialog.tsx`, line 69
**Severity:** Moderate

The destructive confirm button has `autoFocus`, which means a keyboard user pressing Enter immediately would execute the destructive action. For destructive dialogs, focus should default to the Cancel button.

**Suggested fix:** Move `autoFocus` to the cancel button when `destructive` is true:
```tsx
<button
  type="button"
  className="lr-btn ..."
  onClick={onCancel}
  autoFocus={destructive}
>
  {cancelLabel}
</button>
<button
  type="button"
  className={destructive ? "..." : "..."}
  onClick={onConfirm}
  autoFocus={!destructive}
>
  {confirmLabel}
</button>
```

### 2.5 Loading states lack screen reader announcements -- WCAG 4.1.3

**Files:**
- `/frontend/src/app/buyer/page.tsx`, line 98 ("Loading...")
- `/frontend/src/app/orders/[orderId]/page.tsx`, line 118 ("Loading order...")
- `/frontend/src/app/subscriptions/[subscriptionId]/page.tsx`, line 380 ("Loading subscription...")
- `/frontend/src/app/stores/page.tsx`, line 348 ("Finding stores near you...")

**Severity:** Moderate

Loading states use `<p>` tags without `role="status"` or `aria-live`. Screen readers will not announce when loading begins or ends.

**Suggested fix:** Wrap loading indicators in `role="status"` containers:
```tsx
<div role="status" aria-live="polite">
  <p className="text-sm text-[color:var(--lr-muted)]">Loading...</p>
</div>
```

### 2.6 Image `alt` text for store placeholders is the first character only -- WCAG 1.1.1 (Non-text Content)

**File:** `/frontend/src/app/page.tsx`, lines 122-126
**Severity:** Moderate

When a store has no image, the placeholder shows the first letter of the store name with no meaningful alt text:
```tsx
<span className="text-3xl text-[color:var(--lr-leaf)]/30">
  {s.name.charAt(0)}
</span>
```

This `<span>` inside a `<div>` has no `aria-label`. The parent link contains the store name, so this is not critical, but the decorative letter should be hidden from screen readers.

**Suggested fix:** Add `aria-hidden="true"` to the letter:
```tsx
<span aria-hidden="true" className="text-3xl ...">
  {s.name.charAt(0)}
</span>
```

### 2.7 Star rating in reviews uses individual SVGs without grouped label -- WCAG 1.1.1

**File:** `/frontend/src/components/review-card.tsx`, lines 3-21
**Severity:** Moderate (mitigated)

The `StarRating` component correctly has `aria-label={`${rating} out of 5 stars`}` on the wrapper, which is good. However, the individual SVG stars should be `aria-hidden="true"` to prevent screen readers from announcing 5 separate images.

**Suggested fix:** Add `aria-hidden="true"` to each star SVG:
```tsx
<svg key={i} aria-hidden="true" className={...} fill="currentColor" viewBox="0 0 20 20">
```

### 2.8 Heading hierarchy is inconsistent on buyer dashboard -- WCAG 1.3.1

**File:** `/frontend/src/app/buyer/page.tsx`
**Severity:** Moderate

The `<h1>` is "My pickups" at `text-lg` (line 139), while section headings use `<h2>` at `text-base`. The visual hierarchy is unclear -- `<h1>` looks barely larger than `<h2>`. Additionally, the page heading appears inside a card rather than as a standalone heading.

On other pages (e.g., store detail, box detail), `<h1>` uses `text-3xl` consistently. The buyer dashboard should follow the same pattern.

**Suggested fix:** Move `<h1>` outside the card and use `text-3xl`:
```tsx
<h1 className="text-3xl font-semibold tracking-tight text-[color:var(--lr-ink)]">
  My pickups
</h1>
```

### 2.9 Seller dashboard order filter buttons are not semantically grouped -- WCAG 1.3.1

**File:** `/frontend/src/app/seller/stores/[storeId]/page.tsx`, lines 699-731
**Severity:** Moderate

The order filter buttons (All, Placed, Ready, etc.) use `aria-pressed` which is correct, but they are not wrapped in a `role="group"` with a label.

**Suggested fix:**
```tsx
<div role="group" aria-label="Filter orders by status" className="flex flex-wrap gap-2">
  {/* filter buttons */}
</div>
```

---

## 3. Usability Issues

### 3.1 Footer links all point to "#" -- dead links

**File:** `/frontend/src/components/footer.tsx`, lines 3-9
**Severity:** High

All footer links (About, How it Works, FAQ, Terms, Privacy, Contact) point to `#`, which navigates to the top of the page. This is confusing and erodes user trust.

**Suggested fix:** Either link to real pages or remove the links until content exists. At minimum, the "Policies" link should point to `/policies`:
```tsx
const links = [
  { label: "Policies", href: "/policies" },
  { label: "Contact", href: "mailto:support@localroots.com" },
] as const;
```

### 3.2 Checkout forms do not use `<form>` elements -- no native submit on Enter

**Files:**
- `/frontend/src/components/subscribe-form.tsx` -- no `<form>` wrapper
- `/frontend/src/components/checkout-form.tsx` -- no `<form>` wrapper

**Severity:** High

Neither checkout flow uses a `<form>` element. Users cannot press Enter to submit after filling in email. All submit actions are `type="button"` with `onClick` handlers.

**Suggested fix:** Wrap the form fields in a `<form onSubmit={...}>` element and change the primary submit button to `type="submit"`.

### 3.3 Token access pattern for orders/subscriptions is confusing for end users

**Files:**
- `/frontend/src/app/orders/[orderId]/page.tsx`, lines 122-148
- `/frontend/src/app/subscriptions/[subscriptionId]/page.tsx`, lines 384-410

**Severity:** High

When a user visits an order or subscription page without a token, they see "Paste the token from your confirmation (or add `?t=...` to the URL)." This developer-oriented language will confuse buyers. Most users will not know what a "token" is or where to find it.

**Suggested fix:** Replace the token input with a sign-in prompt:
```
"Sign in to view this order."
[Sign in with email] [Sign in with Google]
```

Or, if token-based access must stay, improve the copy:
```
"This link requires an access code. Check your email for the order confirmation, which contains a direct link to this page."
```

### 3.4 No "skip to main content" link -- WCAG 2.4.1 (Bypass Blocks)

**File:** `/frontend/src/app/layout.tsx`
**Severity:** High

There is no skip navigation link for keyboard users to bypass the header and navigation on every page.

**Suggested fix:** Add as the first child of `<body>`:
```tsx
<a
  href="#main-content"
  className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-[100] focus:rounded-lg focus:bg-white focus:px-4 focus:py-2 focus:text-sm focus:font-semibold focus:shadow-lg"
>
  Skip to main content
</a>
```

And add `id="main-content"` to the `<main>` element:
```tsx
<main id="main-content" className="mt-10">{children}</main>
```

### 3.5 Seller store dashboard is very long single-page with no scroll-to sections

**File:** `/frontend/src/app/seller/stores/[storeId]/page.tsx` (967 lines)
**Severity:** Moderate

The seller store management page is ~967 lines with subscription boxes, orders, pickup codes, and payouts all in one scrollable view. On mobile, this is a very long page with no way to jump between sections.

**Suggested fix:** Add anchor links or a tabbed interface to separate Orders, Subscription Boxes, and Payouts into distinct views.

### 3.6 Buyer login: `autoFocus` on email input may disorient screen reader users -- WCAG 2.4.3

**File:** `/frontend/src/app/buyer/login/page.tsx`, line 145
**Severity:** Low-Moderate

The email input has `autoFocus`, which may bypass important context (heading, description, Google sign-in button) for screen reader users. On mobile, it will also trigger the keyboard immediately, hiding half the page content.

**Suggested fix:** Remove `autoFocus` from the email input. Let users navigate to it naturally.

---

## 4. Mobile Responsiveness

### 4.1 Nav buttons may be too small for touch -- WCAG 2.5.5 (Target Size)

**File:** `/frontend/src/app/layout.tsx`, lines 55-59
**Severity:** High

Navigation buttons use `px-4 py-2` which produces approximately 40x32px tap targets. WCAG 2.5.5 (AAA) recommends 44x44px, and WCAG 2.5.8 (AA in 2.2) requires at least 24x24px with adequate spacing. While the current size passes AA, it is below the recommended 44x44px.

**Affected elements:**
- Header nav: Browse, Sign in, Sell, Dashboard, Log out
- Buyer dashboard: Sign out button at `px-3 py-1.5 text-xs` (~36x24px) -- too small

**Suggested fix:** Increase minimum padding to `px-4 py-2.5` for nav buttons, and `px-4 py-2` for the sign-out button (currently `px-3 py-1.5`).

### 4.2 Seller dashboard sticky header overlaps content on small screens

**File:** `/frontend/src/app/seller/stores/[storeId]/page.tsx`, line 465
**Severity:** Moderate

The pickup window selector is `sticky top-3 z-10` which stays fixed during scroll. On small viewports, this takes up significant vertical space and may overlap content below, especially the order filter buttons.

**Suggested fix:** On mobile, remove `sticky` positioning or reduce the sticky header height by collapsing the date/location info into a single line.

### 4.3 Seller order cards have small touch targets for action buttons

**File:** `/frontend/src/app/seller/stores/[storeId]/page.tsx`, lines 828-873
**Severity:** Moderate

Order action buttons (Mark ready, Cancel, Confirm, No show) use `px-3 py-2 text-sm` producing ~80x34px targets. The pickup code input at `w-40 px-3 py-2` is acceptable, but the grouped buttons next to it are tight on mobile.

**Suggested fix:** On mobile, stack action buttons vertically with full width instead of inline flex wrapping.

### 4.4 Checkout quantity inputs are narrow on mobile

**File:** `/frontend/src/components/checkout-form.tsx`, line 229
**Severity:** Low

Quantity inputs use `w-20 sm:w-24` which is only 80px on mobile. The `type="number"` stepper arrows may be hard to tap.

**Suggested fix:** Increase to `w-24 sm:w-28` and consider adding +/- buttons instead of relying on the native number stepper.

### 4.5 Store discovery search form wraps awkwardly on narrow screens

**File:** `/frontend/src/app/stores/page.tsx`, lines 242-308
**Severity:** Low

The search form uses `flex flex-wrap items-end gap-3`. On very narrow screens (320px), the Search button and Show all button wrap to a third row, making the form visually disconnected.

**Suggested fix:** Stack vertically on mobile:
```tsx
<form className="grid gap-3 sm:flex sm:flex-wrap sm:items-end">
```

---

## 5. User Flow Issues

### 5.1 Post-checkout success has no clear next step for walk-up orders

**File:** `/frontend/src/components/checkout-form.tsx`, lines 141-198
**Severity:** High

After placing a walk-up order, the user sees "Order placed" with:
1. "View order" link
2. "Copy access link" button

But there is no instruction about when or where to pick up. The pickup date/time and location are not displayed on the success screen.

**Suggested fix:** Add the pickup window date/time and location to the order success view:
```
Pickup: Sat, Mar 1 at 10:00 AM
Location: Green Valley Farm Stand, 123 Main St
```

### 5.2 Subscribe success flow has no email confirmation messaging

**File:** `/frontend/src/components/subscribe-form.tsx`, lines 125-178
**Severity:** Moderate

After subscribing, the success view says "You're in!" but does not mention that a confirmation email was sent. Users may not know to check their email for their pickup code.

**Suggested fix:** Add: "A confirmation email has been sent to {email} with your pickup details."

### 5.3 Buyer dashboard shows order links with embedded tokens in the URL

**File:** `/frontend/src/app/buyer/page.tsx`, lines 199, 254
**Severity:** Moderate (Security/UX)

Order links include `?t=${encodeURIComponent(session.getToken() ?? "")}`. This embeds the full session JWT in the URL, which could be shared unintentionally (browser history, shared links, screenshots). The session token grants full account access, not just order access.

**Suggested fix:** Use order-specific tokens (which the API already supports via `buyer_token` on orders) rather than the session JWT.

### 5.4 Seller setup wizard has no back navigation between steps

**Files:**
- `/frontend/src/app/seller/stores/[storeId]/setup/box/page.tsx` -- no back button
- `/frontend/src/app/seller/stores/[storeId]/setup/payouts/page.tsx` -- no back button
- `/frontend/src/app/seller/stores/[storeId]/setup/review/page.tsx` -- has Edit buttons but no explicit "Back"

**Severity:** Moderate

The setup wizard stepper (`layout.tsx`) shows progress dots but they are not clickable. Users on step 3 (payouts) cannot go back to step 2 (box) without using the browser back button or the "Back to seller home" link, which abandons the wizard entirely.

**Suggested fix:** Make the completed step indicators clickable links, and add "Back" buttons to each step.

### 5.5 QR poster page has no context about what it is

**File:** `/frontend/src/app/boxes/[planId]/qr/page.tsx`

**Severity:** Low

This page is opened in a new tab from the seller dashboard but has no heading or context about what the user should do with it. A brief instruction ("Print this poster and display it at your farmstand") would help.

---

## 6. Edge State Issues

### 6.1 Home page shows no featured farms if API is down -- silent failure

**File:** `/frontend/src/app/page.tsx`, lines 5-12
**Severity:** Moderate

`getFeaturedStores()` catches all errors and returns `[]`. The featured farms section is hidden entirely. Users see a hero, how-it-works, and seller pitch -- but no indication that the data failed to load.

**Suggested fix:** Show the section with an appropriate empty state: "Featured farms are loading. Check back shortly."

### 6.2 Stores page shows database setup instructions to end users

**File:** `/frontend/src/app/stores/page.tsx`, lines 353-368
**Severity:** High

When the API fails, the error message includes raw developer instructions:
```
If you have not set up Postgres yet, start it and run migrations:
docker compose up -d
...
```

This should never be shown to end users.

**Suggested fix:** Show a user-friendly error: "We're having trouble loading farms right now. Please try again in a few minutes." Only show debug instructions in development mode:
```tsx
{process.env.NODE_ENV === "development" && (
  <pre className="mt-2 ...">...</pre>
)}
```

### 6.3 Store detail page calls `staticMapUrl(loc.lat!, loc.lng!)` with forced unwrap

**File:** `/frontend/src/app/stores/[storeId]/page.tsx`, line 222
**Severity:** Moderate (Runtime Error)

The `!` non-null assertion on `loc.lat` and `loc.lng` will cause a runtime error if a pickup location has null coordinates. The `staticMapUrl` function already handles missing API keys but not null lat/lng.

**Suggested fix:** Guard the call:
```tsx
const mapUrl = loc.lat != null && loc.lng != null ? staticMapUrl(loc.lat, loc.lng) : null;
```

### 6.4 Subscription page: `useSearchParams()` is not wrapped in `Suspense`

**File:** `/frontend/src/app/subscriptions/[subscriptionId]/page.tsx`
**Severity:** Moderate

Next.js 15+ requires components using `useSearchParams()` to be wrapped in `<Suspense>`. The subscription page and order page both use `useSearchParams()` without a Suspense boundary, which will cause a build-time warning or error.

Other pages handle this correctly (e.g., `stores/page.tsx` wraps `StoresContent` in `<Suspense>`).

**Suggested fix:** Wrap the component using the same pattern as `stores/page.tsx`.

### 6.5 Past orders section has no pagination -- performance issue at scale

**File:** `/frontend/src/app/buyer/page.tsx`, line 251
**Severity:** Low

Past orders are sliced to 10 with `.slice(0, 10)` but there is no "Show more" or pagination. Users with many past orders cannot see their full history.

**Suggested fix:** Add a "View all past orders" link or implement infinite scroll.

### 6.6 Empty state for walk-up items is missing on store detail page

**File:** `/frontend/src/app/stores/[storeId]/page.tsx`, lines 424-456
**Severity:** Low

If `walkUpOfferings` is empty, nothing is shown in the walk-up section. This is correct behavior, but when a store has subscription boxes AND no walk-up items, there is no indication that walk-up purchasing exists as a feature. First-time users may not know about this option.

---

## 7. Microcopy Issues

### 7.1 "Paste the token from your confirmation" is developer-facing language

**Files:**
- `/frontend/src/app/orders/[orderId]/page.tsx`, line 128
- `/frontend/src/app/subscriptions/[subscriptionId]/page.tsx`, line 390

**Severity:** High

See Section 3.3. The phrase "Paste the token from your confirmation (or add `?t=...` to the URL)" is technical jargon.

### 7.2 Error messages expose raw API patterns

**File:** `/frontend/src/app/stores/page.tsx`, line 358
**Severity:** High

"Could not load stores" followed by the raw error message (e.g., "fetch failed") is not actionable for end users.

**Suggested fix:** Map all user-facing errors through `friendlyErrorMessage()` (already available in `lib/ui.ts`) and provide actionable guidance:
"We couldn't find farms near you right now. Check your internet connection and try again."

### 7.3 Pickup code card says "The seller scans this with their phone camera" but does not explain what happens next

**File:** `/frontend/src/components/pickup-code-card.tsx`, line 119
**Severity:** Low

After telling the user about the QR scan, the flow ends. Users do not know what to expect after the scan.

**Suggested fix:** "Show this code to the seller at pickup. Once they scan it, your order will be marked as picked up and your card will be charged."

### 7.4 "Authorize card" button label is jargon

**File:** `/frontend/src/components/stripe-card-auth.tsx`, line 90
**Severity:** Low

"Authorize card" is payment-industry terminology. Most consumers think in terms of "Pay" or "Place order."

**Suggested fix:** "Complete payment" or "Confirm and pay"

### 7.5 Policies page "Contact support" has no link or email

**File:** `/frontend/src/app/policies/page.tsx`, line 125
**Severity:** Moderate

Line 125: "Contact support if something looks wrong with an order." -- but there is no link, email, or way to actually contact support.

**Suggested fix:** Add a `mailto:` link: `Contact <a href="mailto:support@localroots.com">support</a>`.

### 7.6 Button text "Continue to payment" changes to "Complete payment below" without visual indicator

**File:** `/frontend/src/components/checkout-form.tsx`, line 312-323
**Severity:** Low

When the Stripe form appears below, the primary button becomes disabled and says "Complete payment below." The pointer changes to `cursor-not-allowed` but there is no visual arrow or highlight directing the user's eye downward to the Stripe form.

**Suggested fix:** Add a downward arrow icon or a brief animated scroll to the Stripe form.

---

## 8. UI Consistency Issues

### 8.1 Inconsistent card padding across pages

**Severity:** Moderate

Card padding varies without clear rationale:
- Buyer dashboard sections: `p-6`
- Store detail location cards: `p-5`
- Seller dashboard order chips: `px-4 py-3`
- Policies page: `p-6`
- Checkout form success: `p-6`

**Suggested fix:** Standardize on `p-5` for standard cards and `p-6` for feature/primary cards.

### 8.2 Inconsistent heading levels for section titles

**Severity:** Moderate

Some section headings use `text-base font-semibold` (store detail, buyer dashboard), while others use `text-lg font-semibold` (buyer dashboard h1), and setup wizard uses `text-xl` or `text-2xl`. There is no clear typographic scale.

**Suggested fix:** Define a heading scale:
- Page title (h1): `text-3xl font-semibold tracking-tight` (already used on most pages)
- Section title (h2): `text-xl font-semibold`
- Subsection (h3): `text-base font-semibold`

### 8.3 Two different error display patterns

**Severity:** Moderate

Errors are displayed two ways:
1. `<ErrorAlert>` component (rose-50 bg, rose-800 text, rounded-xl, ring-1)
2. Inline error divs (e.g., seller store page line 460: `lr-card border-rose-200 bg-rose-50/60`)

**Suggested fix:** Use `<ErrorAlert>` consistently everywhere. Add the `role="alert"` fix from Section 1.7.

### 8.4 Inconsistent button styles for destructive actions

**Severity:** Low

Destructive actions use three different styles:
1. `ConfirmDialog`: `bg-rose-600 text-white` (rounded-full, no lr-btn class)
2. `CancelFlow`: `bg-rose-600 text-white` (rounded-full)
3. Seller "Cancel" button: `lr-btn lr-chip ... text-rose-900`

**Suggested fix:** Create a `.lr-btn-destructive` class:
```css
.lr-btn-destructive {
  border-color: rgba(220, 38, 38, 0.35);
  background: linear-gradient(135deg, rgba(220, 38, 38, 0.94), rgba(190, 18, 60, 0.88));
  color: #fff;
}
```

### 8.5 `cadenceLabel()` helper is duplicated in 5 files

**Files:**
- `/frontend/src/app/stores/[storeId]/page.tsx`, line 10
- `/frontend/src/app/boxes/[planId]/page.tsx`, line 22
- `/frontend/src/app/stores/[storeId]/boxes/page.tsx`, line 21
- `/frontend/src/app/buyer/page.tsx`, line 18
- `/frontend/src/components/subscribe-form.tsx`, line 15

**Severity:** Low (code quality)

The same 5-line function is copy-pasted across 5 files.

**Suggested fix:** Move to `lib/ui.ts`:
```ts
export function cadenceLabel(c: string): string {
  if (c === "weekly") return "Weekly";
  if (c === "biweekly") return "Every two weeks";
  if (c === "monthly") return "Monthly";
  return c;
}
```

---

## 9. Polish Improvements

### 9.1 Page titles set via `document.title` in useEffect -- should use Next.js metadata

**Files:**
- `/frontend/src/app/buyer/page.tsx`, line 53
- `/frontend/src/app/buyer/login/page.tsx`, line 15
- `/frontend/src/app/seller/page.tsx`, line 13
- `/frontend/src/app/seller/login/page.tsx`, line 19
- `/frontend/src/app/orders/[orderId]/page.tsx`, line 20
- `/frontend/src/app/subscriptions/[subscriptionId]/page.tsx`, line 240
- `/frontend/src/app/pickup/confirm/page.tsx`, line 26

**Severity:** Low

Client components set `document.title` in `useEffect`, which means:
1. The title flashes on initial load (briefly shows "LocalRoots" then changes)
2. Search engines may not pick up the correct title
3. It bypasses Next.js's metadata system

For client components where `export const metadata` is not available, consider using `useEffect` with the title set immediately before the first render, or restructuring as server component wrappers.

### 9.2 No animation or transition on toast entrance

**File:** `/frontend/src/components/toast.tsx`, lines 105-129
**Severity:** Low

The toast appears and disappears instantly with no transition. A slide-in animation would feel more polished and draw the user's eye.

**Suggested fix:** Add a CSS animation:
```css
@keyframes toast-in {
  from { opacity: 0; transform: translateY(-8px); }
  to { opacity: 1; transform: translateY(0); }
}
```

### 9.3 No favicon or PWA manifest

**File:** `/frontend/public/`
**Severity:** Low

No custom favicon was observed in the project. The default Next.js favicon will show in browser tabs.

**Suggested fix:** Add a branded favicon (leaf icon in `--lr-leaf` green) and a basic `manifest.json` for "Add to Home Screen" capability, which is important for sellers who will use the dashboard frequently from mobile.

### 9.4 Search error message mentions "city or zip code" but placeholder says "Your city or zip code"

**File:** `/frontend/src/app/stores/page.tsx`, line 175
**Severity:** Low

The geocode error says: "Could not find that location. Try a city or zip code." This is appropriate but could be more helpful by echoing back what the user searched: "We couldn't find '{query}'. Try a different city, zip code, or address."

### 9.5 Seller settings page has no unsaved changes warning

**File:** `/frontend/src/app/seller/stores/[storeId]/settings/page.tsx`
**Severity:** Low

If a seller edits the store name and navigates away without saving, changes are silently lost. There is no "unsaved changes" prompt.

**Suggested fix:** Add a `beforeunload` event listener when form state is dirty.

### 9.6 Store card hover effect may cause motion discomfort -- WCAG 2.3.3

**Multiple files** using `hover:-translate-y-0.5`
**Severity:** Low

The lift-on-hover animation (`translateY(-0.5)`) is subtle but repeated across many cards. Consider respecting `prefers-reduced-motion`:

```css
@media (prefers-reduced-motion: reduce) {
  .lr-btn:hover {
    transform: none;
  }
  .lr-animate {
    animation: none;
  }
}
```

### 9.7 `console.log` statement left in production code

**File:** `/frontend/src/app/subscriptions/[subscriptionId]/page.tsx`, line 213
**Severity:** Low

```tsx
console.log("[CancelFlow] reason:", reason);
```

This debug statement should be removed or gated behind a development environment check.

---

## Summary of Priorities

### Must Fix (Critical A11y / High Usability)

| # | Issue | Impact |
|---|-------|--------|
| 1.1 | `.lr-field:focus` removes outline | Keyboard users cannot see focused inputs |
| 1.2 | No focus indicator on `.lr-btn` | Keyboard users cannot see focused buttons |
| 1.4 | `--lr-muted` contrast ratio too low | Small text fails WCAG 1.4.3 |
| 1.5 | `<nav>` lacks `aria-label` | Screen readers cannot distinguish navs |
| 1.7 | `ErrorAlert` missing `role="alert"` | Errors not announced to screen readers |
| 3.1 | Footer links all dead (`#`) | Broken navigation, erodes trust |
| 3.4 | No skip-to-content link | Keyboard users cannot bypass header |
| 6.2 | Dev database instructions shown to users | Confusing, exposes internals |

### Should Fix (Moderate A11y / Moderate Usability)

| # | Issue | Impact |
|---|-------|--------|
| 1.3 | No focus on `.lr-chip` / `.lr-card` | Interactive cards invisible to keyboard |
| 1.6 | Breadcrumbs lack `aria-label` | Screen readers confused by multiple navs |
| 2.1 | Select dropdown missing label | Unlabeled form control |
| 2.4 | Destructive dialog auto-focuses confirm | Accidental destructive actions |
| 2.5 | Loading states not announced | Screen readers miss state changes |
| 3.2 | Checkout forms not using `<form>` | No native Enter-to-submit |
| 3.3 | Token language confuses buyers | Users cannot access their orders |
| 4.1 | Nav buttons below 44px touch target | Difficult to tap on mobile |
| 5.1 | No pickup info on checkout success | Users don't know when/where to pick up |

### Nice to Have (Polish)

| # | Issue | Impact |
|---|-------|--------|
| 8.5 | `cadenceLabel()` duplicated 5 times | Code maintainability |
| 9.1 | `document.title` via useEffect | Title flashes, poor SEO |
| 9.2 | Toast has no entrance animation | Feels abrupt |
| 9.5 | No unsaved changes warning | Silent data loss |
| 9.6 | No `prefers-reduced-motion` | Motion sensitivity |

---

## Appendix: Design System Inventory

### CSS Custom Properties (from `globals.css`)

| Token | Value | Usage |
|-------|-------|-------|
| `--lr-bg` | `#f6f1e8` | Page background (sand) |
| `--lr-ink` | `#1c1b16` | Primary text |
| `--lr-muted` | `#5a5549` | Secondary text (needs darkening) |
| `--lr-card` | `rgba(255,255,255,0.78)` | Card backgrounds |
| `--lr-card-strong` | `rgba(255,255,255,0.92)` | Elevated card backgrounds |
| `--lr-border` | `rgba(38,28,10,0.12)` | Borders |
| `--lr-leaf` | `#2f6b4f` | Primary accent (sage green) |
| `--lr-clay` | `#b35d2e` | Warning/inactive accent |
| `--lr-water` | `#1f6c78` | Secondary accent (used in gradients) |

### Component Classes

| Class | Purpose |
|-------|---------|
| `.lr-btn` | Pill-shaped button base |
| `.lr-btn-primary` | Green gradient primary button |
| `.lr-card` | Frosted glass card |
| `.lr-card-strong` | More opaque card variant |
| `.lr-chip` | Inline badge/tag |
| `.lr-field` | Form input base |
| `.lr-animate` | Fade-up entrance animation |

### Fonts

| Font | Variable | Usage |
|------|----------|-------|
| Spline Sans | `--font-lr-sans` | Body text |
| Fraunces | `--font-lr-serif` | Headings, brand name |
| Geist Mono | `--font-geist-mono` | Code, IDs |
