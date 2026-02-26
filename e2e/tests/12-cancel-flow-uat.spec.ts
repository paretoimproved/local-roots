import { test as base, expect, type Page } from "@playwright/test";
import { uniqueEmail, TEST_CARD } from "../fixtures/test-data";

/**
 * Cancel Retention Flow + Policies Page UAT
 *
 * Runs against production test data (Eugene garden supply store).
 * Uses Stripe test cards — requires E2E_STRIPE_PK to be set.
 */

// Use base test (no liveSellerContext fixture needed — we use existing prod data)
const test = base;

// Existing production test plan
const PLAN_ID = "0094605f-f1da-49b6-811c-28ae698d7363";

// ---------------------------------------------------------------------------
// Helper: subscribe through the UI and navigate to subscription page
// ---------------------------------------------------------------------------

async function subscribeAndNavigate(page: Page): Promise<void> {
  await page.goto(`/boxes/${PLAN_ID}`);
  await expect(page.getByRole("heading", { name: /farm box/i })).toBeVisible({
    timeout: 15_000,
  });

  const email = uniqueEmail("cancel-uat");
  await page.getByLabel("Email").fill(email);
  await page.getByRole("button", { name: "Start subscription" }).click();

  // Wait for Stripe PaymentElement to load (tabbed interface in first iframe)
  const stripeFrame = page.frameLocator("iframe").first();
  const cardTab = stripeFrame.getByRole("button", { name: "Card" });
  await expect(cardTab).toBeVisible({ timeout: 15_000 });
  await cardTab.click();

  // Card fields appear inside the same first iframe after clicking Card.
  // Stripe's custom inputs need click→fill one field at a time.
  const numberInput = stripeFrame.locator('input[name="number"]');
  await expect(numberInput).toBeVisible({ timeout: 15_000 });
  await numberInput.click();
  await numberInput.fill(TEST_CARD.number);
  await page.waitForTimeout(300);

  const expiryInput = stripeFrame.locator('input[name="expiry"]');
  await expiryInput.click();
  await expiryInput.fill(TEST_CARD.expiry);
  await page.waitForTimeout(300);

  const cvcInput = stripeFrame.locator('input[name="cvc"]');
  await cvcInput.click();
  await cvcInput.fill(TEST_CARD.cvc);
  await page.waitForTimeout(300);

  const zipInput = stripeFrame.locator('input[name="postalCode"]');
  await zipInput.click();
  await zipInput.fill("12345");
  await page.waitForTimeout(500);

  // Click authorize
  const authorizeBtn = page.getByRole("button", { name: /authorize/i });
  await authorizeBtn.scrollIntoViewIfNeeded();
  await authorizeBtn.click();
  // Wait for the confirmation heading
  await expect(page.getByRole("heading", { name: "You're in!" })).toBeVisible({
    timeout: 60_000,
  });

  // Navigate to the subscription management page
  const manageLink = page.getByRole("link", { name: "Manage subscription" });
  await expect(manageLink).toBeVisible();
  await manageLink.click();

  // Wait for subscription page to load
  await expect(page.getByRole("heading", { name: "Subscription" })).toBeVisible({
    timeout: 10_000,
  });
  await expect(page.getByText("active")).toBeVisible({ timeout: 10_000 });
}

// ---------------------------------------------------------------------------
// Cancel Flow tests
// ---------------------------------------------------------------------------

