import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Policies — Local Roots",
  description:
    "How payments, pickups, subscriptions, and refunds work on Local Roots.",
};

export default function PoliciesPage() {
  return (
    <div className="grid gap-6">
      <header className="grid gap-2">
        <Link
          className="lr-btn lr-chip inline-flex w-fit items-center gap-2 px-4 py-2 text-sm font-medium text-[color:var(--lr-ink)]"
          href="/"
        >
          <span aria-hidden="true">&larr;</span>
          Home
        </Link>
        <div>
          <h1 className="text-3xl font-semibold tracking-tight text-[color:var(--lr-ink)]">
            Policies
          </h1>
          <p className="mt-1 text-sm text-[color:var(--lr-muted)]">
            How payments, pickups, and subscriptions work on LocalRoots.
          </p>
        </div>
      </header>

      <section className="lr-card lr-card-strong grid gap-6 p-6">
        {/* Subscriptions */}
        <div>
          <h2 className="text-base font-semibold text-[color:var(--lr-ink)]">
            Subscriptions
          </h2>
          <ul className="mt-2 grid gap-2 text-sm text-[color:var(--lr-muted)]">
            <li>
              You can cancel, pause, or resume your subscription at any time
              from your dashboard.
            </li>
            <li>
              If you cancel or pause before the pickup-window cutoff, your
              upcoming cycle will not be charged.
            </li>
            <li>
              If you cancel or pause after the cutoff, the current cycle is
              non-refundable &mdash; your box has already been prepared.
              Future cycles will not be charged.
            </li>
          </ul>
        </div>

        {/* One-Time Orders */}
        <div>
          <h2 className="text-base font-semibold text-[color:var(--lr-ink)]">
            One-Time Orders
          </h2>
          <ul className="mt-2 grid gap-2 text-sm text-[color:var(--lr-muted)]">
            <li>
              Your card is authorized at checkout. The charge is captured when
              the seller confirms your pickup.
            </li>
            <li>
              You can cancel a one-time order before the pickup-window cutoff
              for a full void of the authorization.
            </li>
          </ul>
        </div>

        {/* Payments & Fees */}
        <div>
          <h2 className="text-base font-semibold text-[color:var(--lr-ink)]">
            Payments &amp; Fees
          </h2>
          <ul className="mt-2 grid gap-2 text-sm text-[color:var(--lr-muted)]">
            <li>
              A 7% + $0.35 buyer service fee is added to each order. This fee
              supports the platform &mdash; sellers pay nothing.
            </li>
            <li>
              Card authorizations are placed within 7 days of the pickup
              window. If your pickup is further out, we save your card and
              authorize closer to the date.
            </li>
            <li>
              Payment is captured when the seller confirms your pickup using
              your 6-digit code or QR scan.
            </li>
          </ul>
        </div>

        {/* Pickup & No-Shows */}
        <div>
          <h2 className="text-base font-semibold text-[color:var(--lr-ink)]">
            Pickup &amp; No-Shows
          </h2>
          <ul className="mt-2 grid gap-2 text-sm text-[color:var(--lr-muted)]">
            <li>
              At pickup, present your 6-digit code or QR code to the seller.
              The seller scans or enters it to confirm.
            </li>
            <li>
              If you don&rsquo;t pick up your order, the box is forfeited.
              What happens to unclaimed boxes is at the seller&rsquo;s
              discretion. No additional no-show fee is charged.
            </li>
          </ul>
        </div>

        {/* Refunds */}
        <div>
          <h2 className="text-base font-semibold text-[color:var(--lr-ink)]">
            Refunds
          </h2>
          <ul className="mt-2 grid gap-2 text-sm text-[color:var(--lr-muted)]">
            <li>
              If the seller cancels your order, you receive a full refund.
            </li>
            <li>
              If you cancel before the pickup-window cutoff, the authorization
              is voided in full.
            </li>
            <li>
              After the cutoff, orders are non-refundable &mdash; the seller
              has already prepared your box.
            </li>
            <li>
              Disputes and edge cases are handled on a case-by-case basis.
              Contact support if something looks wrong with an order.
            </li>
          </ul>
        </div>

        {/* Your Data */}
        <div>
          <h2 className="text-base font-semibold text-[color:var(--lr-ink)]">
            Your Data
          </h2>
          <ul className="mt-2 grid gap-2 text-sm text-[color:var(--lr-muted)]">
            <li>
              We collect minimal data: your name, email, and delivery
              preferences. Payment card details are handled entirely by
              Stripe&nbsp;&mdash; we never see or store your card number.
            </li>
            <li>
              Your data is not sold to third parties. We use it only to
              operate the service.
            </li>
          </ul>
        </div>
      </section>

      <div className="rounded-2xl bg-white/60 p-4 text-xs text-[color:var(--lr-muted)] ring-1 ring-[color:var(--lr-border)]">
        Last updated February 2026. Questions? Contact support and
        we&rsquo;ll sort it out.
      </div>
    </div>
  );
}
