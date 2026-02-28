"use client";

import { useMemo, useState } from "react";
import {
  type SellerOrder,
  type SellerPayoutSummary,
} from "@/lib/seller-api";
import { formatMoney } from "@/lib/ui";
import { StatusPill, PaymentPill } from "@/components/seller/status-pills";
import { ManualPickupEntry } from "@/components/seller/manual-pickup-entry";
import { PayoutSummaryCard } from "@/components/seller/payout-summary";

type OrderFilter =
  | "all"
  | "placed"
  | "ready"
  | "picked_up"
  | "no_show"
  | "canceled";

interface OrderListProps {
  orders: SellerOrder[] | null;
  selectedWindowId: string;
  busyOrderId: string | null;
  pickupCodeByOrderId: Record<string, string>;
  payoutSummary: SellerPayoutSummary | null;
  onSetOrderStatus: (
    orderId: string,
    status: "ready" | "canceled" | "no_show",
    opts?: { waive_fee?: boolean },
  ) => void;
  onConfirmPickup: (orderId: string) => void;
  onPickupCodeChange: (orderId: string, code: string) => void;
}

export function OrderList({
  orders,
  selectedWindowId,
  busyOrderId,
  pickupCodeByOrderId,
  payoutSummary,
  onSetOrderStatus,
  onConfirmPickup,
  onPickupCodeChange,
}: OrderListProps) {
  const [orderFilter, setOrderFilter] = useState<OrderFilter>("all");

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

  return (
    <section className="lr-card lr-animate grid gap-4 p-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="flex flex-wrap items-center gap-3">
          <div>
            <h2 className="text-base font-semibold">Orders</h2>
            <p className="mt-1 text-sm text-[color:var(--lr-muted)]">
              Scan the buyer&apos;s QR with your phone camera, or enter the
              code manually.
            </p>
          </div>
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
        <PayoutSummaryCard summary={payoutSummary} />
      ) : null}

      {filteredOrders?.length ? (
        <ul className="grid gap-2">
          {filteredOrders.map((o) => (
            <li key={o.id} className="lr-chip rounded-2xl px-4 py-3">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="min-w-[240px]">
                  <div className="flex flex-wrap items-center gap-2">
                    <div className="font-medium text-[color:var(--lr-ink)]">
                      {o.buyer_name ? `${o.buyer_name} \u00b7 ` : ""}
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
                    {" \u00b7 "}Placed{" "}
                    <span className="font-medium text-[color:var(--lr-ink)]">
                      {new Date(o.created_at).toLocaleString()}
                    </span>
                  </div>
                  <div className="mt-1 text-sm text-[color:var(--lr-muted)]">
                    Seller payout (est.){" "}
                    <span className="font-semibold text-[color:var(--lr-ink)]">
                      {formatMoney(o.subtotal_cents)}
                    </span>
                    {o.payment_method === "card" &&
                    (o.buyer_fee_cents ?? 0) > 0 ? (
                      <>
                        {" \u00b7 "}Service fee{" "}
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
                          {it.quantity}&times;
                        </span>{" "}
                        {it.product_title}{" "}
                        <span className="opacity-85">({it.product_unit})</span>
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
                        onClick={() => onSetOrderStatus(o.id, "ready")}
                        disabled={busyOrderId === o.id}
                      >
                        {busyOrderId === o.id ? "Updating\u2026" : "Mark ready"}
                      </button>
                      <ManualPickupEntry
                        orderId={o.id}
                        pickupCode={pickupCodeByOrderId[o.id] ?? ""}
                        onPickupCodeChange={onPickupCodeChange}
                        onConfirm={onConfirmPickup}
                        busy={busyOrderId === o.id}
                      />
                      <button
                        type="button"
                        className="lr-btn lr-chip px-3 py-2 text-sm font-semibold text-rose-900 disabled:opacity-50"
                        onClick={() => onSetOrderStatus(o.id, "canceled")}
                        disabled={busyOrderId === o.id}
                      >
                        Cancel
                      </button>
                    </>
                  ) : null}

                  {o.status === "ready" ? (
                    <>
                      <ManualPickupEntry
                        orderId={o.id}
                        pickupCode={pickupCodeByOrderId[o.id] ?? ""}
                        onPickupCodeChange={onPickupCodeChange}
                        onConfirm={onConfirmPickup}
                        busy={busyOrderId === o.id}
                      />
                      <div className="grid content-start gap-2">
                        <button
                          type="button"
                          className="lr-btn lr-chip px-3 py-2 text-sm font-semibold text-[color:var(--lr-clay)] disabled:opacity-50"
                          onClick={() =>
                            onSetOrderStatus(o.id, "no_show", {
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
                            onSetOrderStatus(o.id, "no_show", {
                              waive_fee: true,
                            })
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
  );
}
