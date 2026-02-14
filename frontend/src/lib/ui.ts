export function formatMoney(cents: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(cents / 100);
}

export function friendlyErrorMessage(e: unknown): string {
  const msg = e instanceof Error ? e.message : String(e);

  // Never show raw JS runtime errors in the UI.
  if (/\b(TypeError|ReferenceError|SyntaxError)\b/.test(msg)) {
    return "Something went wrong. Please refresh and try again.";
  }

  // requestJSON throws: `API <status>: <text>`
  const m = msg.match(/^API\s+\d+:\s*(.*)$/);
  if (m && m[1]) {
    const text = m[1].trim();
    try {
      const parsed = JSON.parse(text) as { error?: string };
      if (parsed && typeof parsed.error === "string" && parsed.error.trim()) {
        return parsed.error.trim();
      }
    } catch {
      // ignore
    }
    return text || "Request failed. Please try again.";
  }

  return msg;
}

export function fieldClass(base: string, hasError: boolean): string {
  return `${base} ${hasError ? "border-rose-300 bg-rose-50/70" : ""}`.trim();
}

