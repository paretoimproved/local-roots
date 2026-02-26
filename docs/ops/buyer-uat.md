# Buyer UAT — Chrome Agent Scripts

Post-fix verification for the 2/23 buyer UAT (commits `a635992` + `c69c8dd`).
Designed for a Claude agent controlling Chrome via computer use.

**Site:** `https://local-roots.vercel.app`

## Test Data

| Key | Value |
|-----|-------|
| Store ID | `b03db2d7-26c8-4a9b-9883-04b433585561` |
| Plan ID | `0094605f-f1da-49b6-811c-28ae698d7363` |
| Store name | Eugene garden supply |
| Box plan | Weekly Farm Box, $25.00/week |
| Pickup location | Brandon's house, 1497 Mesa Avenue, Eugene, OR 97405 |
| Seller account | brandonq812@gmail.com |
| Store detail URL | `/stores/b03db2d7-26c8-4a9b-9883-04b433585561` |
| Box detail URL | `/boxes/0094605f-f1da-49b6-811c-28ae698d7363` |

---

## 1. Homepage

1. Navigate to `https://local-roots.vercel.app`.
2. Verify:
   - A **hero image** is visible above the fold.
   - A **"How it works"** section is present with numbered steps.
   - A **featured farms** section shows at least one store card.
   - A **seller pitch** section is present (e.g. "Start selling" or "List your farm").
   - A **footer** is visible at the bottom of the page.
3. **Pass:** All five elements are present and render correctly. No broken images, no layout shifts.

---

## 2. Store Discovery

1. Navigate to `https://local-roots.vercel.app/stores`.
2. Verify:
   - Page heading reads **"Farms"**.
   - Radius selector defaults to **25 mi**.
   - Search input placeholder reads **"Your city or zip code"**.
   - Store cards are **fully clickable** (entire card area, not just the name link).
   - Hovering a store card produces a **lift/shadow effect**.
   - Recently created stores show a **"New"** badge.
   - Cards do **NOT** show an "Added" date or "Added on..." text.
   - The counter text reads **"N farms nearby"** — it only appears when a search/location is active.
3. **Pass:** All assertions above hold. Cards navigate to the correct store detail page on click.

---

## 3. Store Detail

1. Navigate to `https://local-roots.vercel.app/stores/b03db2d7-26c8-4a9b-9883-04b433585561`.
2. Verify:
   - A **breadcrumb** is visible: **Farms → Eugene garden supply** (with "Farms" linking to `/stores`).
   - The `<h1>` heading shows the **store name** (e.g. "Eugene garden supply"), NOT a raw UUID.
   - A **description** paragraph is visible below the heading.
   - A **"Pickup locations"** section is present with at least one location card.
   - Each location card shows the **address** as a link (to Google Maps directions).
   - If the seller uploaded a pickup spot photo, it appears on the location card. Otherwise, if a Google Maps API key is configured, a **static map image** is visible.
   - **Upcoming pickups** are listed under each location with formatted dates/times (timezone abbreviated, e.g. "PST" not "America/Los_Angeles").
   - A **"What's available"** section shows subscription box cards (with image, price, cadence, next pickup) and/or walk-up items.
   - Subscription box cards have a **"Subscribe"** button and link to `/boxes/{planId}`.
   - A **footer** is present at the bottom of the page.
3. **Pass:** Breadcrumb present, store name is human-readable, pickup locations with maps render, subscription boxes shown, footer renders.

---

## 4. Box Detail

1. Navigate to `https://local-roots.vercel.app/boxes/0094605f-f1da-49b6-811c-28ae698d7363`.
2. Verify:
   - A **breadcrumb** is visible reading **"Eugene garden supply → Weekly Farm Box"** (or similar with the store name linking back).
   - There is **NO** "Browse stores" button on this page.
   - The policies section says **"Skip before cutoff. Seller cancels: full refund."** — it does NOT contain the phrase "card billing".
   - There is **NO** visible capacity number (e.g. "10 spots", "5/10 remaining").
3. **Pass:** Breadcrumb correct, no "Browse stores" button, policy text matches, no capacity number shown.

---

## 5. Subscribe Flow

