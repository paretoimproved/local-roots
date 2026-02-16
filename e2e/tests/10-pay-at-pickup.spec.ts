import { test, expect } from "../fixtures/auth";
import { uniqueEmail } from "../fixtures/test-data";

test.describe("Pay at pickup", () => {
  test("buyer places order with pay-at-pickup", async ({
    buyerPage,
    liveMarketContext,
  }) => {
    await buyerPage.goto(`/pickup-windows/${liveMarketContext.pickupWindowId}`);
    await expect(buyerPage.getByText("Heirloom Tomatoes")).toBeVisible();

    // Select quantity
    const qtyInput = buyerPage.getByRole("spinbutton").first();
    await qtyInput.fill("2");

    // Fill buyer info
    const email = uniqueEmail("pay-pickup");
    await buyerPage.getByLabel("Email").fill(email);

    // Pay at pickup should be default or available
    await buyerPage.getByLabel("Pay at pickup").check();

    // Place order
    await buyerPage.getByRole("button", { name: "Place order" }).click();

    // Wait for confirmation
    await expect(buyerPage.getByText("Order placed")).toBeVisible({ timeout: 15_000 });
  });

  test('confirmation shows pickup code and "Pay at pickup"', async ({
    buyerPage,
    liveMarketContext,
  }) => {
    await buyerPage.goto(`/pickup-windows/${liveMarketContext.pickupWindowId}`);

    const qtyInput = buyerPage.getByRole("spinbutton").first();
    await qtyInput.fill("1");

    const email = uniqueEmail("pickup-confirm");
    await buyerPage.getByLabel("Email").fill(email);
    await buyerPage.getByLabel("Pay at pickup").check();
    await buyerPage.getByRole("button", { name: "Place order" }).click();

    await expect(buyerPage.getByText("Order placed")).toBeVisible({ timeout: 15_000 });

    // Should show payment method as "Pay at pickup"
    await expect(buyerPage.getByText(/pay at pickup/i)).toBeVisible();

    // Should show access link copy button
    await expect(
      buyerPage.getByRole("link", { name: "View order" }),
    ).toBeVisible();
  });

  test("access link copy works", async ({ buyerPage, liveMarketContext }) => {
    await buyerPage.goto(`/pickup-windows/${liveMarketContext.pickupWindowId}`);

    const qtyInput = buyerPage.getByRole("spinbutton").first();
    await qtyInput.fill("1");

    const email = uniqueEmail("copy-link");
    await buyerPage.getByLabel("Email").fill(email);
    await buyerPage.getByLabel("Pay at pickup").check();
    await buyerPage.getByRole("button", { name: "Place order" }).click();

    await expect(buyerPage.getByText("Order placed")).toBeVisible({ timeout: 15_000 });

    // Grant clipboard permissions for this test
    await buyerPage.context().grantPermissions(["clipboard-read", "clipboard-write"]);

    // Click copy access link
    await buyerPage.getByRole("button", { name: "Copy access link" }).click();
    await expect(buyerPage.getByText("Copied")).toBeVisible();
  });
});
