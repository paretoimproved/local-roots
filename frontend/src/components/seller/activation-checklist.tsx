"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import type { SellerSubscriptionPlan, SellerSubscription } from "@/lib/seller-api";
import {
  getActivationSteps,
  readActivationDismissed,
  writeActivationDismissed,
} from "@/lib/activation-checklist";

interface Props {
  plans: SellerSubscriptionPlan[] | null;
  subscriptions: SellerSubscription[] | null;
  storeId: string;
}

export function ActivationChecklist({ plans, subscriptions, storeId }: Props) {
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    setDismissed(readActivationDismissed(storeId));
  }, [storeId]);

  // Don't render while data is still loading
  if (plans === null || subscriptions === null) return null;

  const steps = getActivationSteps(plans, subscriptions);
  const allDone = steps.length > 0 && steps.every((s) => s.done);

  if (dismissed || allDone || steps.length === 0) return null;

  const doneCount = steps.filter((s) => s.done).length;
  const firstLivePlan = plans.find((p) => p.is_live);
  const subscriberStep = steps.find((s) => s.id === "subscriber");

  function dismiss() {
    writeActivationDismissed(storeId);
    setDismissed(true);
  }

  return (
    <section
      className="lr-card border-[color:var(--lr-leaf)]/30 bg-emerald-50/40 grid gap-4 p-5"
      aria-label="Activation checklist"
    >
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-base font-semibold text-[color:var(--lr-ink)]">
            Getting started &mdash; {doneCount} of {steps.length} done
          </h2>
          <p className="mt-0.5 text-sm text-[color:var(--lr-muted)]">
            A few steps to your first sale.
          </p>
        </div>
        <button
          type="button"
          onClick={dismiss}
          className="shrink-0 text-xs text-[color:var(--lr-muted)] hover:text-[color:var(--lr-ink)]"
          aria-label="Dismiss checklist"
        >
          Dismiss
        </button>
      </div>

      <ul className="grid gap-2">
        {steps.map((step) => (
          <li key={step.id} className="flex items-center gap-3">
            <span
              className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                step.done
                  ? "bg-[color:var(--lr-leaf)] text-white"
                  : "border-2 border-[color:var(--lr-border)] text-transparent"
              }`}
              aria-hidden="true"
            >
              &#x2713;
            </span>
            <span
              className={`text-sm ${
                step.done
                  ? "line-through text-[color:var(--lr-muted)]"
                  : "font-medium text-[color:var(--lr-ink)]"
              }`}
            >
              {step.label}
            </span>
          </li>
        ))}
      </ul>

      {firstLivePlan && subscriberStep && !subscriberStep.done ? (
        <div className="lr-chip rounded-xl p-4 grid gap-2">
          <p className="text-sm font-semibold text-[color:var(--lr-ink)]">
            Get your first subscriber
          </p>
          <p className="text-xs text-[color:var(--lr-muted)]">
            Print a QR poster for your farmstand &mdash; walk-up visitors scan
            and subscribe on the spot.
          </p>
          <Link
            className="lr-btn lr-btn-primary inline-flex w-fit items-center gap-2 px-4 py-2 text-sm font-semibold"
            href={`/boxes/${firstLivePlan.id}/qr`}
            target="_blank"
            rel="noreferrer"
          >
            Print farmstand QR poster &rarr;
          </Link>
        </div>
      ) : null}
    </section>
  );
}
