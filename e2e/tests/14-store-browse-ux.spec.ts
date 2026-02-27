import { test, expect } from "@playwright/test";
import {
  createConsoleErrorCollector,
  findVisibleUuids,
} from "../fixtures/ux-helpers";

test.describe("Store browse UX", () => {
  test("page loads with search controls", async ({ page }) => {
    await page.goto("/stores");
    await expect(
      page.getByRole("heading", { level: 1, name: "Farms" }),
    ).toBeVisible();
    await expect(page.getByLabel("City or zip code")).toBeVisible();
    // Radius select with options
    const radiusSelect = page.locator("select");
    await expect(radiusSelect).toBeVisible();
    for (const opt of ["10 mi", "25 mi", "50 mi", "100 mi"]) {
      await expect(radiusSelect.locator(`option:text("${opt}")`)).toBeAttached();
    }
    await expect(page.getByRole("button", { name: "Search" })).toBeVisible();
  });

  test("store cards render without UUIDs", async ({ page }) => {
    await page.goto("/stores");
    // Wait for at least one store card (from seed data)
    const storeHeadings = page.locator("h2");
    await expect(storeHeadings.first()).toBeVisible({ timeout: 15_000 });

    const count = await storeHeadings.count();
    expect(count).toBeGreaterThanOrEqual(1);

    // No raw UUIDs in store cards
    const uuids = await findVisibleUuids(page);
    expect(uuids, "Raw UUIDs should not be visible on store browse").toHaveLength(0);
  });

  test("store card links to detail page", async ({ page }) => {
    await page.goto("/stores");
    // Wait for cards
    const firstLink = page.locator("a[href^='/stores/']").first();
    await expect(firstLink).toBeVisible({ timeout: 15_000 });

    await firstLink.click();
    await page.waitForURL(/\/stores\/[0-9a-f-]+/);
    // Detail page should have an h1
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  });

  test("search button disabled when input empty", async ({ page }) => {
    await page.goto("/stores");
    const searchBtn = page.getByRole("button", { name: "Search" });
    const input = page.getByLabel("City or zip code");

    // Should be disabled initially (empty input)
    await expect(searchBtn).toBeDisabled();

    // Type some characters — should enable
    await input.fill("Portland");
    await expect(searchBtn).toBeEnabled();

    // Clear — should disable again
    await input.fill("");
    await expect(searchBtn).toBeDisabled();
  });

  test("demo mode shows banner", async ({ page }) => {
    await page.goto("/stores?demo=true");
    await expect(page.getByText("Viewing demo stores")).toBeVisible();
    const exitLink = page.getByRole("link", { name: "Exit demo" });
    await expect(exitLink).toBeVisible();
  });

  test("no console errors", async ({ page }) => {
    const collector = createConsoleErrorCollector(page);
    await page.goto("/stores");
    await expect(
      page.getByRole("heading", { level: 1, name: "Farms" }),
    ).toBeVisible();
    await page.waitForTimeout(1000);

    const errors = collector.getErrors();
    expect(errors, "Console errors on store browse page").toHaveLength(0);
  });
});
