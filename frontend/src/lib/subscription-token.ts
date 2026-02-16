const KEY_PREFIX = "localroots_sub_token_";
const OLD_KEY_PREFIX = "localroots_sub_token:";

export const subscriptionToken = {
  get(subscriptionId: string): string | null {
    if (typeof window === "undefined") return null;
    const val = window.localStorage.getItem(`${KEY_PREFIX}${subscriptionId}`);
    if (val) return val;
    // Migrate old colon-separated key if present
    const old = window.localStorage.getItem(`${OLD_KEY_PREFIX}${subscriptionId}`);
    if (old) {
      window.localStorage.setItem(`${KEY_PREFIX}${subscriptionId}`, old);
      window.localStorage.removeItem(`${OLD_KEY_PREFIX}${subscriptionId}`);
      return old;
    }
    return null;
  },
  set(subscriptionId: string, token: string) {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(`${KEY_PREFIX}${subscriptionId}`, token);
  },
  clear(subscriptionId: string) {
    if (typeof window === "undefined") return;
    window.localStorage.removeItem(`${KEY_PREFIX}${subscriptionId}`);
  },
};

