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

/** Attempt to refresh the session using the stored refresh token. Returns true on success. */
async function tryRefreshSession(): Promise<boolean> {
  const refreshToken = session.getRefreshToken();
  if (!refreshToken) return false;

  try {
    // Raw fetch — must NOT go through requestJSON to avoid infinite 401 loop.
    const res = await fetch(`${apiBaseUrl()}/v1/auth/refresh`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refresh_token: refreshToken }),
      cache: "no-store",
    });

    if (!res.ok) return false;

    const data = await res.json();
    if (data.token) {
      session.setToken(data.token);
      if (data.refresh_token) session.setRefreshToken(data.refresh_token);
      return true;
    }
    return false;
  } catch {
    return false;
  }
}

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
      const currentPath = window.location.pathname;
      // Never redirect login/register/auth pages — their 401s are login failures, not session expiry.
      const isAuthPage = /^\/(seller|buyer)\/(login|register|auth)/.test(currentPath);

      if (!isAuthPage) {
        // Attempt silent refresh before giving up.
        const refreshed = await tryRefreshSession();

        if (refreshed) {
          // Retry the original request once with the new token.
          const retryHeaders = new Headers(init.headers);
          retryHeaders.set("Content-Type", "application/json");
          const newToken = init.token ? session.getToken() : null;
          if (newToken) retryHeaders.set("Authorization", `Bearer ${newToken}`);

          const retryRes = await fetch(`${apiBaseUrl()}${path}`, {
            ...init,
            headers: retryHeaders,
            cache,
          });

          if (retryRes.ok) {
            return (await retryRes.json()) as T;
          }
          // Retry also failed — fall through to redirect.
        }

        session.clearToken();
        let loginUrl: string | null = null;
        if (currentPath.startsWith("/seller") || currentPath.startsWith("/pickup/confirm")) {
          loginUrl = "/seller/login";
        } else if (currentPath.startsWith("/buyer")) {
          loginUrl = "/buyer/login";
        }
        if (loginUrl) {
          const next = currentPath + window.location.search;
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
