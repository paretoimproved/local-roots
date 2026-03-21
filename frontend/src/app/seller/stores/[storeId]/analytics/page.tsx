"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import {
  sellerApi,
  type StoreAnalytics,
  type PayoutHistoryEntry,
} from "@/lib/seller-api";
import { session } from "@/lib/session";
import { useToast } from "@/components/toast";
import { formatMoney, friendlyErrorMessage } from "@/lib/ui";
import { StarRating } from "@/components/review-card";

function MetricCard({
  label,
  value,
  sub,
  accent,
}: {
  label: string;
  value: string;
  sub?: string;
  accent?: boolean;
}) {
  return (
    <div className={accent ? "lr-card lr-card-strong p-5" : "lr-card p-5"}>
      <p className="text-xs uppercase tracking-wide" style={{ color: "var(--lr-muted)" }}>
        {label}
      </p>
      <p className="text-2xl font-semibold mt-1" style={{ color: "var(--lr-ink)" }}>
        {value}
      </p>
      {sub && (
        <p className="text-xs mt-1" style={{ color: "var(--lr-muted)" }}>
          {sub}
        </p>
      )}
    </div>
  );
}

function DeltaArrow({ delta }: { delta: number }) {
  if (delta === 0) return <span className="text-xs" style={{ color: "var(--lr-muted)" }}>—</span>;
  const isUp = delta > 0;
  return (
    <span
      className="inline-flex items-center gap-0.5 text-xs font-medium"
      style={{ color: isUp ? "var(--lr-leaf)" : "var(--lr-clay)" }}
    >
      {isUp ? "▲" : "▼"} {Math.abs(delta)} vs 4w ago
    </span>
  );
}

function PayoutStatusChip({ entry }: { entry: PayoutHistoryEntry }) {
  if (entry.transfer_id) {
    return (
      <span
        className="inline-block px-2 py-0.5 rounded-full text-xs font-medium"
        style={{ backgroundColor: "rgba(47, 107, 79, 0.1)", color: "var(--lr-leaf)" }}
      >
        Transferred
      </span>
    );
  }
  if (entry.transfer_error && entry.transfer_retry_count >= 3) {
    return (
      <span
        className="inline-block px-2 py-0.5 rounded-full text-xs font-medium"
        style={{ backgroundColor: "rgba(220, 38, 38, 0.1)", color: "#dc2626" }}
        title={entry.transfer_error}
      >
        Failed
      </span>
    );
  }
  if (entry.transfer_error) {
    return (
      <span
        className="inline-block px-2 py-0.5 rounded-full text-xs font-medium"
        style={{ backgroundColor: "rgba(179, 93, 46, 0.1)", color: "var(--lr-clay)" }}
        title={`Retry ${entry.transfer_retry_count}/3: ${entry.transfer_error}`}
      >
        Retrying
      </span>
    );
  }
  return (
    <span
      className="inline-block px-2 py-0.5 rounded-full text-xs font-medium"
      style={{ backgroundColor: "rgba(74, 70, 60, 0.1)", color: "var(--lr-muted)" }}
    >
      Pending
    </span>
  );
}

function formatPickupRate(rate: number): string {
  return `${(rate * 100).toFixed(0)}%`;
}

function formatGrowth(pct: number | null): string | undefined {
  if (pct == null) return undefined;
  const sign = pct >= 0 ? "+" : "";
  return `${sign}${pct.toFixed(0)}% vs prior 30d`;
}

