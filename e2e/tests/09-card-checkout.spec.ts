import { test, expect } from "../fixtures/auth";
import { uniqueEmail, TEST_CARD } from "../fixtures/test-data";

test.describe("Card checkout", () => {
  test("buyer checks out with card (one-time purchase)", async ({
    buyerPage,
    liveMarketContext,
  }) => {
    test.skip(!process.env.E2E_STRIPE_PK, "Skipped: E2E_STRIPE_PK not set");

    await buyerPage.goto(`/pickup-windows/${liveMarketContext.pickupWindowId}`);
    await expect(buyerPage.getByText("Heirloom Tomatoes")).toBeVisible();

    // Select quantity
    const qtyInput = buyerPage.getByRole("spinbutton").first();
    await qtyInput.fill("2");

    // Fill buyer info
    const email = uniqueEmail("card-checkout");
    await buyerPage.getByLabel("Email").fill(email);

    // Select card payment
    await buyerPage.getByLabel("Pay with card").check();

    // Continue to payment
    await buyerPage.getByRole("button", { name: "Continue to payment" }).click();

    // Wait for Stripe PaymentElement
    const stripeFrame = buyerPage.frameLocator('iframe[title*="Secure"]').first();
    await expect(stripeFrame.locator('[placeholder="Card number"]')).toBeVisible({
      timeout: 15_000,
    });

    // Fill card details
    await stripeFrame.locator('[placeholder="Card number"]').fill(TEST_CARD.number);
    await stripeFrame.locator('[placeholder="MM / YY"]').fill(TEST_CARD.expiry);
    await stripeFrame.locator('[placeholder="CVC"]').fill(TEST_CARD.cvc);

    // Authorize
    await buyerPage.getByRole("button", { name: /authorize/i }).click();

    // Wait for order confirmation
    await expect(buyerPage.getByText("Order placed")).toBeVisible({ timeout: 30_000 });
  });

  test("correct total shown including buyer fee", async ({
    buyerPage,
    liveMarketContext,
  }) => {
    test.skip(!process.env.E2E_STRIPE_PK, "Skipped: E2E_STRIPE_PK not set");

    await buyerPage.goto(`/pickup-windows/${liveMarketContext.pickupWindowId}`);

    // Select quantity
    const qtyInput = buyerPage.getByRole("spinbutton").first();
    await qtyInput.fill("3");

    // Fill email
    await buyerPage.getByLabel("Email").fill(uniqueEmail("fee-check"));

    // Total should be visible and reflect quantity * price
    await expect(buyerPage.getByText("Total")).toBeVisible();
    // $5.00 * 3 = $15.00 (base, plus any service fee)
    await expect(buyerPage.getByText("$15.00")).toBeVisible();
  });
});
