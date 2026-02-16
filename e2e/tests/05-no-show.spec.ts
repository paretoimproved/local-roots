import { test, expect } from "../fixtures/auth";
import {
  placeOrderViaApi,
  updateOrderStatusViaApi,
  createProductViaApi,
  createOfferingViaApi,
  getOrderViaApi,
} from "../fixtures/api-helpers";
import { uniqueEmail } from "../fixtures/test-data";

test.describe("No-show", () => {
  test("seller marks order as no-show", async ({ sellerPage, liveSellerContext }) => {
    // Create product + offering + order
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
    const buyerEmail = uniqueEmail("noshow");
    const { order, token: orderToken } = await placeOrderViaApi(
      liveSellerContext.pickupWindowId,
      buyerEmail,
      [{ offering_id: offering.id, quantity: 1 }],
    );

    // Mark ready first (no-show is available from "ready" status)
    await updateOrderStatusViaApi(
      liveSellerContext.token,
      liveSellerContext.storeId,
      order.id,
      "ready",
    );

    // Navigate to seller dashboard
    await sellerPage.goto(`/seller/stores/${liveSellerContext.storeId}`);
    const windowSelect = sellerPage.locator("select").first();
    await windowSelect.selectOption({ index: 1 });

    // Find the order and mark as no-show
    await expect(sellerPage.getByText(buyerEmail)).toBeVisible();
    await sellerPage.getByRole("button", { name: /no show/i }).first().click();

    // Verify via API
    const updated = await getOrderViaApi(order.id, orderToken);
    expect(updated.status).toBe("no_show");
  });

  test("order status updates to no_show on buyer page", async ({
    buyerPage,
    liveSellerContext,
  }) => {
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
    const buyerEmail = uniqueEmail("noshow-buyer");
    const { order, token: orderToken } = await placeOrderViaApi(
      liveSellerContext.pickupWindowId,
      buyerEmail,
      [{ offering_id: offering.id, quantity: 1 }],
    );

    // Mark ready then no-show via API
    await updateOrderStatusViaApi(
      liveSellerContext.token,
      liveSellerContext.storeId,
      order.id,
      "ready",
    );
    await updateOrderStatusViaApi(
      liveSellerContext.token,
      liveSellerContext.storeId,
      order.id,
      "no_show",
    );

    await buyerPage.goto(`/orders/${order.id}?t=${orderToken}`);
    await expect(buyerPage.getByText(/no.?show/i)).toBeVisible();
  });
});
