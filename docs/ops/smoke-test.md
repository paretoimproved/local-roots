# Smoke Test (MVP)

Run this checklist before inviting real sellers/buyers.
Each scenario includes exact steps, URLs, and expected results.

**Env:** `FRONTEND` = your frontend URL, `API` = your backend URL.
Local defaults: `http://localhost:3000` / `http://localhost:8080`.

---

## 1. Seller Onboarding

### 1a. Register

1. Go to `FRONTEND/seller/register`.
2. Verify heading reads **"Create seller account"**.
3. Fill **Display name** → `Smoke Test Farmer`.
4. Fill **Email** → a fresh test email.
5. Fill **Password** → 8+ characters.
6. Click **"Create account"**.
7. **Expected:** Redirect to `/seller`. Heading reads **"Seller"**. "Your stores" section is visible.

### 1b. Create store

1. On `/seller`, locate the **"Create a store"** section.
2. Fill **Name** → `Sunny Acres Farm`.
3. Fill **Description** → `Fresh veggies every Saturday`.
4. Fill **Phone** → `555-0100` (optional).
5. Click **"Create store"**.
6. **Expected:** Store appears in "Your stores" list with a **"Manage"** link.

### 1c. Setup wizard — Location

1. Click **"Manage"** on the new store, then follow the redirect to `/seller/stores/{storeId}/setup/location`.
2. Verify heading: **"Where will customers pick up their box?"**
3. Click the **"Pickup address"** field and type a real address (e.g. `123 Main St, Sacramento, CA`).
4. Select a result from the autocomplete dropdown.
5. **Expected:** A confirmation card appears showing the formatted address and auto-detected timezone (e.g. `America/Los_Angeles`).
6. (Optional) Fill **"Spot name"** → `Farm Stand`.
7. If timezone was not auto-detected, a **"Timezone"** combobox appears — select one manually.
8. Click **"Continue"**.
9. **Expected:** Redirect to `/seller/stores/{storeId}/setup/box`.

### 1d. Setup wizard — Box

1. On `/seller/stores/{storeId}/setup/box`, verify heading: **"Build your first farm box"**.
2. Verify **"Box name"** is pre-filled with `Weekly Farm Box` (default).
3. Fill **"Price per box"** → `25.00`.
4. Under **"How often?"**, click **"Every week"** (should highlight green).
5. Fill **"How many customers?"** → `10`.
6. Verify **"When's your first pickup?"** has a default (next Saturday 10:00 AM).
7. Click **"Continue →"**.
8. **Expected:** Redirect to `/seller/stores/{storeId}/setup/review`.

### 1e. Review — Payout gate

1. On `/seller/stores/{storeId}/setup/review`, verify heading: **"You're ready to start selling!"**
2. Verify **"PICKUP SPOT"** card shows the address from step 1c.
3. Verify **"YOUR BOX"** card shows `Weekly Farm Box`, `$25.00`, `Weekly`, cap `10`, and the first pickup date.
4. Verify **"CUSTOMER PREVIEW"** card shows a QR code and shareable URL.
5. **Expected (no Stripe Connect):** An amber warning card reads **"Set up payouts first"** with a sub-message about connecting a bank account. A **"Set up payouts"** link is visible. The **"Start selling"** button is NOT visible.

### 1f. Review — Go live (requires Stripe Connect active)

1. Complete Stripe Connect onboarding for the store (out of scope for automation — manual Stripe dashboard step).
2. Return to `/seller/stores/{storeId}/setup/review`.
3. **Expected:** The amber payout gate is gone. A **"Start selling"** button is visible.
4. Click **"Start selling"**.
5. **Expected:** Celebration view appears: green checkmark, heading **"You're live!"**, QR code (180px), shareable URL, **"Copy link"** button, and **"Go to dashboard"** link.

---

## 2. Subscription Happy Path (Card)

### 2a. Buyer views plan page

