let counter = 0;

/** Generate a unique email for test isolation. */
export function uniqueEmail(prefix = "e2e"): string {
  counter++;
  return `${prefix}+${Date.now()}-${counter}@localroots-test.com`;
}

/** Stripe test card numbers. */
export const TEST_CARD = {
  number: "4242424242424242",
  expiry: "12/30",
  cvc: "123",
} as const;

/** Default test password for seller accounts. */
export const TEST_PASSWORD = "TestPass123!";

/** Default test store values. */
export const TEST_STORE = {
  name: "E2E Test Farm",
  description: "Automated test store",
} as const;

/** Default test plan values. */
export const TEST_PLAN = {
  title: "Weekly Farm Box",
  priceCents: 2500,
  cadence: "weekly" as const,
  subscriberLimit: 10,
} as const;