1. Navigate to `https://local-roots.vercel.app/boxes/0094605f-f1da-49b6-811c-28ae698d7363`.
2. In the subscribe form, enter an **email address** (use a real test email).
3. Click **"Start subscription"**.
4. Verify:
   - The button changes to **disabled** state with text **"Complete payment below"** (or similar disabled CTA).
   - A Stripe PaymentElement iframe loads below.
5. **⏸ PAUSE** — Human must manually enter credit card details in the Stripe iframe and click authorize.
6. After successful payment, verify:
   - Heading reads **"You're in!"**.
   - Subtext says **"Welcome to Weekly Farm Box"** (uses the plan name, not a raw ID).
   - There is **NO** raw subscription UUID visible in the confirmation text.
   - A **pickup code card** is present with a **green highlight** (green border or green background accent).
7. **Pass:** Confirmation shows friendly copy, pickup code has green treatment, no raw UUIDs in body text.

---

## 6. Order Page

1. From the subscribe confirmation (test 5), click the **"View first order"** link. Alternatively, navigate to the order URL from the confirmation email.
2. Verify:
   - The page heading shows the **product title** (e.g. "Weekly Farm Box"), NOT the word "Order" as a standalone heading.
   - The pickup date is **formatted** as a human-readable date (e.g. "Sat, Mar 1, 2026"), not an ISO timestamp.
   - The raw order **UUID is tucked inside a `<details>` disclosure** element (collapsed by default) — it should NOT be shown prominently.
   - A **footer** is present at the bottom of the page.
3. **Pass:** Heading is the product name, date is formatted, UUID is in a disclosure, footer renders.

---

## 7. Buyer Auth & Nav State

### 7a. Sign in

1. Navigate to `https://local-roots.vercel.app/buyer/login`.
2. Enter an email that has an existing subscription/order.
3. Click **"Send sign-in link"**.
4. **⏸ PAUSE** — Human must open their email, find the magic link, and click it (or paste the URL into Chrome).
5. After redirect, verify:
   - The browser has navigated to `/buyer`.
   - The nav bar shows **"My pickups"** link (NOT "Sign in").

### 7b. Dashboard

1. On `/buyer`, verify three sections:
   - **"Active Subscriptions"** — shows at least one subscription card.
   - **"Upcoming Pickups"** — shows upcoming orders (if any).
   - **"Past Orders"** — shows completed/canceled orders (if any).
2. **Pass:** All three section headings render. Subscription card shows plan name, price, and status.

### 7c. Sign out

1. Click **"Sign out"** in the nav bar.
2. Verify:
   - Nav reverts to showing **"Sign in"** (not "My pickups").
   - The page does **NOT** do a full reload — the transition is client-side.
3. **Pass:** Nav state toggles without page refresh.

---

## 8. Subscription Management

1. Sign in as a buyer (see test 7a, **⏸ PAUSE** for magic link).
2. Navigate to the buyer dashboard at `/buyer`.
3. Click into an active subscription.
4. Verify:
   - Status badge is **colored**: green for "active", amber/yellow for "paused".

### 8a. Pause

1. Click **"Pause"** (or "Pause subscription").
2. Verify:
   - A **toast notification** appears saying **"Subscription paused"**.
   - The status badge changes to **amber/yellow** with text "paused".

### 8b. Resume

1. Click **"Resume"** (or "Resume subscription").
2. Verify:
   - A **toast notification** appears saying **"Subscription resumed"**.
   - The status badge changes back to **green** with text "active".
3. **Pass:** Both pause and resume produce toast feedback, badge color matches status.

### 8c. Cancel — pause offer (step 1)

1. Click **"Cancel"** on an active subscription.
2. Verify:
   - A dialog opens with heading **"Before you go..."**.
   - Body text asks **"Would you like to pause your subscription instead?"**.
   - A **"Pause subscription"** button (primary) and a **"No, cancel my subscription"** text link are visible.
   - No red/destructive button on this step.
3. **Pass:** Step 1 offers pause as an alternative before showing cancel.

### 8d. Cancel — pause from step 1

1. In the pause-offer dialog from 8c, click **"Pause subscription"**.
2. Verify:
   - Dialog closes.
   - A **toast notification** appears saying **"Subscription paused"**.
   - Status badge changes to **amber/yellow** with text "paused".
