import { describe, it, expect, vi, beforeEach } from "vitest";
import { requestJSON, getApiBaseUrlForDebug } from "@/lib/http";

const mockFetch = vi.fn();
vi.stubGlobal("fetch", mockFetch);

function jsonResponse(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function errorResponse(body: string, status: number) {
  return new Response(body, { status, statusText: "Error" });
}

beforeEach(() => {
  vi.clearAllMocks();
  delete process.env.NEXT_PUBLIC_API_BASE_URL;
});

describe("requestJSON", () => {
  it("makes a GET request and returns parsed JSON", async () => {
    mockFetch.mockResolvedValueOnce(jsonResponse({ ok: true }));

    const result = await requestJSON("/v1/test");

    expect(result).toEqual({ ok: true });
    expect(mockFetch).toHaveBeenCalledOnce();
    const [url, init] = mockFetch.mock.calls[0];
    expect(url).toBe("http://localhost:8080/v1/test");
    expect(init.method).toBeUndefined();
    expect(init.headers.get("Content-Type")).toBe("application/json");
    expect(init.cache).toBe("no-store");
  });

  it("uses NEXT_PUBLIC_API_BASE_URL when set", async () => {
    process.env.NEXT_PUBLIC_API_BASE_URL = "https://api.example.com/";
    mockFetch.mockResolvedValueOnce(jsonResponse({}));

    await requestJSON("/v1/test");

    const [url] = mockFetch.mock.calls[0];
    expect(url).toBe("https://api.example.com/v1/test");
  });

  it("strips trailing slashes from base URL", async () => {
    process.env.NEXT_PUBLIC_API_BASE_URL = "https://api.example.com///";
    mockFetch.mockResolvedValueOnce(jsonResponse({}));

    await requestJSON("/v1/test");

    const [url] = mockFetch.mock.calls[0];
    expect(url).toBe("https://api.example.com/v1/test");
  });

  it("sets Authorization header when token is provided", async () => {
    mockFetch.mockResolvedValueOnce(jsonResponse({}));

    await requestJSON("/v1/test", { token: "abc123" });

    const [, init] = mockFetch.mock.calls[0];
    expect(init.headers.get("Authorization")).toBe("Bearer abc123");
  });

  it("does not set Authorization header when no token", async () => {
    mockFetch.mockResolvedValueOnce(jsonResponse({}));

    await requestJSON("/v1/test");

    const [, init] = mockFetch.mock.calls[0];
    expect(init.headers.has("Authorization")).toBe(false);
  });

  it("uses force-cache for GET requests with next option", async () => {
    mockFetch.mockResolvedValueOnce(jsonResponse({}));

    await requestJSON("/v1/test", { method: "GET", next: { revalidate: 30 } });

    const [, init] = mockFetch.mock.calls[0];
    expect(init.cache).toBe("force-cache");
  });

  it("uses no-store for POST requests even with next option", async () => {
    mockFetch.mockResolvedValueOnce(jsonResponse({}));

    await requestJSON("/v1/test", {
      method: "POST",
      next: { revalidate: 30 },
    });

    const [, init] = mockFetch.mock.calls[0];
    expect(init.cache).toBe("no-store");
  });

  it("uses no-store for GET requests without next option", async () => {
    mockFetch.mockResolvedValueOnce(jsonResponse({}));

    await requestJSON("/v1/test", { method: "GET" });

    const [, init] = mockFetch.mock.calls[0];
    expect(init.cache).toBe("no-store");
  });

  it("throws on non-ok response with body text", async () => {
    mockFetch.mockResolvedValueOnce(errorResponse("Not found", 404));

    await expect(requestJSON("/v1/missing")).rejects.toThrow(
      "API 404: Not found",
    );
  });

  it("throws on non-ok response using statusText when body read fails", async () => {
    const res = new Response(null, { status: 500, statusText: "Server Error" });
    vi.spyOn(res, "text").mockRejectedValueOnce(new Error("read error"));
    mockFetch.mockResolvedValueOnce(res);

    await expect(requestJSON("/v1/fail")).rejects.toThrow(
      "API 500: Server Error",
    );
  });

  it("throws on non-ok response with empty body", async () => {
    mockFetch.mockResolvedValueOnce(errorResponse("", 403));

    await expect(requestJSON("/v1/forbidden")).rejects.toThrow("API 403:");
  });

  it("sends POST body through", async () => {
    mockFetch.mockResolvedValueOnce(jsonResponse({ id: "1" }));

    await requestJSON("/v1/create", {
      method: "POST",
      body: JSON.stringify({ name: "test" }),
    });

    const [, init] = mockFetch.mock.calls[0];
    expect(init.body).toBe('{"name":"test"}');
  });
});

describe("getApiBaseUrlForDebug", () => {
  it("returns default base URL", () => {
    expect(getApiBaseUrlForDebug()).toBe("http://localhost:8080");
  });

  it("returns configured base URL", () => {
    process.env.NEXT_PUBLIC_API_BASE_URL = "https://api.prod.com";
    expect(getApiBaseUrlForDebug()).toBe("https://api.prod.com");
  });
});
