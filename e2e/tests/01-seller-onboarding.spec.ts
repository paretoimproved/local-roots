import { test, expect } from "../fixtures/auth";
import { uniqueEmail, TEST_PASSWORD } from "../fixtures/test-data";

test.describe("Seller onboarding", () => {
  test("seller registers with email and password", async ({ page }) => {
    await page.goto("/seller/register");
    await expect(page.getByRole("heading", { name: "Create seller account" })).toBeVisible();

    const email = uniqueEmail("register");
    await page.getByLabel("Your name").fill("E2E Farmer");
    await page.getByLabel("Email").fill(email);
    await page.getByLabel("Password").fill(TEST_PASSWORD);
    await page.getByRole("button", { name: "Create account" }).click();

    // Should redirect to seller dashboard
    await page.waitForURL("**/seller");
    await expect(page.getByRole("heading", { name: "Seller" })).toBeVisible();
  });

  test("seller creates a store", async ({ sellerPage, sellerContext }) => {
    await sellerPage.goto("/seller");
    await expect(sellerPage.getByRole("heading", { name: "Seller" })).toBeVisible();

    // The sellerContext fixture creates a store via API, so the store list should show it
    await expect(sellerPage.getByText(sellerContext.storeId ? "Your stores" : "Create a store")).toBeVisible();
    await expect(sellerPage.getByText("E2E Test Farm")).toBeVisible();
    await expect(sellerPage.getByRole("link", { name: /continue setup|manage/i })).toBeVisible();
  });

  test("setup wizard: location step", async ({ sellerPage, sellerContext }) => {
    await sellerPage.goto(`/seller/stores/${sellerContext.storeId}/setup/location`);
    await expect(
      sellerPage.getByRole("heading", { name: /where will customers pick up/i }),
    ).toBeVisible();

    // Verify key form elements are visible
    await expect(sellerPage.getByText("Pickup address", { exact: true })).toBeVisible();
    await expect(sellerPage.getByText("Spot name", { exact: false })).toBeVisible();
    await expect(sellerPage.getByPlaceholder("e.g. Green Valley Farm Stand")).toBeVisible();
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

    // Save the box (creates the plan, stays on page to allow photo upload)
    await sellerPage.getByRole("button", { name: /save box/i }).click();

    // Photo upload and Continue button should appear after plan is saved
    await expect(sellerPage.getByText(/box photo/i)).toBeVisible();
    await sellerPage.getByRole("button", { name: /continue/i }).click();

    // Should navigate to payouts page
    await sellerPage.waitForURL(`**/setup/payouts`);
  });

  test("review page shows setup summary", async ({
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

    // Review page shows setup summary
    await expect(
      sellerPage.getByRole("heading", { name: /ready to start selling/i }),
    ).toBeVisible();
    await expect(sellerPage.getByText("Test Pickup Spot")).toBeVisible();
    await expect(sellerPage.getByText("Weekly Farm Box")).toBeVisible();
    await expect(sellerPage.getByRole("button", { name: "Start selling" })).toBeVisible();
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