test.describe("Cancel retention flow", () => {
  test.describe.configure({ timeout: 120_000 });

  test("step 1: cancel button opens pause offer dialog", async ({ page }) => {
    test.skip(!process.env.E2E_STRIPE_PK, "Skipped: E2E_STRIPE_PK not set");

    await subscribeAndNavigate(page);

    // Click cancel
    await page.getByRole("button", { name: "Cancel" }).click();

    // Verify Step 1 content
    const dialog = page.locator("dialog[open]");
    await expect(dialog).toBeVisible();
    await expect(dialog.getByText("Before you go")).toBeVisible();
    await expect(
      dialog.getByText("Would you like to pause your subscription instead?"),
    ).toBeVisible();
    await expect(dialog.getByRole("button", { name: "Pause subscription" })).toBeVisible();
    await expect(dialog.getByText("No, cancel my subscription")).toBeVisible();

    // No red/destructive button on step 1
    const destructiveBtn = dialog.locator("button.bg-rose-600");
    await expect(destructiveBtn).toHaveCount(0);
  });

  test("step 1: pause action pauses and can resume", async ({ page }) => {
    test.skip(!process.env.E2E_STRIPE_PK, "Skipped: E2E_STRIPE_PK not set");

    await subscribeAndNavigate(page);

    await page.getByRole("button", { name: "Cancel" }).click();
    const dialog = page.locator("dialog[open]");
    await expect(dialog).toBeVisible();

    // Click pause
    await dialog.getByRole("button", { name: "Pause subscription" }).click();

    // Dialog closes
    await expect(dialog).not.toBeVisible();

    // Toast appears
    await expect(page.getByText("Subscription paused")).toBeVisible({ timeout: 5_000 });

    // Status badge changes to paused
    await expect(page.getByText("paused")).toBeVisible();

    // Resume works
    await page.getByRole("button", { name: "Resume" }).click();
    await expect(page.getByText("Subscription resumed")).toBeVisible({ timeout: 5_000 });
    await expect(page.getByText("active")).toBeVisible();
  });

  test("step 2: exit survey with radio options and go back", async ({ page }) => {
    test.skip(!process.env.E2E_STRIPE_PK, "Skipped: E2E_STRIPE_PK not set");

    await subscribeAndNavigate(page);

    await page.getByRole("button", { name: "Cancel" }).click();
    const dialog = page.locator("dialog[open]");
    await expect(dialog).toBeVisible();

    // Advance to step 2
    await dialog.getByText("No, cancel my subscription").click();

    // Verify Step 2 content
    await expect(dialog.getByText("sorry to see you go")).toBeVisible();
    await expect(dialog.getByText("Help us improve")).toBeVisible();

    // All 5 radio options
    await expect(dialog.getByText("Too expensive")).toBeVisible();
    await expect(dialog.getByText("Too much food")).toBeVisible();
    await expect(dialog.getByText("Moving")).toBeVisible();
    await expect(dialog.getByText("Quality issues")).toBeVisible();
    await expect(dialog.getByText("Other")).toBeVisible();

    // First option pre-selected
    const firstRadio = dialog.locator('input[type="radio"][value="Too expensive"]');
    await expect(firstRadio).toBeChecked();

    // Red destructive cancel button present
    await expect(dialog.getByRole("button", { name: "Cancel subscription" })).toBeVisible();

    // Go back returns to step 1
    await dialog.getByText("Go back").click();
    await expect(dialog.getByText("Before you go")).toBeVisible();
    await expect(dialog.getByRole("button", { name: "Pause subscription" })).toBeVisible();
  });

  test("step 2: cancel action completes", async ({ page }) => {
    test.skip(!process.env.E2E_STRIPE_PK, "Skipped: E2E_STRIPE_PK not set");

    await subscribeAndNavigate(page);

    await page.getByRole("button", { name: "Cancel" }).click();
    const dialog = page.locator("dialog[open]");

    // Advance to step 2
    await dialog.getByText("No, cancel my subscription").click();

    // Select a non-default reason
    await dialog.getByText("Quality issues").click();

    // Click cancel
    await dialog.getByRole("button", { name: "Cancel subscription" }).click();

    // Dialog closes
    await expect(dialog).not.toBeVisible();

    // Toast appears
    await expect(page.getByText("Subscription canceled")).toBeVisible({ timeout: 5_000 });

    // Status badge changes
    await expect(page.getByText("canceled", { exact: true })).toBeVisible();

    // Cancel button should no longer appear
    await expect(page.getByRole("button", { name: "Cancel" })).not.toBeVisible();
  });

  test("escape key dismisses dialog without side effects", async ({ page }) => {
    test.skip(!process.env.E2E_STRIPE_PK, "Skipped: E2E_STRIPE_PK not set");

    await subscribeAndNavigate(page);

    await page.getByRole("button", { name: "Cancel" }).click();
    const dialog = page.locator("dialog[open]");
    await expect(dialog).toBeVisible();

    // Press Escape
    await page.keyboard.press("Escape");

    // Dialog closes
    await expect(dialog).not.toBeVisible();

    // Status unchanged — still active
    await expect(page.getByText("active")).toBeVisible();

    // No toast fired
    await expect(page.getByText("Subscription paused")).not.toBeVisible();
    await expect(page.getByText("Subscription canceled")).not.toBeVisible();
  });
});

// ---------------------------------------------------------------------------
// Policies page tests (no auth needed)
// ---------------------------------------------------------------------------

test.describe("Policies page", () => {
  test("all six sections render with correct headings", async ({ page }) => {
    await page.goto("/policies");

    // Page heading
    await expect(page.getByRole("heading", { name: "Policies" })).toBeVisible();

    // Subheading — no placeholder language
    await expect(
      page.getByText("How payments, pickups, and subscriptions work on LocalRoots"),
    ).toBeVisible();
    await expect(page.getByText("MVP policies")).not.toBeVisible();

    // Six section headings in order
    const sections = [
      "Subscriptions",
      "One-Time Orders",
      "Payments & Fees",
      "Pickup & No-Shows",
      "Refunds",
      "Your Data",
    ];
    for (const heading of sections) {
      await expect(page.getByRole("heading", { name: heading })).toBeVisible();
    }
  });

  test("key content assertions", async ({ page }) => {
    await page.goto("/policies");

    // Subscriptions section
    await expect(page.getByText("cancel, pause, or resume")).toBeVisible();
    await expect(page.getByText("non-refundable").first()).toBeVisible();

    // Payments & Fees
    await expect(page.getByText("5% buyer service fee")).toBeVisible();
    await expect(page.getByText("sellers pay nothing")).toBeVisible();

    // Pickup & No-Shows — no $5 fee
    await expect(page.getByText("No additional no-show fee")).toBeVisible();
    await expect(page.getByText("$5")).not.toBeVisible();

    // Refunds
    await expect(page.getByText(/seller cancels/i)).toBeVisible();
    await expect(page.getByText("full refund")).toBeVisible();
    await expect(page.getByText("case-by-case")).toBeVisible();

    // Your Data
    await expect(page.getByText("Stripe")).toBeVisible();
    await expect(page.getByText("not sold")).toBeVisible();

    // Footer — updated date, no placeholder
    await expect(page.getByText("Last updated February 2026")).toBeVisible();
    await expect(page.getByText("These policies will evolve")).not.toBeVisible();
  });

  test("clean layout with no visual regressions", async ({ page }) => {
    await page.goto("/policies");

    // Card container exists
    const card = page.locator(".lr-card");
    await expect(card.first()).toBeVisible();

    // Back link to home
    await expect(page.getByRole("link", { name: "Home" })).toBeVisible();

    // No console errors (capture during navigation)
    const consoleErrors: string[] = [];
    page.on("console", (msg) => {
      if (msg.type() === "error") consoleErrors.push(msg.text());
    });
    await page.reload();
    await page.waitForTimeout(2_000);

    // Filter out known non-critical errors (e.g. favicon, analytics)
    const criticalErrors = consoleErrors.filter(
      (e) => !e.includes("favicon") && !e.includes("analytics"),
    );
    expect(criticalErrors).toHaveLength(0);
  });
});