export default function SellerAnalyticsPage() {
  const params = useParams<{ storeId: string }>();
  const storeId = params.storeId;
  const router = useRouter();
  const { showToast } = useToast();

  const [token, setToken] = useState<string | null>(null);
  const [analytics, setAnalytics] = useState<StoreAnalytics | null>(null);
  const [payouts, setPayouts] = useState<PayoutHistoryEntry[] | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const t = session.getToken();
    if (!t) {
      router.replace(`/seller/login?next=/seller/stores/${storeId}/analytics`);
      return;
    }
    setToken(t);
  }, [router, storeId]);

  useEffect(() => {
    if (!token) return;
    let cancelled = false;

    async function load() {
      try {
        const [analyticsData, payoutData] = await Promise.all([
          sellerApi.getStoreAnalytics(token!, storeId),
          sellerApi.getPayoutHistory(token!, storeId),
        ]);
        if (cancelled) return;
        setAnalytics(analyticsData);
        setPayouts(payoutData);
      } catch (e: unknown) {
        if (cancelled) return;
        showToast({ kind: "error", message: friendlyErrorMessage(e) });
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => { cancelled = true; };
  }, [token, storeId, showToast]);

  if (!token) return null;

  if (loading) {
    return (
      <main className="max-w-4xl mx-auto px-4 py-10">
        <p style={{ color: "var(--lr-muted)" }}>Loading analytics...</p>
      </main>
    );
  }

  if (!analytics) {
    return (
      <main className="max-w-4xl mx-auto px-4 py-10">
        <p style={{ color: "var(--lr-muted)" }}>Unable to load analytics.</p>
        <Link href={`/seller/stores/${storeId}`} className="lr-btn lr-chip mt-4 inline-block">
          Back to store
        </Link>
      </main>
    );
  }

  return (
    <main className="max-w-4xl mx-auto px-4 py-10 lr-animate">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-2xl font-semibold" style={{ color: "var(--lr-ink)" }}>
          Store Analytics
        </h1>
        <Link href={`/seller/stores/${storeId}`} className="lr-btn lr-chip text-sm">
          Back to store
        </Link>
      </div>

      {/* Primary metrics row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
        <div className="lr-card lr-card-strong p-5">
          <p className="text-xs uppercase tracking-wide" style={{ color: "var(--lr-muted)" }}>
            Active Subscribers
          </p>
          <p className="text-2xl font-semibold mt-1" style={{ color: "var(--lr-ink)" }}>
            {analytics.active_subscribers}
          </p>
          <DeltaArrow delta={analytics.subscriber_delta_4w} />
        </div>
        <MetricCard
          label="Pickup Rate"
          value={formatPickupRate(analytics.pickup_rate)}
          sub={`${analytics.picked_up_count} of ${analytics.total_orders} orders`}
          accent
        />
        <MetricCard
          label="Revenue"
          value={formatMoney(analytics.total_revenue_cents)}
          sub={formatGrowth(analytics.revenue_growth_pct)}
          accent
        />
        <div className="lr-card lr-card-strong p-5">
          <p className="text-xs uppercase tracking-wide" style={{ color: "var(--lr-muted)" }}>
            Avg Rating
          </p>
          {analytics.avg_rating != null ? (
            <>
              <div className="flex items-center gap-2 mt-1">
                <p className="text-2xl font-semibold" style={{ color: "var(--lr-ink)" }}>
                  {analytics.avg_rating.toFixed(1)}
                </p>
                <StarRating rating={Math.round(analytics.avg_rating)} />
              </div>
              <p className="text-xs mt-1" style={{ color: "var(--lr-muted)" }}>
                {analytics.review_count} {analytics.review_count === 1 ? "review" : "reviews"}
              </p>
            </>
          ) : (
            <p className="text-2xl font-semibold mt-1" style={{ color: "var(--lr-muted)" }}>—</p>
          )}
        </div>
      </div>

      {/* Secondary metrics row */}
      <div className="grid grid-cols-3 gap-4 mb-8">
        <MetricCard
          label="Retention"
          value={analytics.retention_rate > 0 ? `${(analytics.retention_rate * 100).toFixed(0)}%` : "—"}
          sub="30-day retention"
        />
        <MetricCard
          label="No-Show Rate"
          value={analytics.no_show_rate > 0 ? `${(analytics.no_show_rate * 100).toFixed(1)}%` : "0%"}
        />
        <MetricCard
          label="Churn"
          value={String(analytics.churn_count)}
          sub="canceled subscriptions"
        />
      </div>

      {/* Top Products */}
      {analytics.top_products && analytics.top_products.length > 0 && (
        <section className="lr-card p-5 mb-8">
          <h2 className="text-lg font-semibold mb-3" style={{ color: "var(--lr-ink)" }}>
            Top Products
          </h2>
          <div className="space-y-2">
            {analytics.top_products.map((p, i) => (
              <div
                key={p.title}
                className="flex items-center justify-between py-1.5"
                style={{ borderBottom: i < analytics.top_products.length - 1 ? "1px solid var(--lr-border)" : undefined }}
              >
                <span className="text-sm" style={{ color: "var(--lr-ink)" }}>{p.title}</span>
                <span className="text-sm tabular-nums" style={{ color: "var(--lr-muted)" }}>
                  {p.quantity} orders &middot; {formatMoney(p.revenue_cents)}
                </span>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Revenue by cycle table */}
      {analytics.revenue_by_cycle.length > 0 && (
        <section className="lr-card p-5 mb-8">
          <h2 className="text-lg font-semibold mb-4" style={{ color: "var(--lr-ink)" }}>
            Revenue by Pickup Cycle
          </h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr style={{ color: "var(--lr-muted)" }}>
                  <th className="text-left pb-2 font-medium">Date</th>
                  <th className="text-right pb-2 font-medium">Revenue</th>
                  <th className="text-right pb-2 font-medium">Orders</th>
                  <th className="text-right pb-2 font-medium">Pickups</th>
                  <th className="text-right pb-2 font-medium">Rate</th>
                </tr>
              </thead>
              <tbody>
                {analytics.revenue_by_cycle.map((c) => (
                  <tr
                    key={c.cycle_date}
                    className="border-t"
                    style={{ borderColor: "var(--lr-border)" }}
                  >
                    <td className="py-2">{c.cycle_date}</td>
                    <td className="py-2 text-right">{formatMoney(c.revenue_cents)}</td>
                    <td className="py-2 text-right">{c.orders}</td>
                    <td className="py-2 text-right">{c.pickups}</td>
                    <td className="py-2 text-right">
                      {c.orders > 0 ? `${((c.pickups / c.orders) * 100).toFixed(0)}%` : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* Payout history table */}
      {payouts && payouts.length > 0 && (
        <section className="lr-card p-5">
          <h2 className="text-lg font-semibold mb-4" style={{ color: "var(--lr-ink)" }}>
            Recent Payouts
          </h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr style={{ color: "var(--lr-muted)" }}>
                  <th className="text-left pb-2 font-medium">Date</th>
                  <th className="text-right pb-2 font-medium">Your Payout</th>
                  <th className="text-right pb-2 font-medium">Platform Fee</th>
                  <th className="text-right pb-2 font-medium">Total</th>
                  <th className="text-left pb-2 font-medium pl-4">Status</th>
                </tr>
              </thead>
              <tbody>
                {payouts.map((p) => (
                  <tr
                    key={p.order_id}
                    className="border-t"
                    style={{ borderColor: "var(--lr-border)" }}
                  >
                    <td className="py-2">
                      {new Date(p.pickup_date).toLocaleDateString()}
                    </td>
                    <td className="py-2 text-right">{formatMoney(p.seller_payout_cents)}</td>
                    <td className="py-2 text-right">{formatMoney(p.platform_fee_cents)}</td>
                    <td className="py-2 text-right">{formatMoney(p.total_cents)}</td>
                    <td className="py-2 pl-4">
                      <PayoutStatusChip entry={p} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </main>
  );
}
