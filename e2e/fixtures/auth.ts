import { test as base, type Page } from "@playwright/test";
import {
  registerSeller,
  createStoreViaApi,
  createPickupLocationViaApi,
  createPlanViaApi,
  generateCycleViaApi,
  createProductViaApi,
  createPickupWindowViaApi,
  createOfferingViaApi,
} from "./api-helpers";
import { uniqueEmail, TEST_PASSWORD } from "./test-data";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface SellerContext {
  token: string;
  email: string;
  storeId: string;
}

export interface LiveSellerContext extends SellerContext {
  planId: string;
  locationId: string;
  pickupWindowId: string;
}

export interface LiveMarketContext extends LiveSellerContext {
  productId: string;
  offeringId: string;
}

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

type Fixtures = {
  /** A Playwright page with a seller JWT already injected into localStorage. */
  sellerPage: Page;
  /** Raw seller credentials + storeId for API-only test setup. */
  sellerContext: SellerContext;
  /** Full seller setup: store + location + plan + generated cycle. */
  liveSellerContext: LiveSellerContext;
  /** Full seller setup plus product, pickup window, and offering for one-off checkout. */
  liveMarketContext: LiveMarketContext;
  /** A clean page for buyer flows (no pre-injected auth). */
  buyerPage: Page;
};

export const test = base.extend<Fixtures>({
  sellerContext: async ({}, use) => {
    const email = uniqueEmail("seller");
    const { token } = await registerSeller(email, TEST_PASSWORD);
    const store = await createStoreViaApi(token, "E2E Test Farm");
    await use({ token, email, storeId: store.id });
  },

  sellerPage: async ({ page, sellerContext }, use) => {
    // Inject seller JWT into localStorage before any navigation
    const frontendUrl = process.env.E2E_FRONTEND_URL ?? "http://localhost:3000";
    await page.goto(frontendUrl);
    await page.evaluate((t) => {
      window.localStorage.setItem("localroots_token", t);
    }, sellerContext.token);
    await use(page);
  },

  liveSellerContext: async ({}, use) => {
    const email = uniqueEmail("seller-live");
    const { token } = await registerSeller(email, TEST_PASSWORD);
    const store = await createStoreViaApi(token, "E2E Live Farm");
    const location = await createPickupLocationViaApi(token, store.id);
    const plan = await createPlanViaApi(token, store.id, location.id);
    const cycle = await generateCycleViaApi(token, store.id, plan.id);

    await use({
      token,
      email,
      storeId: store.id,
      planId: plan.id,
      locationId: location.id,
      pickupWindowId: cycle.pickup_window.id,
    });
  },

  liveMarketContext: async ({}, use) => {
    const email = uniqueEmail("seller-market");
    const { token } = await registerSeller(email, TEST_PASSWORD);
    const store = await createStoreViaApi(token, "E2E Market Farm");
    const location = await createPickupLocationViaApi(token, store.id);
    const plan = await createPlanViaApi(token, store.id, location.id);
    await generateCycleViaApi(token, store.id, plan.id);

    // Create a standalone pickup window with offerings for one-off checkout
    const product = await createProductViaApi(token, store.id, "Heirloom Tomatoes", "lb");
    const pw = await createPickupWindowViaApi(token, store.id, location.id);
    const offering = await createOfferingViaApi(token, store.id, pw.id, product.id, 500, 20);

    await use({
      token,
      email,
      storeId: store.id,
      planId: plan.id,
      locationId: location.id,
      pickupWindowId: pw.id,
      productId: product.id,
      offeringId: offering.id,
    });
  },

  buyerPage: async ({ page }, use) => {
    await use(page);
  },
});

export { expect } from "@playwright/test";
