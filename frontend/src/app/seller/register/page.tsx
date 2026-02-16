"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { type FormEvent, useEffect, useState } from "react";
import { sellerApi } from "@/lib/seller-api";
import { session } from "@/lib/session";
import { ErrorAlert } from "@/components/error-alert";
import { friendlyErrorMessage } from "@/lib/ui";

export default function SellerRegisterPage() {
  const router = useRouter();
  useEffect(() => { document.title = "Create account — LocalRoots"; }, []);
  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const res = await sellerApi.registerSeller(
        email,
        password,
        displayName || undefined,
      );
      session.setToken(res.token);
      router.replace("/seller");
    } catch (err: unknown) {
      setError(friendlyErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="mx-auto max-w-md">
      <h1 className="text-3xl font-semibold tracking-tight text-[color:var(--lr-ink)]">
        Create seller account
      </h1>
      <p className="mt-1 text-sm text-[color:var(--lr-muted)]">
        Already have one?{" "}
        <Link className="text-[color:var(--lr-ink)] underline" href="/seller/login">
          Sign in
        </Link>
        .
      </p>

      {error ? <ErrorAlert error={error} className="mt-4" /> : null}

      <form
        onSubmit={onSubmit}
        className="lr-card lr-card-strong mt-6 p-6"
      >
        <label className="grid gap-1">
          <span className="text-sm font-medium text-[color:var(--lr-muted)]">
            Display name
          </span>
          <input
            className="lr-field px-3 py-2 text-sm"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            autoComplete="name"
            placeholder="Optional"
          />
        </label>
        <label className="mt-3 grid gap-1">
          <span className="text-sm font-medium text-[color:var(--lr-muted)]">
            Email
          </span>
          <input
            className="lr-field px-3 py-2 text-sm"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            type="email"
            autoComplete="email"
            required
          />
        </label>
        <label className="mt-3 grid gap-1">
          <span className="text-sm font-medium text-[color:var(--lr-muted)]">
            Password
          </span>
          <input
            className="lr-field px-3 py-2 text-sm"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            type="password"
            autoComplete="new-password"
            required
            minLength={8}
          />
          <span className="text-xs text-[color:var(--lr-muted)]">
            Minimum 8 characters.
          </span>
        </label>
        <button
          className="lr-btn lr-btn-primary mt-5 inline-flex w-full items-center justify-center px-5 py-2 text-sm font-medium disabled:opacity-50"
          disabled={submitting}
          type="submit"
        >
          {submitting ? "Creating…" : "Create account"}
        </button>
      </form>
    </div>
  );
}
