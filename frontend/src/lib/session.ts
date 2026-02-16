const TOKEN_KEY = "localroots_token";
const BUYER_TOKEN_KEY = "localroots_buyer_token";

export const session = {
  getToken(): string | null {
    if (typeof window === "undefined") return null;
    return window.localStorage.getItem(TOKEN_KEY);
  },
  setToken(token: string) {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(TOKEN_KEY, token);
  },
  clearToken() {
    if (typeof window === "undefined") return;
    window.localStorage.removeItem(TOKEN_KEY);
  },
};

export const buyerSession = {
  getToken(): string | null {
    if (typeof window === "undefined") return null;
    return window.localStorage.getItem(BUYER_TOKEN_KEY);
  },
  setToken(token: string) {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(BUYER_TOKEN_KEY, token);
  },
  clearToken() {
    if (typeof window === "undefined") return;
    window.localStorage.removeItem(BUYER_TOKEN_KEY);
  },
};

