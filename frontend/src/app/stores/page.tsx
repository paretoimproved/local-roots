"use client";

import { Suspense, useEffect, useState, useCallback, useRef } from "react";
import Link from "next/link";
import Image from "next/image";
import { useSearchParams } from "next/navigation";
import { api, type Store, type PlacePrediction } from "@/lib/api";
import { session } from "@/lib/session";

const RADIUS_OPTIONS = [
  { label: "10 mi", km: 16 },
  { label: "25 mi", km: 40 },
  { label: "50 mi", km: 80 },
  { label: "100 mi", km: 161 },
] as const;

const DEFAULT_RADIUS_KM = 40;

function formatDistance(km: number): string {
  const miles = km * 0.621371;
  return miles < 10
    ? `${miles.toFixed(1)} mi away`
    : `${Math.round(miles)} mi away`;
}

export default function StoresPage() {
  return (
    <Suspense>
      <StoresContent />
    </Suspense>
  );
}

function StoresContent() {
  const searchParams = useSearchParams();
  const isDemo = searchParams.get("demo") === "true";

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

  // Autocomplete state
  const [predictions, setPredictions] = useState<PlacePrediction[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);

  const fetchStores = useCallback(
    async (loc?: { lat: number; lng: number } | null, radius?: number) => {
      setLoading(true);
      setError(null);
      try {
        const token = isDemo ? session.getToken() ?? undefined : undefined;
        const opts = loc
          ? { lat: loc.lat, lng: loc.lng, radius_km: radius ?? radiusKm, demo: isDemo || undefined, token }
          : isDemo ? { demo: true, token } : undefined;
        const data = await api.listStores(opts);
        setStores(data);
        setHasLocation(!!loc);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Unknown error");
      } finally {
        setLoading(false);
      }
    },
    [radiusKm, isDemo],
  );

  // Initial load: show all stores; detect geolocation silently for search
  useEffect(() => {
    fetchStores();

    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        },
        () => {},
        { timeout: 5000 },
      );
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Re-fetch when radius changes (only if we have coords)
  useEffect(() => {
    if (coords) {
      fetchStores(coords, radiusKm);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [radiusKm]);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (
        wrapperRef.current &&
        !wrapperRef.current.contains(e.target as Node)
      ) {
        setShowDropdown(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  // Debounced autocomplete
  function handleInputChange(value: string) {
    setSearchQuery(value);
    setSearchError(null);
    setActiveIndex(-1);

    if (debounceRef.current) clearTimeout(debounceRef.current);

    if (value.trim().length < 2) {
      setPredictions([]);
      setShowDropdown(false);
      return;
    }

    debounceRef.current = setTimeout(async () => {
      try {
        const results = await api.placesAutocomplete(value.trim());
        setPredictions(results);
        setShowDropdown(results.length > 0);
      } catch {
        setPredictions([]);
        setShowDropdown(false);
      }
    }, 250);
  }

  async function selectPrediction(prediction: PlacePrediction) {
    setSearchQuery(prediction.label);
    setShowDropdown(false);
    setPredictions([]);
    setSearchError(null);

    try {
      const result = await api.geocode({ place_id: prediction.place_id });
      const loc = { lat: result.lat, lng: result.lng };
      setCoords(loc);
      setLocationLabel(result.label);
      await fetchStores(loc);
    } catch {
      setSearchError("Could not find that location. Try a different search.");
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const q = searchQuery.trim();
    if (q.length < 2) return;

    setShowDropdown(false);
    setPredictions([]);
    setSearchError(null);

    try {
      const result = await api.geocode({ q });
      const loc = { lat: result.lat, lng: result.lng };
      setCoords(loc);
      setLocationLabel(result.label);
      await fetchStores(loc);
    } catch {
      setSearchError("Could not find that location. Try a city or zip code.");
    }
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (!showDropdown || predictions.length === 0) return;

    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIndex((prev) =>
        prev < predictions.length - 1 ? prev + 1 : 0,
      );
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex((prev) =>
        prev > 0 ? prev - 1 : predictions.length - 1,
      );
    } else if (e.key === "Enter" && activeIndex >= 0) {
      e.preventDefault();
      selectPrediction(predictions[activeIndex]);
    } else if (e.key === "Escape") {
      setShowDropdown(false);
    }
  }

  function handleClearLocation() {
    setCoords(null);
    setLocationLabel(null);
    setSearchQuery("");
    setSearchError(null);
    setPredictions([]);
    setShowDropdown(false);
    fetchStores();
  }

  return (
    <div className="grid gap-6">
      <div className="flex items-baseline justify-between">
        <h1 className="text-3xl font-semibold tracking-tight text-[color:var(--lr-ink)]">
          Farms
        </h1>
        {stores && hasLocation ? (
          <p className="text-sm text-[color:var(--lr-muted)]">
            {stores.length} farm{stores.length !== 1 ? "s" : ""} nearby
          </p>
        ) : null}
      </div>

      {isDemo ? (
        <div className="flex items-center justify-between rounded-lg border border-amber-300 bg-amber-50 px-4 py-3">
          <p className="text-sm font-medium text-amber-800">
            Viewing demo stores
          </p>
          <Link
            href="/stores"
            className="text-sm font-semibold text-amber-700 underline hover:text-amber-900"
          >
            Exit demo
          </Link>
        </div>
      ) : null}

      {/* Search controls */}
      <div ref={wrapperRef} className="relative">
      <div className="lr-card lr-card-strong p-4">
        <form
          onSubmit={handleSubmit}
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
              placeholder="Your city or zip code"
              value={searchQuery}
              onChange={(e) => handleInputChange(e.target.value)}
              onFocus={() => {
                if (predictions.length > 0) setShowDropdown(true);
              }}
              onKeyDown={handleKeyDown}
              autoComplete="off"
              role="combobox"
              aria-expanded={showDropdown}
              aria-autocomplete="list"
              aria-controls="location-listbox"
              aria-activedescendant={
                activeIndex >= 0 ? `prediction-${activeIndex}` : undefined
              }
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
            disabled={searchQuery.trim().length < 2}
            className="lr-btn lr-btn-primary px-4 py-2 text-sm font-semibold disabled:opacity-50"
          >
            Search
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
      {showDropdown && predictions.length > 0 ? (
        <ul
          id="location-listbox"
          role="listbox"
          className="absolute left-0 right-0 top-full z-50 mt-1 overflow-hidden rounded-lg border border-[color:var(--lr-border)] bg-[color:var(--lr-bg)] shadow-[0_8px_30px_rgba(38,28,10,0.12)]"
        >
          {predictions.map((p, i) => (
            <li
              key={p.place_id}
              id={`prediction-${i}`}
              role="option"
              aria-selected={i === activeIndex}
              onMouseDown={() => selectPrediction(p)}
              onMouseEnter={() => setActiveIndex(i)}
              className={`cursor-pointer px-3 py-2 text-sm ${
                i === activeIndex
                  ? "bg-[color:var(--lr-accent)]/10 text-[color:var(--lr-ink)]"
                  : "text-[color:var(--lr-muted)] hover:text-[color:var(--lr-ink)]"
              }`}
            >
              {p.label}
            </li>
          ))}
        </ul>
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
            We&apos;re having trouble loading farms right now
          </p>
          <p className="mt-2 text-sm text-[color:var(--lr-muted)]">
            Please try again in a few minutes. If the problem persists, contact support.
          </p>
          {process.env.NODE_ENV === "development" && (
            <>
              <p className="mt-3 text-sm text-[color:var(--lr-muted)]">{error}</p>
              <p className="mt-3 text-sm text-[color:var(--lr-muted)]">
                If you have not set up Postgres yet, start it and run migrations:
              </p>
              <pre className="mt-2 overflow-x-auto rounded-2xl border border-[color:var(--lr-border)] bg-[color:var(--lr-ink)] p-4 text-xs text-[color:var(--lr-bg)] shadow-[0_18px_45px_rgba(38,28,10,0.18)]">
                <code>{`docker compose up -d
export DATABASE_URL="postgres://localroots:localroots@localhost:5432/localroots?sslmode=disable"
pnpm migrate:up`}</code>
              </pre>
            </>
          )}
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
              className="lr-card lr-card-strong overflow-hidden transition hover:-translate-y-0.5 hover:shadow-[0_22px_60px_rgba(38,28,10,0.14)]"
            >
              <Link href={`/stores/${s.id}`} className="block cursor-pointer">
                {s.image_url ? (
                  <div className="relative aspect-[16/9] w-full">
                    <Image
                      src={s.image_url}
                      alt={s.name}
                      fill
                      className="object-cover"
                      sizes="(max-width: 768px) 100vw, 700px"
                    />
                  </div>
                ) : null}
                <div className="flex items-start justify-between gap-6 p-6">
                  <div>
                    <h2 className="text-lg font-semibold text-[color:var(--lr-ink)]">
                      {s.name}
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
                    {Date.now() - new Date(s.created_at).getTime() < 30 * 24 * 60 * 60 * 1000 ? (
                      <span className="rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-semibold text-green-800">
                        New
                      </span>
                    ) : null}
                  </div>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
