"use client";

import { useState } from "react";
import Link from "next/link";
import { type SellerSubscriptionPlan } from "@/lib/seller-api";
import { formatMoney } from "@/lib/ui";
import { QrCode } from "@/components/qr-code";

interface SubscriptionPlanListProps {
  plans: SellerSubscriptionPlan[] | null;
  siteOrigin: string;
  generatingCycle: boolean;
  togglingPlan: boolean;
  onGenerateNextCycle: (planId: string) => void;
  onTogglePlanActive: (planId: string, currentlyActive: boolean) => void;
  showToast: (toast: { kind: "success" | "error"; message: string }) => void;
}

export function SubscriptionPlanList({
  plans,
  siteOrigin,
  generatingCycle,
  togglingPlan,
  onGenerateNextCycle,
  onTogglePlanActive,
  showToast,
}: SubscriptionPlanListProps) {
  const [showQrFor, setShowQrFor] = useState<Set<string>>(new Set());

  function toggleQr(planId: string) {
    setShowQrFor(prev => {
      const next = new Set(prev);
      if (next.has(planId)) next.delete(planId);
      else next.add(planId);
      return next;
    });
  }

  function copyLink(planId: string) {
    const url = siteOrigin
      ? `${siteOrigin}/b/${planId}`
      : `/b/${planId}`;
    navigator.clipboard
      .writeText(url)
      .then(() =>
        showToast({
          kind: "success",
          message: "Buyer link copied.",
        }),
      )
      .catch(() =>
        showToast({
          kind: "error",
          message:
            "Could not copy. Your browser may block clipboard access.",
        }),
      );
  }

  return (
    <section className="lr-card lr-animate grid gap-4 p-6">
      <div>
        <h2 className="text-base font-semibold">Subscription boxes</h2>
        <p className="mt-1 text-sm text-[color:var(--lr-muted)]">
          Curated seasonal boxes for recurring buyers. Print a farmstand QR
          to turn walk-up buyers into subscriptions.
        </p>
      </div>

      {plans?.length ? (
        <ul className="grid gap-3">
          {plans.map((p) => {
            const qrVisible = showQrFor.has(p.id);
            const buyerUrl = siteOrigin
              ? `${siteOrigin}/b/${p.id}`
              : `/b/${p.id}`;

            return (
              <li key={p.id} className="lr-chip rounded-2xl p-4">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div className="min-w-[240px]">
                    <div className="flex flex-wrap items-center gap-2">
                      <div className="font-semibold text-[color:var(--lr-ink)]">
                        {p.title}
                      </div>
                      <span className="lr-chip rounded-full px-3 py-1 text-xs font-semibold text-[color:var(--lr-muted)]">
                        {p.cadence}
                      </span>
                      {p.is_live ? (
                        <span className="lr-chip rounded-full px-3 py-1 text-xs font-semibold text-[color:var(--lr-leaf)]">
                          live
                        </span>
                      ) : (
                        <span className="lr-chip rounded-full px-3 py-1 text-xs font-semibold text-[color:var(--lr-clay)]">
                          draft
                        </span>
                      )}
                      {!p.is_active ? (
                        <span className="lr-chip rounded-full px-3 py-1 text-xs font-semibold text-[color:var(--lr-clay)]">
                          inactive
                        </span>
                      ) : null}
                    </div>
                    <div className="mt-1 text-sm text-[color:var(--lr-muted)]">
                      {formatMoney(p.price_cents)} &middot; cap{" "}
                      {p.subscriber_limit} &middot; next{" "}
                      {new Date(p.next_start_at).toLocaleString()}
                    </div>
                    <div className="mt-2 flex flex-wrap gap-2">
                      <Link
                        className="lr-btn lr-chip px-3 py-2 text-sm font-semibold text-[color:var(--lr-ink)]"
                        href={`/boxes/${p.id}`}
                        target="_blank"
                        rel="noreferrer"
                      >
                        {p.is_live ? "Buyer page" : "Preview buyer page"}
                      </Link>
                      <button
                        type="button"
                        className="lr-btn lr-btn-primary px-3 py-2 text-sm font-semibold"
                        onClick={() => onGenerateNextCycle(p.id)}
                        disabled={generatingCycle}
                      >
                        {generatingCycle
                          ? "Generating\u2026"
                          : p.is_live
                          ? "Generate next cycle"
                          : "Go live (generate first cycle)"}
                      </button>
                      <button
                        type="button"
                        className={`lr-btn lr-chip px-3 py-2 text-sm font-semibold disabled:opacity-50 ${
                          p.is_active
                            ? "text-[color:var(--lr-clay)]"
                            : "text-[color:var(--lr-leaf)]"
                        }`}
                        onClick={() => onTogglePlanActive(p.id, p.is_active)}
                        disabled={togglingPlan}
                      >
                        {togglingPlan
                          ? "Updating\u2026"
                          : p.is_active
                            ? "Pause box"
                            : "Resume box"}
                      </button>
                    </div>
                  </div>

                  <div className="grid gap-2 justify-items-end">
                    {p.is_live ? (
                      <>
                        <div className="flex flex-wrap justify-end gap-2">
                          <button
                            type="button"
                            className="lr-btn lr-chip px-3 py-2 text-sm font-semibold text-[color:var(--lr-ink)]"
                            onClick={() => copyLink(p.id)}
                          >
                            Copy link
                          </button>
                          <button
                            type="button"
                            className="lr-btn lr-chip px-3 py-2 text-sm font-semibold text-[color:var(--lr-ink)]"
                            onClick={() => toggleQr(p.id)}
                          >
                            {qrVisible ? "Hide QR" : "Show QR"}
                          </button>
                        </div>
                        {qrVisible && (
                          <div className="grid gap-2 justify-items-end">
                            <QrCode
                              value={buyerUrl}
                              size={140}
                              label="Farmstand QR"
                            />
                            <Link
                              className="lr-btn lr-chip px-3 py-2 text-sm font-semibold text-[color:var(--lr-ink)]"
                              href={`/boxes/${p.id}/qr`}
                              target="_blank"
                              rel="noreferrer"
                            >
                              Print poster
                            </Link>
                            <div className="max-w-[14rem] text-right text-xs text-[color:var(--lr-muted)]">
                              Tip: print this QR at the farmstand.
                            </div>
                          </div>
                        )}
                      </>
                    ) : (
                      <div className="lr-chip grid gap-2 rounded-2xl p-4 text-right">
                        <div className="text-xs font-semibold uppercase tracking-wide text-[color:var(--lr-muted)]">
                          Farmstand QR
                        </div>
                        <div className="text-xs text-[color:var(--lr-muted)]">
                          Go live to enable the buyer QR.
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      ) : (
        <div className="text-sm text-[color:var(--lr-muted)]">
          No subscription boxes yet.
        </div>
      )}
    </section>
  );
}