1. Copy the shareable URL from the seller's review/dashboard page (or go to `FRONTEND/boxes/{planId}`).
2. **Expected:** Page shows plan title **"Weekly Farm Box"**, price, cadence, and a **"Pickup details"** card with address and next pickup date.
3. Verify **"Subscribe"** section is visible with Email, Name, and Phone fields.

### 2b. Buyer subscribes with card

1. On the plan page, fill **Email** → a fresh buyer email.
2. (Optional) Fill **Name** and **Phone**.
3. Click **"Start subscription"**.
4. **Expected:** A Stripe PaymentElement iframe loads below the button.
5. Inside the Stripe iframe:
   - Fill **Card number** → `4242 4242 4242 4242`.
   - Fill **Expiry** → `12/30`.
   - Fill **CVC** → `123`.
6. Click the **"Authorize"** button.
7. **Expected (within 30s):** Confirmation view appears with heading **"Subscription started"**, subscription ID, and message about the first order.

### 2c. Confirmation links work

1. From the confirmation view, verify two links are present:
   - **"View first order"** → opens `/orders/{orderId}?t={token}`.
   - **"Manage subscription"** → opens `/subscriptions/{subscriptionId}?t={token}`.
2. Click **"View first order"**.
3. **Expected:** Order page loads showing status, total, items, and pickup code.
4. Go back, click **"Manage subscription"**.
5. **Expected:** Subscription page loads showing plan name, price, cadence, next pickup, and status **"active"**.

---

## 3. Cycle Generation

### 3a. Seller generates next cycle

1. Go to `FRONTEND/seller/stores/{storeId}` (seller dashboard).
2. Under **"Subscription boxes"**, find the plan card for **"Weekly Farm Box"**.
3. Verify a status badge shows **"live"** (green).
4. Click **"Generate next cycle"** button.
5. **Expected:** Button text changes briefly (loading state), then the dashboard refreshes. A new pickup window appears in the window selector dropdown.

### 3b. Orders appear as "placed"

1. After cycle generation (and with at least one active subscriber), select the newly generated pickup window from the dropdown.
2. Scroll to the **"Orders"** section.
3. **Expected:** Orders list shows subscriber orders with:
   - Buyer email visible.
   - Status pill reads **"placed"**.
   - Total amount shown.

---

## 4. Pickup Confirmation

### 4a. Seller marks order "ready"

1. On the seller dashboard, select a pickup window with placed orders.
2. In the orders list, find an order with status **"placed"**.
3. Click **"Mark ready"** on that order.
4. **Expected:** Order status pill changes to **"ready"**. A **"Pickup code"** input field and **"Confirm pickup"** button appear. **"Scan QR"** and **"No show"** buttons also appear.

### 4b. Seller confirms pickup with code

1. On the now-ready order, locate the **"Pickup code"** input (placeholder: `123456`).
2. Enter the buyer's 6-digit pickup code (shown on the buyer's order page or confirmation email).
3. Click **"Confirm pickup"**.
4. **Expected:** Order status changes to **"picked_up"**. Payment status changes to **"paid"**.

### 4c. Buyer sees "picked up" on order page

1. Open the buyer's order page: `FRONTEND/orders/{orderId}?t={token}`.
2. **Expected:** Status shows **"picked up"**. A **"Leave a review"** section appears with Rating dropdown and Comment textarea.

---

## 5. No-Show

### 5a. Seller marks order as no-show (charge fee)

1. On the seller dashboard, select a pickup window with a **"ready"** order.
2. Click **"No show (charge fee)"** on the order.
3. **Expected:** Order status changes to **"no_show"**. A captured fee amount appears on the order card (e.g. `$X.XX` no-show fee).

### 5b. Buyer sees no-show status

1. Open the buyer's order page: `FRONTEND/orders/{orderId}?t={token}`.
2. **Expected:** Status shows **"no show"**. The fee amount is visible.

### 5c. No-show with waive (repeat)

