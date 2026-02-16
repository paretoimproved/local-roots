"use client";

import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import {
  sellerApi,
  type SellerPickupLocation,
  type SellerSubscriptionPlan,
} from "@/lib/seller-api";
import { session } from "@/lib/session";
import { useToast } from "@/components/toast";
import { formatMoney, friendlyErrorMessage } from "@/lib/ui";
import { QrCode } from "@/components/qr-code";

function cadenceLabel(cadence: string): string {
  switch (cadence) {
    case "weekly":
      return "/week";
    case "biweekly":
      return "/2 weeks";
    case "monthly":
      return "/month";
    default:
      return "";
  }
}

function friendlyDate(iso: string, tz?: string): string {
  const opts: Intl.DateTimeFormatOptions = {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  };
  if (tz) opts.timeZone = tz;
  return new Date(iso).toLocaleDateString(undefined, opts);
}

export default function ReviewPage() {
  const params = useParams<{ storeId: string }>();
  const storeId = params.storeId;
  const router = useRouter();
  const { showToast } = useToast();

  const [loading, setLoading] = useState(true);
  const [launching, setLaunching] = useState(false);
  const [location, setLocation] = useState<SellerPickupLocation | null>(null);
  const [plan, setPlan] = useState<SellerSubscriptionPlan | null>(null);
  const [launched, setLaunched] = useState(false);
  const [copied, setCopied] = useState(false);
  const [connectStatus, setConnectStatus] = useState<string>("none");

  useEffect(() => {
    const token = session.getToken();
    if (!token) {
      router.replace("/seller/login");
      return;
    }

    let cancelled = false;

    async function load() {
      try {
        const [locations, plans, cs] = await Promise.all([
          sellerApi.listPickupLocations(token!, storeId),
          sellerApi.listSubscriptionPlans(token!, storeId),
          sellerApi.connectStatus(token!, storeId).catch(() => ({ status: "none" })),
        ]);
        if (!cancelled) setConnectStatus(cs.status);

        if (cancelled) return;

        if (locations.length === 0) {
          router.replace(`/seller/stores/${storeId}/setup/location`);
          return;
        }

        if (plans.length === 0) {
          router.replace(`/seller/stores/${storeId}/setup/box`);
          return;
        }

        setLocation(locations[0]);
        setPlan(plans.find((p) => p.is_active) ?? plans[0]);
      } catch (e: unknown) {
        if (!cancelled) {
          showToast({ kind: "error", message: friendlyErrorMessage(e) });
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [storeId]);

  async function handleLaunch() {
    const token = session.getToken();
    if (!token || !plan) return;

    setLaunching(true);
    try {
      await sellerApi.generateNextCycle(token, storeId, plan.id);
      setLaunched(true);
    } catch (e: unknown) {
      showToast({ kind: "error", message: friendlyErrorMessage(e) });
    } finally {
      setLaunching(false);
    }
  }

  async function handleCopy(url: string) {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      showToast({ kind: "success", message: "Link copied!" });
      setTimeout(() => setCopied(false), 2000);
    } catch {
      showToast({ kind: "error", message: "Could not copy to clipboard." });
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

  if (!location || !plan) return null;

  const shareUrl =
    typeof window !== "undefined"
      ? `${window.location.origin}/stores/${storeId}/plans`
      : "";

  // ── Celebration view ──
  if (launched) {
    return (
      <div className="lr-animate grid justify-items-center gap-6 text-center">
        {/* Checkmark */}
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
            You&apos;re live!
          </h1>
          <p className="mt-2 text-sm text-[color:var(--lr-muted)]">
            Your farmstand is open for business. Share the link or QR code with
            your customers so they can subscribe.
          </p>
        </div>

        {/* QR code */}
        <QrCode value={shareUrl} size={180} label="Farmstand QR code" />

        {/* Shareable URL */}
        <div className="w-full max-w-sm">
          <div className="lr-card-strong flex items-center gap-2 rounded-xl p-3">
            <span className="min-w-0 flex-1 truncate text-sm text-[color:var(--lr-ink)]">
              {shareUrl}
            </span>
            <button
              type="button"
              className="lr-btn lr-chip shrink-0 px-3 py-1.5 text-xs font-semibold"
              onClick={() => handleCopy(shareUrl)}
            >
              {copied ? "Copied!" : "Copy link"}
            </button>
          </div>
        </div>

        {/* Go to dashboard */}
        <button
          type="button"
          className="lr-btn lr-btn-primary mt-2 px-6 py-2.5 text-sm font-semibold"
          onClick={() => router.push(`/seller/stores/${storeId}`)}
        >
          Go to dashboard
        </button>
      </div>
    );
  }

  // ── Review view ──
  const addressParts = [location.address1, location.city, location.region]
    .filter(Boolean)
    .join(", ");

  return (
    <div className="lr-animate grid gap-6">
      <div>
        <h1 className="text-2xl font-bold text-[color:var(--lr-ink)]">
          You&apos;re ready to start selling!
        </h1>
        <p className="mt-2 text-sm text-[color:var(--lr-muted)]">
          Review your setup below, then hit Start selling to go live.
        </p>
      </div>

      {/* Location summary */}
      <div className="lr-card rounded-2xl p-5">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-[color:var(--lr-muted)]">
              Pickup spot
            </p>
            <p className="mt-1 text-sm font-semibold text-[color:var(--lr-ink)]">
              {location.label || "Pickup location"}
            </p>
            <p className="mt-0.5 text-sm text-[color:var(--lr-muted)]">
              {addressParts}
            </p>
          </div>
          <button
            type="button"
            className="lr-btn lr-chip shrink-0 px-3 py-1 text-xs font-semibold text-[color:var(--lr-leaf)]"
            onClick={() =>
              router.push(`/seller/stores/${storeId}/setup/location`)
            }
          >
            Edit
          </button>
        </div>
      </div>

      {/* Box summary */}
      <div className="lr-card rounded-2xl p-5">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-[color:var(--lr-muted)]">
              Your box
            </p>
            <p className="mt-1 text-sm font-semibold text-[color:var(--lr-ink)]">
              {plan.title}
            </p>
            <p className="mt-0.5 text-sm text-[color:var(--lr-muted)]">
              {formatMoney(plan.price_cents)}
              {cadenceLabel(plan.cadence)} &middot; Up to{" "}
              {plan.subscriber_limit} customers
            </p>
            <p className="mt-0.5 text-sm text-[color:var(--lr-muted)]">
              First pickup: {friendlyDate(plan.first_start_at, location.timezone)}
            </p>
          </div>
          <button
            type="button"
            className="lr-btn lr-chip shrink-0 px-3 py-1 text-xs font-semibold text-[color:var(--lr-leaf)]"
            onClick={() => router.push(`/seller/stores/${storeId}/setup/box`)}
          >
            Edit
          </button>
        </div>
      </div>

      {/* Customer preview */}
      <div className="lr-card rounded-2xl p-5">
        <p className="text-xs font-medium uppercase tracking-wide text-[color:var(--lr-muted)]">
          Customer preview
        </p>
        <div className="mt-3 flex justify-center">
          <QrCode value={shareUrl} size={140} label="Farmstand QR code" />
        </div>
        <p className="mt-3 text-center text-xs text-[color:var(--lr-muted)] break-all">
          {shareUrl}
        </p>
      </div>

      {/* Connect gate + Start selling button */}
      <div className="flex flex-col items-center gap-3 pt-2">
        {connectStatus !== "active" ? (
          <div className="lr-card w-full rounded-2xl border-amber-200 bg-amber-50/60 p-5 text-center">
            <p className="text-sm font-semibold text-amber-900">
              Set up payouts first
            </p>
            <p className="mt-1 text-xs text-amber-800">
              Connect your bank account so you can receive payments from customers.
            </p>
            <button
              type="button"
              className="lr-btn lr-btn-primary mt-3 px-5 py-2 text-sm font-medium"
              onClick={() =>
                router.push(`/seller/stores/${storeId}/settings?connect=setup`)
              }
            >
              Set up payouts
            </button>
          </div>
        ) : (
          <>
            <button
              type="button"
              className="lr-btn lr-btn-primary w-full px-6 py-3 text-sm font-semibold disabled:opacity-50"
              disabled={launching}
              onClick={handleLaunch}
            >
              {launching ? (
                <span className="flex items-center justify-center gap-2">
                  <span
                    className="inline-block h-4 w-4 rounded-full border-2 border-white border-t-transparent animate-spin"
                    aria-hidden="true"
                  />
                  Launching...
                </span>
              ) : (
                "Start selling"
              )}
            </button>
            <p className="max-w-xs text-center text-xs text-[color:var(--lr-muted)]">
              This opens your first pickup and creates your shareable link and
              farmstand QR.
            </p>
          </>
        )}
      </div>
    </div>
  );
}
