import { test, expect } from "@playwright/test";
import {
  createConsoleErrorCollector,
  findVisibleUuids,
  findRawIsoTimestamps,
  findMalformedPrices,
  checkBasicA11y,
} from "../fixtures/ux-helpers";

test.describe("Pickup window UX", () => {
  // Navigate to a pickup window via store detail → "Shop this pickup" link (uses seed data)
  async function goToPickupWindow(page: import("@playwright/test").Page) {
    await page.goto("/stores");
    const firstStoreLink = page.locator("a[href^='/stores/']").first();
    await expect(firstStoreLink).toBeVisible({ timeout: 15_000 });
    await firstStoreLink.click();
    await page.waitForURL(/\/stores\/[0-9a-f-]+/);
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();

    // Find a pickup window link (either "Shop this pickup" or direct link to /pickup-windows/)
    const pwLink = page.locator("a[href*='/pickup-windows/']").first();
    const hasPwLink = await pwLink.isVisible({ timeout: 5_000 }).catch(() => false);
    if (!hasPwLink) {
      // Try another store
      await page.goto("/stores");
      const links = page.locator("a[href^='/stores/']");
      const count = await links.count();
      for (let i = 1; i < count && i < 5; i++) {
        await links.nth(i).click();
        await page.waitForURL(/\/stores\/[0-9a-f-]+/);
        const found = await page
          .locator("a[href*='/pickup-windows/']")
          .first()
          .isVisible({ timeout: 3_000 })
          .catch(() => false);
        if (found) break;
        await page.goto("/stores");
      }
    }

    const finalPwLink = page.locator("a[href*='/pickup-windows/']").first();
    await expect(finalPwLink).toBeVisible({ timeout: 5_000 });
    await finalPwLink.click();
    await page.waitForURL(/\/pickup-windows\/[0-9a-f-]+/);
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  }

  test("breadcrumb shows store name", async ({ page }) => {
    await goToPickupWindow(page);

    // "Farms" link in breadcrumb
    const farmsLink = page.getByRole("link", { name: "Farms" });
    await expect(farmsLink).toBeVisible();

    // Store name link in breadcrumb (not a UUID)
    const storeLink = page.locator("nav a[href^='/stores/']").first();
    await expect(storeLink).toBeVisible();
    const storeName = await storeLink.textContent();
    expect(storeName).not.toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
    );
  });

  test("heading shows store name not UUID", async ({ page }) => {
    await goToPickupWindow(page);
    const h1 = page.getByRole("heading", { level: 1 });
    await expect(h1).toBeVisible();
    const text = await h1.textContent();
    expect(text?.trim().length).toBeGreaterThan(0);
    expect(text).not.toMatch(
      /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i,
    );
  });

  test("offerings list with formatted prices", async ({ page }) => {
    await goToPickupWindow(page);
    // Should have at least one offering with a formatted price
    const malformed = await findMalformedPrices(page);
    expect(
      malformed,
      `Malformed prices: ${malformed.join(", ")}`,
    ).toHaveLength(0);
  });

  test("checkout form renders", async ({ page }) => {
    await goToPickupWindow(page);
    const emailInput = page.getByLabel(/email/i).first();
    await expect(emailInput).toBeVisible();
    const checkoutBtn = page.getByRole("button", { name: /continue to payment/i });
    await expect(checkoutBtn).toBeVisible();
  });

  test("checkout button disabled initially", async ({ page }) => {
    await goToPickupWindow(page);
    const checkoutBtn = page.getByRole("button", { name: /continue to payment/i });
    await expect(checkoutBtn).toBeDisabled();
  });

  test("no raw UUIDs, no ISO timestamps, no console errors", async ({ page }) => {
    const collector = createConsoleErrorCollector(page);
    await goToPickupWindow(page);
    await page.waitForTimeout(1000);

    const uuids = await findVisibleUuids(page);
    expect(uuids, "Raw UUIDs visible on pickup window page").toHaveLength(0);

    const isoTimestamps = await findRawIsoTimestamps(page);
    expect(
      isoTimestamps,
      `Raw ISO timestamps: ${isoTimestamps.join(", ")}`,
    ).toHaveLength(0);

    const a11y = await checkBasicA11y(page);
    expect(a11y.hasH1, "Pickup window should have an h1").toBe(true);

    const errors = collector.getErrors();
    expect(errors, "Console errors on pickup window page").toHaveLength(0);
  });
});
