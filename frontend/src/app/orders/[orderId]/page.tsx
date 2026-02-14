"use client";

import Link from "next/link";
import { useParams, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { buyerApi, type GetOrderResponse } from "@/lib/buyer-api";
import { orderToken } from "@/lib/order-token";

function formatMoney(cents: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(cents / 100);
}

export default function OrderPage() {
  const params = useParams<{ orderId: string }>();
  const search = useSearchParams();
  const orderId = params.orderId;

  const tokenFromQuery = search.get("t");
  const [token, setToken] = useState<string>("");
  const [tokenInput, setTokenInput] = useState("");
  const [data, setData] = useState<GetOrderResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [rating, setRating] = useState(5);
  const [body, setBody] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [reviewDone, setReviewDone] = useState(false);

  useEffect(() => {
    const saved = orderToken.get(orderId);
    const effective = tokenFromQuery || saved || "";
    if (effective) {
      setToken(effective);
      if (tokenFromQuery) orderToken.set(orderId, tokenFromQuery);
    }
  }, [orderId, tokenFromQuery]);

  async function load() {
    if (!token) return;
    setError(null);
    try {
      const res = await buyerApi.getOrder(orderId, token);
      setData(res);
      setReviewDone(res.has_review);
    } catch (e: unknown) {
      setError(String(e));
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orderId, token]);

  const canReview = useMemo(() => {
    const status = data?.order.status;
    return status === "picked_up" && !reviewDone;
  }, [data, reviewDone]);

  async function submitToken() {
    const t = tokenInput.trim();
    if (!t) return;
    orderToken.set(orderId, t);
    setToken(t);
    setTokenInput("");
  }

  async function submitReview() {
    if (!data) return;
    setSubmitting(true);
    setError(null);
    try {
      await buyerApi.createReview(orderId, {
        token,
        rating,
        body: body || null,
      });
      setReviewDone(true);
      await load();
    } catch (e: unknown) {
      setError(String(e));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="grid gap-6">
      <div className="grid gap-1">
        <h1 className="text-2xl font-semibold tracking-tight">Order</h1>
        <p className="text-sm text-zinc-600">
          <span className="font-mono text-xs">{orderId}</span>
        </p>
      </div>

      {error ? (
        <div className="rounded-xl bg-rose-50 p-4 text-sm text-rose-800 ring-1 ring-rose-200">
          {error}
        </div>
      ) : null}

      {!token ? (
        <section className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-zinc-950/5">
          <h2 className="text-base font-semibold text-zinc-950">Access token</h2>
          <p className="mt-1 text-sm text-zinc-600">
            Paste the token from your confirmation (or add `?t=...` to the URL).
          </p>
          <div className="mt-4 flex gap-2">
            <input
              className="w-full rounded-xl border border-zinc-200 px-3 py-2 text-sm"
              value={tokenInput}
              onChange={(e) => setTokenInput(e.target.value)}
              placeholder="token"
            />
            <button
              className="rounded-full bg-zinc-950 px-4 py-2 text-sm font-medium text-zinc-50 hover:bg-zinc-800"
              type="button"
              onClick={submitToken}
            >
              Load
            </button>
          </div>
        </section>
      ) : null}

      {data ? (
        <>
          <section className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-zinc-950/5">
            <div className="flex flex-wrap items-baseline justify-between gap-4">
              <div>
                <div className="text-sm text-zinc-600">Status</div>
                <div className="text-lg font-semibold text-zinc-950">
                  {data.order.status}
                </div>
              </div>
              <div className="text-right">
                <div className="text-sm text-zinc-600">Total</div>
                <div className="text-lg font-semibold text-zinc-950">
                  {formatMoney(data.order.total_cents)}
                </div>
              </div>
            </div>

            <div className="mt-4 grid gap-2">
              {data.order.items.map((it) => (
                <div
                  key={it.id}
                  className="flex items-baseline justify-between rounded-xl bg-zinc-50 px-4 py-3 ring-1 ring-zinc-950/5"
                >
                  <div>
                    <div className="font-medium text-zinc-950">
                      {it.product_title}
                    </div>
                    <div className="text-sm text-zinc-600">
                      {it.quantity} × {formatMoney(it.price_cents)} ({it.product_unit})
                    </div>
                  </div>
                  <div className="text-sm font-medium text-zinc-950">
                    {formatMoney(it.line_total_cents)}
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-4 rounded-xl bg-zinc-50 p-4 text-sm text-zinc-700 ring-1 ring-zinc-950/5">
              Payment method: <span className="font-medium">Pay at pickup</span>.
            </div>
          </section>

          {canReview ? (
            <section className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-zinc-950/5">
              <h2 className="text-base font-semibold text-zinc-950">Leave a review</h2>
              <p className="mt-1 text-sm text-zinc-600">
                Reviews unlock after pickup is marked complete.
              </p>
              <div className="mt-4 grid gap-3">
                <label className="grid gap-1">
                  <span className="text-sm font-medium text-zinc-800">Rating</span>
                  <select
                    className="rounded-xl border border-zinc-200 px-3 py-2 text-sm"
                    value={rating}
                    onChange={(e) => setRating(Number(e.target.value))}
                  >
                    <option value={5}>5</option>
                    <option value={4}>4</option>
                    <option value={3}>3</option>
                    <option value={2}>2</option>
                    <option value={1}>1</option>
                  </select>
                </label>
                <label className="grid gap-1">
                  <span className="text-sm font-medium text-zinc-800">
                    Comment (optional)
                  </span>
                  <textarea
                    className="min-h-24 rounded-xl border border-zinc-200 px-3 py-2 text-sm"
                    value={body}
                    onChange={(e) => setBody(e.target.value)}
                    placeholder="What went well?"
                  />
                </label>
                <button
                  className="inline-flex items-center justify-center rounded-full bg-zinc-950 px-4 py-2 text-sm font-medium text-zinc-50 hover:bg-zinc-800 disabled:opacity-50"
                  disabled={submitting}
                  onClick={submitReview}
                  type="button"
                >
                  {submitting ? "Submitting…" : "Submit review"}
                </button>
              </div>
            </section>
          ) : reviewDone ? (
            <section className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-zinc-950/5">
              <h2 className="text-base font-semibold text-zinc-950">Review submitted</h2>
              <p className="mt-1 text-sm text-zinc-600">Thanks for the feedback.</p>
            </section>
          ) : null}
        </>
      ) : null}

      <div>
        <Link className="text-sm text-zinc-600 hover:text-zinc-950" href="/stores">
          Back to stores
        </Link>
      </div>
    </div>
  );
}

