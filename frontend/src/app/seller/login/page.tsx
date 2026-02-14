"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { type FormEvent, useState } from "react";
import { sellerApi } from "@/lib/seller-api";
import { session } from "@/lib/session";

export default function SellerLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const res = await sellerApi.login(email, password);
      session.setToken(res.token);
      router.replace("/seller");
    } catch (err: unknown) {
      setError(String(err));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="mx-auto max-w-md">
      <h1 className="text-2xl font-semibold tracking-tight">Seller login</h1>
      <p className="mt-1 text-sm text-zinc-600">
        Or{" "}
        <Link className="text-zinc-950 underline" href="/seller/register">
          create an account
        </Link>
        .
      </p>

      {error ? (
        <div className="mt-4 rounded-xl bg-rose-50 p-4 text-sm text-rose-800 ring-1 ring-rose-200">
          {error}
        </div>
      ) : null}

      <form
        onSubmit={onSubmit}
        className="mt-6 rounded-2xl bg-white p-6 shadow-sm ring-1 ring-zinc-950/5"
      >
        <label className="grid gap-1">
          <span className="text-sm font-medium text-zinc-800">Email</span>
          <input
            className="rounded-xl border border-zinc-200 px-3 py-2 text-sm"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            type="email"
            autoComplete="email"
            required
          />
        </label>
        <label className="mt-3 grid gap-1">
          <span className="text-sm font-medium text-zinc-800">Password</span>
          <input
            className="rounded-xl border border-zinc-200 px-3 py-2 text-sm"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            type="password"
            autoComplete="current-password"
            required
          />
        </label>
        <button
          className="mt-5 inline-flex w-full items-center justify-center rounded-full bg-zinc-950 px-5 py-2 text-sm font-medium text-zinc-50 hover:bg-zinc-800 disabled:opacity-50"
          disabled={submitting}
          type="submit"
        >
          {submitting ? "Signing in…" : "Sign in"}
        </button>
      </form>
    </div>
  );
}
