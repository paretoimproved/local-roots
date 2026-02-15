import { describe, it, expect, vi, beforeEach } from "vitest";

const mockRequestJSON = vi.fn();
vi.mock("@/lib/http", () => ({
  requestJSON: (...args: unknown[]) => mockRequestJSON(...args),
}));

import { sellerApi } from "@/lib/seller-api";

beforeEach(() => {
  vi.clearAllMocks();
  mockRequestJSON.mockResolvedValue({});
});

describe("sellerApi.registerSeller", () => {
  it("POSTs to /v1/auth/register with seller role", async () => {
    await sellerApi.registerSeller("a@b.com", "pass123", "Alice");

    const [path, init] = mockRequestJSON.mock.calls[0];
    expect(path).toBe("/v1/auth/register");
    expect(init.method).toBe("POST");
    const body = JSON.parse(init.body);
    expect(body.email).toBe("a@b.com");
    expect(body.password).toBe("pass123");
    expect(body.display_name).toBe("Alice");
    expect(body.role).toBe("seller");
  });

  it("nullifies displayName when not provided", async () => {
    await sellerApi.registerSeller("a@b.com", "pass123");

    const body = JSON.parse(mockRequestJSON.mock.calls[0][1].body);
    expect(body.display_name).toBeNull();
  });
});

describe("sellerApi.login", () => {
  it("POSTs to /v1/auth/login with email and password", async () => {
    await sellerApi.login("a@b.com", "pass123");

    const [path, init] = mockRequestJSON.mock.calls[0];
    expect(path).toBe("/v1/auth/login");
    expect(init.method).toBe("POST");
    const body = JSON.parse(init.body);
    expect(body.email).toBe("a@b.com");
    expect(body.password).toBe("pass123");
  });
});

describe("sellerApi.listMyStores", () => {
  it("GETs /v1/seller/stores with token", async () => {
    await sellerApi.listMyStores("tok");

    expect(mockRequestJSON).toHaveBeenCalledWith("/v1/seller/stores", {
      token: "tok",
    });
  });
});

describe("sellerApi.createStore", () => {
  it("POSTs to /v1/seller/stores with name and optional fields", async () => {
    await sellerApi.createStore("tok", {
      name: "Farm Stand",
      description: "Fresh produce",
    });

    const [path, init] = mockRequestJSON.mock.calls[0];
    expect(path).toBe("/v1/seller/stores");
    expect(init.method).toBe("POST");
    expect(init.token).toBe("tok");
    const body = JSON.parse(init.body);
    expect(body.name).toBe("Farm Stand");
    expect(body.description).toBe("Fresh produce");
    expect(body.phone).toBeNull();
  });
});

describe("sellerApi.listPickupLocations", () => {
  it("GETs /v1/seller/stores/:id/pickup-locations with token", async () => {
    await sellerApi.listPickupLocations("tok", "store-1");

    expect(mockRequestJSON).toHaveBeenCalledWith(
      "/v1/seller/stores/store-1/pickup-locations",
      { token: "tok" },
    );
  });
});

describe("sellerApi.createPickupLocation", () => {
  it("POSTs with required fields and defaults optional", async () => {
    await sellerApi.createPickupLocation("tok", "store-1", {
      address1: "123 Main",
      city: "Portland",
      region: "OR",
      postal_code: "97201",
      timezone: "America/Los_Angeles",
    });

    const [path, init] = mockRequestJSON.mock.calls[0];
    expect(path).toBe("/v1/seller/stores/store-1/pickup-locations");
    expect(init.method).toBe("POST");
    expect(init.token).toBe("tok");
    const body = JSON.parse(init.body);
    expect(body.address1).toBe("123 Main");
    expect(body.country).toBe("US");
    expect(body.label).toBeNull();
    expect(body.address2).toBeNull();
    expect(body.lat).toBeNull();
    expect(body.lng).toBeNull();
  });
});

describe("sellerApi.deletePickupLocation", () => {
  it("DELETEs /v1/seller/stores/:storeId/pickup-locations/:locId", async () => {
    await sellerApi.deletePickupLocation("tok", "store-1", "loc-1");

    expect(mockRequestJSON).toHaveBeenCalledWith(
      "/v1/seller/stores/store-1/pickup-locations/loc-1",
      { method: "DELETE", token: "tok" },
    );
  });
});

