# Cancel Retention Flow & Policies UAT — Chrome Agent Scripts

Verification for the cancellation retention interstitial and formalized policies page (commit `420b444`).
Designed for a Claude agent controlling Chrome via computer use.

**Site:** `https://local-roots.vercel.app`

## Prerequisites

- Buyer must be signed in with an **active subscription**. See `buyer-uat.md` tests 7a + 5 to set up.
- If no active subscription exists, subscribe first (test 5 in `buyer-uat.md`), then sign in via magic link.

## Test Data

| Key | Value |
|-----|-------|
| Buyer dashboard URL | `/buyer` |
| Policies URL | `/policies` |

---

## 1. Cancel Flow — Step 1 (Pause Offer)

1. Navigate to `https://local-roots.vercel.app/buyer`.
2. Click into an **active** subscription (green "active" badge).
3. Click the **"Cancel"** button.
4. Verify:
   - A **dialog** appears (modal overlay with dark backdrop).
   - Heading reads **"Before you go…"**.
   - Body text says **"Would you like to pause your subscription instead? You can resume anytime from your dashboard."**
   - A **green primary button** reads **"Pause subscription"**.
   - A **text link** below reads **"No, cancel my subscription"**.
   - There is **NO** destructive red button on this step.
5. **Pass:** Dialog renders with pause offer, correct heading, green pause button, and text link to advance.

---

## 2. Cancel Flow — Pause Action

1. From Step 1 (test 1), click **"Pause subscription"**.
2. Verify:
   - The dialog **closes**.
   - A **toast notification** appears saying **"Subscription paused"**.
   - The status badge changes to **amber/yellow** with text **"paused"**.
   - The action buttons now show **"Resume"** instead of "Pause".
3. **Pass:** Subscription is paused, toast confirms, badge updates.

### Restore active state

1. Click **"Resume"**.
2. Verify toast says **"Subscription resumed"** and badge returns to **green "active"**.

---

## 3. Cancel Flow — Step 2 (Exit Survey)

1. With the subscription back to **active**, click **"Cancel"** again.
2. On the pause offer dialog (Step 1), click the text link **"No, cancel my subscription"**.
3. Verify:
   - The dialog updates to **Step 2** (no page navigation, same dialog).
   - Heading reads **"We're sorry to see you go"**.
   - Body text says **"Help us improve — why are you canceling?"**
   - **Five radio options** are listed:
     - Too expensive
     - Too much food
     - Moving / can't pick up
     - Quality issues
     - Other
   - The first option (**"Too expensive"**) is **pre-selected**.
   - A **red destructive button** reads **"Cancel subscription"**.
   - A **text link** reads **"Go back"**.
4. **Pass:** Step 2 renders with all 5 radio options, first pre-selected, red cancel button, and go-back link.

---

## 4. Cancel Flow — Go Back

1. From Step 2 (test 3), click **"Go back"**.
2. Verify:
   - The dialog returns to **Step 1** (pause offer).
   - Heading reads **"Before you go…"** again.
   - The green **"Pause subscription"** button is visible.
3. **Pass:** Navigation between steps works in both directions.

---

## 5. Cancel Flow — Cancel Action

1. Click **"No, cancel my subscription"** to return to Step 2.
2. Select the radio option **"Quality issues"** (or any non-default option).
3. Click the red **"Cancel subscription"** button.
4. Verify:
   - The dialog **closes**.
   - A **toast notification** appears saying **"Subscription canceled"**.
   - The status badge changes to **gray** with text **"canceled"**.
   - The **"Cancel" button is no longer shown** in the action buttons.
   - A **"Resume" button** is visible (allowing re-subscribe).
5. **Pass:** Subscription is canceled, toast confirms, badge updates to gray, cancel button removed.

---

## 6. Cancel Flow — Escape Key Dismissal

1. If a subscription is active (resume first if needed), click **"Cancel"**.
2. Press the **Escape** key.
3. Verify:
   - The dialog **closes** without any status change.
   - No toast notification appears.
   - The subscription remains **active** (green badge).
4. **Pass:** Escape dismisses dialog cleanly without side effects.

---

## 7. Policies Page — Sections

1. Navigate to `https://local-roots.vercel.app/policies`.
2. Verify the page contains a **breadcrumb/back link** to Home.
3. Verify the heading reads **"Policies"**.
4. Verify the subheading reads **"How payments, pickups, and subscriptions work on LocalRoots."** — it does **NOT** contain the phrase "MVP policies".
5. Verify the following **six section headings** are present in order:
   - **Subscriptions**
   - **One-Time Orders**
   - **Payments & Fees**
   - **Pickup & No-Shows**
   - **Refunds**
   - **Your Data**
6. **Pass:** All 6 sections render, no placeholder language.

---

## 8. Policies Page — Key Content

1. Still on `/policies`, verify the following specific content:
   - Under **Subscriptions**: text includes **"cancel, pause, or resume"** and **"non-refundable"** (for after-cutoff).
   - Under **Payments & Fees**: text includes **"5% buyer service fee"** and **"sellers pay nothing"**.
   - Under **Pickup & No-Shows**: text includes **"No additional no-show fee"** — it does **NOT** mention "$5 fee".
   - Under **Refunds**: text includes **"seller cancels"** → **"full refund"** and **"case-by-case"** for disputes.
   - Under **Your Data**: text includes **"Stripe"** and **"not sold"**.
2. Verify a footer note reads **"Last updated February 2026"** — it does **NOT** contain "These policies will evolve".
3. **Pass:** All key content assertions hold. No placeholder or outdated language.

---

## 9. Policies Page — No Broken Layout

1. Still on `/policies`, verify:
   - All sections are inside a **single card** (`lr-card` styling — rounded corners, shadow/ring).
   - Text is readable (no overlapping, no overflow, no missing styles).
   - The page has a **footer** note at the bottom (the "Last updated" line).
   - No **console errors** visible (if dev tools are open).
2. **Pass:** Clean layout, no visual regressions.

---

## Summary Checklist

| # | Test | Result |
|---|------|--------|
| 1 | Cancel Flow — Step 1 (Pause Offer) | ▢ Pass / ▢ Fail |
| 2 | Cancel Flow — Pause Action | ▢ Pass / ▢ Fail |
| 3 | Cancel Flow — Step 2 (Exit Survey) | ▢ Pass / ▢ Fail |
| 4 | Cancel Flow — Go Back | ▢ Pass / ▢ Fail |
| 5 | Cancel Flow — Cancel Action | ▢ Pass / ▢ Fail |
| 6 | Cancel Flow — Escape Key Dismissal | ▢ Pass / ▢ Fail |
| 7 | Policies Page — Sections | ▢ Pass / ▢ Fail |
| 8 | Policies Page — Key Content | ▢ Pass / ▢ Fail |
| 9 | Policies Page — No Broken Layout | ▢ Pass / ▢ Fail |
