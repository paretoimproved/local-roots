function apiBaseUrl() {
  return (
    process.env.NEXT_PUBLIC_API_BASE_URL?.replace(/\/+$/, "") ||
    "http://localhost:8080"
  );
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
    throw new Error(`API ${res.status}: ${text || res.statusText}`);
  }

  return (await res.json()) as T;
}

export function getApiBaseUrlForDebug() {
  return apiBaseUrl();
}
