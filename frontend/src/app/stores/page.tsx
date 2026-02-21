"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { api, type Store } from "@/lib/api";

function formatDistance(km: number): string {
  const miles = km * 0.621371;
  return miles < 10
    ? `${miles.toFixed(1)} mi away`
    : `${Math.round(miles)} mi away`;
}

export default function StoresPage() {
  const [stores, setStores] = useState<Store[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [hasLocation, setHasLocation] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function load(coords?: { lat: number; lng: number }) {
      try {
        const data = await api.listStores(coords);
        if (!cancelled) {
          setStores(data);
          setHasLocation(!!coords);
        }
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : "Unknown error");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    if (!navigator.geolocation) {
      load();
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        load({ lat: pos.coords.latitude, lng: pos.coords.longitude });
      },
      () => {
        load();
      },
      { timeout: 5000 },
    );

    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="grid gap-6">
      <div className="flex items-baseline justify-between">
        <h1 className="text-3xl font-semibold tracking-tight text-[color:var(--lr-ink)]">
          Stores
        </h1>
        <p className="text-sm text-[color:var(--lr-muted)]">
          {stores
            ? hasLocation
              ? `${stores.length} nearby`
              : `${stores.length} active`
            : ""}
        </p>
      </div>

      {loading ? (
        <div className="lr-card lr-card-strong p-6">
          <p className="text-sm text-[color:var(--lr-muted)]">
            Finding stores near you...
          </p>
        </div>
      ) : null}

      {error ? (
        <div className="lr-card lr-card-strong p-6">
          <p className="text-sm font-medium text-[color:var(--lr-ink)]">
            Could not load stores
          </p>
          <p className="mt-2 text-sm text-[color:var(--lr-muted)]">{error}</p>
          <p className="mt-3 text-sm text-[color:var(--lr-muted)]">
            If you have not set up Postgres yet, start it and run migrations:
          </p>
          <pre className="mt-2 overflow-x-auto rounded-2xl border border-[color:var(--lr-border)] bg-[color:var(--lr-ink)] p-4 text-xs text-[color:var(--lr-bg)] shadow-[0_18px_45px_rgba(38,28,10,0.18)]">
            <code>{`docker compose up -d
export DATABASE_URL="postgres://localroots:localroots@localhost:5432/localroots?sslmode=disable"
pnpm migrate:up`}</code>
          </pre>
        </div>
      ) : null}

      {!loading && stores && stores.length === 0 ? (
        <div className="lr-card lr-card-strong p-6">
          <p className="text-sm text-[color:var(--lr-muted)]">
            {hasLocation
              ? "No stores found nearby. Try expanding your search radius."
              : "No stores yet."}
          </p>
        </div>
      ) : null}

      {stores && stores.length > 0 ? (
        <ul className="grid gap-3">
          {stores.map((s) => (
            <li
              key={s.id}
              className="lr-card lr-card-strong p-6 transition hover:-translate-y-0.5 hover:shadow-[0_22px_60px_rgba(38,28,10,0.14)]"
            >
              <div className="flex items-start justify-between gap-6">
                <div>
                  <h2 className="text-lg font-semibold text-[color:var(--lr-ink)]">
                    <Link className="hover:underline" href={`/stores/${s.id}`}>
                      {s.name}
                    </Link>
                  </h2>
                  {s.city || s.region ? (
                    <p className="mt-1 text-sm text-[color:var(--lr-muted)]">
                      {[s.city, s.region].filter(Boolean).join(", ")}
                    </p>
                  ) : null}
                  {s.description ? (
                    <p className="mt-2 text-sm text-[color:var(--lr-muted)]">
                      {s.description}
                    </p>
                  ) : null}
                </div>
                <div className="flex flex-col items-end gap-2">
                  {s.distance_km != null ? (
                    <span className="lr-chip rounded-full px-3 py-1 text-xs font-medium">
                      {formatDistance(s.distance_km)}
                    </span>
                  ) : null}
                  <span className="text-xs text-[color:var(--lr-muted)]">
                    Added {new Date(s.created_at).toLocaleDateString("en-US")}
                  </span>
                </div>
              </div>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
