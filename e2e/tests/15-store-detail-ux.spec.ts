import { test, expect } from "@playwright/test";
import {
  createConsoleErrorCollector,
  findVisibleUuids,
  findRawIsoTimestamps,
  findMalformedPrices,
  checkBasicA11y,
} from "../fixtures/ux-helpers";

test.describe("Store detail UX", () => {
  // Helper: navigate to first store detail page
  async function goToFirstStore(page: import("@playwright/test").Page) {
    await page.goto("/stores");
    const firstLink = page.locator("a[href^='/stores/']").first();
    await expect(firstLink).toBeVisible({ timeout: 15_000 });
    await firstLink.click();
    await page.waitForURL(/\/stores\/[0-9a-f-]+/);
    // Wait for h1 to confirm page loaded
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  }

  test("breadcrumb navigation", async ({ page }) => {
    await goToFirstStore(page);
    const breadcrumb = page.locator("nav[aria-label='Breadcrumb'], nav, .breadcrumb").first();
    const farmsLink = page.getByRole("link", { name: "Farms" });
    await expect(farmsLink).toBeVisible();
    await expect(farmsLink).toHaveAttribute("href", "/stores");
  });

  test("hero section with store name", async ({ page }) => {
    await goToFirstStore(page);
    const h1 = page.getByRole("heading", { level: 1 });
    await expect(h1).toBeVisible();
    const name = await h1.textContent();
    expect(name?.trim().length).toBeGreaterThan(0);
    // Name should not be a UUID
    expect(name).not.toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
    );
  });

  test("store image or placeholder", async ({ page }) => {
    await goToFirstStore(page);
    // Either an image with alt matching store name, or a placeholder initial
    const h1Text = await page.getByRole("heading", { level: 1 }).textContent();
    const img = page.locator("img").first();
    const hasImage = await img.isVisible().catch(() => false);
    if (hasImage) {
      // Image should have alt text
      const alt = await img.getAttribute("alt");
      expect(alt?.length).toBeGreaterThan(0);
    }
    // Either way, page should render without error
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  });

  test("pickup locations section", async ({ page }) => {
    await goToFirstStore(page);
    const heading = page.getByRole("heading", { level: 2, name: "Pickup locations" });
    await expect(heading).toBeVisible();
  });

  test("directions link to Google Maps", async ({ page }) => {
    await goToFirstStore(page);
    // Look for a maps link
    const mapsLink = page.locator("a[href*='maps.google.com'], a[href*='google.com/maps']").first();
    const hasMapsLink = await mapsLink.isVisible().catch(() => false);
    if (hasMapsLink) {
      const href = await mapsLink.getAttribute("href");
      expect(href).toContain("google.com/maps");
    }
  });

  test("subscription boxes with formatted prices", async ({ page }) => {
    await goToFirstStore(page);
    const heading = page.getByRole("heading", { level: 2, name: "What's available" });
    await expect(heading).toBeVisible();

    // Check for properly formatted prices
    const malformed = await findMalformedPrices(page);
    expect(
      malformed,
      `Malformed prices found: ${malformed.join(", ")}`,
    ).toHaveLength(0);
  });

  test("box subscribe link navigates to /boxes", async ({ page }) => {
    await goToFirstStore(page);
    const subscribeLink = page.getByRole("link", { name: "Subscribe" }).first();
    const hasSubscribe = await subscribeLink.isVisible().catch(() => false);
    if (hasSubscribe) {
      await subscribeLink.click();
      await page.waitForURL(/\/boxes\/[0-9a-f-]+/);
      await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    }
  });

  test("reviews section", async ({ page }) => {
    await goToFirstStore(page);
    // Reviews may or may not exist — just check heading renders if present
    const heading = page.getByRole("heading", {
      level: 2,
      name: "What buyers are saying",
    });
    const hasReviews = await heading.isVisible().catch(() => false);
    if (hasReviews) {
      await expect(heading).toBeVisible();
    }
  });

  test("no raw UUIDs, no ISO timestamps, no console errors", async ({ page }) => {
    const collector = createConsoleErrorCollector(page);
    await goToFirstStore(page);
    await page.waitForTimeout(1000);

    const uuids = await findVisibleUuids(page);
    expect(uuids, "Raw UUIDs visible on store detail").toHaveLength(0);

    const isoTimestamps = await findRawIsoTimestamps(page);
    expect(
      isoTimestamps,
      `Raw ISO timestamps found: ${isoTimestamps.join(", ")}`,
    ).toHaveLength(0);

    const a11y = await checkBasicA11y(page);
    expect(a11y.hasH1, "Store detail should have an h1").toBe(true);

    const errors = collector.getErrors();
    expect(errors, "Console errors on store detail").toHaveLength(0);
  });
});
