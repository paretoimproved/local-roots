"use client";

import { useMemo, useState } from "react";
import type { Offering } from "@/lib/api";
import { buyerApi, defaultItemQty, type Order } from "@/lib/buyer-api";

function formatMoney(cents: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(cents / 100);
}

export function CheckoutForm({
  pickupWindowId,
  offerings,
}: {
  pickupWindowId: string;
  offerings: Offering[];
}) {
  const [qty, setQty] = useState<Record<string, number>>(() =>
    defaultItemQty(offerings),
  );
  const [buyerEmail, setBuyerEmail] = useState("");
  const [buyerName, setBuyerName] = useState("");
  const [buyerPhone, setBuyerPhone] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [order, setOrder] = useState<Order | null>(null);

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
      setOrder(res);
    } catch (e: unknown) {
      setError(String(e));
    } finally {
      setSubmitting(false);
    }
  }

  if (order) {
    return (
      <section className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-zinc-950/5">
        <h2 className="text-base font-semibold text-zinc-950">Order placed</h2>
        <p className="mt-2 text-sm text-zinc-600">
          Order ID: <span className="font-mono text-xs">{order.id}</span>
        </p>
        <p className="mt-2 text-sm text-zinc-600">
          Total: <span className="font-medium text-zinc-950">{formatMoney(order.total_cents)}</span>
        </p>
        <div className="mt-4 rounded-xl bg-zinc-50 p-4 text-sm text-zinc-700 ring-1 ring-zinc-950/5">
          Payment method: <span className="font-medium">Pay at pickup</span>.
        </div>
      </section>
    );
  }

  return (
    <section className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-zinc-950/5">
      <h2 className="text-base font-semibold text-zinc-950">Checkout</h2>
      <p className="mt-1 text-sm text-zinc-600">
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
              className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-zinc-50 px-4 py-3 ring-1 ring-zinc-950/5"
            >
              <div>
                <div className="font-medium text-zinc-950">{o.product.title}</div>
                <div className="text-sm text-zinc-600">
                  {formatMoney(o.price_cents)} · {o.product.unit} · {remaining} left
                </div>
              </div>
              <input
                className="w-24 rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm"
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

      <div className="mt-4 grid gap-2 rounded-xl bg-zinc-50 p-4 ring-1 ring-zinc-950/5">
        <div className="flex items-baseline justify-between">
          <div className="text-sm font-medium text-zinc-800">Total</div>
          <div className="text-sm font-semibold text-zinc-950">{formatMoney(total)}</div>
        </div>

        <label className="grid gap-1">
          <span className="text-xs font-medium text-zinc-700">Email</span>
          <input
            className="rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm"
            type="email"
            value={buyerEmail}
            onChange={(e) => setBuyerEmail(e.target.value)}
            required
          />
        </label>
        <div className="grid gap-2 md:grid-cols-2">
          <label className="grid gap-1">
            <span className="text-xs font-medium text-zinc-700">Name (optional)</span>
            <input
              className="rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm"
              value={buyerName}
              onChange={(e) => setBuyerName(e.target.value)}
            />
          </label>
          <label className="grid gap-1">
            <span className="text-xs font-medium text-zinc-700">Phone (optional)</span>
            <input
              className="rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm"
              value={buyerPhone}
              onChange={(e) => setBuyerPhone(e.target.value)}
            />
          </label>
        </div>

        <button
          className="mt-2 inline-flex items-center justify-center rounded-full bg-zinc-950 px-4 py-2 text-sm font-medium text-zinc-50 hover:bg-zinc-800 disabled:opacity-50"
          disabled={submitting || items.length === 0 || !buyerEmail.trim()}
          onClick={placeOrder}
          type="button"
        >
          {submitting ? "Placing order…" : "Place order"}
        </button>
        <div className="text-xs text-zinc-500">
          Payment method: pay at pickup (for now).
        </div>
      </div>
    </section>
  );
}