describe("sellerApi.timezoneForLatLng", () => {
  it("POSTs lat/lng to /v1/seller/geo/timezone", async () => {
    await sellerApi.timezoneForLatLng("tok", 45.5, -122.6);

    const [path, init] = mockRequestJSON.mock.calls[0];
    expect(path).toBe("/v1/seller/geo/timezone");
    expect(init.method).toBe("POST");
    expect(init.token).toBe("tok");
    const body = JSON.parse(init.body);
    expect(body.lat).toBe(45.5);
    expect(body.lng).toBe(-122.6);
  });
});

describe("sellerApi.listPickupWindows", () => {
  it("GETs /v1/seller/stores/:id/pickup-windows with token", async () => {
    await sellerApi.listPickupWindows("tok", "store-1");

    expect(mockRequestJSON).toHaveBeenCalledWith(
      "/v1/seller/stores/store-1/pickup-windows",
      { token: "tok" },
    );
  });
});

describe("sellerApi.createPickupWindow", () => {
  it("POSTs pickup window input to correct URL", async () => {
    const input = {
      pickup_location_id: "loc-1",
      start_at: "2025-06-01T10:00:00Z",
      end_at: "2025-06-01T12:00:00Z",
      cutoff_at: "2025-05-31T22:00:00Z",
    };
    await sellerApi.createPickupWindow("tok", "store-1", input);

    const [path, init] = mockRequestJSON.mock.calls[0];
    expect(path).toBe("/v1/seller/stores/store-1/pickup-windows");
    expect(init.method).toBe("POST");
    expect(init.token).toBe("tok");
    expect(JSON.parse(init.body)).toEqual(input);
  });
});

describe("sellerApi.listProducts", () => {
  it("GETs /v1/seller/stores/:id/products with token", async () => {
    await sellerApi.listProducts("tok", "store-1");

    expect(mockRequestJSON).toHaveBeenCalledWith(
      "/v1/seller/stores/store-1/products",
      { token: "tok" },
    );
  });
});

describe("sellerApi.createProduct", () => {
  it("POSTs product input to correct URL", async () => {
    await sellerApi.createProduct("tok", "store-1", {
      title: "Tomatoes",
      unit: "lb",
      description: "Red ones",
    });

    const [path, init] = mockRequestJSON.mock.calls[0];
    expect(path).toBe("/v1/seller/stores/store-1/products");
    expect(init.method).toBe("POST");
    expect(init.token).toBe("tok");
    const body = JSON.parse(init.body);
    expect(body.title).toBe("Tomatoes");
    expect(body.unit).toBe("lb");
    expect(body.description).toBe("Red ones");
  });
});

describe("sellerApi.listOfferings", () => {
  it("GETs offerings for a pickup window with token", async () => {
    await sellerApi.listOfferings("tok", "store-1", "pw-1");

    expect(mockRequestJSON).toHaveBeenCalledWith(
      "/v1/seller/stores/store-1/pickup-windows/pw-1/offerings",
      { token: "tok" },
    );
  });
});

describe("sellerApi.createOffering", () => {
  it("POSTs offering to correct URL", async () => {
    await sellerApi.createOffering("tok", "store-1", "pw-1", {
      product_id: "prod-1",
      price_cents: 500,
      quantity_available: 10,
    });

    const [path, init] = mockRequestJSON.mock.calls[0];
    expect(path).toBe(
      "/v1/seller/stores/store-1/pickup-windows/pw-1/offerings",
    );
    expect(init.method).toBe("POST");
    expect(init.token).toBe("tok");
    const body = JSON.parse(init.body);
    expect(body.product_id).toBe("prod-1");
    expect(body.price_cents).toBe(500);
    expect(body.quantity_available).toBe(10);
  });
});

describe("sellerApi.listOrders", () => {
  it("GETs orders for a pickup window", async () => {
    await sellerApi.listOrders("tok", "store-1", "pw-1");

    expect(mockRequestJSON).toHaveBeenCalledWith(
      "/v1/seller/stores/store-1/pickup-windows/pw-1/orders",
      { token: "tok" },
    );
  });
});

describe("sellerApi.getPayoutSummary", () => {
  it("GETs payout summary for a pickup window", async () => {
    await sellerApi.getPayoutSummary("tok", "store-1", "pw-1");

    expect(mockRequestJSON).toHaveBeenCalledWith(
      "/v1/seller/stores/store-1/pickup-windows/pw-1/payout-summary",
      { token: "tok" },
    );
  });
});

