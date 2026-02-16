"use client";

import Link from "next/link";
import { useParams, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { buyerApi, type BuyerSubscription } from "@/lib/buyer-api";
import { subscriptionToken } from "@/lib/subscription-token";
import { useToast } from "@/components/toast";
import { formatMoney, friendlyErrorMessage } from "@/lib/ui";
import { Elements, PaymentElement, useElements, useStripe } from "@stripe/react-stripe-js";
import { loadStripe } from "@stripe/stripe-js";

const stripeKey = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY ?? "";
const stripePromise = stripeKey ? loadStripe(stripeKey) : null;

function UpdateCardInner({
  onConfirm,
  submitting,
}: {
  onConfirm: (setupIntentId: string) => Promise<void>;
  submitting: boolean;
}) {
  const stripe = useStripe();
  const elements = useElements();
  const [error, setError] = useState<string | null>(null);

  async function confirm() {
    if (!stripe || !elements) return;
    setError(null);
    const res = await stripe.confirmSetup({
      elements,
      redirect: "if_required",
    });
    if (res.error) {
      setError(res.error.message ?? "Could not save card.");
      return;
    }
    const id = res.setupIntent?.id ?? "";
    const status = res.setupIntent?.status ?? "";
    if (!id || status !== "succeeded") {
      setError("Card was not saved. Please try again.");
      return;
    }
    await onConfirm(id);
  }

  return (
    <div className="grid gap-3">
      {error ? (
        <div className="rounded-xl bg-rose-50 p-4 text-sm text-rose-800 ring-1 ring-rose-200">
          {error}
        </div>
      ) : null}
      <div className="rounded-xl bg-white/60 p-4 ring-1 ring-[color:var(--lr-border)]">
        <PaymentElement />
      </div>
      <button
        type="button"
        className="lr-btn lr-btn-primary inline-flex w-full items-center justify-center px-4 py-2 text-sm font-semibold disabled:opacity-50"
        disabled={submitting || !stripe || !elements}
        onClick={confirm}
      >
        {submitting ? "Saving…" : "Save card"}
      </button>
      <div className="text-xs text-[color:var(--lr-muted)]">
        Your card will be used to authorize upcoming pickups within 7 days of the pickup.
      </div>
    </div>
  );
}

function UpdateCard({
  clientSecret,
  submitting,
  onConfirm,
}: {
  clientSecret: string;
  submitting: boolean;
  onConfirm: (setupIntentId: string) => Promise<void>;
}) {
  if (!stripePromise) {
    return (
      <div className="rounded-xl bg-amber-50/70 p-4 text-sm text-amber-900 ring-1 ring-amber-200">
        Payment system is temporarily unavailable. Please try again later.
      </div>
    );
  }

  return (
    <Elements
      stripe={stripePromise}
      options={{ clientSecret, appearance: { theme: "stripe" } }}
    >
      <UpdateCardInner onConfirm={onConfirm} submitting={submitting} />
    </Elements>
  );
}

export default function SubscriptionPage() {
  const params = useParams<{ subscriptionId: string }>();
  const search = useSearchParams();
  const subscriptionId = params.subscriptionId;
  const tokenFromQuery = search.get("t");
  const { showToast } = useToast();

  const [token, setToken] = useState<string>("");
  const [tokenInput, setTokenInput] = useState("");
  const [sub, setSub] = useState<BuyerSubscription | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [setupSecret, setSetupSecret] = useState<string | null>(null);

  useEffect(() => {
    const saved = subscriptionToken.get(subscriptionId);
    const effective = tokenFromQuery || saved || "";
    if (effective) {
      setToken(effective);
      if (tokenFromQuery) subscriptionToken.set(subscriptionId, tokenFromQuery);
    }
  }, [subscriptionId, tokenFromQuery]);

  async function load() {
    if (!token) return;
    setError(null);
    setLoading(true);
    try {
      const res = await buyerApi.getSubscription(subscriptionId, token);
      setSub(res.subscription);
    } catch (e: unknown) {
      setError(friendlyErrorMessage(e));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [subscriptionId, token]);

  const nextLabel = useMemo(() => {
    if (!sub) return "";
    const tz = sub.plan.pickup_location.timezone || "UTC";
    const start = new Date(sub.plan.next_start_at);
    return new Intl.DateTimeFormat("en-US", {
      timeZone: tz,
      weekday: "short",
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    }).format(start);
  }, [sub]);

  async function submitToken() {
    const t = tokenInput.trim();
    if (!t) return;
    subscriptionToken.set(subscriptionId, t);
    setToken(t);
    setTokenInput("");
  }

  async function setStatus(status: "active" | "paused" | "canceled") {
    if (!token) return;
    setSubmitting(true);
    setError(null);
    try {
      const res = await buyerApi.updateSubscriptionStatus(subscriptionId, { token, status });
      const note = (res.note ?? "").trim();
      showToast({
        kind: "success",
        message: note || `Subscription ${status}.`,
      });
      await load();
    } catch (e: unknown) {
      setError(friendlyErrorMessage(e));
    } finally {
      setSubmitting(false);
    }
  }

  async function startUpdateCard() {
    if (!token) return;
    setSubmitting(true);
    setError(null);
    try {
      const res = await buyerApi.setupSubscriptionPaymentMethod(subscriptionId, token);
      setSetupSecret(res.client_secret);
      showToast({ kind: "success", message: "Card update started." });
    } catch (e: unknown) {
      setError(friendlyErrorMessage(e));
    } finally {
      setSubmitting(false);
    }
  }

  async function confirmUpdateCard(setupIntentId: string) {
    if (!token) return;
    setSubmitting(true);
    setError(null);
    try {
      await buyerApi.confirmSubscriptionPaymentMethod(subscriptionId, {
        token,
        setup_intent_id: setupIntentId,
      });
      setSetupSecret(null);
      showToast({ kind: "success", message: "Card updated." });
      await load();
    } catch (e: unknown) {
      setError(friendlyErrorMessage(e));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="grid gap-6">
      <div className="grid gap-1">
        <h1 className="text-3xl font-semibold tracking-tight text-[color:var(--lr-ink)]">
          Subscription
        </h1>
      </div>

      {error ? (
        <div className="rounded-xl bg-rose-50 p-4 text-sm text-rose-800 ring-1 ring-rose-200">
          <p>
            {/not found/i.test(error)
              ? "We couldn\u2019t find this subscription. Please check your link and try again."
              : error}
          </p>
          <button
            type="button"
            className="mt-2 text-sm font-medium underline"
            onClick={load}
          >
            Try again
          </button>
        </div>
      ) : null}

      {loading && !sub ? (
        <section className="lr-card lr-card-strong p-6 text-center">
          <p className="text-sm text-[color:var(--lr-muted)]">Loading subscription...</p>
        </section>
      ) : null}

      {!token ? (
        <section className="lr-card lr-card-strong p-6">
          <h2 className="text-base font-semibold text-[color:var(--lr-ink)]">
            Access token
          </h2>
          <p className="mt-1 text-sm text-[color:var(--lr-muted)]">
            Paste the token from your confirmation (or add `?t=...` to the URL).
          </p>
          <div className="mt-4 grid gap-2 sm:flex">
            <input
              className="lr-field w-full px-3 py-2 text-sm"
              value={tokenInput}
              onChange={(e) => setTokenInput(e.target.value)}
              placeholder="token"
            />
            <button
              className="lr-btn lr-btn-primary px-4 py-2 text-sm font-medium"
              type="button"
              onClick={submitToken}
            >
              Load
            </button>
          </div>
        </section>
      ) : null}

      {sub ? (
        <section className="lr-card lr-card-strong p-6">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <div className="text-sm text-[color:var(--lr-muted)]">Plan</div>
              <div className="text-lg font-semibold text-[color:var(--lr-ink)]">
                {sub.plan.title}
              </div>
              <div className="mt-1 text-sm text-[color:var(--lr-muted)]">
                {formatMoney(sub.plan.price_cents)} · {sub.plan.cadence}
              </div>
              <div className="mt-3 text-sm text-[color:var(--lr-muted)]">
                Next pickup:{" "}
                <span className="font-semibold text-[color:var(--lr-ink)]">
                  {nextLabel}
                </span>
              </div>
              <div className="mt-2 text-sm text-[color:var(--lr-muted)]">
                Location:{" "}
                <span className="font-medium text-[color:var(--lr-ink)]">
                  {sub.plan.pickup_location.label ?? "Pickup"}
                </span>{" "}
                · {sub.plan.pickup_location.address1}, {sub.plan.pickup_location.city},{" "}
                {sub.plan.pickup_location.region} {sub.plan.pickup_location.postal_code}
              </div>
            </div>

            <div className="grid gap-2 text-right">
              <div className="text-sm text-[color:var(--lr-muted)]">Status</div>
              <div className="text-lg font-semibold text-[color:var(--lr-ink)]">
                {sub.status}
              </div>
            </div>
          </div>

          <div className="mt-5 flex flex-wrap gap-2">
            {sub.status !== "active" ? (
              <button
                className="lr-btn lr-btn-primary px-4 py-2 text-sm font-medium disabled:opacity-50"
                type="button"
                disabled={submitting}
                onClick={() => setStatus("active")}
              >
                Resume
              </button>
            ) : (
              <button
                className="lr-btn px-4 py-2 text-sm font-medium text-[color:var(--lr-ink)] disabled:opacity-50"
                type="button"
                disabled={submitting}
                onClick={() => setStatus("paused")}
              >
                Pause
              </button>
            )}
            {sub.status !== "canceled" ? (
              <button
                className="lr-btn px-4 py-2 text-sm font-medium text-[color:var(--lr-ink)] disabled:opacity-50"
                type="button"
                disabled={submitting}
                onClick={() => {
                  const ok = window.confirm("Cancel this subscription? You can re-subscribe later.");
                  if (ok) void setStatus("canceled");
                }}
              >
                Cancel
              </button>
            ) : null}

            <Link
              className="lr-btn lr-chip px-4 py-2 text-sm font-medium text-[color:var(--lr-ink)]"
              href={`/stores/${sub.store_id}/boxes`}
            >
              Browse boxes
            </Link>
          </div>

          <div className="mt-6 grid gap-3 rounded-2xl bg-white/60 p-4 ring-1 ring-[color:var(--lr-border)]">
            <div className="text-sm font-semibold text-[color:var(--lr-ink)]">
              Payment method
            </div>
            <div className="text-sm text-[color:var(--lr-muted)]">
              We authorize within 7 days of pickup and capture when pickup is confirmed.
            </div>
            {!setupSecret ? (
              <button
                className="lr-btn lr-btn-primary w-fit px-4 py-2 text-sm font-medium disabled:opacity-50"
                type="button"
                disabled={submitting}
                onClick={startUpdateCard}
              >
                Update card
              </button>
            ) : (
              <UpdateCard
                clientSecret={setupSecret}
                submitting={submitting}
                onConfirm={confirmUpdateCard}
              />
            )}
          </div>
        </section>
      ) : null}
    </div>
  );
}
