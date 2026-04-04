import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { session } from "@/lib/session";

describe("session (browser)", () => {
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

  it("returns null when no token is stored", () => {
    expect(session.getToken()).toBeNull();
  });

  it("stores and retrieves a token", () => {
    session.setToken("tok_abc");
    expect(session.getToken()).toBe("tok_abc");
  });

  it("clears a stored token", () => {
    session.setToken("tok_abc");
    session.clearToken();
    expect(session.getToken()).toBeNull();
  });

  it("uses the correct localStorage key", () => {
    session.setToken("tok_xyz");
    expect(window.localStorage.setItem).toHaveBeenCalledWith(
      "localroots_token",
      "tok_xyz",
    );
  });

  it("setToken removes legacy buyer key", () => {
    store["localroots_buyer_token"] = "old_buyer_tok";
    session.setToken("unified_tok");
    expect(window.localStorage.removeItem).toHaveBeenCalledWith(
      "localroots_buyer_token",
    );
    expect(store["localroots_buyer_token"]).toBeUndefined();
  });

  it("clearToken removes both keys", () => {
    store["localroots_token"] = "tok";
    store["localroots_buyer_token"] = "buyer_tok";
    session.clearToken();
    expect(store["localroots_token"]).toBeUndefined();
    expect(store["localroots_buyer_token"]).toBeUndefined();
  });

  // Refresh token tests
  it("returns null when no refresh token is stored", () => {
    expect(session.getRefreshToken()).toBeNull();
  });

  it("stores and retrieves a refresh token", () => {
    session.setRefreshToken("rt_abc");
    expect(session.getRefreshToken()).toBe("rt_abc");
  });

  it("clears a refresh token", () => {
    session.setRefreshToken("rt_abc");
    session.clearRefreshToken();
    expect(session.getRefreshToken()).toBeNull();
  });

  it("uses the correct localStorage key for refresh token", () => {
    session.setRefreshToken("rt_xyz");
    expect(window.localStorage.setItem).toHaveBeenCalledWith(
      "localroots_refresh_token",
      "rt_xyz",
    );
  });

  it("clearToken also clears refresh token", () => {
    store["localroots_token"] = "tok";
    store["localroots_refresh_token"] = "rt";
    session.clearToken();
    expect(store["localroots_token"]).toBeUndefined();
    expect(store["localroots_refresh_token"]).toBeUndefined();
  });
});

describe("session (SSR / no window)", () => {
  beforeEach(() => {
    vi.stubGlobal("window", undefined);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("getToken returns null when window is undefined", () => {
    expect(session.getToken()).toBeNull();
  });

  it("setToken does not throw when window is undefined", () => {
    expect(() => session.setToken("tok")).not.toThrow();
  });

  it("clearToken does not throw when window is undefined", () => {
    expect(() => session.clearToken()).not.toThrow();
  });

  it("getRefreshToken returns null when window is undefined", () => {
    expect(session.getRefreshToken()).toBeNull();
  });

  it("setRefreshToken does not throw when window is undefined", () => {
    expect(() => session.setRefreshToken("rt")).not.toThrow();
  });

  it("clearRefreshToken does not throw when window is undefined", () => {
    expect(() => session.clearRefreshToken()).not.toThrow();
  });
});
