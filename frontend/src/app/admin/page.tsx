"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { requestJSON } from "@/lib/http";
import { session } from "@/lib/session";
import { formatMoney, friendlyErrorMessage } from "@/lib/ui";

// ---- Types ------------------------------------------------------------------

type RecentOrder = {
  id: string;
  store_name: string;
  buyer_email: string | null;
  status: string;
  payment_status: string;
  total_cents: number;
  created_at: string;
};

type DashboardData = {
  active_stores: number;
  total_subscribers: number;
  recent_orders: RecentOrder[];
  pickup_completion_rate: number | null;
  total_revenue_cents: number;
};

// ---- Helpers ----------------------------------------------------------------

function formatRate(rate: number | null): string {
  if (rate == null) return "—";
  return `${(rate * 100).toFixed(1)}%`;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

// ---- Skeleton ---------------------------------------------------------------

function SkeletonCard() {
  return (
    <div className="lr-card lr-card-strong p-5 animate-pulse">
      <div className="h-3 w-24 rounded mb-3" style={{ backgroundColor: "var(--lr-border)" }} />
      <div className="h-7 w-16 rounded" style={{ backgroundColor: "var(--lr-border)" }} />
    </div>
  );
}

// ---- Page -------------------------------------------------------------------

export default function AdminDashboardPage() {
  const router = useRouter();
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const toastFiredRef = useRef(false);

  useEffect(() => {
    document.title = "Admin Dashboard — LocalRoots";
  }, []);

  useEffect(() => {
    const token = session.getToken();
    if (!token) {
      router.replace("/");
      return;
    }

    // Decode role from JWT payload (base64url) without a library.
    try {
      const payload = JSON.parse(atob(token.split(".")[1].replace(/-/g, "+").replace(/_/g, "/")));
      if (payload.role !== "admin") {
        router.replace("/");
        return;
      }
    } catch {
      router.replace("/");
      return;
    }

    let cancelled = false;

    async function load() {
      const tok = session.getToken()!;
      try {
        const d = await requestJSON<DashboardData>("/v1/admin/dashboard", {
          token: tok,
        });
        if (!cancelled) setData(d);
      } catch (e: unknown) {
        if (cancelled) return;
        if (!toastFiredRef.current) {
          toastFiredRef.current = true;
          setError(friendlyErrorMessage(e));
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [router]);

  // ---- Loading state --------------------------------------------------------

  if (loading) {
    return (
      <main className="max-w-5xl mx-auto px-4 py-10">
        <div className="h-8 w-48 rounded mb-8 animate-pulse" style={{ backgroundColor: "var(--lr-border)" }} />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard />
        </div>
        <div className="lr-card p-5 animate-pulse">
          <div className="h-4 w-32 rounded mb-4" style={{ backgroundColor: "var(--lr-border)" }} />
          <div className="space-y-3">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-3 rounded" style={{ backgroundColor: "var(--lr-border)" }} />
            ))}
          </div>
        </div>
      </main>
    );
  }

  // ---- Error state ----------------------------------------------------------

  if (error) {
    return (
      <main className="max-w-5xl mx-auto px-4 py-10">
        <h1 className="text-2xl font-bold mb-4" style={{ color: "var(--lr-ink)" }}>
          Admin Dashboard
        </h1>
        <p style={{ color: "var(--lr-clay)" }}>{error}</p>
      </main>
    );
  }

  // ---- Empty state (no data yet) --------------------------------------------

  if (!data) {
    return (
      <main className="max-w-5xl mx-auto px-4 py-10">
        <h1 className="text-2xl font-bold mb-4" style={{ color: "var(--lr-ink)" }}>
          Admin Dashboard
        </h1>
        <p style={{ color: "var(--lr-muted)" }}>
          No activity yet. Metrics appear after your first pickup.
        </p>
      </main>
    );
  }

  const hasNoOrders = data.recent_orders.length === 0;

  // ---- Loaded state ---------------------------------------------------------

  return (
    <main className="max-w-5xl mx-auto px-4 py-10 lr-animate">
      <h1 className="text-2xl font-bold mb-8" style={{ color: "var(--lr-ink)" }}>
        Admin Dashboard
      </h1>

      {/* Metric cards */}
      <div
        className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8"
        aria-live="polite"
        aria-label="Platform metrics"
      >
        <div className="lr-card lr-card-strong p-5">
          <p className="text-sm" style={{ color: "var(--lr-muted)" }}>
            Active Stores
          </p>
          <p className="text-2xl font-bold mt-1" style={{ color: "var(--lr-ink)" }}>
            {data.active_stores}
          </p>
        </div>

        <div className="lr-card lr-card-strong p-5">
          <p className="text-sm" style={{ color: "var(--lr-muted)" }}>
            Active Subscribers
          </p>
          <p className="text-2xl font-bold mt-1" style={{ color: "var(--lr-ink)" }}>
            {data.total_subscribers}
          </p>
        </div>

        <div className="lr-card lr-card-strong p-5">
          <p className="text-sm" style={{ color: "var(--lr-muted)" }}>
            Pickup Rate (30d)
          </p>
          <p className="text-2xl font-bold mt-1" style={{ color: "var(--lr-ink)" }}>
            {formatRate(data.pickup_completion_rate)}
          </p>
        </div>

        <div className="lr-card lr-card-strong p-5">
          <p className="text-sm" style={{ color: "var(--lr-muted)" }}>
            Total Revenue
          </p>
          <p className="text-2xl font-bold mt-1" style={{ color: "var(--lr-ink)" }}>
            {formatMoney(data.total_revenue_cents)}
          </p>
        </div>
      </div>

      {/* Recent orders table */}
      <section className="lr-card p-5">
        <h2 className="text-lg font-semibold mb-4" style={{ color: "var(--lr-ink)" }}>
          Recent Orders
        </h2>

        {hasNoOrders ? (
          <p style={{ color: "var(--lr-muted)" }}>
            No activity yet. Metrics appear after your first pickup.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr style={{ color: "var(--lr-muted)" }}>
                  <th className="text-left pb-2 font-medium">Store</th>
                  <th className="text-left pb-2 font-medium">Buyer</th>
                  <th className="text-left pb-2 font-medium">Status</th>
                  <th className="text-left pb-2 font-medium">Payment</th>
                  <th className="text-right pb-2 font-medium">Total</th>
                  <th className="text-right pb-2 font-medium">Date</th>
                </tr>
              </thead>
              <tbody>
                {data.recent_orders.map((o) => (
                  <tr
                    key={o.id}
                    className="border-t"
                    style={{ borderColor: "var(--lr-border)" }}
                  >
                    <td className="py-2" style={{ color: "var(--lr-ink)" }}>
                      {o.store_name}
                    </td>
                    <td className="py-2" style={{ color: "var(--lr-muted)" }}>
                      {o.buyer_email ?? "—"}
                    </td>
                    <td className="py-2">
                      <StatusPill status={o.status} />
                    </td>
                    <td className="py-2">
                      <StatusPill status={o.payment_status} />
                    </td>
                    <td className="py-2 text-right tabular-nums" style={{ color: "var(--lr-ink)" }}>
                      {formatMoney(o.total_cents)}
                    </td>
                    <td className="py-2 text-right" style={{ color: "var(--lr-muted)" }}>
                      {formatDate(o.created_at)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </main>
  );
}

// ---- Inline status pill (avoids importing seller-specific component) --------

function StatusPill({ status }: { status: string }) {
  const colors: Record<string, { bg: string; text: string }> = {
    placed: { bg: "rgba(74,70,60,0.1)", text: "var(--lr-muted)" },
    ready: { bg: "rgba(74,70,60,0.1)", text: "var(--lr-muted)" },
    picked_up: { bg: "rgba(47,107,79,0.1)", text: "var(--lr-leaf)" },
    no_show: { bg: "rgba(220,38,38,0.1)", text: "#dc2626" },
    canceled: { bg: "rgba(220,38,38,0.1)", text: "#dc2626" },
    paid: { bg: "rgba(47,107,79,0.1)", text: "var(--lr-leaf)" },
    authorized: { bg: "rgba(74,70,60,0.1)", text: "var(--lr-muted)" },
    voided: { bg: "rgba(74,70,60,0.1)", text: "var(--lr-muted)" },
    refunded: { bg: "rgba(179,93,46,0.1)", text: "var(--lr-clay)" },
  };
  const c = colors[status] ?? { bg: "rgba(74,70,60,0.1)", text: "var(--lr-muted)" };
  return (
    <span
      className="inline-block px-2 py-0.5 rounded-full text-xs font-medium"
      style={{ backgroundColor: c.bg, color: c.text }}
    >
      {status.replace(/_/g, " ")}
    </span>
  );
}
