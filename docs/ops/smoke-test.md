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

### 1e. Setup wizard — Payouts (embedded Connect onboarding)

1. After box setup, the wizard redirects to `/seller/stores/{storeId}/setup/payouts`.
2. Verify heading: **"Get paid for your harvest"**.
3. Verify CTA button reads **"Connect your bank account"**.
4. Click **"Connect your bank account"**.
5. **Expected:** Button shows **"Setting up..."** briefly, then the page transitions to heading **"Complete your Stripe setup"** with an embedded Stripe onboarding form rendered inline (no popup, no new tab).
6. Complete the embedded Stripe onboarding form (test mode: use test data).
7. **Expected:** On completion, the form disappears and a success view appears: green checkmark, heading **"Payouts connected"**, message **"Your bank account is set up."**, and a **"Continue"** button.
8. Click **"Continue"**.
9. **Expected:** Redirect to `/seller/stores/{storeId}/setup/review`.

### 1f. Review — Payout gate

1. On `/seller/stores/{storeId}/setup/review`, verify heading: **"You're ready to start selling!"**
2. Verify **"PICKUP SPOT"** card shows the address from step 1c.
3. Verify **"YOUR BOX"** card shows `Weekly Farm Box`, `$25.00`, `Weekly`, cap `10`, and the first pickup date.
4. Verify **"CUSTOMER PREVIEW"** card shows a QR code and shareable URL.
5. **Expected (no Stripe Connect):** An amber warning card reads **"Set up payouts first"** with a sub-message about connecting a bank account. A **"Set up payouts"** link is visible. The **"Start selling"** button is NOT visible.

### 1g. Review — Go live (requires Stripe Connect active)

1. If Connect was completed in step 1e, the payout gate should already be cleared.
2. **Expected:** A **"Start selling"** button is visible (no amber warning).
3. Click **"Start selling"**.
4. **Expected:** Celebration view appears: green checkmark, heading **"You're live!"**, QR code (180px), shareable URL, **"Copy link"** button, and **"Go to dashboard"** link.

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
4. **Expected:** Order status pill changes to **"ready"**. A **"Pickup code"** input field and **"Confirm"** button appear. **"No show"** buttons also appear.

### 4b. Seller confirms pickup with manual code entry

1. On a ready order, locate the **"Pickup code"** input (placeholder: `123456`).
2. Enter the buyer's 6-digit pickup code (shown on the buyer's order page or confirmation email).
3. Click **"Confirm"**.
4. **Expected:** Order status changes to **"picked_up"**. Payment status changes to **"paid"**.

### 4c. Buyer sees "picked up" on order page

1. Open the buyer's order page: `FRONTEND/orders/{orderId}?t={token}`.
2. **Expected:** Status shows **"Picked up"** (human-readable, not `picked_up`). A **"Leave a review"** section appears with Rating dropdown and Comment textarea.
3. **Expected:** The PickupCodeCard shows heading **"Pickup confirmed"** with message "This order has been marked as picked up." The 6-digit code chip, copy button, QR image, and info note are **hidden**.

### 4d. QR scan pickup via native camera (placed or ready → picked_up)

1. On the **buyer's** order page, verify the QR code encodes a **URL** (not a `LR|...` payload). Inspect it — it should be `FRONTEND/pickup/confirm?order={orderId}&code={pickupCode}`.
2. On the **seller's** phone, open the native camera app and scan the buyer's QR code.
3. **Expected:** The phone opens the URL in a browser → `FRONTEND/pickup/confirm?order=...&code=...`.
4. If the seller is not logged in, they are redirected to `/seller/login?next=...`. After logging in, they return to the confirm page.
5. **Expected:** A review screen shows:
   - Heading **"Confirm pickup"** with the store name.
   - Buyer name/email.
   - Product items with quantity and price.
   - Fee breakdown (subtotal, service fee if applicable, total).
   - Payment status line (e.g. **"Card authorized ✓"**).
