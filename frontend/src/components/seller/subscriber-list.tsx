"use client";

import { useMemo, useState } from "react";
import { type SellerSubscription } from "@/lib/seller-api";
import { StatusPill } from "@/components/seller/status-pills";

type SubFilter = "all" | "active" | "paused" | "canceled";

interface SubscriberListProps {
  subscriptions: SellerSubscription[] | null;
  busySubId: string | null;
  onCancel: (subId: string) => void;
}

export function SubscriberList({
  subscriptions,
  busySubId,
  onCancel,
}: SubscriberListProps) {
  const [filter, setFilter] = useState<SubFilter>("all");

  const filtered = useMemo(() => {
    if (!subscriptions) return null;
    if (filter === "all") return subscriptions;
    return subscriptions.filter((s) => s.status === filter);
  }, [subscriptions, filter]);

  const counts = useMemo(() => {
    const base: Record<SubFilter, number> = {
      all: 0,
      active: 0,
      paused: 0,
      canceled: 0,
    };
    if (!subscriptions) return base;
    base.all = subscriptions.length;
    for (const s of subscriptions) {
      const k = s.status as SubFilter;
      if (k in base) base[k] += 1;
    }
    return base;
  }, [subscriptions]);

  return (
    <section className="lr-card lr-animate grid gap-4 p-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold">Subscribers</h2>
          <p className="mt-1 text-sm text-[color:var(--lr-muted)]">
            Active, paused, and canceled subscriptions across all boxes.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          {(
            [
              ["all", "All"],
              ["active", "Active"],
              ["paused", "Paused"],
              ["canceled", "Canceled"],
            ] as const
          ).map(([k, label]) => {
            const active = filter === k;
            const count = counts[k];
            return (
              <button
                key={k}
                type="button"
                className={`lr-btn px-3 py-1.5 text-sm font-semibold ${
                  active
                    ? "lr-btn-primary"
                    : "lr-chip text-[color:var(--lr-ink)]"
                }`}
                onClick={() => setFilter(k)}
                aria-pressed={active}
              >
                {label}{" "}
                <span className="opacity-80" aria-label={`${count} subscribers`}>
                  {count}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {filtered?.length ? (
        <ul className="grid gap-2">
          {filtered.map((s) => (
            <li key={s.id} className="lr-chip rounded-2xl px-4 py-3">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="min-w-[240px]">
                  <div className="flex flex-wrap items-center gap-2">
                    <div className="font-medium text-[color:var(--lr-ink)]">
                      {s.buyer_name ? `${s.buyer_name} \u00b7 ` : ""}
                      {s.buyer_email}
                    </div>
                    <StatusPill status={s.status} />
                  </div>
                  <div className="mt-1 text-sm text-[color:var(--lr-muted)]">
                    {s.plan_title}
                    {" \u00b7 "}
                    Joined{" "}
                    <span className="font-medium text-[color:var(--lr-ink)]">
                      {new Date(s.created_at).toLocaleDateString()}
                    </span>
                  </div>
                </div>

                {(s.status === "active" || s.status === "paused") ? (
                  <button
                    type="button"
                    className="lr-btn lr-chip px-3 py-2 text-sm font-semibold text-rose-900 disabled:opacity-50"
                    onClick={() => onCancel(s.id)}
                    disabled={busySubId === s.id}
                  >
                    {busySubId === s.id ? "Canceling\u2026" : "Cancel"}
                  </button>
                ) : null}
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <div className="text-sm text-[color:var(--lr-muted)]">
          No subscribers yet.
        </div>
      )}
    </section>
  );
}