3. **Pass:** Pause works from the cancel retention dialog.

### 8e. Cancel — exit survey (step 2)

1. Click **"Cancel"** on an active subscription to open the dialog.
2. Click **"No, cancel my subscription"** to advance to step 2.
3. Verify:
   - Heading changes to **"We're sorry to see you go"**.
   - Five radio options appear: Too expensive, Too much food, Moving / can't pick up, Quality issues, Other.
   - First option (**"Too expensive"**) is pre-selected.
   - A red **"Cancel subscription"** button is visible.
   - A **"Go back"** text link is visible.
4. Click **"Go back"** — verify it returns to step 1 (pause offer).
5. **Pass:** Exit survey shows radio options and allows going back.

### 8f. Cancel — confirm cancel (step 2)

1. Repeat steps from 8e to reach the exit survey.
2. Select a different reason (e.g. **"Quality issues"**).
3. Click **"Cancel subscription"** (red button).
4. Verify:
   - Dialog closes.
   - A **toast notification** appears saying **"Subscription canceled"**.
   - Status badge shows **"canceled"**.
   - The **"Cancel"** button no longer appears on the page.
5. **Pass:** Cancel completes, status updates, cancel button removed.

### 8g. Escape key dismisses dialog

1. Click **"Cancel"** to open the dialog.
2. Press **Escape**.
3. Verify:
   - Dialog closes.
   - Status remains **"active"**.
   - No toast notification fires.
4. **Pass:** Escape dismisses without side effects.

---

## 9. Seller Page Checks

### 9a. Login

1. Navigate to `https://local-roots.vercel.app/seller/login`.
2. **⏸ PAUSE** — Human must log in as `brandonq812@gmail.com` (password or Google OAuth).

### 9b. Single log out button

1. Navigate to `/seller`.
2. Verify:
   - There is exactly **one "Log out" button** and it is in the **nav bar** (top of page).
   - There is **NO** duplicate "Log out" button in the page body content.

### 9c. Wrong store redirect

1. Navigate to `https://local-roots.vercel.app/seller/stores/00000000-0000-0000-0000-000000000000` (a store ID that does not belong to this seller).
2. Verify:
   - The page **redirects** to `/seller`.
   - A **toast notification** appears with an error/warning message (e.g. "Store not found" or "Access denied").
3. **Pass:** Redirect happens, toast shown, no raw error page.

---

## 10. Error Handling

### 10a. No raw JSON errors

1. Throughout all previous tests, verify:
   - At no point was a raw JSON error message displayed to the user (e.g. `{"error":"..."}` or `API 503: {"error":...}`).
   - All error states show **friendly, human-readable messages**.

### 10b. Forbidden resource

1. Navigate to a URL for a resource the current user should not access (e.g. another seller's store management page while logged in as a different seller).
2. Verify:
   - The page shows a **friendly error message** (e.g. "You don't have access to this page" or a redirect with toast).
   - The page does **NOT** display raw status codes or JSON payloads.

### 10c. API unavailable

1. If testable: trigger a backend error (e.g. navigate to a page while the API is temporarily unreachable).
2. Verify:
   - The error message is **user-friendly** (e.g. "Something went wrong. Please try again.").
   - The page does **NOT** show `API 503: {"error":...}` or similar raw formats.
3. **Pass:** All error states across the entire UAT session used friendly messages — no raw JSON, no raw status codes.

---

## Summary Checklist

| # | Test | Result |
|---|------|--------|
| 1 | Homepage | ▢ Pass / ▢ Fail |
| 2 | Store Discovery | ▢ Pass / ▢ Fail |
| 3 | Store Detail | ▢ Pass / ▢ Fail |
| 4 | Box Detail | ▢ Pass / ▢ Fail |
| 5 | Subscribe Flow | ▢ Pass / ▢ Fail |
| 6 | Order Page | ▢ Pass / ▢ Fail |
| 7 | Buyer Auth & Nav State | ▢ Pass / ▢ Fail |
| 8 | Subscription Management | ▢ Pass / ▢ Fail |
| 9 | Seller Page Checks | ▢ Pass / ▢ Fail |
| 10 | Error Handling | ▢ Pass / ▢ Fail |
