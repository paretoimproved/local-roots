"use client";

import { Suspense, useCallback, useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { buyerAuthApi } from "@/lib/buyer-api";
import { session } from "@/lib/session";
import { ErrorAlert } from "@/components/error-alert";
import { useToast } from "@/components/toast";
import { friendlyErrorMessage } from "@/lib/ui";
import { GoogleSignInButton } from "@/components/google-sign-in";
import { oauthApi } from "@/lib/oauth-api";

export default function BuyerLoginPage() {
  return <Suspense><BuyerLoginInner /></Suspense>;
}

function BuyerLoginInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { showToast } = useToast();
  const next = searchParams.get("next");
  const redirectTo = next && next.startsWith("/") ? next : "/buyer";

  useEffect(() => { document.title = "Sign in — LocalRoots"; }, []);
  useEffect(() => {
    if (session.getToken()) router.replace(redirectTo);
  }, [router, redirectTo]);
  const shownExpiredRef = useRef(false);
  useEffect(() => {
    if (searchParams.get("expired") === "1" && !shownExpiredRef.current) {
      shownExpiredRef.current = true;
      showToast({ kind: "error", message: "Your session has expired. Please sign in again." });
    }
  }, [searchParams, showToast]);

  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [cooldown, setCooldown] = useState(0);
  const cooldownRef = useRef<ReturnType<typeof setInterval>>(undefined);

  const startCooldown = useCallback(() => {
    setCooldown(60);
    clearInterval(cooldownRef.current);
    cooldownRef.current = setInterval(() => {
      setCooldown((c) => {
        if (c <= 1) {
          clearInterval(cooldownRef.current);
          return 0;
        }
        return c - 1;
      });
    }, 1000);
  }, []);

  async function handleGoogleCredential(idToken: string) {
    setSubmitting(true);
    setError(null);
    try {
      const res = await oauthApi.googleLogin(idToken, "buyer");
      session.setToken(res.token);
      if (res.user.role === "seller") {
        router.replace("/seller");
      } else {
        router.replace(redirectTo);
      }
    } catch (err: unknown) {
      setError(friendlyErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim() || cooldown > 0) return;
    setSubmitting(true);
    setError(null);
    try {
      await buyerAuthApi.sendMagicLink(email.trim());
      setSent(true);
      startCooldown();
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
            className="underline disabled:opacity-50"
            disabled={cooldown > 0}
            onClick={() => {
              setSent(false);
              setError(null);
            }}
          >
            {cooldown > 0 ? `try again in ${cooldown}s` : "try again"}
          </button>
          .
        </p>
        <p className="mt-4 text-sm text-[color:var(--lr-muted)]">
          <Link className="underline" href="/stores">Browse stores</Link>
        </p>
      </section>
    );
  }

  return (
    <section className="mx-auto max-w-md">
      <div className="lr-card lr-card-strong p-6">
        <Image
          src="/local-roots-logo.png"
          alt="LocalRoots"
          width={48}
          height={48}
          className="mb-4"
  
        />
        <h1 className="text-lg font-semibold text-[color:var(--lr-ink)]">
          Sign in
        </h1>

        {error ? <ErrorAlert error={error} className="mt-4" /> : null}

        <div className="mt-4">
          <GoogleSignInButton
            onCredential={handleGoogleCredential}
            text="continue_with"
            disabled={submitting}
          />
        </div>

        <div className="my-4 flex items-center gap-3">
          <div className="h-px flex-1 bg-[color:var(--lr-border)]" />
          <span className="text-xs text-[color:var(--lr-muted)]">or</span>
          <div className="h-px flex-1 bg-[color:var(--lr-border)]" />
        </div>

        <p className="text-sm text-[color:var(--lr-muted)]">
          Enter your email and we&apos;ll send you a sign-in link. No password needed.
        </p>

        <form onSubmit={handleSubmit} className="mt-3 grid gap-3">
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
              disabled={submitting}
            />
          </label>
          <button
            type="submit"
            className="lr-btn lr-btn-primary px-4 py-2 text-sm font-semibold disabled:opacity-50"
            disabled={submitting || !email.trim() || cooldown > 0}
          >
            {submitting ? "Sending..." : cooldown > 0 ? `Wait ${cooldown}s` : "Send sign-in link"}
          </button>
        </form>
      </div>
    </section>
  );
}
