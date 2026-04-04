"use client";

import { useEffect, useState } from "react";
import {
  sellerApi,
  type PlacesAutocompletePrediction,
} from "@/lib/seller-api";

export type AddressSelection = {
  address1: string;
  city: string;
  region: string;
  postal_code: string;
  country: string;
  lat: number | null;
  lng: number | null;
  timezone: string | null;
  formattedAddress: string;
};

export type AddressAutocompleteProps = {
  token: string;
  initialQuery?: string;
  onSelect: (details: AddressSelection) => void;
  onError?: (message: string) => void;
};

function newPlacesSessionToken(): string {
  try {
    return typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : String(Date.now()) + "-" + Math.random().toString(16).slice(2);
  } catch {
    return String(Date.now()) + "-" + Math.random().toString(16).slice(2);
  }
}

export function AddressAutocomplete({
  token,
  initialQuery,
  onSelect,
  onError,
}: AddressAutocompleteProps) {
  const [query, setQuery] = useState(initialQuery ?? "");
  const [sessionToken, setSessionToken] = useState("");
  const [predictions, setPredictions] = useState<PlacesAutocompletePrediction[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);

  // Sync initialQuery changes from parent.
  useEffect(() => {
    if (initialQuery !== undefined) setQuery(initialQuery);
  }, [initialQuery]);

  // Debounced autocomplete search.
  useEffect(() => {
    if (!open) return;
    const q = query.trim();
    if (q.length < 3) {
      setPredictions([]);
      setLoading(false);
      return;
    }
    if (!sessionToken) {
      setSessionToken(newPlacesSessionToken());
      return;
    }

    setLoading(true);
    const handle = window.setTimeout(() => {
      sellerApi
        .placesAutocomplete(token, q, sessionToken)
        .then((res) => {
          setPredictions(res.predictions ?? []);
          setActiveIndex(0);
        })
        .catch((e: unknown) => {
          const msg =
            e instanceof Error ? e.message : "Address search failed";
          onError?.(msg);
        })
        .finally(() => setLoading(false));
    }, 300);

    return () => window.clearTimeout(handle);
  }, [token, open, query, sessionToken, onError]);

  async function selectPrediction(p: PlacesAutocompletePrediction) {
    const st = sessionToken || newPlacesSessionToken();
    setLoading(true);
    try {
      const d = await sellerApi.placesDetails(token, p.place_id, st);

      let timezone: string | null = null;
      if (typeof d.lat === "number" && typeof d.lng === "number") {
        try {
          const tz = await sellerApi.timezoneForLatLng(token, d.lat, d.lng);
          if (tz?.time_zone_id) timezone = tz.time_zone_id;
        } catch {
          // Timezone derivation failed; caller handles via onSelect.timezone === null.
        }
      }

      const formattedAddress = p.full_text || d.formatted_address || "";
      setQuery(formattedAddress);
      setPredictions([]);
      setOpen(false);
      setSessionToken("");

      onSelect({
        address1: d.address1 ?? "",
        city: d.city ?? "",
        region: d.region ?? "",
        postal_code: d.postal_code ?? "",
        country: d.country ?? "US",
        lat: d.lat ?? null,
        lng: d.lng ?? null,
        timezone,
        formattedAddress,
      });
    } catch (e: unknown) {
      const msg =
        e instanceof Error ? e.message : "Failed to get address details";
      onError?.(msg);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="relative">
      <input
        className="lr-field w-full px-3 py-2 text-sm"
        value={query}
        onChange={(e) => {
          setQuery(e.target.value);
          setOpen(true);
          if (!sessionToken) setSessionToken(newPlacesSessionToken());
        }}
        onFocus={() => {
          setOpen(true);
          if (!sessionToken) setSessionToken(newPlacesSessionToken());
        }}
        onBlur={() => {
          window.setTimeout(() => setOpen(false), 120);
        }}
        onKeyDown={(e) => {
          if (!open || !predictions.length) return;
          if (e.key === "ArrowDown") {
            e.preventDefault();
            setActiveIndex((i) => Math.min(i + 1, predictions.length - 1));
          } else if (e.key === "ArrowUp") {
            e.preventDefault();
            setActiveIndex((i) => Math.max(i - 1, 0));
          } else if (e.key === "Enter") {
            e.preventDefault();
            const p = predictions[activeIndex];
            if (p) void selectPrediction(p);
          } else if (e.key === "Escape") {
            e.preventDefault();
            setOpen(false);
          }
        }}
        placeholder="Search address (autocomplete)"
        aria-label="Search address"
        autoComplete="off"
      />
      {open && (loading || predictions.length) ? (
        <div className="absolute z-20 mt-2 w-full overflow-hidden rounded-2xl border border-[color:var(--lr-border)] bg-white/95 shadow-[0_18px_50px_rgba(38,28,10,0.16)] backdrop-blur">
          {loading ? (
            <div className="px-3 py-2 text-sm text-[color:var(--lr-muted)]">
              Searching…
            </div>
          ) : null}
          {!loading ? (
            <ul className="max-h-64 overflow-auto py-1">
              {predictions.map((p, idx) => {
                const active = idx === activeIndex;
                return (
                  <li key={p.place_id}>
                    <button
                      type="button"
                      className="w-full px-3 py-2 text-left text-sm"
                      style={{
                        background: active
                          ? "rgba(47, 107, 79, 0.10)"
                          : "transparent",
                      }}
                      onMouseDown={(ev) => {
                        ev.preventDefault();
                        void selectPrediction(p);
                      }}
                    >
                      <div className="font-medium text-[color:var(--lr-ink)]">
                        {p.main_text || p.full_text}
                      </div>
                      {p.secondary_text ? (
                        <div className="text-xs text-[color:var(--lr-muted)]">
                          {p.secondary_text}
                        </div>
                      ) : null}
                    </button>
                  </li>
                );
              })}
            </ul>
          ) : null}
          <div className="border-t border-[color:var(--lr-border)] px-3 py-2 text-[11px] text-[color:var(--lr-muted)]">
            Powered by Google
          </div>
        </div>
      ) : null}
    </div>
  );
}
