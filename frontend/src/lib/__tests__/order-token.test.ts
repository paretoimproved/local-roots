import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { orderToken } from "@/lib/order-token";

describe("orderToken (browser)", () => {
  const store: Record<string, string> = {};

  beforeEach(() => {
    Object.keys(store).forEach((k) => delete store[k]);

    vi.stubGlobal("window", {
      localStorage: {
        getItem: vi.fn((key: string) => store[key] ?? null),
        setItem: vi.fn((key: string, val: string) => {
          store[key] = val;
        }),
      },
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("returns null when no token exists for order", () => {
    expect(orderToken.get("order-1")).toBeNull();
  });

  it("stores and retrieves a token for a specific order", () => {
    orderToken.set("order-1", "tok_order_1");
    expect(orderToken.get("order-1")).toBe("tok_order_1");
  });

  it("isolates tokens by order ID", () => {
    orderToken.set("order-1", "tok_1");
    orderToken.set("order-2", "tok_2");
    expect(orderToken.get("order-1")).toBe("tok_1");
    expect(orderToken.get("order-2")).toBe("tok_2");
  });

  it("uses the correct localStorage key format", () => {
    orderToken.set("order-abc", "tok");
    expect(window.localStorage.setItem).toHaveBeenCalledWith(
      "localroots_order_token_order-abc",
      "tok",
    );
  });
});

describe("orderToken (SSR / no window)", () => {
  beforeEach(() => {
    vi.stubGlobal("window", undefined);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("get returns null when window is undefined", () => {
    expect(orderToken.get("order-1")).toBeNull();
  });

  it("set does not throw when window is undefined", () => {
    expect(() => orderToken.set("order-1", "tok")).not.toThrow();
  });
});
