"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import {
  sellerApi,
  type SellerOrder,
  type SellerPayoutSummary,
  type SellerPickupWindow,
  type SellerSubscriptionPlan,
  type SellerSubscription,
} from "@/lib/seller-api";
import { session } from "@/lib/session";
import { useToast } from "@/components/toast";
import { formatMoney, friendlyErrorMessage, parseApiError } from "@/lib/ui";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { RefundModal } from "@/components/refund-modal";
import { PickupWindowList } from "@/components/seller/pickup-window-list";
import { SubscriptionPlanList } from "@/components/seller/subscription-plan-list";
import { OrderList } from "@/components/seller/order-list";
import { SubscriberList } from "@/components/seller/subscriber-list";
import { GlobalPickupEntry } from "@/components/seller/global-pickup-entry";
import { PayoutSummaryCard } from "@/components/seller/payout-summary";

export default function SellerStorePage() {
  const params = useParams<{ storeId: string }>();
  const storeId = params.storeId;
  const router = useRouter();
  const { showToast, clearToast } = useToast();

  const [token, setToken] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [windows, setWindows] = useState<SellerPickupWindow[] | null>(null);
  const [orders, setOrders] = useState<SellerOrder[] | null>(null);
  const [payoutSummary, setPayoutSummary] = useState<SellerPayoutSummary | null>(
    null,
  );
  const [plans, setPlans] = useState<SellerSubscriptionPlan[] | null>(null);
  const [subscriptions, setSubscriptions] = useState<SellerSubscription[] | null>(null);
  const [busySubId, setBusySubId] = useState<string | null>(null);

  const [selectedWindowId, setSelectedWindowId] = useState<string>("");
  const [tab, setTab] = useState<"pickups" | "manage">("pickups");
  const [generatingCycle, setGeneratingCycle] = useState(false);
  const [busyOrderId, setBusyOrderId] = useState<string | null>(null);
  const [refundOrderId, setRefundOrderId] = useState<string | null>(null);
  const [refundLoading, setRefundLoading] = useState(false);
  const [togglingPlan, setTogglingPlan] = useState(false);
  const [confirmAction, setConfirmAction] = useState<{
    title: string;
    message: string;
    confirmLabel: string;
    destructive: boolean;
    action: () => void;
  } | null>(null);

  const selectedWindow = useMemo(() => {
    if (!selectedWindowId) return null;
    return (windows ?? []).find((w) => w.id === selectedWindowId) ?? null;
  }, [windows, selectedWindowId]);

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

  async function refreshAll(t: string) {
    const [, ws, , sps, subs] = await Promise.all([
      sellerApi.listPickupLocations(t, storeId),
      sellerApi.listPickupWindows(t, storeId),
      sellerApi.listProducts(t, storeId),
      sellerApi.listSubscriptionPlans(t, storeId),
      sellerApi.listSubscriptions(t, storeId),
    ]);
    setWindows(ws);
    setPlans(sps);
    setSubscriptions(subs);
    setSelectedWindowId((prev) => {
      if (prev && ws.some((w) => w.id === prev)) return prev;
      return ws[0]?.id ?? "";
    });
  }

  useEffect(() => {
    if (!token) return;
    setError(null);
    refreshAll(token).catch((e: unknown) => {
      const apiErr = parseApiError(e);
      if (apiErr && apiErr.status === 403) {
        showToast({ kind: "error", message: "You don\u2019t have access to that store." });
        router.replace("/seller");
        return;
      }
      if (apiErr && apiErr.status === 404) {
        showToast({ kind: "error", message: "Store not found." });
        router.replace("/seller");
        return;
      }
      setError(friendlyErrorMessage(e));
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, storeId]);

  useEffect(() => {
    if (!token || !selectedWindowId) return;
    setError(null);
    sellerApi
      .listOfferings(token, storeId, selectedWindowId)
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

  function togglePlanActive(planId: string, currentlyActive: boolean) {
    if (!token) return;
    const action = currentlyActive ? "pause" : "resume";
    setConfirmAction({
      title: currentlyActive ? "Pause box?" : "Resume box?",
      message: currentlyActive
        ? "It will stop appearing for new buyers."
        : "It will be visible to buyers again.",
      confirmLabel: currentlyActive ? "Pause" : "Resume",
      destructive: currentlyActive,
      action: async () => {
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
      },
    });
  }

  async function setOrderStatus(
    orderId: string,
    status: "ready" | "canceled" | "no_show",
    opts?: { waive_fee?: boolean },
  ) {
    if (!token || !selectedWindowId) return;
    if (status === "canceled") {
      setConfirmAction({
        title: "Cancel order?",
        message: "This will release reserved inventory.",
        confirmLabel: "Cancel order",
        destructive: true,
        action: () => executeOrderStatus(orderId, status, opts),
      });
      return;
    }
    if (status === "no_show") {
      setConfirmAction({
        title: "Mark as no-show?",
        message: "This will release reserved inventory.",
        confirmLabel: "Mark no-show",
        destructive: true,
        action: () => executeOrderStatus(orderId, status, opts),
      });
      return;
    }
    executeOrderStatus(orderId, status, opts);
  }

  async function executeOrderStatus(
    orderId: string,
    status: "ready" | "canceled" | "no_show",
    opts?: { waive_fee?: boolean },
  ) {
    if (!token || !selectedWindowId) return;
    setBusyOrderId(orderId);
    setError(null);
    try {
      await sellerApi.updateOrderStatus(token, storeId, orderId, status, opts);
      // Refresh both orders and offerings since inventory may have changed.
      const [os] = await Promise.all([
        sellerApi.listOrders(token, storeId, selectedWindowId),
        sellerApi.listOfferings(token, storeId, selectedWindowId),
      ]);
      setOrders(os);
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

  async function executeRefund() {
    if (!token || !refundOrderId || !selectedWindowId) return;
    setRefundLoading(true);
    try {
      await sellerApi.refundOrder(token, storeId, refundOrderId);
      const os = await sellerApi.listOrders(token, storeId, selectedWindowId);
      setOrders(os);
      showToast({ kind: "success", message: "Refund initiated. The buyer will be credited shortly." });
    } catch (e: unknown) {
      showToast({ kind: "error", message: friendlyErrorMessage(e) });
    } finally {
      setRefundLoading(false);
      setRefundOrderId(null);
    }
  }

  function cancelSubscription(subId: string) {
    setConfirmAction({
      title: "Cancel subscription?",
      message: "This will cancel the subscription and any unfulfilled orders for this subscriber.",
      confirmLabel: "Cancel subscription",
      destructive: true,
      action: async () => {
        if (!token) return;
        setBusySubId(subId);
        setError(null);
        try {
          await sellerApi.cancelSubscription(token, storeId, subId);
          await refreshAll(token);
          showToast({ kind: "success", message: "Subscription canceled." });
        } catch (e: unknown) {
          setError(friendlyErrorMessage(e));
          showToast({ kind: "error", message: "Could not cancel subscription." });
        } finally {
          setBusySubId(null);
        }
      },
    });
  }

  return (
    <div className="grid gap-8">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div className="grid gap-2">
          <Link
            className="lr-btn lr-chip inline-flex w-fit items-center gap-2 px-4 py-2 text-sm font-medium text-[color:var(--lr-ink)]"
            href="/seller"
          >
            <span aria-hidden="true">&larr;</span>
            Seller home
          </Link>
          <h1 className="text-2xl font-semibold tracking-tight">Store</h1>
        </div>

        <div className="flex gap-2">
          <Link
            className="lr-btn lr-chip px-4 py-2 text-sm font-medium text-[color:var(--lr-ink)]"
            href={`/seller/stores/${storeId}/analytics`}
          >
            Analytics
          </Link>
          <Link
            className="lr-btn lr-chip px-4 py-2 text-sm font-medium text-[color:var(--lr-ink)]"
            href={`/seller/stores/${storeId}/settings`}
          >
            Settings
          </Link>
        </div>
      </header>

      {error ? (
        <div className="lr-card border-rose-200 bg-rose-50/60 p-4 text-sm text-rose-900">
          {error}
        </div>
      ) : null}

      <div className="flex gap-1 rounded-xl bg-[color:var(--lr-border)]/50 p-1">
        <button
          type="button"
          className={`rounded-lg px-4 py-2 text-sm font-semibold transition ${
            tab === "pickups"
              ? "bg-white text-[color:var(--lr-ink)] shadow-sm"
              : "text-[color:var(--lr-muted)] hover:text-[color:var(--lr-ink)]"
          }`}
          onClick={() => setTab("pickups")}
        >
          Pickups
        </button>
        <button
          type="button"
          className={`rounded-lg px-4 py-2 text-sm font-semibold transition ${
            tab === "manage"
              ? "bg-white text-[color:var(--lr-ink)] shadow-sm"
              : "text-[color:var(--lr-muted)] hover:text-[color:var(--lr-ink)]"
          }`}
          onClick={() => setTab("manage")}
        >
          Manage
        </button>
      </div>

      {tab === "pickups" && (
        <div className="grid gap-6">
          <PickupWindowList
            windows={windows}
            selectedWindowId={selectedWindowId}
            selectedWindow={selectedWindow}
            onWindowChange={setSelectedWindowId}
          />

          {token && (
            <GlobalPickupEntry
              token={token}
              storeId={storeId}
              onPickupConfirmed={() => {
                if (token && selectedWindowId) {
                  sellerApi
                    .listOrders(token, storeId, selectedWindowId)
                    .then(setOrders)
                    .catch(() => {});
                }
              }}
              showToast={showToast}
            />
          )}

          {payoutSummary && payoutSummary.picked_up_count > 0 ? (
            <p className="text-sm text-[color:var(--lr-muted)]">
              Today:{" "}
              <span className="font-semibold text-[color:var(--lr-ink)]">
                {formatMoney(payoutSummary.seller_payout_cents)}
              </span>
              {" from "}
              {payoutSummary.picked_up_count} pickup
              {payoutSummary.picked_up_count !== 1 ? "s" : ""}
            </p>
          ) : null}

          <OrderList
            orders={orders}
            selectedWindowId={selectedWindowId}
            busyOrderId={busyOrderId}
            onSetOrderStatus={setOrderStatus}
            onRefundOrder={setRefundOrderId}
          />
        </div>
      )}

      {tab === "manage" && (
        <div className="grid gap-8">
          <SubscriptionPlanList
            plans={plans}
            siteOrigin={siteOrigin}
            generatingCycle={generatingCycle}
            togglingPlan={togglingPlan}
            onGenerateNextCycle={generateNextCycle}
            onTogglePlanActive={togglePlanActive}
            showToast={showToast}
          />

          <SubscriberList
            subscriptions={subscriptions}
            busySubId={busySubId}
            onCancel={cancelSubscription}
          />

          {payoutSummary ? (
            <PayoutSummaryCard summary={payoutSummary} />
          ) : null}
        </div>
      )}

      <ConfirmDialog
        open={confirmAction !== null}
        title={confirmAction?.title ?? ""}
        message={confirmAction?.message ?? ""}
        confirmLabel={confirmAction?.confirmLabel ?? "Confirm"}
        destructive={confirmAction?.destructive ?? false}
        onConfirm={() => {
          confirmAction?.action();
          setConfirmAction(null);
        }}
        onCancel={() => setConfirmAction(null)}
      />

      {(() => {
        const refundOrder = refundOrderId
          ? (orders ?? []).find((o) => o.id === refundOrderId)
          : null;
        return (
          <RefundModal
            isOpen={refundOrderId !== null}
            onClose={() => setRefundOrderId(null)}
            onConfirm={executeRefund}
            amount={refundOrder ? formatMoney(refundOrder.total_cents) : ""}
            buyerName={refundOrder?.buyer_name ?? undefined}
            loading={refundLoading}
          />
        );
      })()}
    </div>
  );
}
