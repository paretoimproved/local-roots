import Link from "next/link";
import { ApiStatusChip } from "@/components/api-status-chip";

export default function Home() {
  return (
    <div className="grid gap-10">
      <section className="lr-card lr-card-strong lr-animate p-8">
        <h1 className="text-4xl font-semibold tracking-tight text-[color:var(--lr-ink)]">
          Produce, bread, eggs.
          <span className="block text-[color:var(--lr-muted)]">
            Pickup on your schedule.
          </span>
        </h1>
        <p className="mt-4 max-w-2xl text-base text-[color:var(--lr-muted)]">
          Sellers publish pickup windows and attach limited-batch offerings.
          Buyers order ahead and pick up locally, with fulfillment owned by the
          seller.
        </p>
        <div className="mt-6 flex flex-wrap gap-3">
          <Link
            className="lr-btn lr-btn-primary inline-flex items-center justify-center px-5 py-2 text-sm font-medium"
            href="/stores"
          >
            Browse stores
          </Link>
          <ApiStatusChip />
        </div>
      </section>

      <section className="grid gap-4">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-[color:var(--lr-muted)]">
          MVP constraints
        </h2>
        <ul className="grid gap-2 text-sm text-[color:var(--lr-muted)]">
          <li>Pickup only. Sellers define date, time window, and location.</li>
          <li>Produce/food only to start.</li>
          <li>Seller responsible for fulfillment; reviews post-fulfillment.</li>
          <li>One order per seller and pickup window (for now).</li>
        </ul>
      </section>
    </div>
  );
}