describe("sellerApi.updateOrderStatus", () => {
  it("POSTs status update to /v1/seller/stores/:storeId/orders/:orderId/status", async () => {
    await sellerApi.updateOrderStatus("tok", "store-1", "order-1", "ready");

    const [path, init] = mockRequestJSON.mock.calls[0];
    expect(path).toBe("/v1/seller/stores/store-1/orders/order-1/status");
    expect(init.method).toBe("POST");
    expect(init.token).toBe("tok");
    const body = JSON.parse(init.body);
    expect(body.status).toBe("ready");
    expect(body.waive_fee).toBe(false);
  });

  it("passes waive_fee option when provided", async () => {
    await sellerApi.updateOrderStatus("tok", "store-1", "order-1", "canceled", {
      waive_fee: true,
    });

    const body = JSON.parse(mockRequestJSON.mock.calls[0][1].body);
    expect(body.waive_fee).toBe(true);
  });
});

describe("sellerApi.confirmPickup", () => {
  it("POSTs pickup_code to confirm-pickup endpoint", async () => {
    await sellerApi.confirmPickup("tok", "store-1", "order-1", "ABCD");

    const [path, init] = mockRequestJSON.mock.calls[0];
    expect(path).toBe(
      "/v1/seller/stores/store-1/orders/order-1/confirm-pickup",
    );
    expect(init.method).toBe("POST");
    expect(init.token).toBe("tok");
    const body = JSON.parse(init.body);
    expect(body.pickup_code).toBe("ABCD");
  });
});

describe("sellerApi.listSubscriptionPlans", () => {
  it("GETs /v1/seller/stores/:id/subscription-plans with token", async () => {
    await sellerApi.listSubscriptionPlans("tok", "store-1");

    expect(mockRequestJSON).toHaveBeenCalledWith(
      "/v1/seller/stores/store-1/subscription-plans",
      { token: "tok" },
    );
  });
});

describe("sellerApi.createSubscriptionPlan", () => {
  it("POSTs plan input to correct URL", async () => {
    const input = {
      pickup_location_id: "loc-1",
      title: "Weekly Box",
      cadence: "weekly" as const,
      price_cents: 2500,
      subscriber_limit: 50,
      first_start_at_local: "2025-06-01T10:00",
      duration_minutes: 120,
      cutoff_hours: 24,
    };
    await sellerApi.createSubscriptionPlan("tok", "store-1", input);

    const [path, init] = mockRequestJSON.mock.calls[0];
    expect(path).toBe("/v1/seller/stores/store-1/subscription-plans");
    expect(init.method).toBe("POST");
    expect(init.token).toBe("tok");
    expect(JSON.parse(init.body)).toEqual(input);
  });
});

describe("sellerApi.generateNextCycle", () => {
  it("POSTs to generate-cycle endpoint with empty body", async () => {
    await sellerApi.generateNextCycle("tok", "store-1", "plan-1");

    const [path, init] = mockRequestJSON.mock.calls[0];
    expect(path).toBe(
      "/v1/seller/stores/store-1/subscription-plans/plan-1/generate-cycle",
    );
    expect(init.method).toBe("POST");
    expect(init.token).toBe("tok");
    expect(JSON.parse(init.body)).toEqual({});
  });
});

describe("sellerApi.placesAutocomplete", () => {
  it("POSTs input and session_token to autocomplete endpoint", async () => {
    await sellerApi.placesAutocomplete("tok", "123 Main", "sess-1");

    const [path, init] = mockRequestJSON.mock.calls[0];
    expect(path).toBe("/v1/seller/geo/places/autocomplete");
    expect(init.method).toBe("POST");
    expect(init.token).toBe("tok");
    const body = JSON.parse(init.body);
    expect(body.input).toBe("123 Main");
    expect(body.session_token).toBe("sess-1");
  });
});

describe("sellerApi.placesDetails", () => {
  it("POSTs place_id and session_token to details endpoint", async () => {
    await sellerApi.placesDetails("tok", "place-123", "sess-1");

    const [path, init] = mockRequestJSON.mock.calls[0];
    expect(path).toBe("/v1/seller/geo/places/details");
    expect(init.method).toBe("POST");
    expect(init.token).toBe("tok");
    const body = JSON.parse(init.body);
    expect(body.place_id).toBe("place-123");
    expect(body.session_token).toBe("sess-1");
  });
});
