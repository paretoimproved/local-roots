"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import type { SubscriptionPlan } from "@/lib/api";
import { buyerApi, type SubscribeResponse } from "@/lib/buyer-api";
import { orderToken } from "@/lib/order-token";
import { subscriptionToken } from "@/lib/subscription-token";
import { PickupCodeCard } from "@/components/pickup-code-card";

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

export function SubscribeForm({ plan }: { plan: SubscriptionPlan }) {
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<SubscribeResponse | null>(null);

  const nextLabel = useMemo(() => {
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
  }, [plan.next_start_at, plan.pickup_location.timezone]);

  async function subscribe() {
    setSubmitting(true);
    setError(null);
    try {
      const res = await buyerApi.subscribeToPlan(plan.id, {
        buyer: {
          email,
          name: name || null,
          phone: phone || null,
        },
      });
      subscriptionToken.set(res.subscription.id, res.subscription.buyer_token);
      orderToken.set(res.first_order.id, res.first_order.buyer_token);
      setDone(res);
    } catch (e: unknown) {
      setError(String(e));
    } finally {
      setSubmitting(false);
    }
  }

  if (done) {
    const order = done.first_order;
    const accessUrl = `/orders/${order.id}?t=${encodeURIComponent(order.buyer_token)}`;
    return (
      <div className="grid gap-4">
        <section className="lr-card lr-card-strong p-6">
          <h2 className="text-base font-semibold text-[color:var(--lr-ink)]">
            Subscription started
          </h2>
          <p className="mt-2 text-sm text-[color:var(--lr-muted)]">
            Subscription ID:{" "}
            <span className="font-mono text-xs">{done.subscription.id}</span>
          </p>
          <p className="mt-2 text-sm text-[color:var(--lr-muted)]">
            First order is ready to manage:
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <Link
              className="lr-btn lr-btn-primary px-4 py-2 text-sm font-semibold"
              href={accessUrl}
            >
              View first order
            </Link>
            <Link
              className="lr-btn lr-chip px-4 py-2 text-sm font-semibold text-[color:var(--lr-ink)]"
              href={`/stores/${plan.store_id}/boxes`}
            >
              Back to boxes
            </Link>
          </div>
          <div className="mt-4 rounded-xl bg-white/60 p-4 text-sm text-[color:var(--lr-muted)] ring-1 ring-[color:var(--lr-border)]">
            Payments: card billing is next phase. For now, this order uses{" "}
            <span className="font-medium">pay at pickup</span>.
          </div>
        </section>

        <PickupCodeCard
          storeId={order.store_id}
          orderId={order.id}
          pickupCode={order.pickup_code}
          status={order.status}
        />
      </div>
    );
  }

  return (
    <section className="lr-card lr-card-strong p-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="text-base font-semibold text-[color:var(--lr-ink)]">
            Subscribe
          </h2>
          <p className="mt-1 text-sm text-[color:var(--lr-muted)]">
            {cadenceLabel(plan.cadence)} · {formatMoney(plan.price_cents)} per box
          </p>
          <div className="mt-3 text-sm text-[color:var(--lr-muted)]">
            Next pickup:{" "}
            <span className="font-semibold text-[color:var(--lr-ink)]">
              {nextLabel}
            </span>
          </div>
        </div>
        <div className="text-xs text-[color:var(--lr-muted)]">
          Capacity: {plan.subscriber_limit}
        </div>
      </div>

      {error ? (
        <div className="mt-4 rounded-xl bg-rose-50 p-4 text-sm text-rose-800 ring-1 ring-rose-200">
          {error}
        </div>
      ) : null}

      <div className="mt-4 grid gap-3">
        <label className="grid gap-1">
          <span className="text-xs font-semibold text-[color:var(--lr-muted)]">
            Email
          </span>
          <input
            className="lr-field px-3 py-2 text-sm"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </label>
        <div className="grid gap-2 md:grid-cols-2">
          <label className="grid gap-1">
            <span className="text-xs font-semibold text-[color:var(--lr-muted)]">
              Name (optional)
            </span>
            <input
              className="lr-field px-3 py-2 text-sm"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </label>
          <label className="grid gap-1">
            <span className="text-xs font-semibold text-[color:var(--lr-muted)]">
              Phone (optional)
            </span>
            <input
              className="lr-field px-3 py-2 text-sm"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
            />
          </label>
        </div>

        <button
          type="button"
          className="lr-btn lr-btn-primary inline-flex items-center justify-center px-4 py-2 text-sm font-semibold disabled:opacity-50"
          disabled={submitting || !email.trim()}
          onClick={subscribe}
        >
          {submitting ? "Starting…" : "Start subscription"}
        </button>
        <div className="text-xs text-[color:var(--lr-muted)]">
          Cancel/skip/refunds follow the pickup window cutoff policy.
        </div>
      </div>
    </section>
  );
}

