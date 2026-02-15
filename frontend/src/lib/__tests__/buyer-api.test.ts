import { describe, it, expect, vi, beforeEach } from "vitest";

const mockRequestJSON = vi.fn();
vi.mock("@/lib/http", () => ({
  requestJSON: (...args: unknown[]) => mockRequestJSON(...args),
}));

import { buyerApi, defaultItemQty } from "@/lib/buyer-api";
import type { Offering } from "@/lib/api";

beforeEach(() => {
  vi.clearAllMocks();
  mockRequestJSON.mockResolvedValue({});
});

describe("buyerApi.placeOrder", () => {
  it("POSTs to /v1/pickup-windows/:id/orders with input body", async () => {
    const input = {
      buyer: { email: "a@b.com", name: "Alice" },
      items: [{ offering_id: "off-1", quantity: 2 }],
    };
    await buyerApi.placeOrder("pw-1", input);

    expect(mockRequestJSON).toHaveBeenCalledWith(
      "/v1/pickup-windows/pw-1/orders",
      {
        method: "POST",
        body: JSON.stringify(input),
      },
    );
  });
});

describe("buyerApi.getOrder", () => {
  it("GETs /v1/orders/:id with bearer token", async () => {
    await buyerApi.getOrder("order-1", "tok_abc");

    expect(mockRequestJSON).toHaveBeenCalledWith("/v1/orders/order-1", {
      method: "GET",
      token: "tok_abc",
    });
  });
});

describe("buyerApi.subscribeToPlan", () => {
  it("POSTs to /v1/subscription-plans/:id/subscribe with formatted body", async () => {
    await buyerApi.subscribeToPlan("plan-1", {
      buyer: { email: "a@b.com" },
      payment_intent_id: "pi_123",
    });

    const [path, init] = mockRequestJSON.mock.calls[0];
    expect(path).toBe("/v1/subscription-plans/plan-1/subscribe");
    expect(init.method).toBe("POST");
    const body = JSON.parse(init.body);
    expect(body.payment_intent_id).toBe("pi_123");
    expect(body.setup_intent_id).toBeNull();
    expect(body.buyer.email).toBe("a@b.com");
    expect(body.buyer.name).toBeNull();
    expect(body.buyer.phone).toBeNull();
  });

  it("passes setup_intent_id when provided", async () => {
    await buyerApi.subscribeToPlan("plan-1", {
      buyer: { email: "a@b.com" },
      setup_intent_id: "seti_456",
    });

    const body = JSON.parse(mockRequestJSON.mock.calls[0][1].body);
    expect(body.setup_intent_id).toBe("seti_456");
    expect(body.payment_intent_id).toBeNull();
  });
});

describe("buyerApi.checkoutPlan", () => {
  it("POSTs to /v1/subscription-plans/:id/checkout with buyer info", async () => {
    await buyerApi.checkoutPlan("plan-1", {
      buyer: { email: "a@b.com", name: "Alice", phone: "555-1234" },
    });

    const [path, init] = mockRequestJSON.mock.calls[0];
    expect(path).toBe("/v1/subscription-plans/plan-1/checkout");
    expect(init.method).toBe("POST");
    const body = JSON.parse(init.body);
    expect(body.buyer.email).toBe("a@b.com");
    expect(body.buyer.name).toBe("Alice");
    expect(body.buyer.phone).toBe("555-1234");
  });

  it("nullifies optional buyer fields when not provided", async () => {
    await buyerApi.checkoutPlan("plan-1", {
      buyer: { email: "a@b.com" },
    });

    const body = JSON.parse(mockRequestJSON.mock.calls[0][1].body);
    expect(body.buyer.name).toBeNull();
    expect(body.buyer.phone).toBeNull();
  });
});

describe("buyerApi.getSubscription", () => {
  it("GETs /v1/subscriptions/:id with token", async () => {
    await buyerApi.getSubscription("sub-1", "tok_abc");

    expect(mockRequestJSON).toHaveBeenCalledWith("/v1/subscriptions/sub-1", {
      method: "GET",
      token: "tok_abc",
    });
  });
});

describe("buyerApi.updateSubscriptionStatus", () => {
  it("POSTs to /v1/subscriptions/:id/status with token and status", async () => {
    await buyerApi.updateSubscriptionStatus("sub-1", {
      token: "tok_abc",
      status: "paused",
    });

    const [path, init] = mockRequestJSON.mock.calls[0];
    expect(path).toBe("/v1/subscriptions/sub-1/status");
    expect(init.method).toBe("POST");
    expect(init.token).toBe("tok_abc");
    const body = JSON.parse(init.body);
    expect(body.status).toBe("paused");
  });
});

describe("buyerApi.setupSubscriptionPaymentMethod", () => {
  it("POSTs to /v1/subscriptions/:id/payment-method/setup with token", async () => {
    await buyerApi.setupSubscriptionPaymentMethod("sub-1", "tok_abc");

    expect(mockRequestJSON).toHaveBeenCalledWith(
      "/v1/subscriptions/sub-1/payment-method/setup",
      { method: "POST", token: "tok_abc" },
    );
  });
});

describe("buyerApi.confirmSubscriptionPaymentMethod", () => {
  it("POSTs with token and setup_intent_id", async () => {
    await buyerApi.confirmSubscriptionPaymentMethod("sub-1", {
      token: "tok_abc",
      setup_intent_id: "seti_123",
    });

    const [path, init] = mockRequestJSON.mock.calls[0];
    expect(path).toBe("/v1/subscriptions/sub-1/payment-method/confirm");
    expect(init.method).toBe("POST");
    expect(init.token).toBe("tok_abc");
    const body = JSON.parse(init.body);
    expect(body.setup_intent_id).toBe("seti_123");
  });
});

describe("buyerApi.createReview", () => {
  it("POSTs to /v1/orders/:id/review with rating and body", async () => {
    await buyerApi.createReview("order-1", {
      token: "tok_abc",
      rating: 5,
      body: "Great!",
    });

    const [path, init] = mockRequestJSON.mock.calls[0];
    expect(path).toBe("/v1/orders/order-1/review");
    expect(init.method).toBe("POST");
    const body = JSON.parse(init.body);
    expect(body.token).toBe("tok_abc");
    expect(body.rating).toBe(5);
    expect(body.body).toBe("Great!");
  });

  it("nullifies body when not provided", async () => {
    await buyerApi.createReview("order-1", {
      token: "tok_abc",
      rating: 3,
    });

    const body = JSON.parse(mockRequestJSON.mock.calls[0][1].body);
    expect(body.body).toBeNull();
  });
});

describe("defaultItemQty", () => {
  it("returns a record with all offering IDs set to 0", () => {
    const offerings = [
      { id: "a" },
      { id: "b" },
      { id: "c" },
    ] as Offering[];

    const result = defaultItemQty(offerings);
    expect(result).toEqual({ a: 0, b: 0, c: 0 });
  });

  it("returns empty object for empty offerings array", () => {
    expect(defaultItemQty([])).toEqual({});
  });
});
