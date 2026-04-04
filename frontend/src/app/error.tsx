"use client";

import Link from "next/link";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <section className="lr-card lr-card-strong mx-auto max-w-md p-6">
      <h2 className="text-lg font-semibold text-[color:var(--lr-ink)]">
        Something went wrong
      </h2>
      <p className="mt-2 text-sm text-[color:var(--lr-muted)]">
        {error.message || "An unexpected error occurred."}
      </p>
      <div className="mt-4 flex flex-wrap gap-2">
        <button
          type="button"
          className="lr-btn lr-btn-primary px-4 py-2 text-sm font-semibold"
          onClick={reset}
        >
          Try again
        </button>
        <Link
          href="/"
          className="lr-btn px-4 py-2 text-sm font-semibold text-[color:var(--lr-ink)]"
        >
          Go home
        </Link>
      </div>
    </section>
  );
}
