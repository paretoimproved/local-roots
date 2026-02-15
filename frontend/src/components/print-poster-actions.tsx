"use client";

export function PrintPosterActions({ boxUrl }: { boxUrl: string }) {
  return (
    <div className="flex flex-wrap gap-2 print:hidden">
      <button
        type="button"
        className="lr-btn lr-btn-primary px-4 py-2 text-sm font-semibold"
        onClick={() => window.print()}
      >
        Print poster
      </button>
      <a
        className="lr-btn lr-chip px-4 py-2 text-sm font-semibold text-[color:var(--lr-ink)]"
        href={boxUrl}
        target="_blank"
        rel="noreferrer"
      >
        Open buyer page
      </a>
    </div>
  );
}

