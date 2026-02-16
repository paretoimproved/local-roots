import { test, expect } from "../fixtures/auth";
import {
  placeOrderViaApi,
  updateOrderStatusViaApi,
  createProductViaApi,
  createOfferingViaApi,
  getOrderViaApi,
} from "../fixtures/api-helpers";
import { uniqueEmail } from "../fixtures/test-data";

test.describe("Cancel order", () => {
  test("seller cancels a placed order", async ({ sellerPage, liveSellerContext }) => {
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
    const buyerEmail = uniqueEmail("cancel");
    const { order, token: orderToken } = await placeOrderViaApi(
      liveSellerContext.pickupWindowId,
      buyerEmail,
      [{ offering_id: offering.id, quantity: 1 }],
    );

    // Navigate to seller dashboard
    await sellerPage.goto(`/seller/stores/${liveSellerContext.storeId}`);
    const windowSelect = sellerPage.locator("select").first();
    await windowSelect.selectOption({ index: 1 });

    // Find the order and cancel it
    await expect(sellerPage.getByText(buyerEmail)).toBeVisible();
    await sellerPage.getByRole("button", { name: "Cancel" }).first().click();

    // Verify via API
    const updated = await getOrderViaApi(order.id, orderToken);
    expect(updated.status).toBe("canceled");
  });

  test('buyer sees "canceled" on order page', async ({ buyerPage, liveSellerContext }) => {
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
    const buyerEmail = uniqueEmail("cancel-buyer");
    const { order, token: orderToken } = await placeOrderViaApi(
      liveSellerContext.pickupWindowId,
      buyerEmail,
      [{ offering_id: offering.id, quantity: 1 }],
    );

    // Cancel via API
    await updateOrderStatusViaApi(
      liveSellerContext.token,
      liveSellerContext.storeId,
      order.id,
      "canceled",
    );

    await buyerPage.goto(`/orders/${order.id}?t=${orderToken}`);
    await expect(buyerPage.getByText(/cancel/i)).toBeVisible();
  });
});
