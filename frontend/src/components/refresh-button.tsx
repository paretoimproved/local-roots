"use client";

export function RefreshButton() {
  return (
    <button
      type="button"
      className="mt-2 text-sm font-medium underline"
      onClick={() => window.location.reload()}
    >
      Try again
    </button>
  );
}
