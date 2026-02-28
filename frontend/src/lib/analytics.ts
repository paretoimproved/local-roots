// Thin analytics abstraction — swap providers by changing the init.
// Set NEXT_PUBLIC_POSTHOG_KEY to enable. Without it, all calls are no-ops.

let initialized = false;

export function initAnalytics(): void {
  const key = process.env.NEXT_PUBLIC_POSTHOG_KEY;
  if (!key || typeof window === "undefined") return;

  // Lazy-load posthog-js to avoid blocking the main bundle.
  import("posthog-js")
    .then(({ default: posthog }) => {
      posthog.init(key, {
        api_host:
          process.env.NEXT_PUBLIC_POSTHOG_HOST ||
          "https://us.i.posthog.com",
        capture_pageview: true,
        capture_pageleave: true,
        loaded: () => {
          initialized = true;
        },
      });
    })
    .catch(() => {
      // Analytics failure should never break the app.
    });
}

export function track(
  event: string,
  properties?: Record<string, string | number | boolean | null>,
): void {
  if (!initialized || typeof window === "undefined") return;
  import("posthog-js")
    .then(({ default: posthog }) => {
      posthog.capture(event, properties);
    })
    .catch(() => {});
}

export function identify(
  userId: string,
  traits?: Record<string, string | number | boolean | null>,
): void {
  if (!initialized || typeof window === "undefined") return;
  import("posthog-js")
    .then(({ default: posthog }) => {
      posthog.identify(userId, traits);
    })
    .catch(() => {});
}
