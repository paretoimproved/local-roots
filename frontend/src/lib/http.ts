import { session } from "@/lib/session";

function apiBaseUrl() {
  return (
    process.env.NEXT_PUBLIC_API_BASE_URL?.replace(/\/+$/, "") ||
    "http://localhost:8080"
  );
}

export class SessionExpiredError extends Error {
  constructor() {
    super("Your session has expired. Redirecting to sign in...");
    this.name = "SessionExpiredError";
  }
}

export type RequestJSONInit = RequestInit & {
  token?: string;
  // For GET requests, allow Next.js caching when desired.
  next?: { revalidate?: number };
};

export async function requestJSON<T>(
  path: string,
  init: RequestJSONInit = {},
): Promise<T> {
  const headers = new Headers(init.headers);
  headers.set("Content-Type", "application/json");
  if (init.token) headers.set("Authorization", `Bearer ${init.token}`);

  const method = (init.method ?? "GET").toUpperCase();
  const cache = method === "GET" && init.next ? "force-cache" : "no-store";

  const res = await fetch(`${apiBaseUrl()}${path}`, {
    ...init,
    headers,
    cache,
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");

    if (res.status === 401 && typeof window !== "undefined") {
      const path = window.location.pathname;
      // Never redirect login/register pages — their 401s are login failures, not session expiry.
      const isAuthPage = /^\/(seller|buyer)\/(login|register|auth)/.test(path);
      if (!isAuthPage) {
        session.clearToken();
        let loginUrl: string | null = null;
        if (path.startsWith("/seller") || path.startsWith("/pickup/confirm")) {
          loginUrl = "/seller/login";
        } else if (path.startsWith("/buyer")) {
          loginUrl = "/buyer/login";
        }
        if (loginUrl) {
          const next = path + window.location.search;
          window.location.href = `${loginUrl}?expired=1&next=${encodeURIComponent(next)}`;
          throw new SessionExpiredError();
        }
      }
    }

    throw new Error(`API ${res.status}: ${text || res.statusText}`);
  }

  return (await res.json()) as T;
}

export function getApiBaseUrlForDebug() {
  return apiBaseUrl();
}
