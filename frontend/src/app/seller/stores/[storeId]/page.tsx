"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import {
  sellerApi,
  type SellerOrder,
  type SellerOffering,
  type SellerPayoutSummary,
  type SellerPickupLocation,
  type SellerPickupWindow,
  type SellerProduct,
  type SellerSubscriptionPlan,
} from "@/lib/seller-api";
import { session } from "@/lib/session";
import { QrScannerModal } from "@/components/qr-scanner-modal";
import { QrCode } from "@/components/qr-code";
import { useToast } from "@/components/toast";
import { formatMoney, friendlyErrorMessage } from "@/lib/ui";
import { StatusPill, PaymentPill } from "@/components/seller/status-pills";

type OrderFilter =
  | "all"
  | "placed"
  | "ready"
  | "picked_up"
  | "no_show"
  | "canceled";

function formatWindowLabel(w: SellerPickupWindow): string {
  const start = new Date(w.start_at);
  const end = new Date(w.end_at);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
    return `Window (${w.status})`;
  }
  return `${start.toLocaleString()}–${end.toLocaleTimeString()} (${w.status})`;
}

export default function SellerStorePage() {
  const params = useParams<{ storeId: string }>();
  const storeId = params.storeId;
  const router = useRouter();
  const { showToast, clearToast } = useToast();

  const [token, setToken] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [, setLocations] = useState<SellerPickupLocation[] | null>(null);
  const [windows, setWindows] = useState<SellerPickupWindow[] | null>(null);
  const [, setProducts] = useState<SellerProduct[] | null>(null);
  const [, setOfferings] = useState<SellerOffering[] | null>(null);
  const [orders, setOrders] = useState<SellerOrder[] | null>(null);
  const [payoutSummary, setPayoutSummary] = useState<SellerPayoutSummary | null>(
    null,
  );
  const [plans, setPlans] = useState<SellerSubscriptionPlan[] | null>(null);

  const [selectedWindowId, setSelectedWindowId] = useState<string>("");
  const [orderFilter, setOrderFilter] = useState<OrderFilter>("all");
  const [supportOpen, setSupportOpen] = useState(false);
  const supportBtnRef = useRef<HTMLButtonElement | null>(null);
  const supportPanelRef = useRef<HTMLDivElement | null>(null);
  const [supportPos, setSupportPos] = useState<{ top: number; left: number } | null>(null);
  const [pickupCodeByOrderId, setPickupCodeByOrderId] = useState<
    Record<string, string>
  >({});
  const [scanOrderId, setScanOrderId] = useState<string | null>(null);
  const [generatingCycle, setGeneratingCycle] = useState(false);
  const [busyOrderId, setBusyOrderId] = useState<string | null>(null);
  const [togglingPlan, setTogglingPlan] = useState(false);

  const selectedWindow = useMemo(() => {
    if (!selectedWindowId) return null;
    return (windows ?? []).find((w) => w.id === selectedWindowId) ?? null;
  }, [windows, selectedWindowId]);

  const filteredOrders = useMemo(() => {
    if (!orders) return null;
    if (orderFilter === "all") return orders;
    return orders.filter((o) => o.status === orderFilter);
  }, [orders, orderFilter]);

  const orderCounts = useMemo(() => {
    const base: Record<OrderFilter, number> = {
      all: 0,
      placed: 0,
      ready: 0,
      picked_up: 0,
      no_show: 0,
      canceled: 0,
    };
    if (!orders) return base;
    base.all = orders.length;
    for (const o of orders) {
      const k = o.status as OrderFilter;
      if (k in base) base[k] += 1;
    }
    return base;
  }, [orders]);

  const siteOrigin = useMemo(() => {
    if (typeof window === "undefined") return "";
    return window.location.origin;
  }, []);

  // Redirect to setup if no live plan
  useEffect(() => {
    if (plans !== null && !plans.some((p) => p.is_live)) {
      router.replace(`/seller/stores/${storeId}/setup`);
    }
  }, [plans, storeId, router]);

  useEffect(() => {
    const t = session.getToken();
    if (!t) {
      router.replace("/seller/login");
      return;
    }
    setToken(t);
  }, [router]);

  useLayoutEffect(() => {
    if (!supportOpen) return;

    const update = () => {
      const btn = supportBtnRef.current;
      if (!btn) return;
      const rect = btn.getBoundingClientRect();
      const w = 288; // matches w-[18rem]
      const pad = 10;
      const left = Math.max(
        pad,
        Math.min(rect.right - w, window.innerWidth - w - pad),
      );
      const top = Math.min(rect.bottom + 10, window.innerHeight - 20);
      setSupportPos({ top, left });
    };

    update();
    window.addEventListener("resize", update);
    window.addEventListener("scroll", update, true);
    return () => {
      window.removeEventListener("resize", update);
      window.removeEventListener("scroll", update, true);
    };
  }, [supportOpen]);

  useEffect(() => {
    if (!supportOpen) return;
    const onDown = (e: MouseEvent) => {
      const t = e.target as Node | null;
      if (!t) return;
      if (supportBtnRef.current?.contains(t)) return;
      if (supportPanelRef.current?.contains(t)) return;
      setSupportOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setSupportOpen(false);
    };
    window.addEventListener("mousedown", onDown);
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("mousedown", onDown);
      window.removeEventListener("keydown", onKey);
    };
  }, [supportOpen]);

  async function refreshAll(t: string) {
    const [ls, ws, ps, sps] = await Promise.all([
      sellerApi.listPickupLocations(t, storeId),
      sellerApi.listPickupWindows(t, storeId),
      sellerApi.listProducts(t, storeId),
      sellerApi.listSubscriptionPlans(t, storeId),
    ]);
    setLocations(ls);
    setWindows(ws);
    setProducts(ps);
    setPlans(sps);
    setSelectedWindowId((prev) => {
      if (prev && ws.some((w) => w.id === prev)) return prev;
      return ws[0]?.id ?? "";
    });
  }

  useEffect(() => {
    if (!token) return;
    setError(null);
    refreshAll(token).catch((e: unknown) => setError(friendlyErrorMessage(e)));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, storeId]);

  useEffect(() => {
    if (!token || !selectedWindowId) return;
    setError(null);
    sellerApi
      .listOfferings(token, storeId, selectedWindowId)
      .then(setOfferings)
      .catch((e: unknown) => setError(friendlyErrorMessage(e)));
  }, [token, storeId, selectedWindowId]);

  useEffect(() => {
    if (!token || !selectedWindowId) return;
    setError(null);
    sellerApi
      .listOrders(token, storeId, selectedWindowId)
      .then(setOrders)
      .catch((e: unknown) => setError(friendlyErrorMessage(e)));
  }, [token, storeId, selectedWindowId]);

  useEffect(() => {
    if (!token || !selectedWindowId) return;
    sellerApi
      .getPayoutSummary(token, storeId, selectedWindowId)
      .then(setPayoutSummary)
      .catch(() => setPayoutSummary(null));
  }, [token, storeId, selectedWindowId]);

  async function generateNextCycle(planId: string) {
    if (!token) return;
    setError(null);
    clearToast();
    setGeneratingCycle(true);
    try {
      const res = await sellerApi.generateNextCycle(token, storeId, planId);
      await refreshAll(token);
      setSelectedWindowId(res.pickup_window_id);
      showToast({
        kind: "success",
        message: "Pickup cycle generated. You are now live.",
      });
    } catch (e: unknown) {
      setError(friendlyErrorMessage(e));
      showToast({ kind: "error", message: "Could not generate pickup cycle." });
    } finally {
      setGeneratingCycle(false);
    }
  }

  async function togglePlanActive(planId: string, currentlyActive: boolean) {
    if (!token) return;
    const action = currentlyActive ? "pause" : "resume";
    const ok = window.confirm(
      currentlyActive
        ? "Pause this box? It will stop appearing for new buyers."
        : "Resume this box? It will be visible to buyers again.",
    );
    if (!ok) return;
    setTogglingPlan(true);
    setError(null);
    try {
      await sellerApi.updateSubscriptionPlan(token, storeId, planId, {
        is_active: !currentlyActive,
      });
      await refreshAll(token);
      showToast({
        kind: "success",
        message: action === "pause" ? "Box paused." : "Box resumed.",
      });
    } catch (e: unknown) {
      setError(friendlyErrorMessage(e));
      showToast({ kind: "error", message: `Could not ${action} box.` });
    } finally {
      setTogglingPlan(false);
    }
  }

  async function setOrderStatus(
    orderId: string,
    status: "ready" | "canceled" | "no_show",
    opts?: { waive_fee?: boolean },
  ) {
    if (!token || !selectedWindowId) return;
    if (status === "canceled") {
      const ok = window.confirm(
        "Cancel this order? This will release reserved inventory.",
      );
      if (!ok) return;
    }
    if (status === "no_show") {
      const ok = window.confirm(
        "Mark as no-show? This will release reserved inventory.",
      );
      if (!ok) return;
    }
    setBusyOrderId(orderId);
    setError(null);
    try {
      await sellerApi.updateOrderStatus(token, storeId, orderId, status, opts);
      // Refresh both orders and offerings since inventory may have changed.
      const [os, ofs] = await Promise.all([
        sellerApi.listOrders(token, storeId, selectedWindowId),
        sellerApi.listOfferings(token, storeId, selectedWindowId),
      ]);
      setOrders(os);
      setOfferings(ofs);
      const labels: Record<string, string> = {
        ready: "Order marked ready.",
        canceled: "Order canceled.",
        no_show: "Marked as no-show.",
      };
      showToast({ kind: "success", message: labels[status] ?? "Order updated." });
    } catch (e: unknown) {
      setError(friendlyErrorMessage(e));
    } finally {
      setBusyOrderId(null);
    }
  }

  async function confirmPickup(orderId: string) {
    if (!token || !selectedWindowId) return;
    const code = (pickupCodeByOrderId[orderId] ?? "").trim();
    if (!/^[0-9]{6}$/.test(code)) {
      setError("Pickup code must be 6 digits.");
      return;
    }
    setBusyOrderId(orderId);
    setError(null);
    try {
      await sellerApi.confirmPickup(token, storeId, orderId, code);
      // Refresh both orders and offerings since inventory may have changed.
      const [os, ofs] = await Promise.all([
        sellerApi.listOrders(token, storeId, selectedWindowId),
        sellerApi.listOfferings(token, storeId, selectedWindowId),
      ]);
      setOrders(os);
      setOfferings(ofs);
      setPickupCodeByOrderId((prev) => {
        const next = { ...prev };
        delete next[orderId];
        return next;
      });
      showToast({ kind: "success", message: "Pickup confirmed." });
    } catch (e: unknown) {
      setError(friendlyErrorMessage(e));
    } finally {
      setBusyOrderId(null);
    }
  }

  return (
    <div className="grid gap-8">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div className="grid gap-2">
          <Link
            className="lr-btn lr-chip inline-flex w-fit items-center gap-2 px-4 py-2 text-sm font-medium text-[color:var(--lr-ink)]"
            href="/seller"
          >
            <span aria-hidden="true">←</span>
            Seller home
          </Link>
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">Store</h1>
            <div className="mt-1 text-sm text-[color:var(--lr-muted)]">
              Manage your pickup windows, orders, and payouts.
            </div>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <Link
            className="lr-btn lr-chip px-4 py-2 text-sm font-medium text-[color:var(--lr-ink)]"
            href={`/seller/stores/${storeId}/settings`}
          >
            Settings
          </Link>
          <button
            ref={supportBtnRef}
            type="button"
            className="lr-btn lr-chip px-4 py-2 text-sm font-medium text-[color:var(--lr-ink)]"
            aria-haspopup="dialog"
            aria-expanded={supportOpen}
            onClick={() => setSupportOpen((v) => !v)}
          >
            Support
          </button>
          <button
            type="button"
            className="lr-btn lr-chip px-4 py-2 text-sm font-medium text-[color:var(--lr-ink)]"
            onClick={() => {
              session.clearToken();
              router.replace("/seller/login");
            }}
          >
            Sign out
          </button>
        </div>
      </header>

      {supportOpen && supportPos ? (
        <div
          ref={supportPanelRef}
          role="dialog"
          aria-label="Support"
          className="fixed z-50 w-[18rem] rounded-2xl border border-[color:var(--lr-border)] bg-white/92 p-3 text-sm shadow-[0_22px_60px_rgba(38,28,10,0.16)] backdrop-blur"
          style={{ top: supportPos.top, left: supportPos.left }}
        >
          <div className="text-xs font-semibold uppercase tracking-wide text-[color:var(--lr-muted)]">
            Store ID
          </div>
          <div className="mt-2 flex items-center gap-2">
            <span className="lr-chip grow rounded-xl px-3 py-2 font-mono text-xs text-[color:var(--lr-ink)]">
              {storeId}
            </span>
            <button
              type="button"
              className="lr-btn lr-btn-primary px-3 py-2 text-xs font-semibold"
              onClick={() => {
                navigator.clipboard
                  .writeText(storeId)
                  .then(() => showToast({ kind: "success", message: "Store ID copied." }))
                  .catch(() =>
                    showToast({
                      kind: "error",
                      message: "Could not copy. Your browser may block clipboard access.",
                    }),
                  );
              }}
            >
              Copy
            </button>
          </div>
          <div className="mt-2 text-xs text-[color:var(--lr-muted)]">
            Only needed if you contact support.
          </div>
        </div>
      ) : null}

      {error ? (
        <div className="lr-card border-rose-200 bg-rose-50/60 p-4 text-sm text-rose-900">
          {error}
        </div>
      ) : null}

      <section className="lr-card lr-card-strong lr-animate sticky top-3 z-10 grid gap-3 p-4 md:p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <select
            className="lr-field px-3 py-2 text-sm"
            value={selectedWindowId}
            onChange={(e) => setSelectedWindowId(e.target.value)}
          >
            <option value="">Select a window…</option>
            {(windows ?? []).map((w) => (
              <option key={w.id} value={w.id}>
                {formatWindowLabel(w)}
              </option>
            ))}
          </select>

          {selectedWindowId ? (
            <Link
              className="lr-btn lr-chip px-4 py-2 text-sm font-medium text-[color:var(--lr-ink)]"
              href={`/pickup-windows/${selectedWindowId}`}
              target="_blank"
              rel="noreferrer"
            >
              Buyer view
            </Link>
          ) : null}
        </div>

        {selectedWindow ? (
          <>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="text-base font-semibold text-[color:var(--lr-ink)]">
                {(() => {
                  const start = new Date(selectedWindow.start_at);
                  const end = new Date(selectedWindow.end_at);
                  const now = new Date();
                  const label = start > now ? "Next pickup" : "Current pickup";
                  const day = start.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" });
                  const startTime = start.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
                  const endTime = end.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
                  return `${label} · ${day} · ${startTime} – ${endTime}`;
                })()}
              </div>
              <StatusPill status={selectedWindow.status} />
            </div>
            <div className="flex flex-wrap items-center gap-2 text-sm text-[color:var(--lr-muted)]">
              <span>
                {selectedWindow.pickup_location.label ?? "Pickup"} ·{" "}
                {selectedWindow.pickup_location.city},{" "}
                {selectedWindow.pickup_location.region}
              </span>
              <span>·</span>
              <span>
                Orders close{" "}
                <span className="font-medium text-[color:var(--lr-ink)]">
                  {new Date(selectedWindow.cutoff_at).toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}
                </span>
              </span>
            </div>
          </>
        ) : (
          <div className="text-sm text-[color:var(--lr-muted)]">
            Generate a box cycle to create a pickup window.
          </div>
        )}
      </section>

      <div className="grid gap-8 lg:grid-cols-2">
        <section className="lr-card lr-animate grid gap-4 p-6">
          <div>
            <h2 className="text-base font-semibold">Subscription boxes</h2>
            <p className="mt-1 text-sm text-[color:var(--lr-muted)]">
              Curated seasonal boxes for recurring buyers. Print a farmstand QR
              to turn walk-up buyers into subscriptions.
            </p>
          </div>

          {plans?.length ? (
            <ul className="grid gap-3">
              {plans.map((p) => (
                <li key={p.id} className="lr-chip rounded-2xl p-4">
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div className="min-w-[240px]">
                      <div className="flex flex-wrap items-center gap-2">
                        <div className="font-semibold text-[color:var(--lr-ink)]">
                          {p.title}
                        </div>
                        <span className="lr-chip rounded-full px-3 py-1 text-xs font-semibold text-[color:var(--lr-muted)]">
                          {p.cadence}
                        </span>
                        {p.is_live ? (
                          <span className="lr-chip rounded-full px-3 py-1 text-xs font-semibold text-[color:var(--lr-leaf)]">
                            live
                          </span>
                        ) : (
                          <span className="lr-chip rounded-full px-3 py-1 text-xs font-semibold text-[color:var(--lr-clay)]">
                            draft
                          </span>
                        )}
                        {!p.is_active ? (
                          <span className="lr-chip rounded-full px-3 py-1 text-xs font-semibold text-[color:var(--lr-clay)]">
                            inactive
                          </span>
                        ) : null}
                      </div>
                      <div className="mt-1 text-sm text-[color:var(--lr-muted)]">
                        ${(p.price_cents / 100).toFixed(2)} · cap{" "}
                        {p.subscriber_limit} · next{" "}
                        {new Date(p.next_start_at).toLocaleString()}
                      </div>
                      <div className="mt-2 flex flex-wrap gap-2">
                        <Link
                          className="lr-btn lr-chip px-3 py-2 text-sm font-semibold text-[color:var(--lr-ink)]"
                          href={`/boxes/${p.id}`}
                          target="_blank"
                          rel="noreferrer"
                        >
                          {p.is_live ? "Buyer page" : "Preview buyer page"}
                        </Link>
                        <button
                          type="button"
                          className="lr-btn lr-btn-primary px-3 py-2 text-sm font-semibold"
                          onClick={() => generateNextCycle(p.id)}
                          disabled={generatingCycle}
                        >
                          {generatingCycle
                            ? "Generating…"
                            : p.is_live
                            ? "Generate next cycle"
                            : "Go live (generate first cycle)"}
                        </button>
                        <button
                          type="button"
                          className={`lr-btn lr-chip px-3 py-2 text-sm font-semibold disabled:opacity-50 ${
                            p.is_active
                              ? "text-[color:var(--lr-clay)]"
                              : "text-[color:var(--lr-leaf)]"
                          }`}
                          onClick={() => togglePlanActive(p.id, p.is_active)}
                          disabled={togglingPlan}
                        >
                          {togglingPlan
                            ? "Updating…"
                            : p.is_active
                              ? "Pause box"
                              : "Resume box"}
                        </button>
                      </div>
                    </div>

                    <div className="grid gap-2 justify-items-end">
                      {p.is_live ? (
                        <>
                          <QrCode
                            value={
                              siteOrigin
                                ? `${siteOrigin}/b/${p.id}`
                                : `/b/${p.id}`
                            }
                            size={140}
                            label="Farmstand QR"
                          />
                          <div className="flex flex-wrap justify-end gap-2">
                            <Link
                              className="lr-btn lr-chip px-3 py-2 text-sm font-semibold text-[color:var(--lr-ink)]"
                              href={`/boxes/${p.id}/qr`}
                              target="_blank"
                              rel="noreferrer"
                            >
                              Print poster
                            </Link>
                            <button
                              type="button"
                              className="lr-btn lr-chip px-3 py-2 text-sm font-semibold text-[color:var(--lr-ink)]"
                              onClick={() => {
                                const url = siteOrigin
                                  ? `${siteOrigin}/b/${p.id}`
                                  : `/b/${p.id}`;
                                navigator.clipboard
                                  .writeText(url)
                                  .then(() =>
                                    showToast({
                                      kind: "success",
                                      message: "Buyer link copied.",
                                    }),
                                  )
                                  .catch(() =>
                                    showToast({
                                      kind: "error",
                                      message:
                                        "Could not copy. Your browser may block clipboard access.",
                                    }),
                                  );
                              }}
                            >
                              Copy link
                            </button>
                          </div>
                          <div className="max-w-[14rem] text-right text-xs text-[color:var(--lr-muted)]">
                            Tip: print this QR at the farmstand.
                          </div>
                        </>
                      ) : (
                        <div className="lr-chip grid gap-2 rounded-2xl p-4 text-right">
                          <div className="text-xs font-semibold uppercase tracking-wide text-[color:var(--lr-muted)]">
                            Farmstand QR
                          </div>
                          <div className="text-xs text-[color:var(--lr-muted)]">
                            Go live to enable the buyer QR.
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <div className="text-sm text-[color:var(--lr-muted)]">
              No subscription boxes yet.
            </div>
          )}
        </section>

      <section className="lr-card lr-animate grid gap-4 p-6">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="text-base font-semibold">Orders</h2>
            <p className="mt-1 text-sm text-[color:var(--lr-muted)]">
              Mark orders ready, then confirm pickup. Reviews unlock for buyers
              after pickup.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            {(
              [
                ["all", "All"],
                ["placed", "Placed"],
                ["ready", "Ready"],
                ["picked_up", "Picked up"],
                ["no_show", "No show"],
                ["canceled", "Canceled"],
              ] as const
            ).map(([k, label]) => {
              const active = orderFilter === k;
              const count = orderCounts[k];
              return (
                <button
                  key={k}
                  type="button"
                  className={`lr-btn px-3 py-1.5 text-sm font-semibold ${
                    active
                      ? "lr-btn-primary"
                      : "lr-chip text-[color:var(--lr-ink)]"
                  }`}
                  onClick={() => setOrderFilter(k)}
                  aria-pressed={active}
                >
                  {label}{" "}
                  <span className="opacity-80" aria-label={`${count} orders`}>
                    {count}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {payoutSummary ? (
          <div className="rounded-2xl bg-white/60 p-4 text-sm ring-1 ring-[color:var(--lr-border)]">
            <div className="flex flex-wrap items-baseline justify-between gap-4">
              <div className="font-semibold text-[color:var(--lr-ink)]">
                Payout summary (est.)
              </div>
              <div className="text-base font-semibold text-[color:var(--lr-ink)]">
                {formatMoney(payoutSummary.seller_payout_cents)}
              </div>
            </div>
            <div className="mt-2 grid gap-1 text-xs text-[color:var(--lr-muted)]">
              <div>
                Picked up: {payoutSummary.picked_up_count} ·{" "}
                {formatMoney(payoutSummary.payout_picked_up_cents)}
              </div>
              <div>
                No-show fees: {payoutSummary.no_show_count} ·{" "}
                {formatMoney(payoutSummary.payout_no_show_cents)}
              </div>
              <div>
                Platform fee collected:{" "}
                {formatMoney(payoutSummary.platform_fee_cents)}
              </div>
            </div>
          </div>
        ) : null}

        {filteredOrders?.length ? (
          <ul className="grid gap-2">
            {filteredOrders.map((o) => (
              <li key={o.id} className="lr-chip rounded-2xl px-4 py-3">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div className="min-w-[240px]">
                      <div className="flex flex-wrap items-center gap-2">
                        <div className="font-medium text-[color:var(--lr-ink)]">
                          {o.buyer_name ? `${o.buyer_name} · ` : ""}
                          {o.buyer_email}
                        </div>
                        <StatusPill status={o.status} />
                        <PaymentPill status={o.payment_status} />
                      </div>
                  <div className="mt-1 text-sm text-[color:var(--lr-muted)]">
                    Total{" "}
                    <span className="font-semibold text-[color:var(--lr-ink)]">
                      {formatMoney(o.total_cents)}
                    </span>
                    {" · "}Placed{" "}
                    <span className="font-medium text-[color:var(--lr-ink)]">
                      {new Date(o.created_at).toLocaleString()}
                    </span>
                  </div>
                  <div className="mt-1 text-sm text-[color:var(--lr-muted)]">
                    Seller payout (est.){" "}
                    <span className="font-semibold text-[color:var(--lr-ink)]">
                      {formatMoney(o.subtotal_cents)}
                    </span>
                    {o.payment_method === "card" && (o.buyer_fee_cents ?? 0) > 0 ? (
                      <>
                        {" · "}Service fee{" "}
                        <span className="font-semibold text-[color:var(--lr-ink)]">
                          {formatMoney(o.buyer_fee_cents)}
                        </span>
                      </>
                    ) : null}
                  </div>
                  {o.status === "no_show" && (o.captured_cents ?? 0) > 0 ? (
                    <div className="mt-1 text-sm text-[color:var(--lr-muted)]">
                      No-show fee{" "}
                      <span className="font-semibold text-[color:var(--lr-ink)]">
                        {formatMoney(o.captured_cents)}
                      </span>
                    </div>
                  ) : null}
                  <div className="mt-2 grid gap-1">
                    {o.items.map((it) => (
                      <div
                        key={it.id}
                          className="text-sm text-[color:var(--lr-muted)]"
                        >
                          <span className="font-semibold text-[color:var(--lr-ink)]">
                            {it.quantity}×
                          </span>{" "}
                          {it.product_title}{" "}
                          <span className="opacity-85">
                            ({it.product_unit})
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    {o.status === "placed" ? (
                      <>
                        <button
                          type="button"
                          className="lr-btn lr-btn-primary px-3 py-2 text-sm font-semibold disabled:opacity-50"
                          onClick={() => setOrderStatus(o.id, "ready")}
                          disabled={busyOrderId === o.id}
                        >
                          {busyOrderId === o.id ? "Updating…" : "Mark ready"}
                        </button>
                        <button
                          type="button"
                          className="lr-btn lr-chip px-3 py-2 text-sm font-semibold text-rose-900 disabled:opacity-50"
                          onClick={() => setOrderStatus(o.id, "canceled")}
                          disabled={busyOrderId === o.id}
                        >
                          Cancel
                        </button>
                      </>
                    ) : null}

                    {o.status === "ready" ? (
                      <>
                        <div className="grid gap-2">
                          <label className="grid gap-1">
                            <span className="text-xs font-semibold text-[color:var(--lr-muted)]">
                              Pickup code
                            </span>
                            <input
                              className="lr-field w-40 px-3 py-2 text-sm font-mono tracking-widest"
                              inputMode="numeric"
                              pattern="[0-9]*"
                              maxLength={6}
                              placeholder="123456"
                              value={pickupCodeByOrderId[o.id] ?? ""}
                              onChange={(e) =>
                                setPickupCodeByOrderId((prev) => ({
                                  ...prev,
                                  [o.id]: e.target.value.replace(/\D/g, "").slice(0, 6),
                                }))
                              }
                            />
                          </label>
                          <div className="flex flex-wrap gap-2">
                            <button
                              type="button"
                              className="lr-btn lr-btn-primary px-3 py-2 text-sm font-semibold disabled:opacity-50"
                              onClick={() => confirmPickup(o.id)}
                              disabled={busyOrderId === o.id}
                            >
                              {busyOrderId === o.id ? "Confirming…" : "Confirm pickup"}
                            </button>
                            <button
                              type="button"
                              className="lr-btn lr-chip px-3 py-2 text-sm font-semibold text-[color:var(--lr-ink)]"
                              onClick={() => setScanOrderId(o.id)}
                              disabled={busyOrderId === o.id}
                            >
                              Scan QR
                            </button>
                          </div>
                        </div>
                        <div className="grid content-start gap-2">
                          <button
                            type="button"
                            className="lr-btn lr-chip px-3 py-2 text-sm font-semibold text-[color:var(--lr-clay)] disabled:opacity-50"
                            onClick={() =>
                              setOrderStatus(o.id, "no_show", {
                                waive_fee: false,
                              })
                            }
                            disabled={busyOrderId === o.id}
                            title="Capture a small no-show fee (default $5) when authorized."
                          >
                            No show (charge fee)
                          </button>
                          <button
                            type="button"
                            className="lr-btn lr-chip px-3 py-2 text-sm font-semibold text-[color:var(--lr-muted)] disabled:opacity-50"
                            onClick={() =>
                              setOrderStatus(o.id, "no_show", { waive_fee: true })
                            }
                            disabled={busyOrderId === o.id}
                            title="Void the authorization (waive fee)."
                          >
                            No show (waive)
                          </button>
                        </div>
                      </>
                    ) : null}
                  </div>
                </div>
              </li>
            ))}
          </ul>
        ) : selectedWindowId ? (
          <div className="text-sm text-[color:var(--lr-muted)]">
            No orders yet for this window.
          </div>
        ) : (
          <div className="text-sm text-[color:var(--lr-muted)]">
            Select an active pickup window above to view orders.
          </div>
        )}
      </section>
      </div>

      <QrScannerModal
        open={scanOrderId !== null}
        onClose={() => setScanOrderId(null)}
        onScan={(res) => {
          const parsed = res.parsed;
          if (parsed) {
            // If the QR includes a different order_id, fill that order instead.
            const targetOrderId = parsed.order_id;
            setPickupCodeByOrderId((prev) => ({
              ...prev,
              [targetOrderId]: parsed.pickup_code,
            }));
            return;
          }
          // If a generic QR was scanned, try to extract a 6-digit code.
          const m = res.raw.match(/\b([0-9]{6})\b/);
          if (!m) {
            setError("Scanned QR did not contain a valid pickup code.");
            return;
          }
          const target = scanOrderId;
          if (!target) return;
          setPickupCodeByOrderId((prev) => ({ ...prev, [target]: m[1] ?? "" }));
        }}
      />
    </div>
  );
}
