export function formatMoney(cents: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(cents / 100);
}

/**
 * Parse an API error thrown by `requestJSON` and return the HTTP status code
 * and a parsed body (if JSON) or raw text.
 *
 * Returns `null` when the error is not an API error.
 */
export function parseApiError(e: unknown): {
  status: number;
  body: string;
  json: Record<string, unknown> | null;
} | null {
  const msg = e instanceof Error ? e.message : String(e);
  const m = msg.match(/^API\s+(\d+):\s*([\s\S]*)$/);
  if (!m) return null;
  const status = Number(m[1]);
  const body = (m[2] ?? "").trim();
  let json: Record<string, unknown> | null = null;
  try {
    const parsed = JSON.parse(body);
    if (parsed && typeof parsed === "object") json = parsed as Record<string, unknown>;
  } catch {
    // not JSON
  }
  return { status, body, json };
}

/**
 * Convert an API status + body into a human-readable message.
 * Never returns raw JSON or raw status codes.
 */
export function mapApiError(status: number, body: string): string {
  // Try to extract a human-readable error string from JSON body.
  let jsonMsg: string | null = null;
  try {
    const parsed = JSON.parse(body) as { error?: string };
    if (parsed && typeof parsed.error === "string" && parsed.error.trim()) {
      jsonMsg = parsed.error.trim();
    }
  } catch {
    // not JSON
  }

  // 503 with "email not configured" → specific guidance
  if (status === 503 && /email.*(not configured|unavailable)/i.test(body)) {
    return "We\u2019re having trouble right now. Please try Google sign-in instead.";
  }

  // Auth errors
  if (status === 401 || status === 403) {
    return jsonMsg ?? "You don\u2019t have access. Please sign in again.";
  }

  // Not found
  if (status === 404) {
    return jsonMsg ?? "The requested resource was not found.";
  }

  // Rate limiting
  if (status === 429) {
    return "Too many requests. Please wait a moment before trying again.";
  }

  // Server errors
  if (status === 503) {
    return "This service is temporarily unavailable. Please try again later.";
  }

  // Return the extracted JSON error if it looks human-readable (no braces/brackets).
  if (jsonMsg && !/[{}[\]]/.test(jsonMsg)) {
    return jsonMsg;
  }

  // Catch-all — never raw JSON, never raw status codes.
  return "Something went wrong. Please try again.";
}

export function friendlyErrorMessage(e: unknown): string {
  const msg = e instanceof Error ? e.message : String(e);

  // Never show raw JS runtime errors in the UI.
  if (/\b(TypeError|ReferenceError|SyntaxError)\b/.test(msg)) {
    return "Something went wrong. Please refresh and try again. If this keeps happening, contact support.";
  }

  // requestJSON throws: `API <status>: <text>`
  const parsed = parseApiError(e);
  if (parsed) {
    return mapApiError(parsed.status, parsed.body);
  }

  return msg;
}

export function fieldClass(base: string, hasError: boolean): string {
  return `${base} ${hasError ? "border-rose-300 bg-rose-50/70" : ""}`.trim();
}

export function cadenceLabel(c: string): string {
  if (c === "weekly") return "Weekly";
  if (c === "biweekly") return "Every two weeks";
  if (c === "monthly") return "Monthly";
  return c;
}
