"use client";

import { useMemo, useState } from "react";
import type { Offering } from "@/lib/api";
import { buyerApi, defaultItemQty, type Order } from "@/lib/buyer-api";
import { orderToken } from "@/lib/order-token";
import { PickupCodeCard } from "@/components/pickup-code-card";
import { useToast } from "@/components/toast";
import { formatMoney, friendlyErrorMessage } from "@/lib/ui";

export function CheckoutForm({
  pickupWindowId,
  offerings,
}: {
  pickupWindowId: string;
  offerings: Offering[];
}) {
  const { showToast } = useToast();
  const [qty, setQty] = useState<Record<string, number>>(() =>
    defaultItemQty(offerings),
  );
  const [buyerEmail, setBuyerEmail] = useState("");
  const [buyerName, setBuyerName] = useState("");
  const [buyerPhone, setBuyerPhone] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [order, setOrder] = useState<Order | null>(null);
  const [copied, setCopied] = useState(false);

  const items = useMemo(() => {
    return offerings
      .map((o) => ({ offering_id: o.id, quantity: qty[o.id] ?? 0, offering: o }))
      .filter((x) => x.quantity > 0);
  }, [offerings, qty]);

  const total = useMemo(() => {
    return items.reduce((sum, it) => sum + it.offering.price_cents * it.quantity, 0);
  }, [items]);

  async function placeOrder() {
    setSubmitting(true);
    setError(null);
    try {
      const res = await buyerApi.placeOrder(pickupWindowId, {
        buyer: {
          email: buyerEmail,
          name: buyerName || null,
          phone: buyerPhone || null,
        },
        items: items.map((it) => ({
          offering_id: it.offering_id,
          quantity: it.quantity,
        })),
      });
      orderToken.set(res.id, res.buyer_token);
      setOrder(res);
      showToast({ kind: "success", message: "Order placed." });
    } catch (e: unknown) {
      setError(friendlyErrorMessage(e));
    } finally {
      setSubmitting(false);
    }
  }

  async function copyAccessLink() {
    if (!order) return;
    const url = `${window.location.origin}/orders/${order.id}?t=${encodeURIComponent(order.buyer_token)}`;
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 1400);
      showToast({ kind: "success", message: "Access link copied." });
    } catch {
      showToast({
        kind: "error",
        message: "Could not copy. Your browser may block clipboard access.",
      });
    }
  }

  if (order) {
    return (
      <div className="grid gap-4">
        <section className="lr-card lr-card-strong p-6">
          <h2 className="text-base font-semibold text-[color:var(--lr-ink)]">
            Order placed
          </h2>
          <p className="mt-2 text-sm text-[color:var(--lr-muted)]">
            Order ID: <span className="font-mono text-xs">{order.id}</span>
          </p>
          <p className="mt-2 text-sm text-[color:var(--lr-muted)]">
            Total:{" "}
            <span className="font-medium text-[color:var(--lr-ink)]">
              {formatMoney(order.total_cents)}
            </span>
          </p>
          <div className="mt-4 grid gap-2 rounded-xl bg-white/60 p-4 ring-1 ring-[color:var(--lr-border)]">
            <div className="text-sm font-medium text-[color:var(--lr-ink)]">
              Save your access link
            </div>
            <div className="text-sm text-[color:var(--lr-muted)]">
              You will need it to check status or leave a review on another
              device.
            </div>
            <div className="flex flex-wrap gap-2">
              <a
                className="lr-btn px-4 py-2 text-sm font-medium text-[color:var(--lr-ink)]"
                href={`/orders/${order.id}`}
              >
                View order
              </a>
              <button
                className="lr-btn lr-btn-primary px-4 py-2 text-sm font-medium"
                type="button"
                onClick={copyAccessLink}
              >
                {copied ? "Copied" : "Copy access link"}
              </button>
            </div>
          </div>

          <div className="mt-4 rounded-xl bg-white/60 p-4 text-sm text-[color:var(--lr-muted)] ring-1 ring-[color:var(--lr-border)]">
            Payment method: <span className="font-medium">Pay at pickup</span>.
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
      <h2 className="text-base font-semibold text-[color:var(--lr-ink)]">
        Checkout
      </h2>
      <p className="mt-1 text-sm text-[color:var(--lr-muted)]">
        Select quantities, then place an order for local pickup.
      </p>

      {error ? (
        <div className="mt-4 rounded-xl bg-rose-50 p-4 text-sm text-rose-800 ring-1 ring-rose-200">
          {error}
        </div>
      ) : null}

      <div className="mt-4 grid gap-3">
        {offerings.map((o) => {
          const remaining = o.quantity_remaining ?? 0;
          const cur = qty[o.id] ?? 0;
          return (
            <div
              key={o.id}
              className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-white/60 px-4 py-3 ring-1 ring-[color:var(--lr-border)]"
            >
              <div>
                <div className="font-medium text-[color:var(--lr-ink)]">
                  {o.product.title}
                </div>
                <div className="text-sm text-[color:var(--lr-muted)]">
                  {formatMoney(o.price_cents)} · {o.product.unit} · {remaining} left
                </div>
              </div>
              <input
                className="lr-field w-24 px-3 py-2 text-sm"
                type="number"
                min={0}
                max={remaining}
                value={cur}
                onChange={(e) =>
                  setQty((prev) => ({
                    ...prev,
                    [o.id]: Math.max(0, Math.min(remaining, Number(e.target.value))),
                  }))
                }
              />
            </div>
          );
        })}
      </div>

      <div className="mt-4 grid gap-2 rounded-xl bg-white/60 p-4 ring-1 ring-[color:var(--lr-border)]">
        <div className="flex items-baseline justify-between">
          <div className="text-sm font-medium text-[color:var(--lr-muted)]">
            Total
          </div>
          <div className="text-sm font-semibold text-[color:var(--lr-ink)]">
            {formatMoney(total)}
          </div>
        </div>

        <label className="grid gap-1">
          <span className="text-xs font-medium text-[color:var(--lr-muted)]">
            Email
          </span>
          <input
            className="lr-field px-3 py-2 text-sm"
            type="email"
            value={buyerEmail}
            onChange={(e) => setBuyerEmail(e.target.value)}
            required
          />
        </label>
        <div className="grid gap-2 md:grid-cols-2">
          <label className="grid gap-1">
            <span className="text-xs font-medium text-[color:var(--lr-muted)]">
              Name (optional)
            </span>
            <input
              className="lr-field px-3 py-2 text-sm"
              value={buyerName}
              onChange={(e) => setBuyerName(e.target.value)}
            />
          </label>
          <label className="grid gap-1">
            <span className="text-xs font-medium text-[color:var(--lr-muted)]">
              Phone (optional)
            </span>
            <input
              className="lr-field px-3 py-2 text-sm"
              value={buyerPhone}
              onChange={(e) => setBuyerPhone(e.target.value)}
            />
          </label>
        </div>

        <button
          className="lr-btn lr-btn-primary mt-2 inline-flex items-center justify-center px-4 py-2 text-sm font-medium disabled:opacity-50"
          disabled={submitting || items.length === 0 || !buyerEmail.trim()}
          onClick={placeOrder}
          type="button"
        >
          {submitting ? "Placing order…" : "Place order"}
        </button>
        <div className="text-xs text-[color:var(--lr-muted)]">
          Payment method: pay at pickup (for now).
        </div>
      </div>
    </section>
  );
}
