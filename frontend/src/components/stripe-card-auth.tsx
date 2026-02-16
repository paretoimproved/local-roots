"use client";

import { Elements, PaymentElement, useElements, useStripe } from "@stripe/react-stripe-js";
import { loadStripe } from "@stripe/stripe-js";
import { friendlyErrorMessage } from "@/lib/ui";

const stripeKey = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY ?? "";
const stripePromise = stripeKey ? loadStripe(stripeKey) : null;

/** Check if Stripe JS is configured before creating intents. */
export function isStripeAvailable(): boolean {
  return stripePromise !== null;
}

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
        {submitting ? "Authorizing\u2026" : "Authorize card"}
      </button>
      <div className="text-xs text-[color:var(--lr-muted)]">
        {mode === "payment_intent"
          ? "Your card will be authorized now and captured when pickup is confirmed."
          : "Your card will be saved now. We will authorize each pickup within 7 days of the pickup and capture when pickup is confirmed."}
      </div>
    </div>
  );
}

export function AuthorizeCard({
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
  if (!stripePromise) {
    return (
      <div className="mt-4 rounded-xl bg-amber-50/70 p-4 text-sm text-amber-900 ring-1 ring-amber-200">
        Payment system is temporarily unavailable. Please try again later.
      </div>
    );
  }

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