1. Create another ready order (or use a different one).
2. Click **"No show (waive)"** on the seller dashboard.
3. **Expected:** Order status changes to **"no_show"**. Payment status shows **"voided"** (no fee captured).

---

## 6. Cancel Order

### 6a. Seller cancels a placed order

1. On the seller dashboard, select a pickup window with a **"placed"** order.
2. Click **"Cancel"** (rose-colored text) on the order.
3. **Expected:** Order status changes to **"canceled"**.

### 6b. Buyer sees canceled status

1. Open the buyer's order page: `FRONTEND/orders/{orderId}?t={token}`.
2. **Expected:** Status shows **"canceled"**.

---

## 7. Buyer Magic Link

### 7a. Request magic link

1. Go to `FRONTEND/buyer/login`.
2. Verify heading reads **"Sign in"** and subtext mentions "sign-in link" and "No password needed."
3. Fill **Email** → a buyer email that has placed at least one order.
4. Click **"Send sign-in link"**.
5. **Expected:** View changes to heading **"Check your email"**, showing the submitted email and a message "It expires in 15 minutes."

### 7b. Verify magic link token

1. Retrieve the magic link from the buyer's email inbox (or query `magic_link_tokens` table if testing locally).
2. The link format is: `FRONTEND/buyer/auth/verify?token={magic_token}`.
3. Open that URL in the browser.
4. **Expected:** Brief "Signing you in..." message, then redirect to `/buyer`. Heading reads **"My pickups"** with the buyer's email shown.

### 7c. Dashboard shows orders and subscriptions

1. On the buyer dashboard (`/buyer`), verify sections appear:
   - **"Active subscriptions"** (if the buyer has any) — shows plan title, cadence, price, status badge.
   - **"Upcoming pickups"** — shows orders with status "placed" or "ready", pickup date, pickup code, and total.
   - **"Past orders"** (if any) — shows completed/canceled orders.
2. Click on an order or subscription to verify the link navigates to the correct detail page.

### 7d. Sign out

1. On the buyer dashboard, click **"Sign out"** (top right).
2. **Expected:** Buyer token is cleared from localStorage. Page redirects or shows unauthenticated state. Navigating back to `/buyer` does NOT show the dashboard (prompts login instead).

---

## 8. Token URL Compatibility

### 8a. Order with token

1. Go to `FRONTEND/orders/{orderId}?t={valid_token}`.
2. **Expected:** Order detail page loads showing:
   - Status (placed/ready/picked_up/etc.)
   - Total amount
   - Line items (product, quantity, price)
   - Pickup code (if applicable)
   - Payment info

### 8b. Subscription with token

1. Go to `FRONTEND/subscriptions/{subscriptionId}?t={valid_token}`.
2. **Expected:** Subscription page loads showing:
   - Plan name and price/cadence
   - Next pickup date and location
   - Status (active/paused/canceled)
   - Action buttons (Pause, Cancel, Update card)

### 8c. Order without token — input prompt

1. Go to `FRONTEND/orders/{orderId}` (no `?t=` param, no buyer auth).
2. **Expected:** Page shows an **"Access token"** section with:
   - Message: "Paste the token from your confirmation (or add `?t=...` to the URL)."
   - A text input with placeholder **"token"**.
   - A **"Load"** button.
3. Paste a valid token into the input and click **"Load"**.
4. **Expected:** Order details load as in 8a.

---

## 9. Card Checkout (One-Time Purchase)

### 9a. Buyer checks out with card

1. Go to `FRONTEND/pickup-windows/{pickupWindowId}` (a window with active offerings).
2. Verify offerings are listed with product title, price, unit, and availability count.
3. Set quantity for at least one item (e.g. `2`).
4. Fill **Email** → a fresh buyer email.
5. Under **"Payment method"**, select **"Pay with card"**.
6. Click **"Continue to payment"**.
7. **Expected:** Stripe PaymentElement iframe loads.
8. Fill card details: `4242 4242 4242 4242`, `12/30`, `123`.
9. Click **"Authorize"**.
10. **Expected (within 30s):** Confirmation view: heading **"Order placed"**, order ID, total, **"View order"** link, and **"Copy access link"** button. Payment method shows **"Card (authorized, captured on pickup)"**.

