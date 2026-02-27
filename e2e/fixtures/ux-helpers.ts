import type { Page } from "@playwright/test";

/**
 * Attaches a console error listener and returns a function to retrieve collected errors.
 * Filters out common noise: favicon 404s, analytics, browser extensions, HMR.
 */
export function createConsoleErrorCollector(page: Page) {
  const errors: string[] = [];

  page.on("console", (msg) => {
    if (msg.type() !== "error") return;
    const text = msg.text();
    // Filter noise
    if (text.includes("favicon")) return;
    if (text.includes("analytics")) return;
    if (text.includes("chrome-extension://")) return;
    if (text.includes("moz-extension://")) return;
    if (text.includes("[HMR]")) return;
    if (text.includes("Fast Refresh")) return;
    if (text.includes("Download the React DevTools")) return;
    if (text.includes("hydration")) return;
    errors.push(text);
  });

  return {
    getErrors: () => [...errors],
  };
}

/**
 * Scans visible page text for raw UUID patterns (8-4-4-4-12 hex).
 * Excludes content inside <details> elements (which may legitimately show IDs).
 */
export async function findVisibleUuids(page: Page): Promise<string[]> {
  return page.evaluate(() => {
    const uuidRegex =
      /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi;

    // Get all text nodes NOT inside <details>
    const walker = document.createTreeWalker(
      document.body,
      NodeFilter.SHOW_TEXT,
      {
        acceptNode(node) {
          let el = node.parentElement;
          while (el) {
            if (el.tagName === "DETAILS") return NodeFilter.FILTER_REJECT;
            // Also skip hidden elements
            const style = window.getComputedStyle(el);
            if (style.display === "none" || style.visibility === "hidden")
              return NodeFilter.FILTER_REJECT;
            el = el.parentElement;
          }
          return NodeFilter.FILTER_ACCEPT;
        },
      },
    );

    const uuids: string[] = [];
    let node: Node | null;
    while ((node = walker.nextNode())) {
      const text = node.textContent ?? "";
      const matches = text.match(uuidRegex);
      if (matches) uuids.push(...matches);
    }
    return uuids;
  });
}

/**
 * Scans visible page text for raw ISO timestamps like "2026-02-26T10:00:00".
 */
export async function findRawIsoTimestamps(page: Page): Promise<string[]> {
  return page.evaluate(() => {
    const isoRegex = /\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/g;
    const text = document.body.innerText;
    return text.match(isoRegex) ?? [];
  });
}

/**
 * Checks that dollar amounts visible on the page match $XX.XX format.
 * Returns any malformed prices found (e.g. "$5" without cents, "$5.5" with one decimal).
 */
export async function findMalformedPrices(page: Page): Promise<string[]> {
  return page.evaluate(() => {
    const text = document.body.innerText;
    // Find all dollar amounts
    const allPrices = text.match(/\$\d+[.\d]*/g) ?? [];
    // Good format: $X.XX or $XX.XX etc (exactly 2 decimal places)
    const goodFormat = /^\$\d+\.\d{2}$/;
    return allPrices.filter((p) => !goodFormat.test(p));
  });
}

/**
 * Basic accessibility checks: page has an h1, all images have alt text.
 */
export async function checkBasicA11y(
  page: Page,
): Promise<{ hasH1: boolean; imagesWithoutAlt: number }> {
  return page.evaluate(() => {
    const h1 = document.querySelector("h1");
    const images = document.querySelectorAll("img");
    let imagesWithoutAlt = 0;
    images.forEach((img) => {
      const alt = img.getAttribute("alt");
      if (!alt || alt.trim() === "") imagesWithoutAlt++;
    });
    return { hasH1: !!h1, imagesWithoutAlt };
  });
}
