"use client";

import { useMemo, useState } from "react";
import { type SellerOrder } from "@/lib/seller-api";
import { formatMoney } from "@/lib/ui";
import { StatusPill, PaymentPill } from "@/components/seller/status-pills";

interface OrderListProps {
  orders: SellerOrder[] | null;
  selectedWindowId: string;
  busyOrderId: string | null;
  onSetOrderStatus: (
    orderId: string,
    status: "ready" | "canceled" | "no_show",
    opts?: { waive_fee?: boolean },
  ) => void;
}

export function OrderList({
  orders,
  selectedWindowId,
  busyOrderId,
  onSetOrderStatus,
}: OrderListProps) {
  const [expandedOrders, setExpandedOrders] = useState<Set<string>>(new Set());
  const [showCompleted, setShowCompleted] = useState(false);

  function toggleExpand(orderId: string) {
    setExpandedOrders((prev) => {
      const next = new Set(prev);
      if (next.has(orderId)) next.delete(orderId);
      else next.add(orderId);
      return next;
    });
  }

  const grouped = useMemo(() => {
    if (!orders) return null;
    const ready: SellerOrder[] = [];
    const waiting: SellerOrder[] = [];
    const completed: SellerOrder[] = [];
    for (const o of orders) {
      if (o.status === "ready") ready.push(o);
      else if (o.status === "placed") waiting.push(o);
      else completed.push(o);
    }
    return { ready, waiting, completed };
  }, [orders]);

  function renderOrder(o: SellerOrder) {
    const isExpanded = expandedOrders.has(o.id);
    const buyerLabel = o.buyer_name
      ? o.buyer_name.split(" ")[0]
      : o.buyer_email.split("@")[0];
    const itemSummary = o.items
      .map((it) => `${it.quantity}x ${it.product_title}`)
      .join(", ");

    return (
      <li key={o.id} className="lr-chip rounded-2xl px-4 py-3">
        {/* Compact row */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-medium text-[color:var(--lr-ink)]">
                {buyerLabel}
              </span>
              <span className="font-semibold text-[color:var(--lr-ink)]">
                {formatMoney(o.total_cents)}
              </span>
              <StatusPill status={o.status} />
            </div>
            <div className="mt-1 truncate text-sm text-[color:var(--lr-muted)]">
              {itemSummary}
            </div>
          </div>

          <div className="flex items-center gap-2">
            {o.status === "placed" && (
              <button
                type="button"
                className="lr-btn lr-btn-primary px-3 py-2 text-sm font-semibold disabled:opacity-50"
                onClick={() => onSetOrderStatus(o.id, "ready")}
                disabled={busyOrderId === o.id}
              >
                {busyOrderId === o.id ? "Updating\u2026" : "Mark ready"}
              </button>
            )}

            <button
              type="button"
              className="lr-btn lr-chip px-2 py-2 text-sm text-[color:var(--lr-muted)]"
              onClick={() => toggleExpand(o.id)}
              aria-expanded={isExpanded}
              aria-label={isExpanded ? "Collapse details" : "Expand details"}
            >
              <svg
                width="16"
                height="16"
                viewBox="0 0 16 16"
                fill="none"
                className={`transition-transform ${isExpanded ? "rotate-180" : ""}`}
              >
                <path
                  d="M4 6l4 4 4-4"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </button>
          </div>
        </div>

        {/* Expanded detail */}
        {isExpanded && (
          <div className="mt-3 border-t border-[color:var(--lr-muted)]/20 pt-3">
            <div className="flex flex-wrap items-center gap-2 text-sm">
              <span className="text-[color:var(--lr-muted)]">
                {o.buyer_name ? `${o.buyer_name} \u00b7 ` : ""}
                {o.buyer_email}
              </span>
              <PaymentPill status={o.payment_status} />
            </div>
            <div className="mt-1 text-sm text-[color:var(--lr-muted)]">
              Placed{" "}
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

            {/* Secondary actions */}
            <div className="mt-3 flex flex-wrap gap-2">
              {o.status === "placed" && (
                <button
                  type="button"
                  className="lr-btn lr-chip px-3 py-2 text-sm font-semibold text-rose-900 disabled:opacity-50"
                  onClick={() => onSetOrderStatus(o.id, "canceled")}
                  disabled={busyOrderId === o.id}
                >
                  Cancel
                </button>
              )}
              {o.status === "ready" && (
                <>
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
                </>
              )}
            </div>
          </div>
        )}
      </li>
    );
  }

  if (!grouped) {
    return selectedWindowId ? (
      <section className="grid gap-4">
        <div className="text-sm text-[color:var(--lr-muted)]">
          No orders yet for this window.
        </div>
      </section>
    ) : (
      <section className="grid gap-4">
        <div className="text-sm text-[color:var(--lr-muted)]">
          Select a pickup window to view orders.
        </div>
      </section>
    );
  }

  if (
    grouped.ready.length === 0 &&
    grouped.waiting.length === 0 &&
    grouped.completed.length === 0
  ) {
    return (
      <section className="grid gap-4">
        <div className="text-sm text-[color:var(--lr-muted)]">
          No orders yet for this window.
        </div>
      </section>
    );
  }

  return (
    <section className="grid gap-4">
      {/* Ready section - green accent */}
      {grouped.ready.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold text-[color:var(--lr-leaf)]">
            Ready ({grouped.ready.length})
          </h3>
          <ul className="mt-2 grid gap-2">
            {grouped.ready.map(renderOrder)}
          </ul>
        </div>
      )}

      {/* Waiting section */}
      {grouped.waiting.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold text-[color:var(--lr-muted)]">
            Waiting ({grouped.waiting.length})
          </h3>
          <ul className="mt-2 grid gap-2">
            {grouped.waiting.map(renderOrder)}
          </ul>
        </div>
      )}

      {/* Completed section - collapsed by default */}
      {grouped.completed.length > 0 && (
        <div>
          <button
            type="button"
            className="flex items-center gap-2 text-sm font-semibold text-[color:var(--lr-muted)]"
            onClick={() => setShowCompleted((v) => !v)}
          >
            Completed ({grouped.completed.length})
            <svg
              width="16"
              height="16"
              viewBox="0 0 16 16"
              fill="none"
              className={`transition-transform ${showCompleted ? "rotate-180" : ""}`}
            >
              <path
                d="M4 6l4 4 4-4"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </button>
          {showCompleted && (
            <ul className="mt-2 grid gap-2">
              {grouped.completed.map(renderOrder)}
            </ul>
          )}
        </div>
      )}
    </section>
  );
}
