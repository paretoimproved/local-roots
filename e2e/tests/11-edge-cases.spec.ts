import { test, expect } from "../fixtures/auth";
import { uniqueEmail, TEST_PASSWORD } from "../fixtures/test-data";

test.describe("Edge cases", () => {
  test("registration validates email and password length", async ({ page }) => {
    await page.goto("/seller/register");

    // Try to submit with short password
    await page.getByLabel("Display name").fill("Test");
    await page.getByLabel("Email").fill(uniqueEmail("edge"));
    await page.getByLabel("Password").fill("short"); // < 8 chars

    await page.getByRole("button", { name: "Create account" }).click();

    // HTML5 validation or server-side error should prevent submission
    // The password field has minLength=8, so browser validation should catch it
    const passwordInput = page.getByLabel("Password");
    const validationMessage = await passwordInput.evaluate(
      (el: HTMLInputElement) => el.validationMessage,
    );
    expect(validationMessage).toBeTruthy();
  });

  test("login shows error for wrong credentials", async ({ page }) => {
    await page.goto("/seller/login");

    await page.getByLabel("Email").fill(uniqueEmail("wrong"));
    await page.getByLabel("Password").fill("WrongPassword123!");
    await page.getByRole("button", { name: "Sign in" }).click();

    // Should show error message
    await expect(page.locator(".bg-rose-50")).toBeVisible();
  });

  test("checkout requires at least one item", async ({ buyerPage, liveMarketContext }) => {
    await buyerPage.goto(`/pickup-windows/${liveMarketContext.pickupWindowId}`);

    // Fill email but don't select any items (quantities stay at 0)
    await buyerPage.getByLabel("Email").fill(uniqueEmail("no-items"));
    await buyerPage.getByLabel("Pay at pickup").check();

    // The Place order button should be disabled when no items are selected
    const placeOrderBtn = buyerPage.getByRole("button", { name: "Place order" });
    await expect(placeOrderBtn).toBeDisabled();
  });

  test("checkout requires email", async ({ buyerPage, liveMarketContext }) => {
    await buyerPage.goto(`/pickup-windows/${liveMarketContext.pickupWindowId}`);

    // Select an item but don't fill email
    const qtyInput = buyerPage.getByRole("spinbutton").first();
    await qtyInput.fill("1");
    await buyerPage.getByLabel("Pay at pickup").check();

    // The Place order button should be disabled without email
    const placeOrderBtn = buyerPage.getByRole("button", { name: "Place order" });
    await expect(placeOrderBtn).toBeDisabled();
  });

  test("subscribe button disabled when plan not live", async ({
    buyerPage,
    sellerContext,
  }) => {
    // Create a plan that's NOT live (no cycle generated)
    const { createPickupLocationViaApi, createPlanViaApi } = await import(
      "../fixtures/api-helpers"
    );
    const location = await createPickupLocationViaApi(sellerContext.token, sellerContext.storeId);
    const plan = await createPlanViaApi(sellerContext.token, sellerContext.storeId, location.id);

    await buyerPage.goto(`/boxes/${plan.id}`);

    // Should show "not live" warning
    await expect(buyerPage.getByText(/not live yet/i)).toBeVisible();

    // Subscribe button should be disabled
    await expect(
      buyerPage.getByRole("button", { name: "Start subscription" }),
    ).toBeDisabled();
  });
});
