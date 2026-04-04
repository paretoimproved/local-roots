import { test, expect } from "../fixtures/auth";
import { uniqueEmail, TEST_CARD } from "../fixtures/test-data";

test.describe("Subscription happy path", () => {
  test("buyer can view subscription plan page", async ({ buyerPage, liveSellerContext }) => {
    await buyerPage.goto(`/boxes/${liveSellerContext.planId}`);

    await expect(buyerPage.getByRole("heading", { name: "Weekly Farm Box" })).toBeVisible();
    await expect(buyerPage.getByText("Pickup details")).toBeVisible();
    await expect(buyerPage.getByText("Subscribe")).toBeVisible();
  });

  test("buyer subscribes with card", async ({ buyerPage, liveSellerContext }) => {
    test.skip(!process.env.E2E_STRIPE_PK, "Skipped: E2E_STRIPE_PK not set");

    await buyerPage.goto(`/boxes/${liveSellerContext.planId}`);
    await expect(buyerPage.getByRole("heading", { name: "Weekly Farm Box" })).toBeVisible();

    // Fill subscriber info
    const email = uniqueEmail("subscriber");
    await buyerPage.getByLabel("Email").fill(email);

    // Start the subscription flow
    await buyerPage.getByRole("button", { name: "Start subscription" }).click();

    // Wait for Stripe PaymentElement iframe to load
    const stripeFrame = buyerPage.frameLocator('iframe[title*="Secure"]').first();
    await expect(stripeFrame.locator('[placeholder="Card number"]')).toBeVisible({
      timeout: 15_000,
    });

    // Fill card details within Stripe iframe
    await stripeFrame.locator('[placeholder="Card number"]').fill(TEST_CARD.number);
    await stripeFrame.locator('[placeholder="MM / YY"]').fill(TEST_CARD.expiry);
    await stripeFrame.locator('[placeholder="CVC"]').fill(TEST_CARD.cvc);

    // Authorize the card
    await buyerPage.getByRole("button", { name: /authorize/i }).click();

    // Wait for subscription confirmation
    await expect(buyerPage.getByText("Subscription started")).toBeVisible({ timeout: 30_000 });
  });

  test("subscription confirmation shows pickup code", async ({
    buyerPage,
    liveSellerContext,
  }) => {
    test.skip(!process.env.E2E_STRIPE_PK, "Skipped: E2E_STRIPE_PK not set");

    await buyerPage.goto(`/boxes/${liveSellerContext.planId}`);

    const email = uniqueEmail("sub-confirm");
    await buyerPage.getByLabel("Email").fill(email);
    await buyerPage.getByRole("button", { name: "Start subscription" }).click();

    const stripeFrame = buyerPage.frameLocator('iframe[title*="Secure"]').first();
    await expect(stripeFrame.locator('[placeholder="Card number"]')).toBeVisible({
      timeout: 15_000,
    });
    await stripeFrame.locator('[placeholder="Card number"]').fill(TEST_CARD.number);
    await stripeFrame.locator('[placeholder="MM / YY"]').fill(TEST_CARD.expiry);
    await stripeFrame.locator('[placeholder="CVC"]').fill(TEST_CARD.cvc);
    await buyerPage.getByRole("button", { name: /authorize/i }).click();

    await expect(buyerPage.getByText("Subscription started")).toBeVisible({ timeout: 30_000 });

    // Confirmation should show links to view order and manage subscription
    await expect(buyerPage.getByRole("link", { name: "View first order" })).toBeVisible();
    await expect(
      buyerPage.getByRole("link", { name: "Manage subscription" }),
    ).toBeVisible();
  });
});