6. Click **"Confirm & capture payment"**.
7. **Expected:** Button shows **"Processing..."** (disabled), then a success screen appears:
   - Green checkmark + heading **"Pickup confirmed"**.
   - Product items with quantities.
   - Payment captured amount and seller payout amount.
   - Buyer name and confirmation timestamp.
   - **"Back to orders"** link → `/seller`.

### 4e. QR scan — already picked up

1. Re-open the same QR URL from step 4d (the order that was just confirmed).
2. **Expected:** Page shows **"Already picked up"** with the timestamp when it was confirmed. A **"Back to orders"** link is present.

### 4f. QR scan — cancelled order

1. Cancel an order from the seller dashboard, then open its QR URL.
2. **Expected:** Page shows **"Order cancelled"** with message "This order was cancelled." and a **"Back to seller dashboard"** link.

### 4g. QR scan — wrong store (different seller)

1. Log in as a different seller and open a QR URL for an order belonging to another store.
2. **Expected:** Page shows **"This order belongs to a different store."** with a link back to `/seller`.

### 4h. QR scan — invalid code

1. Open `FRONTEND/pickup/confirm?order={validOrderId}&code=000000` (wrong code).
2. **Expected:** Page shows **"Invalid pickup code. Ask the buyer to show their code again."**

### 4i. Manual code entry for placed orders

1. On the seller dashboard, find an order with status **"placed"**.
2. Verify a **"Pickup code"** input and **"Confirm"** button appear (same as for ready orders).
3. Enter the buyer's 6-digit code and click **"Confirm"**.
4. **Expected:** Order jumps directly from **"placed"** to **"picked_up"**. Payment captured.

### 4j. No in-browser QR scanner

1. On the seller dashboard, verify there is **NO** "Scan pickup" button and **NO** "Scan QR" buttons on individual orders.
2. The orders heading note reads: **"Scan the buyer's QR with your phone camera, or enter the code manually."**

---

## 5. No-Show

> **Policy (Feb 2026):** No additional no-show fee is charged. The buyer forfeits the box and the card authorization is voided. Set `NO_SHOW_FEE_CENTS=0` in production to match this policy.

### 5a. Seller marks order as no-show

1. On the seller dashboard, select a pickup window with a **"ready"** order.
2. Click **"No show"** on the order.
3. **Expected:** Order status changes to **"no_show"**. Payment status shows **"voided"** (authorization released, no fee captured).

### 5b. Buyer sees no-show status

1. Open the buyer's order page: `FRONTEND/orders/{orderId}?t={token}`.
2. **Expected:** Status shows **"no show"**. No fee line item appears.

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
2. Verify a breadcrumb is visible: **Farms → {store name} → {date} pickup**.
3. Verify the heading shows the **store name** (not a raw UUID) with the pickup date/time below.
4. Verify offerings are listed with product title, price, unit, and availability count.
5. Set quantity for at least one item (e.g. `2`).
6. Fill **Email** → a fresh buyer email.
7. Click **"Continue to payment"** (card is the only payment method — no payment method toggle).
8. **Expected:** Stripe PaymentElement iframe loads.
9. Fill card details: `4242 4242 4242 4242`, `12/30`, `123`.
10. Click **"Authorize"**.
11. **Expected (within 30s):** Confirmation view: heading **"Order placed"**, order ID, total, **"View order"** link, and **"Copy access link"** button. Payment method shows **"Card (authorized, captured on pickup)"**.

### 9b. Total includes buyer fee

1. On the checkout page, select items and fill email.
2. Verify the **"Total"** display updates in real-time as quantities change.
3. **Expected:** Total = sum of (quantity × price) for each item. Service fee line is shown (either "Calculated at checkout" or the actual amount once checkout starts).

---

## 10. Edge Cases

### 10a. Registration — password too short

