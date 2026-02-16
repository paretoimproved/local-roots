import { describe, it, expect } from "vitest";

import { formatMoney, friendlyErrorMessage } from "@/lib/ui";

describe("formatMoney", () => {
  it("formats 0 cents as $0.00", () => {
    expect(formatMoney(0)).toBe("$0.00");
  });

  it("formats 100 cents as $1.00", () => {
    expect(formatMoney(100)).toBe("$1.00");
  });

  it("formats 2550 cents as $25.50", () => {
    expect(formatMoney(2550)).toBe("$25.50");
  });

  it("formats 999 cents as $9.99", () => {
    expect(formatMoney(999)).toBe("$9.99");
  });
});

describe("friendlyErrorMessage", () => {
  it("returns the message from an Error object", () => {
    expect(friendlyErrorMessage(new Error("Something broke"))).toBe(
      "Something broke",
    );
  });

  it("converts non-Error values to string", () => {
    expect(friendlyErrorMessage("raw string error")).toBe("raw string error");
    expect(friendlyErrorMessage(42)).toBe("42");
    expect(friendlyErrorMessage(null)).toBe("null");
    expect(friendlyErrorMessage(undefined)).toBe("undefined");
  });

  it("replaces messages containing TypeError with a generic user-friendly message", () => {
    // The regex checks if the message text itself contains the word "TypeError".
    // This matches stringified errors like "TypeError: Cannot read properties..."
    const result = friendlyErrorMessage(
      new Error("TypeError: Cannot read properties of undefined"),
    );
    expect(result).toBe(
      "Something went wrong. Please refresh and try again. If this keeps happening, contact support.",
    );
  });

  it("replaces messages containing ReferenceError with a generic user-friendly message", () => {
    const result = friendlyErrorMessage(
      new Error("ReferenceError: x is not defined"),
    );
    expect(result).toBe(
      "Something went wrong. Please refresh and try again. If this keeps happening, contact support.",
    );
  });

  it("replaces messages containing SyntaxError with a generic user-friendly message", () => {
    const result = friendlyErrorMessage(
      new Error("SyntaxError: Unexpected token"),
    );
    expect(result).toBe(
      "Something went wrong. Please refresh and try again. If this keeps happening, contact support.",
    );
  });

  it("does not replace native error subclasses when message lacks the type name", () => {
    // A native TypeError whose message does NOT contain "TypeError" passes through
    const result = friendlyErrorMessage(
      new TypeError("Cannot read properties of undefined"),
    );
    expect(result).toBe("Cannot read properties of undefined");
  });

  it("extracts error field from API JSON error response", () => {
    const result = friendlyErrorMessage(
      new Error('API 400: {"error":"Email is required"}'),
    );
    expect(result).toBe("Email is required");
  });

  it("returns raw text for API error without JSON body", () => {
    const result = friendlyErrorMessage(
      new Error("API 500: Internal Server Error"),
    );
    expect(result).toBe("Internal Server Error");
  });

  it("falls through for API error with empty capture group", () => {
    // "API 500: " — the regex captures "" (empty) after \s* consumes the space,
    // so m[1] is falsy and it falls through to return the raw message.
    const result = friendlyErrorMessage(new Error("API 500: "));
    expect(result).toBe("API 500: ");
  });

  it("returns fallback for API error with only whitespace text", () => {
    // "API 500: something  " — non-empty capture, but after trim the text is used
    const result = friendlyErrorMessage(new Error("API 404: Not Found"));
    expect(result).toBe("Not Found");
  });

  it("returns the original message for non-API errors", () => {
    const result = friendlyErrorMessage(new Error("Network request failed"));
    expect(result).toBe("Network request failed");
  });
});
