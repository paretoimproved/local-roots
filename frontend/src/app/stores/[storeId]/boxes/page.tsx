import Link from "next/link";
import { api } from "@/lib/api";

function formatNext(plan: Awaited<ReturnType<typeof api.listStoreSubscriptionPlans>>[number]) {
  const tz = plan.pickup_location.timezone || "UTC";
  const start = new Date(plan.next_start_at);
  return new Intl.DateTimeFormat("en-US", {
    timeZone: tz,
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(start);
}

function formatMoney(cents: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(cents / 100);
}

function cadenceLabel(c: string) {
  if (c === "weekly") return "Weekly";
  if (c === "biweekly") return "Every two weeks";
  if (c === "monthly") return "Monthly";
  return c;
}

export default async function StoreBoxesPage({
  params,
}: {
  params: { storeId: string };
}) {
  const { storeId } = params;

  let plans: Awaited<ReturnType<typeof api.listStoreSubscriptionPlans>> | null =
    null;
  let error: string | null = null;

  try {
    plans = await api.listStoreSubscriptionPlans(storeId);
  } catch (e) {
    error = e instanceof Error ? e.message : "Unknown error";
  }

  return (
    <div className="grid gap-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="grid gap-1">
          <h1 className="text-3xl font-semibold tracking-tight text-[color:var(--lr-ink)]">
            Seasonal boxes
          </h1>
          <p className="text-sm text-[color:var(--lr-muted)]">
            Store: <span className="font-mono text-xs">{storeId}</span>
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <Link
            className="lr-btn px-4 py-2 text-sm font-semibold text-[color:var(--lr-ink)]"
            href={`/stores/${storeId}`}
          >
            Pickup windows
          </Link>
          <Link
            className="lr-btn lr-btn-primary px-4 py-2 text-sm font-semibold"
            href="/stores"
          >
            Browse stores
          </Link>
        </div>
      </div>

      {error ? (
        <div className="lr-card lr-card-strong p-6">
          <p className="text-sm font-medium text-[color:var(--lr-ink)]">
            Could not load boxes
          </p>
          <p className="mt-2 text-sm text-[color:var(--lr-muted)]">{error}</p>
        </div>
      ) : null}

      {plans && plans.length === 0 ? (
        <div className="lr-card lr-card-strong p-6">
          <p className="text-sm text-[color:var(--lr-muted)]">
            No subscription boxes yet.
          </p>
        </div>
      ) : null}

      {plans && plans.length > 0 ? (
        <ul className="grid gap-3">
          {plans.map((p) => (
            <li
              key={p.id}
              className="lr-card lr-card-strong p-6 transition hover:-translate-y-0.5 hover:shadow-[0_22px_60px_rgba(38,28,10,0.14)]"
            >
              <div className="flex flex-wrap items-start justify-between gap-6">
                <div className="min-w-[240px]">
                  <h2 className="text-lg font-semibold text-[color:var(--lr-ink)]">
                    <Link className="hover:underline" href={`/boxes/${p.id}`}>
                      {p.title}
                    </Link>
                  </h2>
                  {p.description ? (
                    <p className="mt-2 text-sm text-[color:var(--lr-muted)]">
                      {p.description}
                    </p>
                  ) : null}
                  <div className="mt-3 flex flex-wrap items-center gap-2 text-sm text-[color:var(--lr-muted)]">
                    <span className="lr-chip rounded-full px-3 py-1">
                      {cadenceLabel(p.cadence)}
                    </span>
                    <span className="lr-chip rounded-full px-3 py-1">
                      {formatMoney(p.price_cents)} / box
                    </span>
                    <span className="lr-chip rounded-full px-3 py-1">
                      Next: {formatNext(p)}
                    </span>
                  </div>
                </div>

                <div className="grid gap-2 text-right">
                  <div className="text-xs text-[color:var(--lr-muted)]">
                    Capacity {p.subscriber_limit}
                  </div>
                  <Link
                    className="lr-btn lr-btn-primary px-4 py-2 text-sm font-semibold"
                    href={`/boxes/${p.id}`}
                  >
                    Subscribe
                  </Link>
                </div>
              </div>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}

