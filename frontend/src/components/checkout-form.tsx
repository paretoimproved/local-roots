"use client";

import { useMemo, useRef, useState } from "react";
import type { Offering } from "@/lib/api";
import { buyerApi, defaultItemQty, type Order, type OrderCheckoutResponse } from "@/lib/buyer-api";
import { orderToken } from "@/lib/order-token";
import { PickupCodeCard } from "@/components/pickup-code-card";
import { AuthorizeCard, isStripeAvailable } from "@/components/stripe-card-auth";
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
  const [paymentMethod, setPaymentMethod] = useState<"pay_at_pickup" | "card">(
    "pay_at_pickup",
  );
  const [checkout, setCheckout] = useState<OrderCheckoutResponse | null>(null);
  // Snapshot of items at checkout time — ensures the order matches the authorized amount
  const [checkoutItems, setCheckoutItems] = useState<
    { offering_id: string; quantity: number }[] | null
  >(null);
  const startingCheckoutRef = useRef(false);
  const paymentsReady = Boolean(
    process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY,
  );
  const formLocked = !!checkout;

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

  async function startCardCheckout() {
    if (startingCheckoutRef.current) return;
    if (!isStripeAvailable()) {
      setError("Payment system could not load. Please disable ad blockers and refresh.");
      return;
    }
    startingCheckoutRef.current = true;
    setSubmitting(true);
    setError(null);
    try {
      const snapshotItems = items.map((it) => ({
        offering_id: it.offering_id,
        quantity: it.quantity,
      }));
      const res = await buyerApi.checkoutOrder(pickupWindowId, {
        buyer: {
          email: buyerEmail,
          name: buyerName || null,
          phone: buyerPhone || null,
        },
        items: snapshotItems,
      });
      setCheckoutItems(snapshotItems);
      setCheckout(res);
      showToast({ kind: "success", message: "Card authorization started." });
    } catch (e: unknown) {
      setError(friendlyErrorMessage(e));
    } finally {
      setSubmitting(false);
      startingCheckoutRef.current = false;
    }
  }

  async function completeCardOrder() {
    if (!checkout || !checkoutItems) return;
    try {
      const res = await buyerApi.placeOrder(pickupWindowId, {
        buyer: {
          email: buyerEmail,
          name: buyerName || null,
          phone: buyerPhone || null,
        },
        // Use the snapshot from checkout time — matches the authorized amount
        items: checkoutItems,
        payment_method: "card",
        stripe_payment_intent_id: checkout.payment_intent_id,
      });
      orderToken.set(res.id, res.buyer_token);
      setOrder(res);
      showToast({ kind: "success", message: "Order placed." });
    } catch {
      // Card is already authorized — keep checkout state so user can retry
      // without re-authorizing their card.
      setError(
        "Your card was authorized, but we couldn\u2019t place your order. " +
        "Please tap \u201cAuthorize card\u201d again to retry. " +
        "If the problem persists, contact support \u2014 your card will not be charged.",
      );
      // Re-throw with sentinel so AuthorizeCard resets submitting without
      // overwriting our detailed error message.
      throw new Error("__handled__");
    }
  }

  function handlePaymentMethodChange(method: "pay_at_pickup" | "card") {
    // Don't allow switching away from card once a PaymentIntent has been created —
    // switching would orphan the intent (money authorized but never captured/canceled).
    if (checkout) return;
    setPaymentMethod(method);
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
            Payment method:{" "}
            <span className="font-medium">
              {order.payment_method === "card"
                ? "Card (authorized, captured on pickup)"
                : "Pay at pickup"}
            </span>
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
                  {formatMoney(o.price_cents)} &middot; {o.product.unit} &middot; {remaining} left
                </div>
              </div>
              <input
                className="lr-field w-20 sm:w-24 px-3 py-2 text-sm"
                type="number"
                min={0}
                max={remaining}
                value={cur}
                disabled={formLocked}
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
            {formatMoney(checkout?.total_cents ?? total)}
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
            disabled={formLocked}
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
              disabled={formLocked}
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
              disabled={formLocked}
            />
          </label>
        </div>

        {paymentsReady ? (
          <fieldset className="mt-2 grid gap-1">
            <legend className="text-xs font-medium text-[color:var(--lr-muted)]">
              Payment method
            </legend>
            <div className="flex flex-wrap gap-x-4 gap-y-1">
              <label className="flex items-center gap-2 text-sm text-[color:var(--lr-ink)]">
                <input
                  type="radio"
                  name="payment_method"
                  value="pay_at_pickup"
                  checked={paymentMethod === "pay_at_pickup"}
                  onChange={() => handlePaymentMethodChange("pay_at_pickup")}
                  className="accent-[color:var(--lr-primary)]"
                  disabled={formLocked}
                />
                Pay at pickup
              </label>
              <label className="flex items-center gap-2 text-sm text-[color:var(--lr-ink)]">
                <input
                  type="radio"
                  name="payment_method"
                  value="card"
                  checked={paymentMethod === "card"}
                  onChange={() => handlePaymentMethodChange("card")}
                  className="accent-[color:var(--lr-primary)]"
                  disabled={formLocked}
                />
                Pay with card
              </label>
            </div>
          </fieldset>
        ) : null}

        {paymentMethod === "pay_at_pickup" ? (
          <button
            className="lr-btn lr-btn-primary mt-2 inline-flex items-center justify-center px-4 py-2 text-sm font-medium disabled:opacity-50"
            disabled={submitting || items.length === 0 || !buyerEmail.trim()}
            onClick={placeOrder}
            type="button"
          >
            {submitting ? "Placing order\u2026" : "Place order"}
          </button>
        ) : checkout ? (
          <AuthorizeCard
            clientSecret={checkout.client_secret}
            submitting={submitting}
            setSubmitting={setSubmitting}
            setError={setError}
            onAuthorized={completeCardOrder}
            mode="payment_intent"
          />
        ) : (
          <button
            className="lr-btn lr-btn-primary mt-2 inline-flex items-center justify-center px-4 py-2 text-sm font-medium disabled:opacity-50"
            disabled={submitting || items.length === 0 || !buyerEmail.trim()}
            onClick={startCardCheckout}
            type="button"
          >
            {submitting ? "Starting\u2026" : "Continue to payment"}
          </button>
        )}
      </div>
    </section>
  );
}
