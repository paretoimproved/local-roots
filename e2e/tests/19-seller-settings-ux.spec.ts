import { test, expect } from "../fixtures/auth";
import {
  createConsoleErrorCollector,
  checkBasicA11y,
} from "../fixtures/ux-helpers";

test.describe("Seller settings UX", () => {
  test("page loads with section heading", async ({
    sellerPage,
    sellerContext,
  }) => {
    await sellerPage.goto(`/seller/stores/${sellerContext.storeId}/settings`);
    await expect(
      sellerPage.getByRole("heading", { level: 1, name: "Settings" }),
    ).toBeVisible();
    await expect(
      sellerPage.getByText(
        "Edit your store, pickup spot, farm box, and advanced tools.",
      ),
    ).toBeVisible();
  });

  test("section nav links", async ({ sellerPage, sellerContext }) => {
    await sellerPage.goto(`/seller/stores/${sellerContext.storeId}/settings`);
    await expect(
      sellerPage.getByRole("heading", { level: 1, name: "Settings" }),
    ).toBeVisible();

    for (const label of [
      "Store details",
      "Pickup spot",
      "Farm box",
      "Payouts",
      "Advanced tools",
    ]) {
      await expect(
        sellerPage.getByRole("link", { name: label }),
      ).toBeVisible();
    }
  });

  test("store details section", async ({ sellerPage, sellerContext }) => {
    await sellerPage.goto(`/seller/stores/${sellerContext.storeId}/settings`);
    await expect(
      sellerPage.getByRole("heading", { level: 2, name: "Store details" }),
    ).toBeVisible();

    await expect(sellerPage.getByText(/add a cover photo/i)).toBeVisible();
    await expect(sellerPage.getByLabel(/name/i).first()).toBeVisible();
    await expect(sellerPage.getByLabel(/description/i)).toBeVisible();
    await expect(sellerPage.getByLabel(/phone/i)).toBeVisible();
  });

  test("pickup spot section", async ({ sellerPage, sellerContext }) => {
    await sellerPage.goto(`/seller/stores/${sellerContext.storeId}/settings`);
    await expect(
      sellerPage.getByRole("heading", { level: 2, name: "Pickup spot" }),
    ).toBeVisible();
  });

  test("farm box section", async ({ sellerPage, sellerContext }) => {
    await sellerPage.goto(`/seller/stores/${sellerContext.storeId}/settings`);
    await expect(
      sellerPage.getByRole("heading", { level: 2, name: "Farm box" }),
    ).toBeVisible();
  });

  test("no console errors", async ({ sellerPage, sellerContext }) => {
    const collector = createConsoleErrorCollector(sellerPage);
    await sellerPage.goto(`/seller/stores/${sellerContext.storeId}/settings`);
    await expect(
      sellerPage.getByRole("heading", { level: 1, name: "Settings" }),
    ).toBeVisible();
    await sellerPage.waitForTimeout(1000);

    const a11y = await checkBasicA11y(sellerPage);
    expect(a11y.hasH1, "Settings page should have an h1").toBe(true);

    const errors = collector.getErrors();
    expect(errors, "Console errors on seller settings").toHaveLength(0);
  });
});
