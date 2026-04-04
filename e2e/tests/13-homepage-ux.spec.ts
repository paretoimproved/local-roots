import { test, expect } from "@playwright/test";
import {
  createConsoleErrorCollector,
  findVisibleUuids,
} from "../fixtures/ux-helpers";

test.describe("Homepage UX", () => {
  test("hero section renders", async ({ page }) => {
    await page.goto("/");
    await expect(
      page.getByRole("heading", { level: 1, name: "Fresh food from local farmers." }),
    ).toBeVisible();
    const cta = page.getByRole("link", { name: "Find a farm near you" });
    await expect(cta).toBeVisible();
    await expect(cta).toHaveAttribute("href", "/stores");
  });

  test("how it works section", async ({ page }) => {
    await page.goto("/");
    await expect(
      page.getByRole("heading", { level: 2, name: "How it works" }),
    ).toBeVisible();
    await expect(page.getByText("Find a local farm")).toBeVisible();
    await expect(page.getByText("Subscribe to a box")).toBeVisible();
    await expect(page.getByText("Pick it up fresh")).toBeVisible();
  });

  test("featured farms section", async ({ page }) => {
    await page.goto("/");
    await expect(
      page.getByRole("heading", { level: 2, name: "Featured farms" }),
    ).toBeVisible();
    // At least 1 farm card (Link with h3 store name)
    const farmCard = page.locator("a[href^='/stores/'] h3").first();
    await expect(farmCard).toBeVisible({ timeout: 15_000 });
    const viewAll = page.getByRole("link", { name: "View all farms" });
    await expect(viewAll).toBeVisible();
    await expect(viewAll).toHaveAttribute("href", "/stores");
  });

  test("seller pitch section", async ({ page }) => {
    await page.goto("/");
    await expect(
      page.getByRole("heading", {
        level: 2,
        name: "Sell your harvest. Zero platform fees.",
      }),
    ).toBeVisible();
    await expect(page.getByText("costs you nothing")).toBeVisible();
    const cta = page.getByRole("link", { name: "Start selling" });
    await expect(cta).toBeVisible();
    await expect(cta).toHaveAttribute("href", "/seller/register");
  });

  test("header navigation", async ({ page }) => {
    await page.goto("/");
    // Logo link
    const logo = page.getByRole("link", { name: /LocalRoots/i }).first();
    await expect(logo).toBeVisible();
    // Browse link
    const browse = page.getByRole("link", { name: "Browse" });
    await expect(browse).toBeVisible();
    await expect(browse).toHaveAttribute("href", "/stores");
    // Tagline
    await expect(
      page.getByText("Seasonal food, sold by neighbors."),
    ).toBeVisible();
  });

  test("footer renders with links", async ({ page }) => {
    await page.goto("/");
    const footer = page.locator("footer");
    await expect(footer).toBeVisible();
    // Year and brand
    const year = new Date().getFullYear().toString();
    await expect(footer.getByText("LocalRoots")).toBeVisible();
    await expect(footer.getByText(year)).toBeVisible();
    // Footer links exist (hrefs may be placeholders)
    for (const label of ["About", "How it Works", "FAQ", "Terms", "Privacy", "Contact"]) {
      const link = footer.getByRole("link", { name: label });
      await expect(link).toBeVisible();
    }
  });

  test("no raw UUIDs and no console errors", async ({ page }) => {
    const collector = createConsoleErrorCollector(page);
    await page.goto("/");
    // Wait for content to load
    await expect(
      page.getByRole("heading", { level: 1, name: "Fresh food from local farmers." }),
    ).toBeVisible();
    // Allow dynamic content to settle
    await page.waitForTimeout(1000);

    const uuids = await findVisibleUuids(page);
    expect(uuids, "Raw UUIDs should not be visible on the homepage").toHaveLength(0);

    const errors = collector.getErrors();
    expect(errors, "Console errors on homepage").toHaveLength(0);
  });
});
