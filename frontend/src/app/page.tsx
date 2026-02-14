import Link from "next/link";
import { ApiStatusChip } from "@/components/api-status-chip";

export default function Home() {
  return (
    <div className="grid gap-10">
      <section className="rounded-2xl bg-white p-8 text-zinc-950 shadow-sm ring-1 ring-zinc-950/5">
        <h1 className="text-3xl font-semibold tracking-tight text-zinc-950">
          Produce and food, for local pickup.
        </h1>
        <p className="mt-3 max-w-2xl text-zinc-700">
          Sellers publish pickup windows (date, time, location) and attach
          limited-batch offerings. Buyers order ahead and pick up locally.
        </p>
        <div className="mt-6 flex flex-wrap gap-3">
          <Link
            className="inline-flex items-center justify-center rounded-full bg-zinc-950 px-5 py-2 text-sm font-medium text-zinc-50 hover:bg-zinc-800"
            href="/stores"
          >
            Browse stores
          </Link>
          <ApiStatusChip />
        </div>
      </section>

      <section className="grid gap-4">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-600">
          MVP constraints
        </h2>
        <ul className="grid gap-2 text-sm text-zinc-700">
          <li>Pickup only. Sellers define date, time window, and location.</li>
          <li>Produce/food only to start.</li>
          <li>Seller responsible for fulfillment; reviews post-fulfillment.</li>
          <li>One order per seller and pickup window (for now).</li>
        </ul>
      </section>
    </div>
  );
}
