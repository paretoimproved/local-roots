import { test, expect } from "../fixtures/auth";
import {
  requestMagicLink,
  getMagicLinkTokenFromDb,
  verifyMagicLink,
  placeOrderViaApi,
  createProductViaApi,
  createOfferingViaApi,
} from "../fixtures/api-helpers";
import { uniqueEmail } from "../fixtures/test-data";

test.describe("Buyer magic link", () => {
  test('buyer requests magic link and sees "Check your email"', async ({ buyerPage }) => {
    const email = uniqueEmail("magic");

    await buyerPage.goto("/buyer/login");
    await expect(buyerPage.getByRole("heading", { name: "Sign in" })).toBeVisible();

    await buyerPage.getByLabel("Email").fill(email);
    await buyerPage.getByRole("button", { name: "Send sign-in link" }).click();

    await expect(buyerPage.getByText("Check your email")).toBeVisible();
    await expect(buyerPage.getByText(email)).toBeVisible();
    await expect(buyerPage.getByText(/expires in 15 minutes/i)).toBeVisible();
  });

  test("verify token redirects to buyer dashboard", async ({
    buyerPage,
    liveSellerContext,
  }) => {
    test.skip(
      !process.env.E2E_DATABASE_URL,
      "Skipped: E2E_DATABASE_URL not set — cannot query magic link token",
    );

    // Place an order first so the buyer has something on the dashboard
    const product = await createProductViaApi(
      liveSellerContext.token,
      liveSellerContext.storeId,
    );
    const offering = await createOfferingViaApi(
      liveSellerContext.token,
      liveSellerContext.storeId,
      liveSellerContext.pickupWindowId,
      product.id,
    );
    const buyerEmail = uniqueEmail("magic-verify");
    await placeOrderViaApi(liveSellerContext.pickupWindowId, buyerEmail, [
      { offering_id: offering.id, quantity: 1 },
    ]);

    // Request magic link via API (not UI — faster)
    await requestMagicLink(buyerEmail);

    // Query DB for the token
    const magicToken = await getMagicLinkTokenFromDb(buyerEmail);

    // Navigate to verify URL
    await buyerPage.goto(`/buyer/auth/verify?token=${magicToken}`);

    // Should redirect to buyer dashboard
    await buyerPage.waitForURL("**/buyer");
    await expect(buyerPage.getByRole("heading", { name: "My pickups" })).toBeVisible();
  });

  test("buyer dashboard shows orders", async ({ buyerPage, liveSellerContext }) => {
    test.skip(
      !process.env.E2E_DATABASE_URL,
      "Skipped: E2E_DATABASE_URL not set",
    );

    const product = await createProductViaApi(
      liveSellerContext.token,
      liveSellerContext.storeId,
    );
    const offering = await createOfferingViaApi(
      liveSellerContext.token,
      liveSellerContext.storeId,
      liveSellerContext.pickupWindowId,
      product.id,
    );
    const buyerEmail = uniqueEmail("dashboard");
    await placeOrderViaApi(liveSellerContext.pickupWindowId, buyerEmail, [
      { offering_id: offering.id, quantity: 1 },
    ]);

    // Authenticate buyer via DB magic link
    await requestMagicLink(buyerEmail);
    const magicToken = await getMagicLinkTokenFromDb(buyerEmail);
    const { token: buyerJwt } = await verifyMagicLink(magicToken);

    // Inject buyer token and navigate
    const frontendUrl = process.env.E2E_FRONTEND_URL ?? "http://localhost:3000";
    await buyerPage.goto(frontendUrl);
    await buyerPage.evaluate((t) => {
      window.localStorage.setItem("localroots_buyer_token", t);
    }, buyerJwt);

    await buyerPage.goto("/buyer");
    await expect(buyerPage.getByRole("heading", { name: "My pickups" })).toBeVisible();

    // Should show the upcoming order
    await expect(buyerPage.getByText("Upcoming pickups")).toBeVisible();
  });

  test("sign out works", async ({ buyerPage }) => {
    test.skip(
      !process.env.E2E_DATABASE_URL,
      "Skipped: E2E_DATABASE_URL not set",
    );

    const buyerEmail = uniqueEmail("signout");
    await requestMagicLink(buyerEmail);
    const magicToken = await getMagicLinkTokenFromDb(buyerEmail);
    const { token: buyerJwt } = await verifyMagicLink(magicToken);

    const frontendUrl = process.env.E2E_FRONTEND_URL ?? "http://localhost:3000";
    await buyerPage.goto(frontendUrl);
    await buyerPage.evaluate((t) => {
      window.localStorage.setItem("localroots_buyer_token", t);
    }, buyerJwt);

    await buyerPage.goto("/buyer");
    await expect(buyerPage.getByRole("heading", { name: "My pickups" })).toBeVisible();

    await buyerPage.getByRole("button", { name: "Sign out" }).click();

    // After sign-out, buyer token should be cleared
    const token = await buyerPage.evaluate(() =>
      window.localStorage.getItem("localroots_buyer_token"),
    );
    expect(token).toBeNull();
  });
});
