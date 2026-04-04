"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { buyerAuthApi } from "@/lib/buyer-api";
import { session } from "@/lib/session";
import { ErrorAlert } from "@/components/error-alert";
import { friendlyErrorMessage } from "@/lib/ui";

function VerifyInner() {
  const router = useRouter();
  const params = useSearchParams();
  const token = params.get("token") ?? "";
  const [error, setError] = useState<string | null>(
    token ? null : "Missing sign-in token.",
  );
  const [verifying, setVerifying] = useState(Boolean(token));

  useEffect(() => {
    if (!token) return;
    let cancelled = false;
    buyerAuthApi
      .verify(token)
      .then((res) => {
        if (cancelled) return;
        session.setToken(res.token);
        if (res.refresh_token) session.setRefreshToken(res.refresh_token);
        router.replace("/buyer");
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setError(friendlyErrorMessage(err));
        setVerifying(false);
      });
    return () => {
      cancelled = true;
    };
  }, [token, router]);

  if (verifying) {
    return (
      <section className="lr-card lr-card-strong mx-auto max-w-md p-6 text-center">
        <p className="text-sm text-[color:var(--lr-muted)]">Signing you in...</p>
      </section>
    );
  }

  return (
    <section className="lr-card lr-card-strong mx-auto max-w-md p-6">
      <h1 className="text-lg font-semibold text-[color:var(--lr-ink)]">
        Sign-in failed
      </h1>
      {error ? <ErrorAlert error={error} className="mt-4" /> : null}
      <div className="mt-4">
        <Link
          className="lr-btn lr-btn-primary px-4 py-2 text-sm font-semibold"
          href="/buyer/login"
        >
          Request a new link
        </Link>
      </div>
    </section>
  );
}

export default function BuyerVerifyPage() {
  return (
    <Suspense
      fallback={
        <section className="lr-card lr-card-strong mx-auto max-w-md p-6 text-center">
          <p className="text-sm text-[color:var(--lr-muted)]">Loading...</p>
        </section>
      }
    >
      <VerifyInner />
    </Suspense>
  );
}
