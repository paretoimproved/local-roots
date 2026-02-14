const SUB_TOKEN_KEY_PREFIX = "localroots_sub_token:";

export const subscriptionToken = {
  get(subscriptionId: string): string | null {
    if (typeof window === "undefined") return null;
    return window.localStorage.getItem(`${SUB_TOKEN_KEY_PREFIX}${subscriptionId}`);
  },
  set(subscriptionId: string, token: string) {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(`${SUB_TOKEN_KEY_PREFIX}${subscriptionId}`, token);
  },
  clear(subscriptionId: string) {
    if (typeof window === "undefined") return;
    window.localStorage.removeItem(`${SUB_TOKEN_KEY_PREFIX}${subscriptionId}`);
  },
};