### 9b. Total includes buyer fee

1. On the checkout page, select items and fill email.
2. Verify the **"Total"** display updates in real-time as quantities change.
3. **Expected:** Total = sum of (quantity × price) for each item. Service fee line is shown (either "Calculated at checkout" or the actual amount once checkout starts).

---

## 10. Pay at Pickup

### 10a. Buyer places pay-at-pickup order

1. Go to `FRONTEND/pickup-windows/{pickupWindowId}`.
2. Set quantity for at least one item.
3. Fill **Email**.
4. Under **"Payment method"**, select **"Pay at pickup"** (should be the default).
5. Click **"Place order"**.
6. **Expected:** Confirmation view: heading **"Order placed"**, order ID, total.

### 10b. Confirmation details

1. On the confirmation view, verify:
   - Payment method shows **"Pay at pickup"**.
   - **"View order"** link is present.
   - **"Copy access link"** button is present.
   - **"Save your access link"** message is visible.

### 10c. Copy access link

1. Click **"Copy access link"**.
2. **Expected:** Button text changes to **"Copied"**.
3. Paste clipboard contents into browser address bar.
4. **Expected:** Opens the order detail page (`/orders/{orderId}?t={token}`) showing full order details.

---

## 11. Edge Cases

### 11a. Registration — password too short

1. Go to `FRONTEND/seller/register`.
2. Fill **Display name** → `Test`.
3. Fill **Email** → a valid email.
4. Fill **Password** → `short` (fewer than 8 characters).
5. Click **"Create account"**.
6. **Expected:** Browser validation prevents submission (HTML5 `minLength=8` on the password field). No redirect occurs.

### 11b. Login — wrong credentials

1. Go to `FRONTEND/seller/login`.
2. Fill **Email** → any email.
3. Fill **Password** → `WrongPassword123!`.
4. Click **"Sign in"**.
5. **Expected:** A rose/pink error banner appears (`.bg-rose-50`) with an error message (e.g. "Invalid email or password"). No redirect occurs.

### 11c. Checkout — no items selected

1. Go to `FRONTEND/pickup-windows/{pickupWindowId}`.
2. Fill **Email** but leave all item quantities at `0`.
3. Select **"Pay at pickup"**.
4. **Expected:** The **"Place order"** button is **disabled** (grayed out, `opacity-50`). Cannot submit.

### 11d. Checkout — no email

1. Go to `FRONTEND/pickup-windows/{pickupWindowId}`.
2. Set quantity for an item to `1` but leave **Email** empty.
3. **Expected:** The **"Place order"** button is **disabled**. Cannot submit.

### 11e. Subscribe — plan not live

1. Go to `FRONTEND/boxes/{planId}` where the plan has NOT had a cycle generated (i.e. `is_live = false`).
2. **Expected:**
   - An amber warning box reads **"This box is not live yet. Check back soon, or scan the farmstand QR once the seller goes live."**
   - The **"Start subscription"** button is **disabled**.
   - Cannot proceed with subscription.

---

## Failure Modes

- **Backend returns 502:** Check Railway logs for migration failures and missing env vars.
- **Webhook not configured:** `/v1/stripe/webhook` returns `503` until `STRIPE_WEBHOOK_SECRET` is set.
- **Stripe PaymentElement doesn't load:** Verify `NEXT_PUBLIC_STRIPE_PK` is set in frontend env and matches the backend's `STRIPE_SECRET_KEY` (same Stripe account, test vs live mode).
- **Address autocomplete doesn't work:** Verify `GOOGLE_PLACES_API_KEY` is set in backend env and the Places API is enabled in Google Cloud Console.