1. Go to `FRONTEND/seller/register`.
2. Fill **Display name** → `Test`.
3. Fill **Email** → a valid email.
4. Fill **Password** → `short` (fewer than 8 characters).
5. Click **"Create account"**.
6. **Expected:** Browser validation prevents submission (HTML5 `minLength=8` on the password field). No redirect occurs.

### 10b. Login — wrong credentials

1. Go to `FRONTEND/seller/login`.
2. Fill **Email** → any email.
3. Fill **Password** → `WrongPassword123!`.
4. Click **"Sign in"**.
5. **Expected:** A rose/pink error banner appears (`.bg-rose-50`) with an error message (e.g. "Invalid email or password"). No redirect occurs.

### 10c. Checkout — no items selected

1. Go to `FRONTEND/pickup-windows/{pickupWindowId}`.
2. Fill **Email** but leave all item quantities at `0`.
3. **Expected:** The **"Continue to payment"** button is **disabled** (grayed out, `opacity-50`). Cannot submit.

### 10d. Checkout — no email

1. Go to `FRONTEND/pickup-windows/{pickupWindowId}`.
2. Set quantity for an item to `1` but leave **Email** empty.
3. **Expected:** The **"Continue to payment"** button is **disabled**. Cannot submit.

### 10e. Subscribe — plan not live

1. Go to `FRONTEND/boxes/{planId}` where the plan has NOT had a cycle generated (i.e. `is_live = false`).
2. **Expected:**
   - An amber warning box reads **"This box is not live yet. Check back soon, or scan the farmstand QR once the seller goes live."**
   - The **"Start subscription"** button is **disabled**.
   - Cannot proceed with subscription.

---

## 11. P0 Money-Safety Verification

These tests verify the 6 critical payment-safety fixes. Run after any change to checkout-form, subscribe-form, or stripe-card-auth.

**Prerequisite:** A live store with Stripe Connect active, at least one subscription plan with a generated cycle, and offerings in a pickup window.

### 11a. Double-click prevention — one-time checkout

1. Go to `FRONTEND/pickup-windows/{pickupWindowId}`.
2. Set quantity for an item, fill **Email**.
3. **Rapidly double-click** the **"Continue to payment"** button.
4. **Expected:** Only ONE Stripe PaymentElement iframe appears. No duplicate intents. Check the Stripe Dashboard → Payments — only one `requires_capture` PaymentIntent should exist for this amount.

### 11b. Double-click prevention — subscription

1. Go to `FRONTEND/boxes/{planId}` (live plan).
2. Fill **Email**, then **rapidly double-click** **"Start subscription"**.
3. **Expected:** Only ONE Stripe element loads. Stripe Dashboard shows only one intent.

### 11c. Form locking after checkout — one-time

1. Go to `FRONTEND/pickup-windows/{pickupWindowId}`.
2. Set quantity `2` for an item, fill **Email**.
3. Click **"Continue to payment"**.
4. **Expected:** After Stripe element loads:
   - Quantity input is **disabled** (cannot change).
   - Email, Name, Phone fields are **disabled**.

### 11d. Form locking after checkout — subscription

1. Go to `FRONTEND/boxes/{planId}`, fill **Email**, click **"Start subscription"**.
2. **Expected:** After Stripe element loads:
   - Email, Name, Phone fields are **disabled**.
   - **"Start subscription"** button is **disabled** and reads **"Continue below…"**.

### 11e. Snapshot prevents quantity mismatch (one-time checkout)

1. Go to `FRONTEND/pickup-windows/{pickupWindowId}`.
2. Set quantity `3` for an item, fill **Email**.
3. Click **"Continue to payment"** — Stripe element loads.
4. Open browser DevTools → Console, run: `document.querySelector('input[type="number"]').removeAttribute('disabled')`
5. Change the quantity field to `5` manually.
6. Fill card `4242 4242 4242 4242`, `12/30`, `123`, click **"Authorize card"**.
7. **Expected:** Order is placed with quantity **3** (the snapshotted value), NOT 5. Verify on the order page or Stripe Dashboard that the captured amount matches 3× the item price.

