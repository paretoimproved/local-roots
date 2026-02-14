"use client";

import Link from "next/link";

export default function PoliciesPage() {
  return (
    <div className="grid gap-6">
      <header className="grid gap-2">
        <Link
          className="lr-btn lr-chip inline-flex w-fit items-center gap-2 px-4 py-2 text-sm font-medium text-[color:var(--lr-ink)]"
          href="/"
        >
          <span aria-hidden="true">←</span>
          Home
        </Link>
        <div>
          <h1 className="text-3xl font-semibold tracking-tight text-[color:var(--lr-ink)]">
            Policies
          </h1>
          <p className="mt-1 text-sm text-[color:var(--lr-muted)]">
            MVP policies for local pickup subscription boxes.
          </p>
        </div>
      </header>

      <section className="lr-card lr-card-strong grid gap-4 p-6">
        <div>
          <h2 className="text-base font-semibold text-[color:var(--lr-ink)]">
            Payments
          </h2>
          <ul className="mt-2 grid gap-2 text-sm text-[color:var(--lr-muted)]">
            <li>
              Card payments are authorized in advance and captured when pickup is
              confirmed.
            </li>
            <li>
              If your pickup is more than 7 days away, we may save your card
              first and authorize closer to pickup.
            </li>
          </ul>
        </div>

        <div>
          <h2 className="text-base font-semibold text-[color:var(--lr-ink)]">
            Pickup Confirmation
          </h2>
          <p className="mt-2 text-sm text-[color:var(--lr-muted)]">
            Sellers confirm pickup using a 6-digit pickup code (and QR scan in
            some flows). Captures happen on confirmation.
          </p>
        </div>

        <div>
          <h2 className="text-base font-semibold text-[color:var(--lr-ink)]">
            Cancellations, Cutoffs, No-Show
          </h2>
          <ul className="mt-2 grid gap-2 text-sm text-[color:var(--lr-muted)]">
            <li>
              You can cancel before the pickup window cutoff time shown on the
              box.
            </li>
            <li>
              After cutoff, the upcoming pickup is locked in for fulfillment.
            </li>
            <li>
              If you do not pick up, the seller may mark the order as no-show.
            </li>
          </ul>
        </div>

        <div className="rounded-2xl bg-white/60 p-4 text-xs text-[color:var(--lr-muted)] ring-1 ring-[color:var(--lr-border)]">
          These policies will evolve. Contact support if something looks wrong
          with an order.
        </div>
      </section>
    </div>
  );
}

