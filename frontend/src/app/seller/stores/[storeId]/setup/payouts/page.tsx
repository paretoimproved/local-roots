"use client";

import { useParams, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { sellerApi } from "@/lib/seller-api";
import { session } from "@/lib/session";
import { useToast } from "@/components/toast";
import { friendlyErrorMessage } from "@/lib/ui";

type ConnectStatus = "none" | "onboarding" | "active" | "restricted";

export default function PayoutsPage() {
  const params = useParams<{ storeId: string }>();
  const storeId = params.storeId;
  const router = useRouter();
  const { showToast } = useToast();

  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState<ConnectStatus>("none");
  const [starting, setStarting] = useState(false);
  const [waitingForStripe, setWaitingForStripe] = useState(false);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Fetch connect status on mount
  useEffect(() => {
    const token = session.getToken();
    if (!token) {
      router.replace("/seller/login");
      return;
    }

    let cancelled = false;

    sellerApi
      .connectStatus(token, storeId)
      .then((cs) => {
        if (!cancelled) setStatus(cs.status as ConnectStatus);
      })
      .catch(() => {
        if (!cancelled) setStatus("none");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [storeId, router]);

  // Clean up polling on unmount
  useEffect(() => {
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, []);

  function startPolling() {
    if (pollRef.current) clearInterval(pollRef.current);
    pollRef.current = setInterval(async () => {
      const token = session.getToken();
      if (!token) return;
      try {
        const cs = await sellerApi.connectStatus(token, storeId);
        const s = cs.status as ConnectStatus;
        setStatus(s);
        if (s === "active") {
          if (pollRef.current) clearInterval(pollRef.current);
          pollRef.current = null;
        }
      } catch {
        // keep polling
      }
    }, 3000);
  }

  async function handleConnect() {
    const token = session.getToken();
    if (!token) {
      router.replace("/seller/login");
      return;
    }

    // Open window immediately so browsers don't block the popup.
    const win = window.open("", "_blank");

    setStarting(true);
    try {
      const res = await sellerApi.connectOnboard(token, storeId);
      if (win) {
        win.location.href = res.url;
      } else {
        window.location.href = res.url;
        return;
      }
      setWaitingForStripe(true);
      startPolling();
    } catch (e: unknown) {
      if (win) win.close();
      showToast({ kind: "error", message: friendlyErrorMessage(e) });
    } finally {
      setStarting(false);
    }
  }

  async function handleRefresh() {
    const token = session.getToken();
    if (!token) {
      router.replace("/seller/login");
      return;
    }

    const win = window.open("", "_blank");

    setStarting(true);
    try {
      const res = await sellerApi.connectRefreshLink(token, storeId);
      if (win) {
        win.location.href = res.url;
      } else {
        window.location.href = res.url;
        return;
      }
      setWaitingForStripe(true);
      startPolling();
    } catch (e: unknown) {
      if (win) win.close();
      showToast({ kind: "error", message: friendlyErrorMessage(e) });
    } finally {
      setStarting(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div
          className="h-6 w-6 rounded-full border-2 border-[color:var(--lr-leaf)] border-t-transparent animate-spin"
          role="status"
          aria-label="Loading"
        />
      </div>
    );
  }

  // Waiting for Stripe onboarding in another tab
  if (waitingForStripe && status !== "active") {
    return (
      <div className="lr-animate grid justify-items-center gap-6 text-center">
        <div
          className="h-8 w-8 rounded-full border-2 border-[color:var(--lr-leaf)] border-t-transparent animate-spin"
          role="status"
          aria-label="Waiting for Stripe"
        />
        <div>
          <h1 className="text-2xl font-bold text-[color:var(--lr-ink)]">
            Finish setup on Stripe
          </h1>
          <p className="mt-2 text-sm text-[color:var(--lr-muted)]">
            We opened Stripe in another tab. Complete the setup there, then come
            back here — this page will update automatically.
          </p>
        </div>
      </div>
    );
  }

  // Active state — show success and continue
  if (status === "active") {
    return (
      <div className="lr-animate grid justify-items-center gap-6 text-center">
        <div
          className="flex h-16 w-16 items-center justify-center rounded-full"
          style={{ backgroundColor: "var(--lr-leaf)" }}
        >
          <svg
            width="32"
            height="32"
            viewBox="0 0 32 32"
            fill="none"
            aria-hidden="true"
          >
            <path
              d="M8 17L13.5 22.5L24 10"
              stroke="#fff"
              strokeWidth="3"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </div>

        <div>
          <h1 className="text-2xl font-bold text-[color:var(--lr-ink)]">
            Payouts connected
          </h1>
          <p className="mt-2 text-sm text-[color:var(--lr-muted)]">
            Your bank account is set up. You will get paid after each pickup.
          </p>
        </div>

        <button
          type="button"
          className="lr-btn lr-btn-primary px-6 py-2.5 text-sm font-semibold"
          onClick={() =>
            router.push(`/seller/stores/${storeId}/setup/review`)
          }
        >
          Continue
        </button>
      </div>
    );
  }

  // CTA labels based on status
  const isOnboarding = status === "onboarding";
  const isRestricted = status === "restricted";

  let ctaLabel = "Connect your bank account";
  if (isOnboarding) ctaLabel = "Continue Stripe setup";
  if (isRestricted) ctaLabel = "Update your Stripe account";

  return (
    <div className="lr-animate grid gap-6">
      <div>
        <h1 className="text-2xl font-bold text-[color:var(--lr-ink)]">
          Get paid for your harvest
        </h1>
        <p className="mt-2 text-sm text-[color:var(--lr-muted)]">
          Connect your bank account so you get paid after each pickup. Stripe
          handles payments — it takes about 2 minutes.
        </p>
      </div>

      {isRestricted && (
        <div className="lr-card rounded-2xl border-amber-200 bg-amber-50/60 p-4">
          <p className="text-sm font-medium text-amber-900">
            Your Stripe account needs attention
          </p>
          <p className="mt-1 text-xs text-amber-800">
            Stripe needs additional information to finish setting up your
            account. Click below to continue.
          </p>
        </div>
      )}

      {isOnboarding && (
        <div className="lr-card rounded-2xl p-4">
          <p className="text-sm font-medium text-[color:var(--lr-ink)]">
            You started connecting but did not finish
          </p>
          <p className="mt-1 text-xs text-[color:var(--lr-muted)]">
            Pick up where you left off. It only takes a minute.
          </p>
        </div>
      )}

      <div className="lr-card rounded-2xl p-5">
        <div className="grid gap-4 text-center">
          <button
            type="button"
            className="lr-btn lr-btn-primary w-full px-6 py-3 text-sm font-semibold disabled:opacity-50"
            disabled={starting}
            onClick={isRestricted ? handleRefresh : handleConnect}
          >
            {starting ? (
              <span className="flex items-center justify-center gap-2">
                <span
                  className="inline-block h-4 w-4 rounded-full border-2 border-white border-t-transparent animate-spin"
                  aria-hidden="true"
                />
                Opening Stripe...
              </span>
            ) : (
              ctaLabel
            )}
          </button>

          <p className="text-xs text-[color:var(--lr-muted)]">
            Zero fees to you. Buyers pay a 5% service fee at checkout.
          </p>

          <p className="text-xs text-[color:var(--lr-muted)]">
            Payments powered by Stripe
          </p>
        </div>
      </div>
    </div>
  );
}
