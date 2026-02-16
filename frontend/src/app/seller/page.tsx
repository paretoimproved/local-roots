"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { sellerApi, type SellerStore } from "@/lib/seller-api";
import { session } from "@/lib/session";
import { ErrorAlert } from "@/components/error-alert";
import { useToast } from "@/components/toast";
import { friendlyErrorMessage } from "@/lib/ui";

export default function SellerHome() {
  const router = useRouter();
  const { showToast } = useToast();
  const [token, setToken] = useState<string | null>(null);
  const [stores, setStores] = useState<SellerStore[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [phone, setPhone] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const t = session.getToken();
    if (!t) {
      router.replace("/seller/login");
      return;
    }
    setToken(t);
  }, [router]);

  useEffect(() => {
    if (!token) return;
    setError(null);
    sellerApi
      .listMyStores(token)
      .then(setStores)
      .catch((e: unknown) => setError(friendlyErrorMessage(e)))
      .finally(() => {});
  }, [token]);

  const hasStore = useMemo(() => (stores?.length ?? 0) > 0, [stores]);

  async function createStore() {
    if (!token) return;
    setSubmitting(true);
    setError(null);
    try {
      await sellerApi.createStore(token, {
        name,
        description: description || null,
        phone: phone || null,
      });
      setName("");
      setDescription("");
      setPhone("");
      setStores(await sellerApi.listMyStores(token));
      showToast({ kind: "success", message: "Store created." });
    } catch (e: unknown) {
      setError(friendlyErrorMessage(e));
    } finally {
      setSubmitting(false);
    }
  }

  function logout() {
    session.clearToken();
    router.replace("/seller/login");
  }

  return (
    <div className="grid gap-8">
      <div className="flex flex-wrap items-baseline justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight text-[color:var(--lr-ink)]">
            Seller
          </h1>
          <p className="mt-1 text-sm text-[color:var(--lr-muted)]">
            Manage your store, pickup windows, and offerings.
          </p>
        </div>
        <button
          className="lr-btn px-4 py-2 text-sm font-medium text-[color:var(--lr-ink)]"
          onClick={logout}
          type="button"
        >
          Log out
        </button>
      </div>

      {error ? <ErrorAlert error={error} /> : null}

      <section className="lr-card lr-card-strong p-6">
        <div className="flex items-baseline justify-between gap-6">
          <h2 className="text-base font-semibold text-[color:var(--lr-ink)]">
            Your stores
          </h2>
          <p className="text-sm text-[color:var(--lr-muted)]">
            {stores ? stores.length : "…"}
          </p>
        </div>

        {stores && stores.length ? (
          <ul className="mt-4 grid gap-3">
            {stores.map((s) => (
              <li
                key={s.id}
                className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-white/60 px-4 py-3 ring-1 ring-[color:var(--lr-border)]"
              >
                <div>
                  <div className="font-medium text-[color:var(--lr-ink)]">
                    {s.name}
                  </div>
                  <div className="text-sm text-[color:var(--lr-muted)]">
                    {s.description}
                  </div>
                </div>
                <Link
                  className="lr-btn lr-btn-primary px-4 py-2 text-sm font-medium"
                  href={`/seller/stores/${s.id}`}
                >
                  Manage
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-4 text-sm text-[color:var(--lr-muted)]">
            No stores yet. Create your first one below.
          </p>
        )}
      </section>

      {!hasStore ? (
        <section className="lr-card lr-card-strong p-6">
          <h2 className="text-base font-semibold text-[color:var(--lr-ink)]">
            Create a store
          </h2>
          <div className="mt-4 grid gap-3">
            <label className="grid gap-1">
              <span className="text-sm font-medium text-[color:var(--lr-muted)]">
                Name
              </span>
              <input
                className="lr-field px-3 py-2 text-sm"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Sunny Acres Farm"
              />
            </label>
            <label className="grid gap-1">
              <span className="text-sm font-medium text-[color:var(--lr-muted)]">
                Description
              </span>
              <textarea
                className="lr-field min-h-20 px-3 py-2 text-sm"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="What you sell and how pickup works."
              />
            </label>
            <label className="grid gap-1">
              <span className="text-sm font-medium text-[color:var(--lr-muted)]">
                Phone
              </span>
              <input
                className="lr-field px-3 py-2 text-sm"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="Optional"
              />
            </label>
            <button
              className="lr-btn lr-btn-primary mt-2 inline-flex items-center justify-center px-5 py-2 text-sm font-medium disabled:opacity-50"
              onClick={createStore}
              disabled={!name.trim() || submitting}
              type="button"
            >
              {submitting ? "Creating…" : "Create store"}
            </button>
          </div>
        </section>
      ) : null}
    </div>
  );
}
