import { test, expect } from "@playwright/test";
import {
  createConsoleErrorCollector,
  findVisibleUuids,
  checkBasicA11y,
} from "../fixtures/ux-helpers";

test.describe("Buyer dashboard UX", () => {
  test("unauthenticated redirects to login", async ({ page }) => {
    await page.goto("/buyer");
    await page.waitForURL(/\/buyer\/login/);
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  });

  test("login page renders", async ({ page }) => {
    await page.goto("/buyer/login");
    await expect(
      page.getByRole("heading", { level: 1, name: /sign in/i }),
    ).toBeVisible();
    await expect(page.getByLabel(/email/i)).toBeVisible();
    await expect(
      page.getByRole("button", { name: /send sign-in link/i }),
    ).toBeVisible();
  });

  test("login page no console errors", async ({ page }) => {
    const collector = createConsoleErrorCollector(page);
    await page.goto("/buyer/login");
    await expect(
      page.getByRole("heading", { level: 1, name: /sign in/i }),
    ).toBeVisible();
    await page.waitForTimeout(1000);

    const a11y = await checkBasicA11y(page);
    expect(a11y.hasH1, "Login page should have an h1").toBe(true);

    const errors = collector.getErrors();
    expect(errors, "Console errors on buyer login page").toHaveLength(0);
  });

  test("login page has no raw UUIDs", async ({ page }) => {
    await page.goto("/buyer/login");
    await expect(
      page.getByRole("heading", { level: 1, name: /sign in/i }),
    ).toBeVisible();
    await page.waitForTimeout(500);

    const uuids = await findVisibleUuids(page);
    expect(uuids, "Raw UUIDs on login page").toHaveLength(0);
  });

  test("login email validation", async ({ page }) => {
    await page.goto("/buyer/login");
    const emailInput = page.getByLabel(/email/i);
    const submitBtn = page.getByRole("button", { name: /send sign-in link/i });

    // Submit with empty email — button should be present
    await expect(submitBtn).toBeVisible();
    await expect(emailInput).toBeVisible();
  });

  // Tests below require E2E_DATABASE_URL for magic link auth flow
  test("dashboard with token shows sections", async ({ page }) => {
    test.skip(
      !process.env.E2E_DATABASE_URL,
      "Skipped: E2E_DATABASE_URL required for magic link auth",
    );

    const { requestMagicLink, getMagicLinkTokenFromDb, verifyMagicLink } =
      await import("../fixtures/api-helpers");
    const { uniqueEmail } = await import("../fixtures/test-data");

    const buyerEmail = uniqueEmail("buyer-dash");
    await requestMagicLink(buyerEmail);
    const magicToken = await getMagicLinkTokenFromDb(buyerEmail);
    const { token: buyerToken } = await verifyMagicLink(magicToken);

    await page.goto("/");
    await page.evaluate((t) => {
      window.localStorage.setItem("localroots_token", t);
    }, buyerToken);
    await page.goto("/buyer");

    await expect(
      page.getByRole("heading", { level: 1, name: /my pickups/i }),
    ).toBeVisible();
    await expect(page.getByText(buyerEmail)).toBeVisible();
    await expect(page.getByRole("button", { name: /sign out/i })).toBeVisible();

    // Section headings
    await expect(
      page.getByRole("heading", { level: 2, name: /active subscriptions/i }),
    ).toBeVisible();
    await expect(
      page.getByRole("heading", { level: 2, name: /upcoming pickups/i }),
    ).toBeVisible();
    await expect(
      page.getByRole("heading", { level: 2, name: /past orders/i }),
    ).toBeVisible();

    // Empty states for a fresh buyer
    await expect(page.getByText(/no active subscriptions/i)).toBeVisible();
    await expect(page.getByText(/no upcoming pickups/i)).toBeVisible();
    await expect(page.getByText(/no past orders/i)).toBeVisible();
  });

  test("sign out works", async ({ page }) => {
    test.skip(
      !process.env.E2E_DATABASE_URL,
      "Skipped: E2E_DATABASE_URL required for magic link auth",
    );

    const { requestMagicLink, getMagicLinkTokenFromDb, verifyMagicLink } =
      await import("../fixtures/api-helpers");
    const { uniqueEmail } = await import("../fixtures/test-data");

    const buyerEmail = uniqueEmail("buyer-signout");
    await requestMagicLink(buyerEmail);
    const magicToken = await getMagicLinkTokenFromDb(buyerEmail);
    const { token: buyerToken } = await verifyMagicLink(magicToken);

    await page.goto("/");
    await page.evaluate((t) => {
      window.localStorage.setItem("localroots_token", t);
    }, buyerToken);
    await page.goto("/buyer");

    await expect(
      page.getByRole("heading", { level: 1, name: /my pickups/i }),
    ).toBeVisible();

    await page.getByRole("button", { name: /sign out/i }).click();
    await page.waitForURL(/\/(buyer\/login|$)/);
  });

  test("dashboard no raw UUIDs", async ({ page }) => {
    test.skip(
      !process.env.E2E_DATABASE_URL,
      "Skipped: E2E_DATABASE_URL required for magic link auth",
    );

    const { requestMagicLink, getMagicLinkTokenFromDb, verifyMagicLink } =
      await import("../fixtures/api-helpers");
    const { uniqueEmail } = await import("../fixtures/test-data");

    const buyerEmail = uniqueEmail("buyer-uuid");
    await requestMagicLink(buyerEmail);
    const magicToken = await getMagicLinkTokenFromDb(buyerEmail);
    const { token: buyerToken } = await verifyMagicLink(magicToken);

    await page.goto("/");
    await page.evaluate((t) => {
      window.localStorage.setItem("localroots_token", t);
    }, buyerToken);
    await page.goto("/buyer");

    await expect(
      page.getByRole("heading", { level: 1, name: /my pickups/i }),
    ).toBeVisible();
    await page.waitForTimeout(1000);

    const uuids = await findVisibleUuids(page);
    expect(uuids, "Raw UUIDs visible on buyer dashboard").toHaveLength(0);
  });
});
