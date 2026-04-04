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

    // Navigate to seller dashboard (auto-selects pickup window)
    await sellerPage.goto(`/seller/stores/${liveSellerContext.storeId}`);

    // Find the order and mark it ready
    await expect(sellerPage.getByText(buyerEmail)).toBeVisible();
    await sellerPage.getByRole("button", { name: "Mark ready" }).first().click();

    // Use the global pickup entry to confirm pickup
    const codeInput = sellerPage.getByPlaceholder("000000");
    await expect(codeInput).toBeVisible();
    await codeInput.fill(order.pickup_code);

    // Auto-lookup fires after 250ms — wait for the preview to appear
    await expect(sellerPage.getByText(buyerEmail.split("@")[0])).toBeVisible();
    await sellerPage.getByRole("button", { name: "Confirm pickup" }).click();

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
