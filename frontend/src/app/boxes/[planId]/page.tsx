import Link from "next/link";
import { api } from "@/lib/api";
import { SubscribeForm } from "@/components/subscribe-form";
import { formatMoney } from "@/lib/ui";

function cadenceLabel(c: string) {
  if (c === "weekly") return "Weekly";
  if (c === "biweekly") return "Every two weeks";
  if (c === "monthly") return "Monthly";
  return c;
}

export default async function BoxPlanPage({
  params,
}: {
  params: { planId: string };
}) {
  const { planId } = params;

  let plan: Awaited<ReturnType<typeof api.getSubscriptionPlan>> | null = null;
  let error: string | null = null;

  try {
    plan = await api.getSubscriptionPlan(planId);
  } catch (e) {
    error = e instanceof Error ? e.message : "Unknown error";
  }

  return (
    <div className="grid gap-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="grid gap-1">
          <h1 className="text-3xl font-semibold tracking-tight text-[color:var(--lr-ink)]">
            {plan ? plan.title : "Box"}
          </h1>
          <p className="text-sm text-[color:var(--lr-muted)]">
            {plan ? `${cadenceLabel(plan.cadence)} · ${formatMoney(plan.price_cents)} per box` : ""}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {plan ? (
            <Link
              className="lr-btn px-4 py-2 text-sm font-semibold text-[color:var(--lr-ink)]"
              href={`/stores/${plan.store_id}/boxes`}
            >
              Back to boxes
            </Link>
          ) : null}
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
            Could not load this box
          </p>
          <p className="mt-2 text-sm text-[color:var(--lr-muted)]">{error}</p>
        </div>
      ) : null}

      {plan ? (
        <div className="grid gap-6 lg:grid-cols-2">
          <section className="lr-card lr-card-strong p-6">
            <h2 className="text-base font-semibold text-[color:var(--lr-ink)]">
              Pickup details
            </h2>
            <p className="mt-2 text-sm text-[color:var(--lr-muted)]">
              {plan.pickup_location.label ? `${plan.pickup_location.label} · ` : ""}
              {plan.pickup_location.address1}, {plan.pickup_location.city},{" "}
              {plan.pickup_location.region} {plan.pickup_location.postal_code}
            </p>
            <div className="mt-4 grid gap-2 text-sm text-[color:var(--lr-muted)]">
              <div className="lr-chip rounded-2xl px-4 py-3">
                <div className="text-xs font-semibold uppercase tracking-wide opacity-80">
                  Next pickup
                </div>
                <div className="mt-1 font-semibold text-[color:var(--lr-ink)]">
                  {new Date(plan.next_start_at).toLocaleString("en-US", {
                    timeZone: plan.pickup_location.timezone || "UTC",
                  })}
                </div>
              </div>
              <div className="lr-chip rounded-2xl px-4 py-3">
                <div className="text-xs font-semibold uppercase tracking-wide opacity-80">
                  Policies
                </div>
                <div className="mt-1">
                  Skip before cutoff. Seller cancels: full refund (card billing coming next phase).
                </div>
              </div>
            </div>
          </section>

          <SubscribeForm plan={plan} />
        </div>
      ) : null}
    </div>
  );
}
