"use client";

import { useState } from "react";
import { buyerAuthApi } from "@/lib/buyer-api";
import { friendlyErrorMessage } from "@/lib/ui";

export default function BuyerLoginPage() {
  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim()) return;
    setSubmitting(true);
    setError(null);
    try {
      await buyerAuthApi.sendMagicLink(email.trim());
      setSent(true);
    } catch (err: unknown) {
      setError(friendlyErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  }

  if (sent) {
    return (
      <section className="lr-card lr-card-strong mx-auto max-w-md p-6">
        <h1 className="text-lg font-semibold text-[color:var(--lr-ink)]">
          Check your email
        </h1>
        <p className="mt-2 text-sm text-[color:var(--lr-muted)]">
          We sent a sign-in link to{" "}
          <span className="font-semibold text-[color:var(--lr-ink)]">{email}</span>.
          It expires in 15 minutes.
        </p>
        <p className="mt-4 text-xs text-[color:var(--lr-muted)]">
          Don&apos;t see it? Check your spam folder, or{" "}
          <button
            type="button"
            className="underline"
            onClick={() => {
              setSent(false);
              setError(null);
            }}
          >
            try again
          </button>
          .
        </p>
      </section>
    );
  }

  return (
    <section className="lr-card lr-card-strong mx-auto max-w-md p-6">
      <h1 className="text-lg font-semibold text-[color:var(--lr-ink)]">
        Sign in
      </h1>
      <p className="mt-1 text-sm text-[color:var(--lr-muted)]">
        Enter your email and we&apos;ll send you a sign-in link. No password needed.
      </p>

      {error ? (
        <div className="mt-4 rounded-xl bg-rose-50 p-4 text-sm text-rose-800 ring-1 ring-rose-200">
          {error}
        </div>
      ) : null}

      <form onSubmit={handleSubmit} className="mt-4 grid gap-3">
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
            autoFocus
          />
        </label>
        <button
          type="submit"
          className="lr-btn lr-btn-primary px-4 py-2 text-sm font-semibold disabled:opacity-50"
          disabled={submitting || !email.trim()}
        >
          {submitting ? "Sending..." : "Send sign-in link"}
        </button>
      </form>
    </section>
  );
}