### 11f. Ad-blocker guard — Stripe unavailable

1. Install an ad-blocker extension (e.g. uBlock Origin) and add `js.stripe.com` to the block list, OR set `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` to an empty string.
2. Reload `FRONTEND/pickup-windows/{pickupWindowId}`.
3. Set quantity, fill **Email**.
4. Click **"Continue to payment"**.
5. **Expected:** A rose/pink error banner appears: **"Payment system could not load. Please disable ad blockers and refresh."** No network request to create a PaymentIntent was made.
6. Repeat on `FRONTEND/boxes/{planId}` → click **"Start subscription"**.
7. **Expected:** Same error message. No intent created.
8. **Cleanup:** Remove the ad-blocker rule / restore the env var.

### 11g. Error message preserved on backend failure

1. Go to `FRONTEND/pickup-windows/{pickupWindowId}`.
2. Set quantity, fill **Email**, click **"Continue to payment"**.
3. Fill card `4242 4242 4242 4242`, `12/30`, `123`.
4. **Before clicking "Authorize card"**, stop the backend (kill the Go server or block the API URL).
5. Click **"Authorize card"**.
6. **Expected:** A rose/pink error banner appears with the **detailed** message: **"Your card was authorized, but we couldn't place your order. Please tap "Authorize card" again to retry. If the problem persists, contact support — your card will not be charged."**
7. Verify the message is NOT overwritten by a generic "Something went wrong" message.
8. **Restart the backend**, then click **"Authorize card"** again.
9. **Expected:** Order is placed successfully (retry works with same authorization).

### 11h. Retry after backend failure — subscription

1. Go to `FRONTEND/boxes/{planId}`, fill **Email**, click **"Start subscription"**.
2. Fill card details, stop backend, click **"Authorize card"**.
3. **Expected:** Detailed error: **"Your card was authorized, but we couldn't create your subscription. Please tap "Authorize card" again to retry…"**
4. Restart backend, click **"Authorize card"** again.
5. **Expected:** Subscription created successfully.

---

## 12. Seller Photo Uploads

**Prerequisite:** Supabase Storage configured (`NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` set), public `images` bucket created. A store with a pickup location and subscription plan exists.

### 12a. Upload store cover photo

1. Go to `FRONTEND/seller/stores/{storeId}/settings`.
2. In the **Store details** section, find the cover photo upload area above the Name field.
3. **Expected:** A dashed-border dropzone with camera icon and text "Add a cover photo — this appears on your store page and farm listings."
4. Click the dropzone and select a JPEG/PNG/WebP image (< 5MB).
5. **Expected:** Spinner overlay during upload, then the image displays at 3:1 aspect ratio with a "Remove" button overlay. A toast reads **"Photo saved"**.
6. Navigate to `FRONTEND/stores/{storeId}`.
7. **Expected:** The uploaded image appears as the store hero image.
8. Navigate to `FRONTEND/stores` (browse page).
9. **Expected:** The store card shows the uploaded image.

### 12b. Upload product/box photo

1. On `FRONTEND/seller/stores/{storeId}/settings`, find the **Farm box** section.
2. Below the Title field, find the product photo upload area.
3. Click and upload a JPEG/PNG/WebP image (< 5MB).
4. **Expected:** Image displays at 4:3 aspect ratio. Toast reads **"Photo saved"**.
5. Navigate to `FRONTEND/stores/{storeId}`.
6. **Expected:** The product image appears in the "What's available" section.
7. Navigate to `FRONTEND/boxes/{planId}`.
8. **Expected:** The product image appears as the box detail hero.

### 12c. Upload pickup spot photo

