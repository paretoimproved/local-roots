import { test, expect } from "../fixtures/auth";
import {
  placeOrderViaApi,
  updateOrderStatusViaApi,
  createProductViaApi,
  createOfferingViaApi,
  getOrderViaApi,
} from "../fixtures/api-helpers";
import { uniqueEmail } from "../fixtures/test-data";

test.describe("Pickup confirmation", () => {
  test("seller marks order ready and confirms pickup", async ({
    sellerPage,
    liveSellerContext,
  }) => {
    // Create product + offering + order via API
    const product = await createProductViaApi(
      liveSellerContext.token,
      liveSellerContext.storeId,
    );
    const offering = await createOfferingViaApi(
      liveSellerContext.token,
      liveSellerContext.storeId,
      liveSellerContext.pickupWindowId,
      product.id,
    );
    const buyerEmail = uniqueEmail("pickup");
    const { order, token: orderToken } = await placeOrderViaApi(
      liveSellerContext.pickupWindowId,
      buyerEmail,
      [{ offering_id: offering.id, quantity: 1 }],
    );

    // Navigate to seller dashboard and select the pickup window
    await sellerPage.goto(`/seller/stores/${liveSellerContext.storeId}`);
    const windowSelect = sellerPage.locator("select").first();
    await windowSelect.selectOption({ index: 1 });

    // Find the order and mark it ready
    await expect(sellerPage.getByText(buyerEmail)).toBeVisible();
    await sellerPage.getByRole("button", { name: "Mark ready" }).first().click();

    // Now confirm pickup with the code
    await expect(sellerPage.getByLabel("Pickup code")).toBeVisible();
    await sellerPage.getByLabel("Pickup code").fill(order.pickup_code);
    await sellerPage.getByRole("button", { name: "Confirm pickup" }).first().click();

    // Verify via API that order status is now picked_up
    const updated = await getOrderViaApi(order.id, orderToken);
    expect(updated.status).toBe("picked_up");
  });

  test('buyer sees "picked up" status on order page', async ({
    buyerPage,
    liveSellerContext,
  }) => {
    // Create and complete an order via API
    const product = await createProductViaApi(
      liveSellerContext.token,
      liveSellerContext.storeId,
    );
    const offering = await createOfferingViaApi(
      liveSellerContext.token,
      liveSellerContext.storeId,
      liveSellerContext.pickupWindowId,
      product.id,
    );
    const buyerEmail = uniqueEmail("pickup-buyer");
    const { order, token: orderToken } = await placeOrderViaApi(
      liveSellerContext.pickupWindowId,
      buyerEmail,
      [{ offering_id: offering.id, quantity: 1 }],
    );

    // Mark ready then confirm pickup via API
    await updateOrderStatusViaApi(
      liveSellerContext.token,
      liveSellerContext.storeId,
      order.id,
      "ready",
    );
    await import("../fixtures/api-helpers").then((m) =>
      m.confirmPickupViaApi(
        liveSellerContext.token,
        liveSellerContext.storeId,
        order.id,
        order.pickup_code,
      ),
    );

    // Buyer views order page with token
    await buyerPage.goto(`/orders/${order.id}?t=${orderToken}`);
    await expect(buyerPage.getByText(/picked.?up/i)).toBeVisible();
  });
});
