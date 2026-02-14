const keyFor = (orderId: string) => `localroots_order_token_${orderId}`;

export const orderToken = {
  get(orderId: string): string | null {
    if (typeof window === "undefined") return null;
    return window.localStorage.getItem(keyFor(orderId));
  },
  set(orderId: string, token: string) {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(keyFor(orderId), token);
  },
};

