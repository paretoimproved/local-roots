"use client";

import Link from "next/link";
import { useParams, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { buyerApi, type BuyerSubscription } from "@/lib/buyer-api";
import { subscriptionToken } from "@/lib/subscription-token";
import { ErrorAlert } from "@/components/error-alert";
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
      {error ? <ErrorAlert error={error} /> : null}
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

const CANCEL_REASONS = [
  "Too expensive",
  "Too much food",
  "Moving / can\u2019t pick up",
  "Quality issues",
  "Other",
] as const;

function CancelFlow({
  open,
  submitting,
  onPause,
  onCancel,
  onClose,
}: {
  open: boolean;
  submitting: boolean;
  onPause: () => void;
  onCancel: (reason: string) => void;
  onClose: () => void;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const [step, setStep] = useState<1 | 2>(1);
  const [reason, setReason] = useState<string>(CANCEL_REASONS[0]);
  const [prevOpen, setPrevOpen] = useState(false);

  // Reset to step 1 whenever the dialog opens (React-recommended prop→state pattern)
  if (open && !prevOpen) {
    setPrevOpen(true);
    setStep(1);
    setReason(CANCEL_REASONS[0]);
  } else if (!open && prevOpen) {
    setPrevOpen(false);
  }

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (open && !el.open) el.showModal();
    if (!open && el.open) el.close();
  }, [open]);

  const handleDialogCancel = useCallback(
    (e: React.SyntheticEvent) => {
      e.preventDefault();
      onClose();
    },
    [onClose],
  );

  if (!open) return null;

  return (
    <dialog
      ref={ref}
      onCancel={handleDialogCancel}
      className="fixed inset-0 z-50 m-auto max-w-sm rounded-2xl border-0 bg-white p-6 shadow-xl backdrop:bg-black/30"
    >
      {step === 1 ? (
        <>
          <h2 className="text-base font-semibold text-[color:var(--lr-ink)]">
            Before you go&hellip;
          </h2>
          <p className="mt-2 text-sm text-[color:var(--lr-muted)]">
            Would you like to pause your subscription instead? You can resume
            anytime from your dashboard.
          </p>
          <div className="mt-5 grid gap-3">
            <button
              type="button"
              className="lr-btn lr-btn-primary w-full px-4 py-2 text-sm font-semibold disabled:opacity-50"
              disabled={submitting}
              onClick={onPause}
            >
              {submitting ? "Pausing\u2026" : "Pause subscription"}
            </button>
            <button
              type="button"
              className="text-sm text-[color:var(--lr-muted)] underline"
              onClick={() => setStep(2)}
            >
              No, cancel my subscription
            </button>
          </div>
        </>
      ) : (
        <>
          <h2 className="text-base font-semibold text-[color:var(--lr-ink)]">
            We&rsquo;re sorry to see you go
          </h2>
          <p className="mt-2 text-sm text-[color:var(--lr-muted)]">
            Help us improve &mdash; why are you canceling?
          </p>
          <fieldset className="mt-4 grid gap-2">
            {CANCEL_REASONS.map((r) => (
              <label
                key={r}
                className="flex items-center gap-2 text-sm text-[color:var(--lr-ink)]"
              >
                <input
                  type="radio"
                  name="cancel-reason"
                  value={r}
                  checked={reason === r}
                  onChange={() => setReason(r)}
                  className="accent-[color:var(--lr-primary)]"
                />
                {r}
              </label>
            ))}
          </fieldset>
          <div className="mt-5 grid gap-3">
            <button
              type="button"
              className="w-full rounded-full bg-rose-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-rose-700 disabled:opacity-50"
              disabled={submitting}
              onClick={() => {
                onCancel(reason);
              }}
            >
              {submitting ? "Canceling\u2026" : "Cancel subscription"}
            </button>
            <button
              type="button"
              className="text-sm text-[color:var(--lr-muted)] underline"
              onClick={() => setStep(1)}
            >
              Go back
            </button>
          </div>
        </>
      )}
    </dialog>
  );
}

export default function SubscriptionPage() {
  const params = useParams<{ subscriptionId: string }>();
  const search = useSearchParams();
  const subscriptionId = params.subscriptionId;
  const tokenFromQuery = search.get("t");
  const { showToast } = useToast();

  useEffect(() => { document.title = "Subscription — LocalRoots"; }, []);

  const [token, setToken] = useState<string>("");
  const [sub, setSub] = useState<BuyerSubscription | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [setupSecret, setSetupSecret] = useState<string | null>(null);
  const [showCancelFlow, setShowCancelFlow] = useState(false);

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

  async function setStatus(status: "active" | "paused" | "canceled", cancelReason?: string) {
    if (!token) return;
    setSubmitting(true);
    setError(null);
    try {
      await buyerApi.updateSubscriptionStatus(subscriptionId, {
        token,
        status,
        ...(cancelReason ? { cancel_reason: cancelReason } : {}),
      });
      const labels: Record<string, string> = {
        paused: "Subscription paused",
        active: "Subscription resumed",
        canceled: "Subscription canceled",
      };
      showToast({
        kind: "success",
        message: labels[status] ?? `Subscription ${status}.`,
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
      showToast({ kind: "success", message: "Payment method updated" });
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
        <ErrorAlert
          error={
            /not found/i.test(error)
              ? "We couldn\u2019t find this subscription. Please check your link and try again."
              : error
          }
          onRetry={load}
        />
      ) : null}

      {loading && !sub ? (
        <section className="lr-card lr-card-strong p-6 text-center">
          <p className="text-sm text-[color:var(--lr-muted)]">Loading subscription...</p>
        </section>
      ) : null}

      {!token ? (
        <section className="lr-card lr-card-strong p-6 text-center">
          <h2 className="text-base font-semibold text-[color:var(--lr-ink)]">
            Sign in to view your subscription
          </h2>
          <p className="mt-2 text-sm text-[color:var(--lr-muted)]">
            Use the link from your confirmation email, or sign in to access your
            subscriptions.
          </p>
          <a
            className="lr-btn lr-btn-primary mt-4 inline-flex items-center justify-center px-6 py-2 text-sm font-medium"
            href="/buyer/login"
          >
            Sign in
          </a>
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
              <div className="text-lg font-semibold">
                {(() => {
                  const colors: Record<string, string> = {
                    active: "bg-green-50 text-green-800 ring-green-200",
                    paused: "bg-amber-50 text-amber-800 ring-amber-200",
                    canceled: "bg-gray-50 text-gray-600 ring-gray-200",
                  };
                  return (
                    <span
                      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-sm font-medium ring-1 ${colors[sub.status] ?? "bg-gray-50 text-gray-600 ring-gray-200"}`}
                    >
                      {sub.status}
                    </span>
                  );
                })()}
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
                onClick={() => setShowCancelFlow(true)}
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
      <CancelFlow
        open={showCancelFlow}
        submitting={submitting}
        onPause={() => {
          setShowCancelFlow(false);
          void setStatus("paused");
        }}
        onCancel={(reason) => {
          setShowCancelFlow(false);
          void setStatus("canceled", reason);
        }}
        onClose={() => setShowCancelFlow(false)}
      />
    </div>
  );
}
