import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { subscriptionToken } from "@/lib/subscription-token";

describe("subscriptionToken (browser)", () => {
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

  it("returns null when no token exists", () => {
    expect(subscriptionToken.get("sub-1")).toBeNull();
  });

  it("stores and retrieves a token", () => {
    subscriptionToken.set("sub-1", "tok_sub_1");
    expect(subscriptionToken.get("sub-1")).toBe("tok_sub_1");
  });

  it("clears a token for a specific subscription", () => {
    subscriptionToken.set("sub-1", "tok_sub_1");
    subscriptionToken.clear("sub-1");
    expect(subscriptionToken.get("sub-1")).toBeNull();
  });

  it("isolates tokens by subscription ID", () => {
    subscriptionToken.set("sub-1", "tok_1");
    subscriptionToken.set("sub-2", "tok_2");
    expect(subscriptionToken.get("sub-1")).toBe("tok_1");
    expect(subscriptionToken.get("sub-2")).toBe("tok_2");
  });

  it("uses the correct localStorage key format", () => {
    subscriptionToken.set("sub-abc", "tok");
    expect(window.localStorage.setItem).toHaveBeenCalledWith(
      "localroots_sub_token:sub-abc",
      "tok",
    );
  });

  it("clear only removes the specified subscription token", () => {
    subscriptionToken.set("sub-1", "tok_1");
    subscriptionToken.set("sub-2", "tok_2");
    subscriptionToken.clear("sub-1");
    expect(subscriptionToken.get("sub-1")).toBeNull();
    expect(subscriptionToken.get("sub-2")).toBe("tok_2");
  });
});

describe("subscriptionToken (SSR / no window)", () => {
  beforeEach(() => {
    vi.stubGlobal("window", undefined);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("get returns null when window is undefined", () => {
    expect(subscriptionToken.get("sub-1")).toBeNull();
  });

  it("set does not throw when window is undefined", () => {
    expect(() => subscriptionToken.set("sub-1", "tok")).not.toThrow();
  });

  it("clear does not throw when window is undefined", () => {
    expect(() => subscriptionToken.clear("sub-1")).not.toThrow();
  });
});
