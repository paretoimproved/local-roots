"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { sellerApi, type PickupPreviewResponse, type PickupConfirmResponse } from "@/lib/seller-api";
import { session } from "@/lib/session";
import { formatMoney, parseApiError } from "@/lib/ui";

type PageState =
  | { kind: "loading" }
  | { kind: "preview"; data: PickupPreviewResponse }
  | { kind: "confirming"; data: PickupPreviewResponse }
  | { kind: "success"; data: PickupConfirmResponse }
  | { kind: "error"; message: string };

export default function PickupConfirmPage() {
  const router = useRouter();
  const search = useSearchParams();
  const orderId = search.get("order") ?? "";
  const code = search.get("code") ?? "";

  const [state, setState] = useState<PageState>({ kind: "loading" });

  useEffect(() => {
    document.title = "Confirm pickup — LocalRoots";
  }, []);

  useEffect(() => {
    if (!orderId || !code) {
      setState({ kind: "error", message: "Missing order or code in URL." });
      return;
    }

    const token = session.getToken();
    if (!token) {
      const returnUrl = `/pickup/confirm?order=${encodeURIComponent(orderId)}&code=${encodeURIComponent(code)}`;
      router.replace(`/seller/login?next=${encodeURIComponent(returnUrl)}`);
      return;
    }

    setState({ kind: "loading" });
    sellerApi
      .pickupPreview(token, orderId, code)
      .then((data) => {
        setState({ kind: "preview", data });
      })
      .catch((e: unknown) => {
        const apiErr = parseApiError(e);
        if (apiErr && (apiErr.status === 401 || apiErr.status === 403)) {
          const errMsg = typeof apiErr.json?.error === "string" ? apiErr.json.error : apiErr.body;
          if (errMsg?.includes("different store")) {
            setState({
              kind: "error",
              message: "This order belongs to a different store.",
            });
            return;
          }
          const returnUrl = `/pickup/confirm?order=${encodeURIComponent(orderId)}&code=${encodeURIComponent(code)}`;
          router.replace(`/seller/login?next=${encodeURIComponent(returnUrl)}`);
          return;
        }
        if (apiErr && apiErr.status === 400) {
          setState({
            kind: "error",
            message: "Invalid pickup code. Ask the buyer to show their code again.",
          });
          return;
        }
        setState({
          kind: "error",
          message: "Something went wrong. Please try again.",
        });
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orderId, code]);

  async function handleConfirm(data: PickupPreviewResponse) {
    const token = session.getToken();
    if (!token) return;

    setState({ kind: "confirming", data });
    try {
      const result = await sellerApi.pickupConfirm(token, orderId, code);
      setState({ kind: "success", data: result });
    } catch (e: unknown) {
      const apiErr = parseApiError(e);
      const errMsg = typeof apiErr?.json?.error === "string" ? apiErr.json.error : apiErr?.body ?? "";
      if (apiErr && errMsg.includes("not eligible")) {
        setState({
          kind: "error",
          message: "This order is no longer eligible for pickup.",
        });
        return;
      }
      if (apiErr && errMsg.includes("payment")) {
        setState({
          kind: "error",
          message:
            "Payment could not be processed. The buyer's card was declined. Please arrange an alternative payment with the buyer.",
        });
        return;
      }
      setState({
        kind: "error",
        message: "Could not confirm pickup. Please try again.",
      });
    }
  }

  if (state.kind === "loading") {
    return (
      <div className="mx-auto max-w-lg">
        <section className="lr-card lr-card-strong p-6 text-center">
          <p className="text-sm text-[color:var(--lr-muted)]">Loading pickup details...</p>
        </section>
      </div>
    );
  }

  if (state.kind === "error") {
    return (
      <div className="mx-auto max-w-lg grid gap-6">
        <section className="lr-card lr-card-strong border-l-4 border-rose-400 p-6">
          <h1 className="text-lg font-semibold text-[color:var(--lr-ink)]">
            Pickup issue
          </h1>
          <p className="mt-2 text-sm text-[color:var(--lr-muted)]">
            {state.message}
          </p>
        </section>
        <Link
          className="lr-btn lr-chip inline-flex w-fit items-center gap-2 px-4 py-2 text-sm font-medium text-[color:var(--lr-ink)]"
          href="/seller"
        >
          <span aria-hidden="true">&larr;</span> Back to seller dashboard
        </Link>
      </div>
    );
  }

  if (state.kind === "success") {
    const d = state.data;
    return (
      <div className="mx-auto max-w-lg grid gap-6">
        <section className="lr-card lr-card-strong border-l-4 border-green-600 p-6">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-green-100 text-green-700">
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
              </svg>
            </div>
            <h1 className="text-lg font-semibold text-[color:var(--lr-ink)]">
              Pickup confirmed
            </h1>
          </div>

          <div className="mt-4 grid gap-3">
            <div className="grid gap-1">
              {d.items.map((it) => (
                <div key={it.id} className="text-sm text-[color:var(--lr-muted)]">
                  <span className="font-semibold text-[color:var(--lr-ink)]">{it.quantity}x</span>{" "}
                  {it.product_title}
                </div>
              ))}
            </div>

            <div className="rounded-xl bg-white/60 p-4 text-sm ring-1 ring-[color:var(--lr-border)]">
              <div className="grid gap-2">
                <div className="flex items-baseline justify-between gap-4">
                  <span className="font-medium text-[color:var(--lr-muted)]">Payment captured</span>
                  <span className="font-semibold text-[color:var(--lr-ink)]">
                    {formatMoney(d.total_cents)}
                  </span>
                </div>
                <div className="flex items-baseline justify-between gap-4">
                  <span className="font-medium text-[color:var(--lr-muted)]">Your payout</span>
                  <span className="font-semibold text-[color:var(--lr-ink)]">
                    {formatMoney(d.subtotal_cents)}
                  </span>
                </div>
              </div>
            </div>

            <div className="text-sm text-[color:var(--lr-muted)]">
              Buyer: <span className="font-medium text-[color:var(--lr-ink)]">{d.buyer_name ?? d.buyer_email}</span>
            </div>
            <div className="text-xs text-[color:var(--lr-muted)]">
              Confirmed at {new Date(d.confirmed_at).toLocaleString()}
            </div>
          </div>
        </section>

        <Link
          className="lr-btn lr-chip inline-flex w-fit items-center gap-2 px-4 py-2 text-sm font-medium text-[color:var(--lr-ink)]"
          href="/seller"
        >
          <span aria-hidden="true">&larr;</span> Back to orders
        </Link>
      </div>
    );
  }

  // preview or confirming
  const d = state.kind === "preview" ? state.data : state.data;
  const isConfirming = state.kind === "confirming";

  // Already picked up
  if (d.status === "picked_up") {
    return (
      <div className="mx-auto max-w-lg grid gap-6">
        <section className="lr-card lr-card-strong border-l-4 border-green-600 p-6">
          <h1 className="text-lg font-semibold text-[color:var(--lr-ink)]">
            Already picked up
          </h1>
          <p className="mt-2 text-sm text-[color:var(--lr-muted)]">
            This order was already picked up on{" "}
            <span className="font-medium text-[color:var(--lr-ink)]">
              {new Date(d.updated_at).toLocaleString()}
            </span>.
          </p>
        </section>
        <Link
          className="lr-btn lr-chip inline-flex w-fit items-center gap-2 px-4 py-2 text-sm font-medium text-[color:var(--lr-ink)]"
          href="/seller"
        >
          <span aria-hidden="true">&larr;</span> Back to orders
        </Link>
      </div>
    );
  }

  // Cancelled
  if (d.status === "canceled") {
    return (
      <div className="mx-auto max-w-lg grid gap-6">
        <section className="lr-card lr-card-strong border-l-4 border-rose-400 p-6">
          <h1 className="text-lg font-semibold text-[color:var(--lr-ink)]">
            Order cancelled
          </h1>
          <p className="mt-2 text-sm text-[color:var(--lr-muted)]">
            This order was cancelled.
          </p>
        </section>
        <Link
          className="lr-btn lr-chip inline-flex w-fit items-center gap-2 px-4 py-2 text-sm font-medium text-[color:var(--lr-ink)]"
          href="/seller"
        >
          <span aria-hidden="true">&larr;</span> Back to orders
        </Link>
      </div>
    );
  }

  // Review screen (placed or ready)
  return (
    <div className="mx-auto max-w-lg grid gap-6">
      <section className="lr-card lr-card-strong p-6">
        <h1 className="text-lg font-semibold text-[color:var(--lr-ink)]">
          Confirm pickup
        </h1>
        <p className="mt-1 text-sm text-[color:var(--lr-muted)]">
          {d.store_name}
        </p>

        <div className="mt-4 grid gap-3">
          <div className="text-sm text-[color:var(--lr-muted)]">
            Buyer: <span className="font-medium text-[color:var(--lr-ink)]">{d.buyer_name ?? d.buyer_email}</span>
            {d.buyer_name ? (
              <span className="ml-2 text-xs">{d.buyer_email}</span>
            ) : null}
          </div>

          <div className="grid gap-1">
            {d.items.map((it) => (
              <div
                key={it.id}
                className="flex items-baseline justify-between rounded-xl bg-white/60 px-4 py-3 ring-1 ring-[color:var(--lr-border)]"
              >
                <div>
                  <div className="font-medium text-[color:var(--lr-ink)]">
                    {it.product_title}
                  </div>
                  <div className="text-sm text-[color:var(--lr-muted)]">
                    {it.quantity} x {formatMoney(it.price_cents)} ({it.product_unit})
                  </div>
                </div>
                <div className="text-sm font-medium text-[color:var(--lr-ink)]">
                  {formatMoney(it.line_total_cents)}
                </div>
              </div>
            ))}
          </div>

          <div className="rounded-xl bg-white/60 p-4 text-sm ring-1 ring-[color:var(--lr-border)]">
            <div className="grid gap-2">
              <div className="flex items-baseline justify-between gap-4">
                <span className="font-medium text-[color:var(--lr-muted)]">Subtotal</span>
                <span className="font-semibold text-[color:var(--lr-ink)]">
                  {formatMoney(d.subtotal_cents)}
                </span>
              </div>
              {d.buyer_fee_cents > 0 ? (
                <div className="flex items-baseline justify-between gap-4">
                  <span className="font-medium text-[color:var(--lr-muted)]">Service fee</span>
                  <span className="font-semibold text-[color:var(--lr-ink)]">
                    {formatMoney(d.buyer_fee_cents)}
                  </span>
                </div>
              ) : null}
              <div className="h-px bg-[color:var(--lr-border)]/70" />
              <div className="flex items-baseline justify-between gap-4">
                <span className="font-semibold text-[color:var(--lr-ink)]">Total</span>
                <span className="font-semibold text-[color:var(--lr-ink)]">
                  {formatMoney(d.total_cents)}
                </span>
              </div>
            </div>
          </div>

          <div className="text-sm text-[color:var(--lr-muted)]">
            Payment:{" "}
            <span className="font-medium">
              {d.payment_status === "authorized"
                ? "Card authorized"
                : `Card ${d.payment_status}`}
            </span>
            {d.payment_status === "authorized" ? (
              <span className="ml-1 text-green-700">&#10003;</span>
            ) : null}
          </div>
        </div>
      </section>

      <div className="grid gap-3">
        <button
          type="button"
          className="lr-btn lr-btn-primary w-full px-5 py-3 text-sm font-semibold disabled:opacity-50"
          onClick={() => handleConfirm(d)}
          disabled={isConfirming}
        >
          {isConfirming ? "Processing..." : "Confirm & capture payment"}
        </button>
        <p className="text-center text-xs text-[color:var(--lr-muted)]">
          This will mark the order as picked up and charge the buyer&apos;s card.
        </p>
      </div>
    </div>
  );
}
