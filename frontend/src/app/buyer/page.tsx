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
import { useToast } from "@/components/toast";
import { formatMoney, friendlyErrorMessage, parseApiError } from "@/lib/ui";

function cadenceLabel(c: string) {
  if (c === "weekly") return "Weekly";
  if (c === "biweekly") return "Every two weeks";
  if (c === "monthly") return "Monthly";
  return c;
}

function statusBadge(status: string) {
  const colors: Record<string, string> = {
    placed: "bg-blue-50 text-blue-800 ring-blue-200",
    ready: "bg-green-50 text-green-800 ring-green-200",
    picked_up: "bg-emerald-50 text-emerald-800 ring-emerald-200",
    canceled: "bg-gray-50 text-gray-600 ring-gray-200",
    no_show: "bg-rose-50 text-rose-800 ring-rose-200",
    active: "bg-green-50 text-green-800 ring-green-200",
    paused: "bg-amber-50 text-amber-800 ring-amber-200",
  };
  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ring-1 ${colors[status] ?? "bg-gray-50 text-gray-600 ring-gray-200"}`}
    >
      {status.replace(/_/g, " ")}
    </span>
  );
}

export default function BuyerDashboardPage() {
  const router = useRouter();
  const { showToast } = useToast();
  const [user, setUser] = useState<BuyerAuthUser | null>(null);
  const [orders, setOrders] = useState<BuyerOrderSummary[]>([]);
  const [subscriptions, setSubscriptions] = useState<BuyerSubscriptionSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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
      const apiErr = parseApiError(err);
      if (apiErr && (apiErr.status === 401 || apiErr.status === 403)) {
        session.clearToken();
        showToast({
          kind: "error",
          message: "Your session has expired. Please sign in again.",
        });
        router.replace("/buyer/login");
        return;
      }
      setError(friendlyErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, [router, showToast]);

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

  const upcomingOrders = orders.filter((o) =>
    ["placed", "ready"].includes(o.status),
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
          <div className="mt-3 grid gap-2">
            {activeSubs.map((s) => (
              <Link
                key={s.id}
                href={`/subscriptions/${s.id}`}
                className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-white/60 p-3 ring-1 ring-[color:var(--lr-border)] transition-colors hover:bg-white/80"
              >
                <div>
                  <div className="text-sm font-semibold text-[color:var(--lr-ink)]">
                    {s.plan_title}
                  </div>
                  <div className="text-xs text-[color:var(--lr-muted)]">
                    {s.store_name ? `${s.store_name} · ` : ""}
                    {cadenceLabel(s.cadence)} · {formatMoney(s.price_cents)}
                  </div>
                </div>
                {statusBadge(s.status)}
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

      <section className="lr-card p-6">
        <h2 className="text-base font-semibold text-[color:var(--lr-ink)]">
          Upcoming Pickups
        </h2>
        {upcomingOrders.length > 0 ? (
          <div className="mt-3 grid gap-2">
            {upcomingOrders.map((o) => (
              <div
                key={o.id}
                className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-white/60 p-3 ring-1 ring-[color:var(--lr-border)]"
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
                  <div className="mt-1 font-mono text-xs text-[color:var(--lr-muted)]">
                    Code: {o.pickup_code}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {statusBadge(o.status)}
                  <span className="text-sm font-semibold text-[color:var(--lr-ink)]">
                    {formatMoney(o.total_cents)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="mt-3 text-sm text-[color:var(--lr-muted)]">
            No upcoming pickups.{" "}
            <Link className="underline" href="/stores">
              Browse boxes
            </Link>
          </p>
        )}
      </section>

      <section className="lr-card p-6">
        <h2 className="text-base font-semibold text-[color:var(--lr-ink)]">
          Past Orders
        </h2>
        {pastOrders.length > 0 ? (
          <div className="mt-3 grid gap-2">
            {pastOrders.slice(0, 10).map((o) => (
              <div
                key={o.id}
                className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-white/60 p-3 ring-1 ring-[color:var(--lr-border)]"
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
                  {statusBadge(o.status)}
                  <span className="text-sm text-[color:var(--lr-muted)]">
                    {formatMoney(o.total_cents)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="mt-3 text-sm text-[color:var(--lr-muted)]">
            No past orders.
          </p>
        )}
      </section>
    </div>
  );
}
