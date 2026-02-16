import { test, expect } from "../fixtures/auth";
import { uniqueEmail, TEST_PASSWORD } from "../fixtures/test-data";

test.describe("Seller onboarding", () => {
  test("seller registers with email and password", async ({ page }) => {
    await page.goto("/seller/register");
    await expect(page.getByRole("heading", { name: "Create seller account" })).toBeVisible();

    const email = uniqueEmail("register");
    await page.getByLabel("Display name").fill("E2E Farmer");
    await page.getByLabel("Email").fill(email);
    await page.getByLabel("Password").fill(TEST_PASSWORD);
    await page.getByRole("button", { name: "Create account" }).click();

    // Should redirect to seller dashboard
    await page.waitForURL("**/seller");
    await expect(page.getByRole("heading", { name: "Seller" })).toBeVisible();
  });

  test("seller creates a store", async ({ sellerPage }) => {
    await sellerPage.goto("/seller");
    await expect(sellerPage.getByRole("heading", { name: "Seller" })).toBeVisible();

    // Fill the "Create a store" form
    await sellerPage.getByLabel("Name").first().fill("Sunny Test Farm");
    await sellerPage.getByLabel("Description").first().fill("Fresh veggies for testing");
    await sellerPage.getByRole("button", { name: "Create store" }).click();

    // Should show the new store in the list with a Manage link
    await expect(sellerPage.getByText("Sunny Test Farm")).toBeVisible();
    await expect(sellerPage.getByRole("link", { name: "Manage" })).toBeVisible();
  });

  test("setup wizard: location step", async ({ sellerPage, sellerContext }) => {
    await sellerPage.goto(`/seller/stores/${sellerContext.storeId}/setup/location`);
    await expect(
      sellerPage.getByRole("heading", { name: /where will customers pick up/i }),
    ).toBeVisible();

    // Fill spot name (skip address autocomplete — use API fallback for actual location)
    await sellerPage.getByLabel("Spot name (optional)").fill("Test Farm Stand");

    // If timezone combobox appears (manual fallback), it means address wasn't auto-selected.
    // The location was already created via API in the sellerContext fixture, so we can
    // verify the setup page loads correctly.
    await expect(sellerPage.getByLabel("Pickup address")).toBeVisible();
  });

  test("setup wizard: box step", async ({ sellerPage, sellerContext }) => {
    // Pre-create location via API so we can access the box step
    const { createPickupLocationViaApi } = await import("../fixtures/api-helpers");
    await createPickupLocationViaApi(sellerContext.token, sellerContext.storeId);

    await sellerPage.goto(`/seller/stores/${sellerContext.storeId}/setup/box`);
    await expect(
      sellerPage.getByRole("heading", { name: /build your first farm box/i }),
    ).toBeVisible();

    await sellerPage.getByLabel("Box name").fill("Weekly Test Box");
    await sellerPage.getByLabel("Price per box").fill("25.00");
    await sellerPage.getByText("Every week").click();
    await sellerPage.getByLabel("How many customers?").fill("5");

    // First pickup datetime-local should have a default
    const firstPickupInput = sellerPage.getByLabel("When's your first pickup?");
    await expect(firstPickupInput).not.toHaveValue("");

    await sellerPage.getByRole("button", { name: /continue/i }).click();

    // Should navigate to review page
    await sellerPage.waitForURL(`**/setup/review`);
  });

  test('review page shows "Set up payouts first" gate', async ({
    sellerPage,
    sellerContext,
  }) => {
    // Pre-create location and plan so review page has data to show
    const { createPickupLocationViaApi, createPlanViaApi } = await import(
      "../fixtures/api-helpers"
    );
    const location = await createPickupLocationViaApi(sellerContext.token, sellerContext.storeId);
    await createPlanViaApi(sellerContext.token, sellerContext.storeId, location.id);

    await sellerPage.goto(`/seller/stores/${sellerContext.storeId}/setup/review`);

    // Without Stripe Connect, the gate should appear
    await expect(sellerPage.getByText("Set up payouts first")).toBeVisible();
    await expect(
      sellerPage.getByText("Connect your bank account so you can receive payments"),
    ).toBeVisible();
    await expect(sellerPage.getByRole("link", { name: "Set up payouts" })).toBeVisible();
  });

  test("review page Start selling works when Connect active", async ({
    sellerPage,
    sellerContext,
  }) => {
    test.skip(
      process.env.E2E_STRIPE_CONNECT_READY !== "true",
      "Skipped: E2E_STRIPE_CONNECT_READY not set",
    );

    const { createPickupLocationViaApi, createPlanViaApi } = await import(
      "../fixtures/api-helpers"
    );
    const location = await createPickupLocationViaApi(sellerContext.token, sellerContext.storeId);
    await createPlanViaApi(sellerContext.token, sellerContext.storeId, location.id);

    await sellerPage.goto(`/seller/stores/${sellerContext.storeId}/setup/review`);

    await sellerPage.getByRole("button", { name: "Start selling" }).click();

    // Should show celebration view
    await expect(sellerPage.getByText("You're live!")).toBeVisible();
    await expect(sellerPage.getByRole("link", { name: "Go to dashboard" })).toBeVisible();
  });
});
