import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  getActivationSteps,
  activationDismissalKey,
  readActivationDismissed,
  writeActivationDismissed,
} from "@/lib/activation-checklist";
import type { SellerSubscriptionPlan, SellerSubscription } from "@/lib/seller-api";

function makePlan(overrides: Partial<SellerSubscriptionPlan> = {}): SellerSubscriptionPlan {
  return {
    id: "plan-1",
    store_id: "store-1",
    pickup_location_id: "loc-1",
    product_id: "prod-1",
    title: "Weekly Box",
    description: null,
    cadence: "weekly",
    price_cents: 2500,
    subscriber_limit: 20,
    first_start_at: "2026-01-01T10:00:00Z",
    duration_minutes: 60,
    cutoff_hours: 24,
    is_active: true,
    is_live: true,
    deposit_cents: 0,
    created_at: "2026-01-01T00:00:00Z",
    updated_at: "2026-01-01T00:00:00Z",
    next_start_at: "2026-06-20T10:00:00Z",
    pickup_location: {
      id: "loc-1",
      label: null,
      address1: "123 Farm Rd",
      address2: null,
      city: "Springfield",
      region: "IL",
      postal_code: "62701",
      country: "US",
      timezone: "America/Chicago",
    },
    ...overrides,
  };
}

function makeSub(overrides: Partial<SellerSubscription> = {}): SellerSubscription {
  return {
    id: "sub-1",
    plan_id: "plan-1",
    plan_title: "Weekly Box",
    buyer_email: "buyer@example.com",
    buyer_name: null,
    status: "active",
    created_at: "2026-01-10T00:00:00Z",
    ...overrides,
  };
}

describe("getActivationSteps", () => {
  it("returns at least two steps", () => {
    expect(getActivationSteps([], [])).toHaveLength(2);
    expect(getActivationSteps([], []).length).toBeGreaterThanOrEqual(2);
  });

  it("includes a step with id 'live'", () => {
    const ids = getActivationSteps([], []).map((s) => s.id);
    expect(ids).toContain("live");
  });

  it("includes a step with id 'subscriber'", () => {
    const ids = getActivationSteps([], []).map((s) => s.id);
    expect(ids).toContain("subscriber");
  });

  it("marks the live step done when a live plan exists", () => {
    const steps = getActivationSteps([makePlan({ is_live: true })], []);
    expect(steps.find((s) => s.id === "live")?.done).toBe(true);
  });

  it("marks the live step not done when no plan is live", () => {
    const steps = getActivationSteps([makePlan({ is_live: false })], []);
    expect(steps.find((s) => s.id === "live")?.done).toBe(false);
  });

  it("marks the live step not done when plans is empty", () => {
    const steps = getActivationSteps([], []);
    expect(steps.find((s) => s.id === "live")?.done).toBe(false);
  });

  it("marks the live step not done when plans is null", () => {
    const steps = getActivationSteps(null, null);
    expect(steps.find((s) => s.id === "live")?.done).toBe(false);
  });

  it("marks the subscriber step done when subscriptions exist", () => {
    const steps = getActivationSteps([], [makeSub()]);
    expect(steps.find((s) => s.id === "subscriber")?.done).toBe(true);
  });

  it("marks the subscriber step not done when subscriptions is empty", () => {
    const steps = getActivationSteps([], []);
    expect(steps.find((s) => s.id === "subscriber")?.done).toBe(false);
  });

  it("marks the subscriber step not done when subscriptions is null", () => {
    const steps = getActivationSteps(null, null);
    expect(steps.find((s) => s.id === "subscriber")?.done).toBe(false);
  });

  it("all steps have non-empty labels", () => {
    const steps = getActivationSteps([makePlan()], [makeSub()]);
    for (const step of steps) {
      expect(step.label.length).toBeGreaterThan(0);
    }
  });
});

describe("activationDismissalKey", () => {
  it("returns a stable key embedding the storeId", () => {
    expect(activationDismissalKey("store-abc")).toBe(
      "localroots_activation_dismissed_store-abc",
    );
  });

  it("produces distinct keys for distinct storeIds", () => {
    expect(activationDismissalKey("store-1")).not.toBe(
      activationDismissalKey("store-2"),
    );
  });
});

describe("readActivationDismissed / writeActivationDismissed (browser)", () => {
  const store: Record<string, string> = {};

  beforeEach(() => {
    Object.keys(store).forEach((k) => delete store[k]);
    vi.stubGlobal("window", {
      localStorage: {
        getItem: vi.fn((key: string) => store[key] ?? null),
        setItem: vi.fn((key: string, val: string) => {
          store[key] = val;
        }),
        removeItem: vi.fn((key: string) => {
          delete store[key];
        }),
      },
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("returns false when not dismissed", () => {
    expect(readActivationDismissed("store-1")).toBe(false);
  });

  it("returns true after writeActivationDismissed", () => {
    writeActivationDismissed("store-1");
    expect(readActivationDismissed("store-1")).toBe(true);
  });

  it("writes the correct localStorage key", () => {
    writeActivationDismissed("store-abc");
    expect(window.localStorage.setItem).toHaveBeenCalledWith(
      "localroots_activation_dismissed_store-abc",
      "1",
    );
  });

  it("isolates dismissal state by storeId", () => {
    writeActivationDismissed("store-1");
    expect(readActivationDismissed("store-2")).toBe(false);
  });
});

describe("readActivationDismissed / writeActivationDismissed (SSR / no window)", () => {
  beforeEach(() => {
    vi.stubGlobal("window", undefined);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("readActivationDismissed returns false when window is undefined", () => {
    expect(readActivationDismissed("store-1")).toBe(false);
  });

  it("writeActivationDismissed does not throw when window is undefined", () => {
    expect(() => writeActivationDismissed("store-1")).not.toThrow();
  });
});
