const TOKEN_KEY = "localroots_token";
const LEGACY_BUYER_TOKEN_KEY = "localroots_buyer_token";

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
  },
  clearToken() {
    if (typeof window === "undefined") return;
    window.localStorage.removeItem(TOKEN_KEY);
    window.localStorage.removeItem(LEGACY_BUYER_TOKEN_KEY);
  },
};

/**
 * @deprecated Use `session` instead. This shim exists only to migrate users
 * who still have tokens stored under the old `localroots_buyer_token` key.
 */
export const buyerSession = {
  getToken(): string | null {
    // Unified key first, then fall back to legacy key for migration.
    return session.getToken() ?? (typeof window !== "undefined" ? window.localStorage.getItem(LEGACY_BUYER_TOKEN_KEY) : null);
  },
  setToken(token: string) {
    session.setToken(token);
  },
  clearToken() {
    session.clearToken();
  },
};

