const TOKEN_KEY = "localroots_token";
const REFRESH_TOKEN_KEY = "localroots_refresh_token";
const LEGACY_BUYER_TOKEN_KEY = "localroots_buyer_token";

const listeners = new Set<() => void>();
function notify() { listeners.forEach((fn) => fn()); }

export function subscribe(fn: () => void) {
  listeners.add(fn);
  return () => { listeners.delete(fn); };
}

if (typeof window !== "undefined") {
  window.addEventListener("storage", (e) => {
    if (e.key === TOKEN_KEY || e.key === LEGACY_BUYER_TOKEN_KEY || e.key === REFRESH_TOKEN_KEY) {
      notify();
    }
  });
}

export const session = {
  getToken(): string | null {
    if (typeof window === "undefined") return null;
    return window.localStorage.getItem(TOKEN_KEY);
  },
  setToken(token: string) {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(TOKEN_KEY, token);
    // Remove legacy buyer key so there's only one source of truth.
    window.localStorage.removeItem(LEGACY_BUYER_TOKEN_KEY);
    notify();
  },
  clearToken() {
    if (typeof window === "undefined") return;
    window.localStorage.removeItem(TOKEN_KEY);
    window.localStorage.removeItem(LEGACY_BUYER_TOKEN_KEY);
    window.localStorage.removeItem(REFRESH_TOKEN_KEY);
    notify();
  },
  getRefreshToken(): string | null {
    if (typeof window === "undefined") return null;
    return window.localStorage.getItem(REFRESH_TOKEN_KEY);
  },
  setRefreshToken(token: string) {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(REFRESH_TOKEN_KEY, token);
  },
  clearRefreshToken() {
    if (typeof window === "undefined") return;
    window.localStorage.removeItem(REFRESH_TOKEN_KEY);
  },
};


