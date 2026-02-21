"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { api, type Store } from "@/lib/api";

const RADIUS_OPTIONS = [
  { label: "10 mi", km: 16 },
  { label: "25 mi", km: 40 },
  { label: "50 mi", km: 80 },
  { label: "100 mi", km: 161 },
] as const;

const DEFAULT_RADIUS_KM = 80;

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
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(
    null,
  );
  const [radiusKm, setRadiusKm] = useState(DEFAULT_RADIUS_KM);
  const [locationLabel, setLocationLabel] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchError, setSearchError] = useState<string | null>(null);
  const [searching, setSearching] = useState(false);

  const fetchStores = useCallback(
    async (loc?: { lat: number; lng: number } | null, radius?: number) => {
      setLoading(true);
      setError(null);
      try {
        const opts = loc
          ? { lat: loc.lat, lng: loc.lng, radius_km: radius ?? radiusKm }
          : undefined;
        const data = await api.listStores(opts);
        setStores(data);
        setHasLocation(!!loc);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Unknown error");
      } finally {
        setLoading(false);
      }
    },
    [radiusKm],
  );

  // Initial load: try geolocation, fall back to all stores
  useEffect(() => {
    if (!navigator.geolocation) {
      fetchStores();
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const loc = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        setCoords(loc);
        fetchStores(loc);
      },
      () => {
        fetchStores();
      },
      { timeout: 5000 },
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Re-fetch when radius changes (only if we have coords)
  useEffect(() => {
    if (coords) {
      fetchStores(coords, radiusKm);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [radiusKm]);

  async function handleLocationSearch(e: React.FormEvent) {
    e.preventDefault();
    const q = searchQuery.trim();
    if (q.length < 2) return;

    setSearching(true);
    setSearchError(null);
    try {
      const result = await api.geocode(q);
      const loc = { lat: result.lat, lng: result.lng };
      setCoords(loc);
      setLocationLabel(result.label);
      await fetchStores(loc);
    } catch {
      setSearchError("Could not find that location. Try a city or zip code.");
    } finally {
      setSearching(false);
    }
  }

  function handleClearLocation() {
    setCoords(null);
    setLocationLabel(null);
    setSearchQuery("");
    setSearchError(null);
    fetchStores();
  }

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

      {/* Search controls */}
      <div className="lr-card lr-card-strong p-4">
        <form
          onSubmit={handleLocationSearch}
          className="flex flex-wrap items-end gap-3"
        >
          <div className="grid min-w-[180px] flex-1 gap-1">
            <label
              htmlFor="location-search"
              className="text-xs font-medium text-[color:var(--lr-muted)]"
            >
              City or zip code
            </label>
            <input
              id="location-search"
              type="text"
              placeholder="e.g. Austin, TX or 78701"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="rounded-lg border border-[color:var(--lr-border)] bg-[color:var(--lr-bg)] px-3 py-2 text-sm text-[color:var(--lr-ink)] placeholder:text-[color:var(--lr-muted)] focus:outline-none focus:ring-2 focus:ring-[color:var(--lr-accent)]"
            />
          </div>
          <div className="grid gap-1">
            <label
              htmlFor="radius-select"
              className="text-xs font-medium text-[color:var(--lr-muted)]"
            >
              Radius
            </label>
            <select
              id="radius-select"
              value={radiusKm}
              onChange={(e) => setRadiusKm(Number(e.target.value))}
              className="rounded-lg border border-[color:var(--lr-border)] bg-[color:var(--lr-bg)] px-3 py-2 text-sm text-[color:var(--lr-ink)] focus:outline-none focus:ring-2 focus:ring-[color:var(--lr-accent)]"
            >
              {RADIUS_OPTIONS.map((opt) => (
                <option key={opt.km} value={opt.km}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>
          <button
            type="submit"
            disabled={searching || searchQuery.trim().length < 2}
            className="lr-btn lr-btn-primary px-4 py-2 text-sm font-semibold disabled:opacity-50"
          >
            {searching ? "Searching..." : "Search"}
          </button>
          {hasLocation ? (
            <button
              type="button"
              onClick={handleClearLocation}
              className="lr-btn px-4 py-2 text-sm font-semibold text-[color:var(--lr-ink)]"
            >
              Show all
            </button>
          ) : null}
        </form>
        {locationLabel ? (
          <p className="mt-2 text-xs text-[color:var(--lr-muted)]">
            Showing stores near {locationLabel}
          </p>
        ) : null}
        {searchError ? (
          <p className="mt-2 text-xs text-rose-600">{searchError}</p>
        ) : null}
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
              ? "No stores found nearby. Try a different location or expand your radius."
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
