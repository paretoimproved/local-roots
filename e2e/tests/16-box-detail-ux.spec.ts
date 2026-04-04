import { test, expect } from "@playwright/test";
import {
  createConsoleErrorCollector,
  findVisibleUuids,
  findRawIsoTimestamps,
  findMalformedPrices,
  checkBasicA11y,
} from "../fixtures/ux-helpers";

test.describe("Box detail UX", () => {
  // Helper: navigate to first box detail via store detail
  async function goToFirstBox(page: import("@playwright/test").Page) {
    await page.goto("/stores");
    const firstStoreLink = page.locator("a[href^='/stores/']").first();
    await expect(firstStoreLink).toBeVisible({ timeout: 15_000 });
    await firstStoreLink.click();
    await page.waitForURL(/\/stores\/[0-9a-f-]+/);
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();

    // Click Subscribe to go to box detail
    const subscribeLink = page.getByRole("link", { name: "Subscribe" }).first();
    await expect(subscribeLink).toBeVisible({ timeout: 10_000 });
    await subscribeLink.click();
    await page.waitForURL(/\/boxes\/[0-9a-f-]+/);
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  }

  test("breadcrumb with store name", async ({ page }) => {
    await goToFirstBox(page);
    // Breadcrumb should have a link back to the store
    const storeLink = page.locator("nav a[href^='/stores/']").first();
    await expect(storeLink).toBeVisible();
    const storeName = await storeLink.textContent();
    expect(storeName?.trim().length).toBeGreaterThan(0);
    // Store name should not be a UUID
    expect(storeName).not.toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
    );
  });

  test("heading with plan title and price", async ({ page }) => {
    await goToFirstBox(page);
    const h1 = page.getByRole("heading", { level: 1 });
    const title = await h1.textContent();
    expect(title?.trim().length).toBeGreaterThan(0);
    // Title should not be a UUID
    expect(title).not.toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
    );

    // Price should be formatted
    const malformed = await findMalformedPrices(page);
    expect(
      malformed,
      `Malformed prices: ${malformed.join(", ")}`,
    ).toHaveLength(0);
  });

  test("pickup details section", async ({ page }) => {
    await goToFirstBox(page);
    await expect(
      page.getByRole("heading", { level: 2, name: "Pickup details" }),
    ).toBeVisible();
    // Should show an address
    await expect(page.getByText(/\d+.*(?:St|Ave|Rd|Blvd|Dr|Ln|Way|Ct)/i).first()).toBeVisible();
  });

  test("policies visible", async ({ page }) => {
    await goToFirstBox(page);
    // Policy text about skipping or cancellation
    const hasSkipPolicy = await page.getByText(/skip/i).first().isVisible().catch(() => false);
    const hasRefundPolicy = await page.getByText(/refund/i).first().isVisible().catch(() => false);
    expect(
      hasSkipPolicy || hasRefundPolicy,
      "Box detail should show subscription policies",
    ).toBe(true);
  });

  test("subscribe form renders", async ({ page }) => {
    await goToFirstBox(page);
    // Email input for subscription
    const emailInput = page.getByLabel(/email/i).first();
    await expect(emailInput).toBeVisible();
    // Start subscription button
    const subscribeBtn = page.getByRole("button", { name: /start subscription/i });
    await expect(subscribeBtn).toBeVisible();
  });

  test("reviews section if present", async ({ page }) => {
    await goToFirstBox(page);
    const heading = page.getByRole("heading", { level: 2, name: "Recent reviews" });
    const hasReviews = await heading.isVisible().catch(() => false);
    if (hasReviews) {
      await expect(heading).toBeVisible();
    }
  });

  test("no raw UUIDs, no ISO timestamps, no console errors", async ({ page }) => {
    const collector = createConsoleErrorCollector(page);
    await goToFirstBox(page);
    await page.waitForTimeout(1000);

    const uuids = await findVisibleUuids(page);
    expect(uuids, "Raw UUIDs visible on box detail").toHaveLength(0);

    const isoTimestamps = await findRawIsoTimestamps(page);
    expect(
      isoTimestamps,
      `Raw ISO timestamps: ${isoTimestamps.join(", ")}`,
    ).toHaveLength(0);

    const a11y = await checkBasicA11y(page);
    expect(a11y.hasH1, "Box detail should have an h1").toBe(true);

    const errors = collector.getErrors();
    expect(errors, "Console errors on box detail").toHaveLength(0);
  });
});
