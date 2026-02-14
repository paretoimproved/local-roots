"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import type { SubscriptionPlan } from "@/lib/api";
import { buyerApi, type PlanCheckoutResponse, type SubscribeResponse } from "@/lib/buyer-api";
import { orderToken } from "@/lib/order-token";
import { subscriptionToken } from "@/lib/subscription-token";
import { PickupCodeCard } from "@/components/pickup-code-card";
import { useToast } from "@/components/toast";
import { formatMoney, friendlyErrorMessage } from "@/lib/ui";
import { Elements, PaymentElement, useElements, useStripe } from "@stripe/react-stripe-js";
import { loadStripe } from "@stripe/stripe-js";

function cadenceLabel(c: string) {
  if (c === "weekly") return "Weekly";
  if (c === "biweekly") return "Every two weeks";
  if (c === "monthly") return "Monthly";
  return c;
}

const stripePromise = loadStripe(
  process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY ?? "",
);

function AuthorizeCardInner({
  onAuthorized,
  submitting,
  setSubmitting,
  setError,
  mode,
}: {
  onAuthorized: () => Promise<void>;
  submitting: boolean;
  setSubmitting: (v: boolean) => void;
  setError: (v: string | null) => void;
  mode: "payment_intent" | "setup_intent";
}) {
  const stripe = useStripe();
  const elements = useElements();

  async function confirm() {
    if (!stripe || !elements) return;
    setSubmitting(true);
    setError(null);
    try {
      if (mode === "payment_intent") {
        const res = await stripe.confirmPayment({
          elements,
          redirect: "if_required",
        });
        if (res.error) {
          setError(res.error.message ?? "Payment failed. Please try again.");
          return;
        }
        const status = res.paymentIntent?.status ?? "";
        if (status !== "requires_capture") {
          setError("Payment was not authorized. Please try another card.");
          return;
        }
      } else {
        const res = await stripe.confirmSetup({
          elements,
          redirect: "if_required",
        });
        if (res.error) {
          setError(res.error.message ?? "Could not save card. Please try again.");
          return;
        }
        const status = res.setupIntent?.status ?? "";
        if (status !== "succeeded") {
          setError("Card was not saved. Please try again.");
          return;
        }
      }
      await onAuthorized();
    } catch (e: unknown) {
      setError(friendlyErrorMessage(e));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="mt-4 grid gap-3">
      <div className="rounded-xl bg-white/60 p-4 ring-1 ring-[color:var(--lr-border)]">
        <PaymentElement />
      </div>
      <button
        type="button"
        className="lr-btn lr-btn-primary inline-flex items-center justify-center px-4 py-2 text-sm font-semibold disabled:opacity-50"
        disabled={submitting || !stripe || !elements}
        onClick={confirm}
      >
        {submitting ? "Authorizing…" : "Authorize card"}
      </button>
      <div className="text-xs text-[color:var(--lr-muted)]">
        {mode === "payment_intent"
          ? "Your card will be authorized now and captured when pickup is confirmed."
          : "Your card will be saved now. We will authorize each pickup within 7 days of the pickup and capture when pickup is confirmed."}
      </div>
    </div>
  );
}

function AuthorizeCard({
  clientSecret,
  onAuthorized,
  submitting,
  setSubmitting,
  setError,
  mode,
}: {
  clientSecret: string;
  onAuthorized: () => Promise<void>;
  submitting: boolean;
  setSubmitting: (v: boolean) => void;
  setError: (v: string | null) => void;
  mode: "payment_intent" | "setup_intent";
}) {
  return (
    <Elements
      stripe={stripePromise}
      options={{
        clientSecret,
        appearance: { theme: "stripe" },
      }}
    >
      <AuthorizeCardInner
        onAuthorized={onAuthorized}
        submitting={submitting}
        setSubmitting={setSubmitting}
        setError={setError}
        mode={mode}
      />
    </Elements>
  );
}

export function SubscribeForm({ plan }: { plan: SubscriptionPlan }) {
  const { showToast } = useToast();
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<SubscribeResponse | null>(null);
  const [checkout, setCheckout] = useState<PlanCheckoutResponse | null>(null);

  const paymentsReady = Boolean(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY);

  const nextLabel = useMemo(() => {
    const tz = plan.pickup_location.timezone || "UTC";
    const start = new Date(plan.next_start_at);
    return new Intl.DateTimeFormat("en-US", {
      timeZone: tz,
      weekday: "short",
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    }).format(start);
  }, [plan.next_start_at, plan.pickup_location.timezone]);

  async function startCheckout() {
    setSubmitting(true);
    setError(null);
    try {
      const res = await buyerApi.checkoutPlan(plan.id, {
        buyer: {
          email,
          name: name || null,
          phone: phone || null,
        },
      });
      setCheckout(res);
      showToast({
        kind: "success",
        message:
          res.mode === "payment_intent"
            ? "Card authorization started."
            : "Card setup started.",
      });
    } catch (e: unknown) {
      setError(friendlyErrorMessage(e));
    } finally {
      setSubmitting(false);
    }
  }

  async function completeSubscribe() {
    if (!checkout) return;
    const res = await buyerApi.subscribeToPlan(plan.id, {
      payment_intent_id: checkout.mode === "payment_intent" ? checkout.id : undefined,
      setup_intent_id: checkout.mode === "setup_intent" ? checkout.id : undefined,
      buyer: {
        email,
        name: name || null,
        phone: phone || null,
      },
    });
    subscriptionToken.set(res.subscription.id, res.subscription.buyer_token);
    orderToken.set(res.first_order.id, res.first_order.buyer_token);
    setDone(res);
    setCheckout(null);
    showToast({ kind: "success", message: "Subscription started." });
  }

  if (done) {
    const order = done.first_order;
    const accessUrl = `/orders/${order.id}?t=${encodeURIComponent(order.buyer_token)}`;
    const subUrl = `/subscriptions/${done.subscription.id}?t=${encodeURIComponent(
      done.subscription.buyer_token,
    )}`;
    return (
      <div className="grid gap-4">
        <section className="lr-card lr-card-strong p-6">
          <h2 className="text-base font-semibold text-[color:var(--lr-ink)]">
            Subscription started
          </h2>
          <p className="mt-2 text-sm text-[color:var(--lr-muted)]">
            Subscription ID:{" "}
            <span className="font-mono text-xs">{done.subscription.id}</span>
          </p>
          <p className="mt-2 text-sm text-[color:var(--lr-muted)]">
            First order is ready to manage:
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <Link
              className="lr-btn lr-btn-primary px-4 py-2 text-sm font-semibold"
              href={accessUrl}
            >
              View first order
            </Link>
            <Link
              className="lr-btn px-4 py-2 text-sm font-semibold text-[color:var(--lr-ink)]"
              href={subUrl}
            >
              Manage subscription
            </Link>
            <Link
              className="lr-btn lr-chip px-4 py-2 text-sm font-semibold text-[color:var(--lr-ink)]"
              href={`/stores/${plan.store_id}/boxes`}
            >
              Back to boxes
            </Link>
          </div>
          <div className="mt-4 rounded-xl bg-white/60 p-4 text-sm text-[color:var(--lr-muted)] ring-1 ring-[color:var(--lr-border)]">
            Payment: your card is on file. If this pickup is within 7 days, it should already be authorized. We capture when pickup is confirmed.
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
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="text-base font-semibold text-[color:var(--lr-ink)]">
            Subscribe
          </h2>
          <p className="mt-1 text-sm text-[color:var(--lr-muted)]">
            {cadenceLabel(plan.cadence)} · {formatMoney(plan.price_cents)} per box
          </p>
          <div className="mt-3 text-sm text-[color:var(--lr-muted)]">
            Next pickup:{" "}
            <span className="font-semibold text-[color:var(--lr-ink)]">
              {nextLabel}
            </span>
          </div>
        </div>
        <div className="text-xs text-[color:var(--lr-muted)]">
          Capacity: {plan.subscriber_limit}
        </div>
      </div>

      {error ? (
        <div className="mt-4 rounded-xl bg-rose-50 p-4 text-sm text-rose-800 ring-1 ring-rose-200">
          {error}
        </div>
      ) : null}

      {!plan.is_live ? (
        <div className="mt-4 rounded-xl bg-amber-50/70 p-4 text-sm text-amber-900 ring-1 ring-amber-200">
          This box is not live yet. Check back soon, or scan the farmstand QR
          once the seller goes live.
        </div>
      ) : null}

      <div className="mt-4 grid gap-3">
        <label className="grid gap-1">
          <span className="text-xs font-semibold text-[color:var(--lr-muted)]">
            Email
          </span>
          <input
            className="lr-field px-3 py-2 text-sm"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </label>
        <div className="grid gap-2 md:grid-cols-2">
          <label className="grid gap-1">
            <span className="text-xs font-semibold text-[color:var(--lr-muted)]">
              Name (optional)
            </span>
            <input
              className="lr-field px-3 py-2 text-sm"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </label>
          <label className="grid gap-1">
            <span className="text-xs font-semibold text-[color:var(--lr-muted)]">
              Phone (optional)
            </span>
            <input
              className="lr-field px-3 py-2 text-sm"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
            />
          </label>
        </div>

        <button
          type="button"
          className="lr-btn lr-btn-primary inline-flex items-center justify-center px-4 py-2 text-sm font-semibold disabled:opacity-50"
          disabled={submitting || !email.trim() || !plan.is_live || !paymentsReady || !!checkout}
          onClick={startCheckout}
        >
          {!plan.is_live
            ? "Not live yet"
            : !paymentsReady
              ? "Payments not configured"
              : checkout
                ? "Continue below…"
                : submitting
                  ? "Starting…"
                  : "Start subscription"}
        </button>
        {checkout ? (
          <AuthorizeCard
            clientSecret={checkout.client_secret}
            submitting={submitting}
            setSubmitting={setSubmitting}
            setError={setError}
            onAuthorized={completeSubscribe}
            mode={checkout.mode}
          />
        ) : (
          <div className="text-xs text-[color:var(--lr-muted)]">
            Cancel/skip/refunds follow the pickup window cutoff policy.
          </div>
        )}
      </div>
    </section>
  );
}
