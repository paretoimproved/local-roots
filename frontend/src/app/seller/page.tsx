"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { sellerApi, type SellerStore } from "@/lib/seller-api";
import { session } from "@/lib/session";

export default function SellerHome() {
  const router = useRouter();
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
      .catch((e: unknown) => setError(String(e)))
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
    } catch (e: unknown) {
      setError(String(e));
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
          <h1 className="text-2xl font-semibold tracking-tight">Seller</h1>
          <p className="mt-1 text-sm text-zinc-600">
            Manage your store, pickup windows, and offerings.
          </p>
        </div>
        <button
          className="rounded-full px-4 py-2 text-sm font-medium text-zinc-700 ring-1 ring-zinc-950/15 hover:bg-white"
          onClick={logout}
          type="button"
        >
          Log out
        </button>
      </div>

      {error ? (
        <div className="rounded-xl bg-rose-50 p-4 text-sm text-rose-800 ring-1 ring-rose-200">
          {error}
        </div>
      ) : null}

      <section className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-zinc-950/5">
        <div className="flex items-baseline justify-between gap-6">
          <h2 className="text-base font-semibold">Your stores</h2>
          <p className="text-sm text-zinc-600">{stores ? stores.length : "…"}</p>
        </div>

        {stores && stores.length ? (
          <ul className="mt-4 grid gap-3">
            {stores.map((s) => (
              <li
                key={s.id}
                className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-zinc-50 px-4 py-3 ring-1 ring-zinc-950/5"
              >
                <div>
                  <div className="font-medium text-zinc-950">{s.name}</div>
                  <div className="text-sm text-zinc-600">{s.description}</div>
                </div>
                <Link
                  className="rounded-full bg-zinc-950 px-4 py-2 text-sm font-medium text-zinc-50 hover:bg-zinc-800"
                  href={`/seller/stores/${s.id}`}
                >
                  Manage
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-4 text-sm text-zinc-600">
            No stores yet. Create your first one below.
          </p>
        )}
      </section>

      {!hasStore ? (
        <section className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-zinc-950/5">
          <h2 className="text-base font-semibold">Create a store</h2>
          <div className="mt-4 grid gap-3">
            <label className="grid gap-1">
              <span className="text-sm font-medium text-zinc-800">Name</span>
              <input
                className="rounded-xl border border-zinc-200 px-3 py-2 text-sm"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Sunny Acres Farm"
              />
            </label>
            <label className="grid gap-1">
              <span className="text-sm font-medium text-zinc-800">
                Description
              </span>
              <textarea
                className="min-h-20 rounded-xl border border-zinc-200 px-3 py-2 text-sm"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="What you sell and how pickup works."
              />
            </label>
            <label className="grid gap-1">
              <span className="text-sm font-medium text-zinc-800">Phone</span>
              <input
                className="rounded-xl border border-zinc-200 px-3 py-2 text-sm"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="Optional"
              />
            </label>
            <button
              className="mt-2 inline-flex items-center justify-center rounded-full bg-zinc-950 px-5 py-2 text-sm font-medium text-zinc-50 hover:bg-zinc-800 disabled:opacity-50"
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

