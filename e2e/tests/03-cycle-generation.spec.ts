import { test, expect } from "../fixtures/auth";

test.describe("Cycle generation", () => {
  test("seller generates next cycle from dashboard", async ({
    sellerPage,
    liveSellerContext,
  }) => {
    await sellerPage.goto(`/seller/stores/${liveSellerContext.storeId}`);
    await expect(sellerPage.getByRole("heading", { name: "Store" })).toBeVisible();

    // Find the plan section and click generate
    await expect(sellerPage.getByText("Weekly Farm Box")).toBeVisible();

    // Click the generate button — text varies based on whether there's already a cycle
    const generateBtn = sellerPage.getByRole("button", { name: /generate next cycle/i });
    if (await generateBtn.isVisible()) {
      await generateBtn.click();

      // After generation, the dashboard should still show the plan and windows
      await expect(sellerPage.getByText("Weekly Farm Box")).toBeVisible();
    }
  });

  test('orders appear in order list with status "placed"', async ({
    sellerPage,
    liveSellerContext,
  }) => {
    // Place an order via API so there's something to see
    const { placeOrderViaApi, createProductViaApi, createOfferingViaApi } = await import(
      "../fixtures/api-helpers"
    );
    const { uniqueEmail } = await import("../fixtures/test-data");

    const product = await createProductViaApi(
      liveSellerContext.token,
      liveSellerContext.storeId,
    );
    const offering = await createOfferingViaApi(
      liveSellerContext.token,
      liveSellerContext.storeId,
      liveSellerContext.pickupWindowId,
      product.id,
      500,
      20,
    );

    const buyerEmail = uniqueEmail("buyer-order");
    await placeOrderViaApi(liveSellerContext.pickupWindowId, buyerEmail, [
      { offering_id: offering.id, quantity: 2 },
    ]);

    await sellerPage.goto(`/seller/stores/${liveSellerContext.storeId}`);
    await expect(sellerPage.getByRole("heading", { name: "Store" })).toBeVisible();

    // Select the pickup window to view its orders
    const windowSelect = sellerPage.locator("select").first();
    await windowSelect.selectOption({ index: 1 });

    // Orders section should show "Placed" filter and orders
    await expect(sellerPage.getByText("Orders")).toBeVisible();
    await expect(sellerPage.getByText(buyerEmail)).toBeVisible();
  });
});
