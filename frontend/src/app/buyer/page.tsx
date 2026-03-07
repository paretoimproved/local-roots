"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import {
  buyerAuthApi,
  type BuyerAuthUser,
  type BuyerOrderSummary,
  type BuyerSubscriptionSummary,
} from "@/lib/buyer-api";
import { session } from "@/lib/session";
import { ErrorAlert } from "@/components/error-alert";
import { PickupCodeCard } from "@/components/pickup-code-card";
import { StatusPill } from "@/components/seller/status-pills";
import { cadenceLabel, formatMoney, friendlyErrorMessage } from "@/lib/ui";

export default function BuyerDashboardPage() {
  const router = useRouter();
  const [user, setUser] = useState<BuyerAuthUser | null>(null);
  const [orders, setOrders] = useState<BuyerOrderSummary[]>([]);
  const [subscriptions, setSubscriptions] = useState<BuyerSubscriptionSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showPastOrders, setShowPastOrders] = useState(false);

  useEffect(() => { document.title = "My pickups — LocalRoots"; }, []);

  const load = useCallback(async () => {
    const token = session.getToken();
    if (!token) {
      router.replace("/buyer/login");
      return;
    }
    try {
      const [me, ords, subs] = await Promise.all([
        buyerAuthApi.getMe(token),
        buyerAuthApi.listOrders(token),
        buyerAuthApi.listSubscriptions(token),
      ]);
      setUser(me);
      setOrders(ords);
      setSubscriptions(subs);
    } catch (err: unknown) {
      setError(friendlyErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    load();
  }, [load]);

  function signOut() {
    session.clearToken();
    router.replace("/buyer/login");
  }

  if (loading) {
    return (
      <section className="lr-card lr-card-strong p-6 text-center">
        <p className="text-sm text-[color:var(--lr-muted)]">Loading...</p>
      </section>
    );
  }

  if (error) {
    return (
      <section className="lr-card lr-card-strong p-6">
        <ErrorAlert
          error={error}
          onRetry={() => {
            setError(null);
            setLoading(true);
            load();
          }}
        />
      </section>
    );
  }

  if (!user) return null;

  const upcomingOrders = orders
    .filter((o) => ["placed", "ready"].includes(o.status))
    .sort(
      (a, b) =>
        new Date(a.pickup_start_at).getTime() -
        new Date(b.pickup_start_at).getTime(),
    );
  const pastOrders = orders.filter(
    (o) => !["placed", "ready"].includes(o.status),
  );
  const activeSubs = subscriptions.filter((s) => s.status !== "canceled");

  return (
    <div className="grid gap-6">
      <section className="lr-card lr-card-strong p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-lg font-semibold text-[color:var(--lr-ink)]">
              My pickups
            </h1>
            <p className="mt-1 text-sm text-[color:var(--lr-muted)]">
              {user.email}
            </p>
          </div>
          <button
            type="button"
            className="lr-btn px-3 py-1.5 text-xs font-semibold text-[color:var(--lr-muted)]"
            onClick={signOut}
          >
            Sign out
          </button>
        </div>
      </section>

      <section className="lr-card p-6">
        <h2 className="text-base font-semibold text-[color:var(--lr-ink)]">
          Active Subscriptions
        </h2>
        {activeSubs.length > 0 ? (
          <div className="mt-3 grid gap-3">
            {activeSubs.map((s) => (
              <Link
                key={s.id}
                href={`/subscriptions/${s.id}`}
                className="flex items-center justify-between gap-3 rounded-xl bg-white/60 p-4 ring-1 ring-[color:var(--lr-border)] transition hover:-translate-y-0.5 hover:shadow-[0_22px_60px_rgba(38,28,10,0.14)]"
              >
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-semibold text-[color:var(--lr-ink)]">
                    {s.plan_title}
                  </div>
                  <div className="mt-0.5 text-xs text-[color:var(--lr-muted)]">
                    {s.store_name ? `${s.store_name} · ` : ""}
                    {cadenceLabel(s.cadence)} · {formatMoney(s.price_cents)}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <StatusPill status={s.status} />
                  <span className="text-[color:var(--lr-muted)]" aria-hidden="true">&rsaquo;</span>
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <p className="mt-3 text-sm text-[color:var(--lr-muted)]">
            No active subscriptions yet.{" "}
            <Link className="underline" href="/stores">
              Browse farms
            </Link>
          </p>
        )}
      </section>

      {upcomingOrders.length > 0 ? (
        <>
          {/* Hero card for next pickup */}
          <Link
            href={`/orders/${upcomingOrders[0].id}?t=${encodeURIComponent(session.getToken() ?? "")}`}
            className="lr-card lr-card-strong block p-6 transition hover:-translate-y-0.5 hover:shadow-[0_22px_60px_rgba(38,28,10,0.14)]"
          >
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-[color:var(--lr-muted)]">
                  Your next pickup
                </p>
                <h2 className="mt-1 text-lg font-semibold text-[color:var(--lr-ink)]">
                  {upcomingOrders[0].product_title || "Order"}
                </h2>
              </div>
              <div className="text-right">
                <div className="text-sm font-semibold text-[color:var(--lr-ink)]">
                  {new Date(upcomingOrders[0].pickup_start_at).toLocaleDateString("en-US", {
                    weekday: "short",
                    month: "short",
                    day: "numeric",
                  })}
                </div>
                <div className="text-sm text-[color:var(--lr-muted)]">
                  {new Date(upcomingOrders[0].pickup_start_at).toLocaleTimeString("en-US", {
                    hour: "numeric",
                    minute: "2-digit",
                  })}
                </div>
              </div>
            </div>
            <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
              <PickupCodeCard
                storeId={upcomingOrders[0].store_id}
                orderId={upcomingOrders[0].id}
                pickupCode={upcomingOrders[0].pickup_code}
                status={upcomingOrders[0].status}
              />
              <StatusPill status={upcomingOrders[0].status} />
            </div>
          </Link>

          {/* Remaining upcoming pickups */}
          {upcomingOrders.length > 1 && (
            <section className="lr-card p-6">
              <h2 className="text-base font-semibold text-[color:var(--lr-ink)]">
                More Upcoming Pickups
              </h2>
              <div className="mt-3 grid gap-2">
                {upcomingOrders.slice(1).map((o) => (
                  <Link
                    key={o.id}
                    href={`/orders/${o.id}?t=${encodeURIComponent(session.getToken() ?? "")}`}
                    className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-white/60 p-3 ring-1 ring-[color:var(--lr-border)] transition hover:-translate-y-0.5 hover:shadow-[0_22px_60px_rgba(38,28,10,0.14)]"
                  >
                    <div>
                      <div className="text-sm font-semibold text-[color:var(--lr-ink)]">
                        {o.product_title || "Order"}
                      </div>
                      <div className="text-xs text-[color:var(--lr-muted)]">
                        {new Date(o.pickup_start_at).toLocaleDateString("en-US", {
                          weekday: "short",
                          month: "short",
                          day: "numeric",
                          hour: "numeric",
                          minute: "2-digit",
                        })}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <StatusPill status={o.status} />
                      <span className="text-sm font-semibold text-[color:var(--lr-ink)]">
                        {formatMoney(o.total_cents)}
                      </span>
                    </div>
                  </Link>
                ))}
              </div>
            </section>
          )}
        </>
      ) : (
        <section className="lr-card p-6">
          <h2 className="text-base font-semibold text-[color:var(--lr-ink)]">
            Upcoming Pickups
          </h2>
          <p className="mt-3 text-sm text-[color:var(--lr-muted)]">
            No upcoming pickups.{" "}
            <Link className="underline" href="/stores">
              Browse boxes
            </Link>
          </p>
        </section>
      )}

      {pastOrders.length > 0 && (
        <section className="lr-card p-6">
          <button
            type="button"
            className="flex w-full items-center justify-between text-left"
            onClick={() => setShowPastOrders((v) => !v)}
            aria-expanded={showPastOrders}
          >
            <h2 className="text-base font-semibold text-[color:var(--lr-ink)]">
              Past Orders ({pastOrders.length})
            </h2>
            <span
              className="text-sm text-[color:var(--lr-muted)] transition-transform"
              style={{ transform: showPastOrders ? "rotate(90deg)" : undefined }}
              aria-hidden="true"
            >
              &rsaquo;
            </span>
          </button>
          {showPastOrders && (
            <div className="mt-3 grid gap-2">
              {pastOrders.slice(0, 10).map((o) => (
                <Link
                  key={o.id}
                  href={`/orders/${o.id}?t=${encodeURIComponent(session.getToken() ?? "")}`}
                  className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-white/60 p-3 ring-1 ring-[color:var(--lr-border)] transition hover:-translate-y-0.5 hover:shadow-[0_22px_60px_rgba(38,28,10,0.14)]"
                >
                  <div>
                    <div className="text-sm font-medium text-[color:var(--lr-ink)]">
                      {o.product_title || "Order"}
                    </div>
                    <div className="text-xs text-[color:var(--lr-muted)]">
                      {new Date(o.created_at).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      })}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <StatusPill status={o.status} />
                    <span className="text-sm text-[color:var(--lr-muted)]">
                      {formatMoney(o.total_cents)}
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </section>
      )}
    </div>
  );
}
