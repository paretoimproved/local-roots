import { describe, it, expect, vi, beforeEach } from "vitest";

const mockRequestJSON = vi.fn();
vi.mock("@/lib/http", () => ({
  requestJSON: (...args: unknown[]) => mockRequestJSON(...args),
}));

import { api } from "@/lib/api";

beforeEach(() => {
  vi.clearAllMocks();
  mockRequestJSON.mockResolvedValue([]);
});

describe("api.listStores", () => {
  it("calls GET /v1/stores with revalidation", async () => {
    await api.listStores();
    expect(mockRequestJSON).toHaveBeenCalledWith("/v1/stores", {
      method: "GET",
      next: { revalidate: 30 },
    });
  });
});

describe("api.listStorePickupWindows", () => {
  it("calls GET /v1/stores/:id/pickup-windows", async () => {
    await api.listStorePickupWindows("store-1");
    expect(mockRequestJSON).toHaveBeenCalledWith(
      "/v1/stores/store-1/pickup-windows",
      { method: "GET", next: { revalidate: 30 } },
    );
  });
});

describe("api.listPickupWindowOfferings", () => {
  it("calls GET /v1/pickup-windows/:id/offerings with 10s revalidation", async () => {
    await api.listPickupWindowOfferings("pw-1");
    expect(mockRequestJSON).toHaveBeenCalledWith(
      "/v1/pickup-windows/pw-1/offerings",
      { method: "GET", next: { revalidate: 10 } },
    );
  });
});

describe("api.listStoreSubscriptionPlans", () => {
  it("calls GET /v1/stores/:id/subscription-plans", async () => {
    await api.listStoreSubscriptionPlans("store-1");
    expect(mockRequestJSON).toHaveBeenCalledWith(
      "/v1/stores/store-1/subscription-plans",
      { method: "GET", next: { revalidate: 30 } },
    );
  });
});

describe("api.getSubscriptionPlan", () => {
  it("calls GET /v1/subscription-plans/:id", async () => {
    await api.getSubscriptionPlan("plan-1");
    expect(mockRequestJSON).toHaveBeenCalledWith(
      "/v1/subscription-plans/plan-1",
      { method: "GET", next: { revalidate: 30 } },
    );
  });
});