1. On `FRONTEND/seller/stores/{storeId}/settings`, find the **Pickup spot** section.
2. Below the Address field, find the pickup spot photo upload area.
3. Click and upload a JPEG/PNG/WebP image (< 5MB).
4. **Expected:** Image displays at 4:3 aspect ratio. Toast reads **"Photo saved"**.
5. Navigate to `FRONTEND/stores/{storeId}`.
6. **Expected:** The uploaded photo appears in the pickup location card (replacing the static map).
7. Navigate to `FRONTEND/boxes/{planId}`.
8. **Expected:** A small photo thumbnail appears in the "Pickup details" card next to the address.

### 12d. Remove photo

1. On `FRONTEND/seller/stores/{storeId}/settings`, click **"Remove"** on any uploaded photo.
2. **Expected:** Photo disappears, dropzone returns. Toast reads **"Photo removed"**.
3. Navigate to the corresponding buyer page.
4. **Expected:** The photo is gone — fallback behavior (placeholder/static map) is restored.

### 12e. Upload validation

1. Attempt to upload a `.gif` file.
2. **Expected:** Error message — file type not accepted (only JPEG, PNG, WebP).
3. Attempt to upload a file larger than 5MB.
4. **Expected:** Error message — file too large.

---

## 13. Delete Farm

### 13a. Delete blocked by active subscription

1. On `FRONTEND/seller/stores/{storeId}/settings`, scroll to the **"Danger zone"** section at the bottom.
2. Verify a red-bordered section with heading **"Danger zone"** and a red **"Delete farm"** button.
3. Ensure the store has at least one active subscription.
4. Click **"Delete farm"**.
5. **Expected:** A destructive confirm dialog appears: title **"Delete farm?"**, message about permanent deletion, red **"Delete farm"** confirm button.
6. Click **"Delete farm"** in the dialog.
7. **Expected:** A toast appears with error message: **"Cannot delete: you have N active subscriber(s). Cancel all subscriptions first."** Store is NOT deleted.

### 13b. Delete blocked by unfulfilled orders

1. Ensure the store has no active subscriptions but has at least one order with status **"placed"** or **"ready"**.
2. Click **"Delete farm"** → confirm in the dialog.
3. **Expected:** Toast error: **"Cannot delete: you have N unfulfilled order(s). Complete or cancel them first."** Store is NOT deleted.

### 13c. Successful deletion

1. Ensure the store has no active subscriptions and no unfulfilled orders (all orders are picked_up, canceled, or no_show; all subscriptions are canceled or paused).
2. Click **"Delete farm"** → confirm in the dialog.
3. **Expected:** Toast reads **"Farm deleted"**. Redirect to `/seller`. The store no longer appears in the "Your stores" list.

### 13d. Cascade verification

1. After a successful deletion, verify in the database (or via API) that all child records are gone:
   - `pickup_locations` for the store → 0 rows.
   - `products` for the store → 0 rows.
   - `subscription_plans` for the store → 0 rows.
   - `orders` for the store → 0 rows.
   - `subscriptions` for the store → 0 rows.

### 13e. Delete already-deleted store

1. Attempt to call `DELETE /v1/seller/stores/{storeId}` for a store that no longer exists.
2. **Expected:** HTTP 404 with `{"error":"store not found"}`.

---

## Failure Modes

- **Backend returns 502:** Check Railway logs for migration failures and missing env vars.
- **Webhook not configured:** `/v1/stripe/webhook` returns `503` until `STRIPE_WEBHOOK_SECRET` is set.
- **Stripe PaymentElement doesn't load:** Verify `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` is set in frontend env and matches the backend's `STRIPE_SECRET_KEY` (same Stripe account, test vs live mode).
- **Embedded Connect onboarding doesn't render:** Verify `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` is set. The Connect account must already be created (via the onboard endpoint) before the Account Session can be fetched.
- **Address autocomplete doesn't work:** Verify `GOOGLE_PLACES_API_KEY` is set in backend env and the Places API is enabled in Google Cloud Console.
- **Photo uploads fail:** Verify `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` are set in frontend env. Verify the `images` bucket exists in Supabase and is set to public.
