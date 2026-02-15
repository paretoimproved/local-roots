"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import {
  sellerApi,
  type PlacesAutocompletePrediction,
  type SellerOrder,
  type SellerOffering,
  type SellerPayoutSummary,
  type SellerPickupLocation,
  type SellerPickupWindow,
  type SellerProduct,
  type SellerSubscriptionPlan,
} from "@/lib/seller-api";
import { session } from "@/lib/session";
import { QrScannerModal } from "@/components/qr-scanner-modal";
import { QrCode } from "@/components/qr-code";
import { useToast } from "@/components/toast";
import { fieldClass, formatMoney, friendlyErrorMessage } from "@/lib/ui";

function toIso(dtLocal: string): string {
  // dtLocal is like "2026-02-14T10:30" in local time.
  const d = new Date(dtLocal);
  return d.toISOString();
}

type OrderFilter =
  | "all"
  | "placed"
  | "ready"
  | "picked_up"
  | "no_show"
  | "canceled";

type WizardStep = 1 | 2 | 3;

function formatWindowLabel(w: SellerPickupWindow): string {
  const start = new Date(w.start_at);
  const end = new Date(w.end_at);
  return `${start.toLocaleString()}–${end.toLocaleTimeString()} (${w.status})`;
}

function toUSDInput(cents: number): string {
  return (cents / 100).toFixed(2);
}

function parseUSDToCents(raw: string): number | null {
  const v = raw.trim();
  if (!v) return 0;
  const n = Number.parseFloat(v);
  if (!Number.isFinite(n)) return null;
  const cents = Math.round(n * 100);
  if (cents < 0) return null;
  return cents;
}

function StatusPill({
  status,
}: {
  status: "placed" | "ready" | "picked_up" | "no_show" | "canceled" | string;
}) {
  const style =
    status === "picked_up"
      ? {
          border: "rgba(47, 107, 79, 0.28)",
          bg: "rgba(47, 107, 79, 0.10)",
          fg: "var(--lr-leaf)",
        }
      : status === "ready"
        ? {
            border: "rgba(31, 108, 120, 0.28)",
            bg: "rgba(31, 108, 120, 0.10)",
            fg: "var(--lr-water)",
          }
        : status === "no_show" || status === "canceled"
          ? {
              border: "rgba(179, 93, 46, 0.30)",
              bg: "rgba(179, 93, 46, 0.10)",
              fg: "var(--lr-clay)",
            }
          : {
              border: "var(--lr-border)",
              bg: "rgba(255, 255, 255, 0.65)",
              fg: "var(--lr-ink)",
            };

  return (
    <span
      className="inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-semibold"
      style={{
        borderColor: style.border,
        background: style.bg,
        color: style.fg,
      }}
    >
      {status.replaceAll("_", " ")}
    </span>
  );
}

function PaymentPill({
  status,
}: {
  status:
    | "unpaid"
    | "pending"
    | "authorized"
    | "paid"
    | "voided"
    | "failed"
    | "refunded"
    | "requires_action"
    | string;
}) {
  const style =
    status === "paid"
      ? {
          border: "rgba(47, 107, 79, 0.28)",
          bg: "rgba(47, 107, 79, 0.10)",
          fg: "var(--lr-leaf)",
        }
      : status === "authorized"
        ? {
            border: "rgba(31, 108, 120, 0.28)",
            bg: "rgba(31, 108, 120, 0.10)",
            fg: "var(--lr-water)",
          }
        : status === "pending" || status === "requires_action"
          ? {
              border: "rgba(90, 85, 73, 0.28)",
              bg: "rgba(90, 85, 73, 0.08)",
              fg: "var(--lr-muted)",
            }
          : status === "failed"
            ? {
                border: "rgba(179, 93, 46, 0.30)",
                bg: "rgba(179, 93, 46, 0.10)",
                fg: "var(--lr-clay)",
              }
            : status === "voided" || status === "refunded"
              ? {
                  border: "rgba(179, 93, 46, 0.22)",
                  bg: "rgba(179, 93, 46, 0.06)",
                  fg: "var(--lr-clay)",
                }
              : {
                  border: "var(--lr-border)",
                  bg: "rgba(255, 255, 255, 0.65)",
                  fg: "var(--lr-ink)",
                };

  return (
    <span
      className="inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-semibold"
      style={{
        borderColor: style.border,
        background: style.bg,
        color: style.fg,
      }}
      title="Payment status"
    >
      {status.replaceAll("_", " ")}
    </span>
  );
}

function TimezoneCombobox({
  value,
  onChange,
  placeholder,
  invalid,
  onTouched,
}: {
  value: string;
  onChange: (next: string) => void;
  placeholder?: string;
  invalid?: boolean;
  onTouched?: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState(value);
  const [active, setActive] = useState(0);

  const zones = useMemo(() => {
    const usCommon = [
      "America/Los_Angeles",
      "America/Denver",
      "America/Chicago",
      "America/New_York",
      "America/Phoenix",
      "America/Anchorage",
      "Pacific/Honolulu",
    ];
    const supported =
      typeof Intl !== "undefined" &&
      "supportedValuesOf" in Intl &&
      typeof (Intl as unknown as { supportedValuesOf?: (k: string) => string[] })
        .supportedValuesOf === "function"
        ? (Intl as unknown as { supportedValuesOf: (k: string) => string[] }).supportedValuesOf(
            "timeZone",
          )
        : [];
    const merged = Array.from(new Set([...usCommon, ...supported]));
    return merged;
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return zones.slice(0, 12);
    return zones
      .filter((z) => z.toLowerCase().includes(q))
      .slice(0, 12);
  }, [zones, query]);

  useEffect(() => {
    setQuery(value);
  }, [value]);

  return (
    <div className="relative">
      <input
        className={fieldClass("lr-field w-full px-3 py-2 text-sm", !!invalid)}
        value={query}
        placeholder={placeholder ?? "Timezone"}
        onChange={(e) => {
          setQuery(e.target.value);
          setOpen(true);
          setActive(0);
        }}
        onFocus={() => {
          setOpen(true);
          setActive(0);
        }}
        onBlur={() => {
          onTouched?.();
          window.setTimeout(() => setOpen(false), 120);
        }}
        onKeyDown={(e) => {
          if (!open) return;
          if (e.key === "ArrowDown") {
            e.preventDefault();
            setActive((i) => Math.min(i + 1, Math.max(filtered.length - 1, 0)));
          } else if (e.key === "ArrowUp") {
            e.preventDefault();
            setActive((i) => Math.max(i - 1, 0));
          } else if (e.key === "Enter") {
            e.preventDefault();
            const z = filtered[active];
            if (z) {
              onChange(z);
              setOpen(false);
            }
          } else if (e.key === "Escape") {
            e.preventDefault();
            setOpen(false);
          }
        }}
        autoComplete="off"
        aria-label="Timezone"
        aria-invalid={!!invalid}
      />

      {open ? (
        <div className="absolute z-20 mt-2 w-full overflow-hidden rounded-2xl border border-[color:var(--lr-border)] bg-white/95 shadow-[0_18px_50px_rgba(38,28,10,0.16)] backdrop-blur">
          <ul className="max-h-64 overflow-auto py-1">
            {filtered.length ? (
              filtered.map((z, idx) => {
                const isActive = idx === active;
                return (
                  <li key={z}>
                    <button
                      type="button"
                      className="w-full px-3 py-2 text-left text-sm"
                      style={{
                        background: isActive
                          ? "rgba(47, 107, 79, 0.10)"
                          : "transparent",
                      }}
                      onMouseDown={(ev) => {
                        ev.preventDefault();
                        onChange(z);
                        setQuery(z);
                        setOpen(false);
                      }}
                    >
                      {z}
                    </button>
                  </li>
                );
              })
            ) : (
              <li className="px-3 py-2 text-sm text-[color:var(--lr-muted)]">
                No matches
              </li>
            )}
          </ul>
        </div>
      ) : null}
    </div>
  );
}

export default function SellerStorePage() {
  const params = useParams<{ storeId: string }>();
  const storeId = params.storeId;
  const router = useRouter();
  const { showToast, clearToast } = useToast();

  const [token, setToken] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [locations, setLocations] = useState<SellerPickupLocation[] | null>(
    null,
  );
  const [windows, setWindows] = useState<SellerPickupWindow[] | null>(null);
  const [products, setProducts] = useState<SellerProduct[] | null>(null);
  const [offerings, setOfferings] = useState<SellerOffering[] | null>(null);
  const [orders, setOrders] = useState<SellerOrder[] | null>(null);
  const [payoutSummary, setPayoutSummary] = useState<SellerPayoutSummary | null>(
    null,
  );
  const [plans, setPlans] = useState<SellerSubscriptionPlan[] | null>(null);

  const [selectedWindowId, setSelectedWindowId] = useState<string>("");
  const [orderFilter, setOrderFilter] = useState<OrderFilter>("all");
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [showLocationSetup, setShowLocationSetup] = useState(false);
  const [showBoxSetup, setShowBoxSetup] = useState(false);
  const [supportOpen, setSupportOpen] = useState(false);
  const supportBtnRef = useRef<HTMLButtonElement | null>(null);
  const supportPanelRef = useRef<HTMLDivElement | null>(null);
  const [supportPos, setSupportPos] = useState<{ top: number; left: number } | null>(null);
  const [pickupCodeByOrderId, setPickupCodeByOrderId] = useState<
    Record<string, string>
  >({});
  const [scanOrderId, setScanOrderId] = useState<string | null>(null);

  // Create pickup location
  const [locLabel, setLocLabel] = useState("Main pickup");
  const [locAddress1, setLocAddress1] = useState("");
  const [locCity, setLocCity] = useState("");
  const [locRegion, setLocRegion] = useState("");
  const [locPostal, setLocPostal] = useState("");
  const [locCountry, setLocCountry] = useState("US");
  const [locTouched, setLocTouched] = useState<Record<string, boolean>>({});
  const [locErrors, setLocErrors] = useState<Record<string, string>>({});
  const [locTz, setLocTz] = useState(
    typeof Intl !== "undefined"
      ? Intl.DateTimeFormat().resolvedOptions().timeZone
      : "America/Los_Angeles",
  );
  const [locLat, setLocLat] = useState<number | null>(null);
  const [locLng, setLocLng] = useState<number | null>(null);
  const [derivingTimezone, setDerivingTimezone] = useState(false);

  // Google address autocomplete (server-side proxied)
  const [addrQuery, setAddrQuery] = useState("");
  const [addrSessionToken, setAddrSessionToken] = useState<string>("");
  const [addrPredictions, setAddrPredictions] = useState<
    PlacesAutocompletePrediction[]
  >([]);
  const [addrOpen, setAddrOpen] = useState(false);
  const [addrLoading, setAddrLoading] = useState(false);
  const [addrActiveIndex, setAddrActiveIndex] = useState(0);
  const [savingLocation, setSavingLocation] = useState(false);

  // Create pickup window
  const [windowLocationId, setWindowLocationId] = useState("");
  const [startAtLocal, setStartAtLocal] = useState("");
  const [endAtLocal, setEndAtLocal] = useState("");
  const [cutoffAtLocal, setCutoffAtLocal] = useState("");
  const [windowNotes, setWindowNotes] = useState("");
  const [windowStatus, setWindowStatus] = useState("draft");

  // Create product
  const [productTitle, setProductTitle] = useState("");
  const [productUnit, setProductUnit] = useState("each");
  const [productDesc, setProductDesc] = useState("");

  // Create offering
  const [offeringProductId, setOfferingProductId] = useState("");
  const [offeringPriceUsd, setOfferingPriceUsd] = useState("");
  const [offeringQty, setOfferingQty] = useState(0);

  // Create subscription plan (seasonal box)
  const [planTitle, setPlanTitle] = useState("");
  const [planDesc, setPlanDesc] = useState("");
  const [planCadence, setPlanCadence] = useState<
    "weekly" | "biweekly" | "monthly"
  >("weekly");
  const [planPriceUsd, setPlanPriceUsd] = useState("");
  const [planLimit, setPlanLimit] = useState(25);
  const [planLocationId, setPlanLocationId] = useState("");
  const [planFirstStartLocal, setPlanFirstStartLocal] = useState("");
  const [planDurationMin, setPlanDurationMin] = useState(120);
  const [planCutoffHours, setPlanCutoffHours] = useState(24);
  const [creatingPlan, setCreatingPlan] = useState(false);
  const [generatingCycle, setGeneratingCycle] = useState(false);
  const [planTouched, setPlanTouched] = useState<Record<string, boolean>>({});
  const [planErrors, setPlanErrors] = useState<Record<string, string>>({});

  const readyForOfferings = useMemo(
    () => !!selectedWindowId && !!products?.length,
    [selectedWindowId, products],
  );

  const selectedWindow = useMemo(() => {
    if (!selectedWindowId) return null;
    return (windows ?? []).find((w) => w.id === selectedWindowId) ?? null;
  }, [windows, selectedWindowId]);

  const filteredOrders = useMemo(() => {
    if (!orders) return null;
    if (orderFilter === "all") return orders;
    return orders.filter((o) => o.status === orderFilter);
  }, [orders, orderFilter]);

  const orderCounts = useMemo(() => {
    const base: Record<OrderFilter, number> = {
      all: 0,
      placed: 0,
      ready: 0,
      picked_up: 0,
      no_show: 0,
      canceled: 0,
    };
    if (!orders) return base;
    base.all = orders.length;
    for (const o of orders) {
      const k = o.status as OrderFilter;
      if (k in base) base[k] += 1;
    }
    return base;
  }, [orders]);

  const siteOrigin = useMemo(() => {
    if (typeof window === "undefined") return "";
    return window.location.origin;
  }, []);

  const primaryPlan = useMemo(() => {
    return (plans ?? []).find((p) => p.is_active) ?? null;
  }, [plans]);

  const setupProgress = useMemo(() => {
    const hasLocation = !!locations?.length;
    const hasPlan = !!primaryPlan;
    const isLive = !!primaryPlan?.is_live;
    const done = [hasLocation, hasPlan, isLive].filter(Boolean).length;
    const total = 3;
    const pct = total ? Math.round((done / total) * 100) : 0;
    return { hasLocation, hasPlan, isLive, done, total, pct };
  }, [locations, primaryPlan]);

  const isLoading = locations === null || plans === null;
  const isOnboarding = !setupProgress.isLive;
  const onboardingStep = !setupProgress.hasLocation
    ? 1
    : !setupProgress.hasPlan
      ? 2
      : 3;
  const [wizardStep, setWizardStep] = useState<WizardStep>(onboardingStep as WizardStep);
  const showFullLocation = !isOnboarding || wizardStep === 1 || showLocationSetup;
  const showFullBox = !isOnboarding || wizardStep === 2 || showBoxSetup;
  const canShowAdvanced = !isOnboarding; // keep onboarding focused

  useEffect(() => {
    // Auto-advance the wizard highlight when prerequisites are completed.
    setWizardStep((prev) =>
      (onboardingStep as WizardStep) > prev ? (onboardingStep as WizardStep) : prev,
    );
  }, [onboardingStep]);

  function goToStep(step: WizardStep, sectionId: string) {
    setWizardStep(step);
    setShowLocationSetup(step === 1);
    setShowBoxSetup(step === 2);
    // Allow React to render the target before scrolling.
    if (typeof window !== "undefined") {
      window.requestAnimationFrame(() => {
        window.requestAnimationFrame(() => scrollToSection(sectionId));
      });
    }
  }

  function scrollToSection(id: string) {
    const el =
      typeof document !== "undefined" ? document.getElementById(id) : null;
    if (!el) return;
    el.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  useEffect(() => {
    const t = session.getToken();
    if (!t) {
      router.replace("/seller/login");
      return;
    }
    setToken(t);
  }, [router]);

  useLayoutEffect(() => {
    if (!supportOpen) return;

    const update = () => {
      const btn = supportBtnRef.current;
      if (!btn) return;
      const rect = btn.getBoundingClientRect();
      const w = 288; // matches w-[18rem]
      const pad = 10;
      const left = Math.max(
        pad,
        Math.min(rect.right - w, window.innerWidth - w - pad),
      );
      const top = Math.min(rect.bottom + 10, window.innerHeight - 20);
      setSupportPos({ top, left });
    };

    update();
    window.addEventListener("resize", update);
    window.addEventListener("scroll", update, true);
    return () => {
      window.removeEventListener("resize", update);
      window.removeEventListener("scroll", update, true);
    };
  }, [supportOpen]);

  useEffect(() => {
    if (!supportOpen) return;
    const onDown = (e: MouseEvent) => {
      const t = e.target as Node | null;
      if (!t) return;
      if (supportBtnRef.current?.contains(t)) return;
      if (supportPanelRef.current?.contains(t)) return;
      setSupportOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setSupportOpen(false);
    };
    window.addEventListener("mousedown", onDown);
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("mousedown", onDown);
      window.removeEventListener("keydown", onKey);
    };
  }, [supportOpen]);

  async function refreshAll(t: string) {
    const [ls, ws, ps, sps] = await Promise.all([
      sellerApi.listPickupLocations(t, storeId),
      sellerApi.listPickupWindows(t, storeId),
      sellerApi.listProducts(t, storeId),
      sellerApi.listSubscriptionPlans(t, storeId),
    ]);
    setLocations(ls);
    setWindows(ws);
    setProducts(ps);
    setPlans(sps);
    setWindowLocationId((prev) => {
      if (prev && ls.some((l) => l.id === prev)) return prev;
      return ls[0]?.id ?? "";
    });
    setPlanLocationId((prev) => {
      if (prev && ls.some((l) => l.id === prev)) return prev;
      return ls[0]?.id ?? "";
    });
    setSelectedWindowId((prev) => {
      if (prev && ws.some((w) => w.id === prev)) return prev;
      return ws[0]?.id ?? "";
    });
  }

  useEffect(() => {
    if (!token) return;
    setError(null);
    refreshAll(token).catch((e: unknown) => setError(friendlyErrorMessage(e)));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, storeId]);

  useEffect(() => {
    // If a seller already has a location, keep the "Add a location" form feeling like
    // a new entry, not an edit.
    if ((locations?.length ?? 0) > 0) {
      setLocLabel("");
    }
  }, [locations?.length]);

  useEffect(() => {
    if (!token || !selectedWindowId) return;
    setError(null);
    sellerApi
      .listOfferings(token, storeId, selectedWindowId)
      .then(setOfferings)
      .catch((e: unknown) => setError(friendlyErrorMessage(e)));
  }, [token, storeId, selectedWindowId]);

  useEffect(() => {
    if (!token || !selectedWindowId) return;
    setError(null);
    sellerApi
      .listOrders(token, storeId, selectedWindowId)
      .then(setOrders)
      .catch((e: unknown) => setError(friendlyErrorMessage(e)));
  }, [token, storeId, selectedWindowId]);

  useEffect(() => {
    if (!token || !selectedWindowId) return;
    sellerApi
      .getPayoutSummary(token, storeId, selectedWindowId)
      .then(setPayoutSummary)
      .catch(() => setPayoutSummary(null));
  }, [token, storeId, selectedWindowId]);

  async function createLocation() {
    if (!token) return;
    setError(null);
    clearToast();
    const hadLocation = (locations?.length ?? 0) > 0;

    const nextErrors: Record<string, string> = {};
    if (!locAddress1.trim()) nextErrors.address1 = "Address is required.";
    if (!locCity.trim()) nextErrors.city = "City is required.";
    if (!locRegion.trim()) nextErrors.region = "State/region is required.";
    if (!locPostal.trim()) nextErrors.postal = "Postal code is required.";
    if (!locTz.trim()) nextErrors.timezone = "Timezone is required.";
    if (locTz.trim()) {
      const tz = locTz.trim();
      const ok = (() => {
        try {
          // This matches what the backend expects (IANA tz database IDs).
          Intl.DateTimeFormat("en-US", { timeZone: tz }).format(new Date());
          return true;
        } catch {
          return false;
        }
      })();
      if (!ok) nextErrors.timezone = "Select a valid timezone from the list.";
    }
    setLocErrors(nextErrors);
    setLocTouched({
      address1: true,
      city: true,
      region: true,
      postal: true,
      timezone: true,
      label: true,
    });
    if (Object.keys(nextErrors).length) {
      showToast({ kind: "error", message: "Check the highlighted fields." });
      return;
    }

    setSavingLocation(true);
    try {
      await sellerApi.createPickupLocation(token, storeId, {
        label: locLabel || null,
        address1: locAddress1,
        address2: null,
        city: locCity,
        region: locRegion,
        postal_code: locPostal,
        country: locCountry,
        timezone: locTz,
        lat: locLat,
        lng: locLng,
      });
      setLocErrors({});
      setLocTouched({});
      setLocAddress1("");
      setLocCity("");
      setLocRegion("");
      setLocPostal("");
      setLocCountry("US");
      setLocLat(null);
      setLocLng(null);
      setDerivingTimezone(false);
      setAddrQuery("");
      setAddrPredictions([]);
      setAddrOpen(false);
      // When a location already exists, keep the "add" form feeling like a new entry.
      if ((locations?.length ?? 0) > 0) setLocLabel("");
      showToast({ kind: "success", message: "Pickup location saved." });
      await refreshAll(token);
      // If this is their first location during onboarding, advance to step 2 automatically.
      if (!hadLocation && isOnboarding) {
        goToStep(2, "setup-box");
      }
    } catch (e: unknown) {
      setError(friendlyErrorMessage(e));
      showToast({ kind: "error", message: "Could not save pickup location." });
    } finally {
      setSavingLocation(false);
    }
  }

  const [deletingLocationId, setDeletingLocationId] = useState<string>("");
  async function deleteLocation(id: string) {
    if (!token) return;
    clearToast();
    const loc = (locations ?? []).find((l) => l.id === id);
    const label = loc?.label ?? "Pickup";
    const ok = window.confirm(`Remove "${label}" pickup location? This cannot be undone.`);
    if (!ok) return;

    setDeletingLocationId(id);
    try {
      await sellerApi.deletePickupLocation(token, storeId, id);
      showToast({ kind: "success", message: "Pickup location removed." });
      await refreshAll(token);
    } catch (e: unknown) {
      setError(friendlyErrorMessage(e));
      showToast({ kind: "error", message: "Could not remove pickup location." });
    } finally {
      setDeletingLocationId("");
    }
  }

  function newPlacesSessionToken(): string {
    // Google recommends session tokens to group billing for autocomplete + details.
    // Browser crypto may be unavailable in some old environments; fallback is fine.
    try {
      return typeof crypto !== "undefined" && "randomUUID" in crypto
        ? crypto.randomUUID()
        : String(Date.now()) + "-" + Math.random().toString(16).slice(2);
    } catch {
      return String(Date.now()) + "-" + Math.random().toString(16).slice(2);
    }
  }

  useEffect(() => {
    if (!token) return;
    if (!addrOpen) return;
    const q = addrQuery.trim();
    if (q.length < 3) {
      setAddrPredictions([]);
      setAddrLoading(false);
      return;
    }
    if (!addrSessionToken) {
      setAddrSessionToken(newPlacesSessionToken());
      return;
    }

    setAddrLoading(true);
    const handle = window.setTimeout(() => {
      sellerApi
        .placesAutocomplete(token, q, addrSessionToken)
        .then((res) => {
          setAddrPredictions(res.predictions ?? []);
          setAddrActiveIndex(0);
        })
        .catch((e: unknown) => setError(friendlyErrorMessage(e)))
        .finally(() => setAddrLoading(false));
    }, 300);

    return () => window.clearTimeout(handle);
  }, [token, addrOpen, addrQuery, addrSessionToken]);

  async function selectPrediction(p: PlacesAutocompletePrediction) {
    if (!token) return;
    const st = addrSessionToken || newPlacesSessionToken();
    setAddrLoading(true);
    setError(null);
    try {
      const userSetTimezone = !!locTouched.timezone;
      const d = await sellerApi.placesDetails(token, p.place_id, st);
      setLocAddress1(d.address1 ?? "");
      setLocCity(d.city ?? "");
      setLocRegion(d.region ?? "");
      setLocPostal(d.postal_code ?? "");
      setLocCountry(d.country ?? "US");
      setLocLat(d.lat ?? null);
      setLocLng(d.lng ?? null);
      if (
        !userSetTimezone &&
        typeof d.lat === "number" &&
        typeof d.lng === "number"
      ) {
        // Derive an IANA timezone from the selected address. We gate saving on this
        // so we don't accidentally save the seller's browser timezone.
        setDerivingTimezone(true);
        setLocTz("");
        try {
          const tz = await sellerApi.timezoneForLatLng(token, d.lat, d.lng);
          if (tz?.time_zone_id) {
            setLocTz(tz.time_zone_id);
          } else {
            showToast({
              kind: "error",
              message:
                "Could not detect timezone from address. Please pick one.",
            });
          }
        } catch (e: unknown) {
          setError(friendlyErrorMessage(e));
          showToast({
            kind: "error",
            message:
              "Could not detect timezone from address. Please pick one.",
          });
        } finally {
          setDerivingTimezone(false);
        }
      }
      setAddrQuery(p.full_text || d.formatted_address || "");
      setAddrPredictions([]);
      setAddrOpen(false);
      // New token for the next search session.
      setAddrSessionToken("");
    } catch (e: unknown) {
      setError(friendlyErrorMessage(e));
    } finally {
      setAddrLoading(false);
    }
  }

  async function createWindow() {
    if (!token) return;
    setError(null);
    try {
      await sellerApi.createPickupWindow(token, storeId, {
        pickup_location_id: windowLocationId,
        start_at: toIso(startAtLocal),
        end_at: toIso(endAtLocal),
        cutoff_at: toIso(cutoffAtLocal),
        status: windowStatus,
        notes: windowNotes || null,
      });
      setStartAtLocal("");
      setEndAtLocal("");
      setCutoffAtLocal("");
      setWindowNotes("");
      await refreshAll(token);
    } catch (e: unknown) {
      setError(friendlyErrorMessage(e));
    }
  }

  async function createProduct() {
    if (!token) return;
    setError(null);
    try {
      await sellerApi.createProduct(token, storeId, {
        title: productTitle,
        unit: productUnit,
        description: productDesc || null,
        is_active: true,
        is_perishable: true,
      });
      setProductTitle("");
      setProductDesc("");
      await refreshAll(token);
    } catch (e: unknown) {
      setError(friendlyErrorMessage(e));
    }
  }

  async function createOffering() {
    if (!token || !selectedWindowId) return;
    setError(null);
    try {
      const cents = parseUSDToCents(offeringPriceUsd);
      if (cents === null) {
        setError("Offering price must be a valid USD amount (e.g. 5.00).");
        return;
      }
      await sellerApi.createOffering(token, storeId, selectedWindowId, {
        product_id: offeringProductId,
        price_cents: cents,
        quantity_available: offeringQty,
        status: "active",
      });
      setOfferingQty(0);
      setOfferingPriceUsd("");
      setOfferings(
        await sellerApi.listOfferings(token, storeId, selectedWindowId),
      );
    } catch (e: unknown) {
      setError(friendlyErrorMessage(e));
    }
  }

  useEffect(() => {
    if (!planLocationId && locations?.length) setPlanLocationId(locations[0].id);
  }, [locations, planLocationId]);

  useEffect(() => {
    if (!isOnboarding) return;
    if (wizardStep !== 2) return;
    if (planFirstStartLocal) return;
    // Smart default: next Saturday morning at 10:00 local time.
    const now = new Date();
    const d = new Date(now);
    const targetDow = 6; // Saturday
    const daysAhead = (targetDow - d.getDay() + 7) % 7;
    d.setDate(d.getDate() + daysAhead);
    d.setHours(10, 0, 0, 0);
    // If it's already Saturday after 10:00, push to next week.
    if (daysAhead === 0 && now.getTime() >= d.getTime()) {
      d.setDate(d.getDate() + 7);
    }
    const pad2 = (n: number) => String(n).padStart(2, "0");
    const local =
      `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}` +
      `T${pad2(d.getHours())}:${pad2(d.getMinutes())}`;
    setPlanFirstStartLocal(local);
  }, [isOnboarding, wizardStep, planFirstStartLocal]);

  async function createPlan() {
    if (!token) return;
    setError(null);
    clearToast();
    setCreatingPlan(true);
    try {
      const nextErrors: Record<string, string> = {};
      if (!planTitle.trim()) nextErrors.title = "Title is required.";
      if (!planLocationId) nextErrors.pickup_location_id = "Pickup location is required.";
      if (!planFirstStartLocal) nextErrors.first_start_at_local = "Start time is required.";

      const cents = parseUSDToCents(planPriceUsd);
      if (cents === null) {
        nextErrors.price = "Price must be a valid USD amount (e.g. 25.00).";
      } else if (cents <= 0) {
        nextErrors.price = "Price must be greater than $0.00.";
      }

      setPlanErrors(nextErrors);
      setPlanTouched({
        title: true,
        price: true,
        pickup_location_id: true,
        first_start_at_local: true,
      });
      if (Object.keys(nextErrors).length) {
        showToast({ kind: "error", message: "Check the highlighted fields." });
        return;
      }

      await sellerApi.createSubscriptionPlan(token, storeId, {
        pickup_location_id: planLocationId,
        title: planTitle,
        description: planDesc || null,
        cadence: planCadence,
        price_cents: cents ?? 0,
        subscriber_limit: planLimit,
        first_start_at_local: planFirstStartLocal,
        duration_minutes: planDurationMin,
        cutoff_hours: planCutoffHours,
      });
      setPlanTitle("");
      setPlanDesc("");
      setPlanPriceUsd("");
      setPlanFirstStartLocal("");
      setPlanErrors({});
      setPlanTouched({});
      showToast({ kind: "success", message: "Box created." });
      await refreshAll(token);
    } catch (e: unknown) {
      setError(friendlyErrorMessage(e));
      showToast({ kind: "error", message: "Could not create box." });
    } finally {
      setCreatingPlan(false);
    }
  }

  async function generateNextCycle(planId: string) {
    if (!token) return;
    setError(null);
    clearToast();
    setGeneratingCycle(true);
    try {
      const res = await sellerApi.generateNextCycle(token, storeId, planId);
      await refreshAll(token);
      setSelectedWindowId(res.pickup_window_id);
      showToast({
        kind: "success",
        message: "Pickup cycle generated. You are now live.",
      });
    } catch (e: unknown) {
      setError(friendlyErrorMessage(e));
      showToast({ kind: "error", message: "Could not generate pickup cycle." });
    } finally {
      setGeneratingCycle(false);
    }
  }

  async function setOrderStatus(
    orderId: string,
    status: "ready" | "canceled" | "no_show",
    opts?: { waive_fee?: boolean },
  ) {
    if (!token || !selectedWindowId) return;
    setError(null);
    try {
      if (status === "canceled") {
        const ok = window.confirm(
          "Cancel this order? This will release reserved inventory.",
        );
        if (!ok) return;
      }
      if (status === "no_show") {
        const ok = window.confirm(
          "Mark as no-show? This will release reserved inventory.",
        );
        if (!ok) return;
      }
      await sellerApi.updateOrderStatus(token, storeId, orderId, status, opts);
      // Refresh both orders and offerings since inventory may have changed.
      const [os, ofs] = await Promise.all([
        sellerApi.listOrders(token, storeId, selectedWindowId),
        sellerApi.listOfferings(token, storeId, selectedWindowId),
      ]);
      setOrders(os);
      setOfferings(ofs);
    } catch (e: unknown) {
      setError(friendlyErrorMessage(e));
    }
  }

  async function confirmPickup(orderId: string) {
    if (!token || !selectedWindowId) return;
    const code = (pickupCodeByOrderId[orderId] ?? "").trim();
    if (!/^[0-9]{6}$/.test(code)) {
      setError("Pickup code must be 6 digits.");
      return;
    }
    setError(null);
    try {
      await sellerApi.confirmPickup(token, storeId, orderId, code);
      // Refresh both orders and offerings since inventory may have changed.
      const [os, ofs] = await Promise.all([
        sellerApi.listOrders(token, storeId, selectedWindowId),
        sellerApi.listOfferings(token, storeId, selectedWindowId),
      ]);
      setOrders(os);
      setOfferings(ofs);
      setPickupCodeByOrderId((prev) => {
        const next = { ...prev };
        delete next[orderId];
        return next;
      });
    } catch (e: unknown) {
      setError(friendlyErrorMessage(e));
    }
  }

  return (
    <div className="grid gap-8">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div className="grid gap-2">
          <Link
            className="lr-btn lr-chip inline-flex w-fit items-center gap-2 px-4 py-2 text-sm font-medium text-[color:var(--lr-ink)]"
            href="/seller"
          >
            <span aria-hidden="true">←</span>
            Seller home
          </Link>
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">Store</h1>
            <div className="mt-1 text-sm text-[color:var(--lr-muted)]">
              Set up your pickup location, launch your seasonal box, then start
              fulfilling pickups.
            </div>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            ref={supportBtnRef}
            type="button"
            className="lr-btn lr-chip px-4 py-2 text-sm font-medium text-[color:var(--lr-ink)]"
            aria-haspopup="dialog"
            aria-expanded={supportOpen}
            onClick={() => setSupportOpen((v) => !v)}
          >
            Support
          </button>
          {!isOnboarding ? (
            <button
              type="button"
              className={`lr-btn px-4 py-2 text-sm font-medium ${
                showAdvanced
                  ? "lr-btn-primary"
                  : "lr-chip text-[color:var(--lr-ink)]"
              }`}
              onClick={() => setShowAdvanced((v) => !v)}
              aria-pressed={showAdvanced}
            >
              {showAdvanced ? "Hide advanced" : "Show advanced"}
            </button>
          ) : null}
          <button
            type="button"
            className="lr-btn lr-chip px-4 py-2 text-sm font-medium text-[color:var(--lr-ink)]"
            onClick={() => {
              session.clearToken();
              router.replace("/seller/login");
            }}
          >
            Sign out
          </button>
        </div>
      </header>

      {supportOpen && supportPos ? (
        <div
          ref={supportPanelRef}
          role="dialog"
          aria-label="Support"
          className="fixed z-50 w-[18rem] rounded-2xl border border-[color:var(--lr-border)] bg-white/92 p-3 text-sm shadow-[0_22px_60px_rgba(38,28,10,0.16)] backdrop-blur"
          style={{ top: supportPos.top, left: supportPos.left }}
        >
          <div className="text-xs font-semibold uppercase tracking-wide text-[color:var(--lr-muted)]">
            Store ID
          </div>
          <div className="mt-2 flex items-center gap-2">
            <span className="lr-chip grow rounded-xl px-3 py-2 font-mono text-xs text-[color:var(--lr-ink)]">
              {storeId}
            </span>
            <button
              type="button"
              className="lr-btn lr-btn-primary px-3 py-2 text-xs font-semibold"
              onClick={() => {
                navigator.clipboard
                  .writeText(storeId)
                  .then(() => showToast({ kind: "success", message: "Store ID copied." }))
                  .catch(() =>
                    showToast({
                      kind: "error",
                      message: "Could not copy. Your browser may block clipboard access.",
                    }),
                  );
              }}
            >
              Copy
            </button>
          </div>
          <div className="mt-2 text-xs text-[color:var(--lr-muted)]">
            Only needed if you contact support.
          </div>
        </div>
      ) : null}

      {error ? (
        <div className="lr-card border-rose-200 bg-rose-50/60 p-4 text-sm text-rose-900">
          {error}
        </div>
      ) : null}

      {isOnboarding ? (
        <section className="lr-card lr-card-strong lr-animate grid gap-4 p-4 md:p-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <div className="text-xs font-semibold uppercase tracking-wide text-[color:var(--lr-muted)]">
                Seller setup
              </div>
              <div className="mt-1 text-sm text-[color:var(--lr-muted)]">
                Step {wizardStep} of 3
                {isLoading ? " (loading…)" : ""}: pickup location → box → go
                live.
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              {/** Disable future steps until prerequisites are met. */}
              {/** Step 1 is always available. */}
              {/** Note: we keep locked steps clickable so we can explain what to do next. */}
              <button
                type="button"
                className={`lr-btn px-3 py-1.5 text-sm font-semibold ${
                  wizardStep === 1
                    ? "lr-btn-primary"
                    : "lr-chip text-[color:var(--lr-ink)]"
                }`}
                onClick={() => goToStep(1, "setup-location")}
              >
                1. Location
              </button>
              {(() => {
                const locked = !setupProgress.hasLocation;
                return (
                  <button
                    type="button"
                    aria-disabled={locked}
                    className={`lr-btn px-3 py-1.5 text-sm font-semibold ${
                      wizardStep === 2
                        ? "lr-btn-primary"
                        : "lr-chip text-[color:var(--lr-ink)]"
                    } ${locked ? "opacity-50 cursor-not-allowed" : ""}`}
                    onClick={() => {
                      goToStep(2, "setup-box");
                      if (locked) {
                        showToast({
                          kind: "error",
                          message: "Add a pickup location to unlock box setup.",
                        });
                      }
                    }}
                  >
                    2. Box
                  </button>
                );
              })()}
              {(() => {
                const locked =
                  !setupProgress.hasLocation || !setupProgress.hasPlan;
                return (
                  <button
                    type="button"
                    className={`lr-btn px-3 py-1.5 text-sm font-semibold ${
                      wizardStep === 3
                        ? "lr-btn-primary"
                        : "lr-chip text-[color:var(--lr-ink)]"
                    } ${locked ? "opacity-50 cursor-not-allowed" : ""}`}
                    onClick={() => {
                      goToStep(3, "setup-go-live");
                      if (locked) {
                        showToast({
                          kind: "error",
                          message: !setupProgress.hasLocation
                            ? "Add a pickup location first."
                            : "Create a box to unlock go-live.",
                        });
                      }
                    }}
                  >
                    3. Go live
                  </button>
                );
              })()}
            </div>
          </div>

          <div className="rounded-2xl bg-white/60 p-4 text-sm text-[color:var(--lr-muted)] ring-1 ring-[color:var(--lr-border)]">
            Focus: get one box live and start fulfilling. Advanced pickup windows
            and catalog offerings are optional.
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 text-sm">
            <div className="text-[color:var(--lr-muted)]">
              Need more control?
            </div>
            <button
              type="button"
              className="lr-btn lr-chip px-3 py-1.5 text-sm font-semibold text-[color:var(--lr-ink)]"
              onClick={() =>
                showToast({
                  kind: "info",
                  message: "Advanced tools unlock after you go live.",
                })
              }
              aria-disabled="true"
            >
              Advanced tools (after go live)
            </button>
          </div>
        </section>
      ) : (
        <section className="lr-card lr-card-strong lr-animate sticky top-3 z-10 grid gap-3 p-4 md:p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2">
              <span className="lr-chip rounded-full px-3 py-1 text-xs font-semibold text-[color:var(--lr-leaf)]">
                live
              </span>
              <div className="text-sm text-[color:var(--lr-muted)]">
                Manage one pickup window at a time.
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <select
                className="lr-field px-3 py-2 text-sm"
                value={selectedWindowId}
                onChange={(e) => setSelectedWindowId(e.target.value)}
              >
                <option value="">Select a window…</option>
                {(windows ?? []).map((w) => (
                  <option key={w.id} value={w.id}>
                    {formatWindowLabel(w)}
                  </option>
                ))}
              </select>

              {selectedWindowId ? (
                <Link
                  className="lr-btn lr-chip px-4 py-2 text-sm font-medium text-[color:var(--lr-ink)]"
                  href={`/pickup-windows/${selectedWindowId}`}
                  target="_blank"
                  rel="noreferrer"
                >
                  Buyer view
                </Link>
              ) : null}
            </div>
          </div>

          {selectedWindow ? (
            <div className="flex flex-wrap items-center gap-2 text-sm">
              <span className="lr-chip rounded-full px-3 py-1 text-[color:var(--lr-muted)]">
                {selectedWindow.pickup_location.label ?? "Pickup"} ·{" "}
                {selectedWindow.pickup_location.city},{" "}
                {selectedWindow.pickup_location.region}
              </span>
              <span className="lr-chip rounded-full px-3 py-1 text-[color:var(--lr-muted)]">
                Cutoff{" "}
                <span className="font-medium text-[color:var(--lr-ink)]">
                  {new Date(selectedWindow.cutoff_at).toLocaleString()}
                </span>
              </span>
              <StatusPill status={selectedWindow.status} />
            </div>
          ) : (
            <div className="text-sm text-[color:var(--lr-muted)]">
              Generate a box cycle to create a pickup window.
            </div>
          )}
        </section>
      )}

      <div className={`grid gap-8 ${isOnboarding ? "" : "lg:grid-cols-2"}`}>
        <section id="setup-location" className="lr-card lr-animate grid gap-4 p-6">
          <div>
            <h2 className="text-base font-semibold">Pickup locations</h2>
            <p className="mt-1 text-sm text-[color:var(--lr-muted)]">
              Where buyers show up. Add at least one location before publishing
              windows.
            </p>
          </div>

          {showFullLocation ? (
            <>
              <div className="grid gap-2">
                {locations?.length ? (
                  <ul className="grid gap-2">
                    {locations.map((l) => (
                      <li key={l.id} className="lr-chip rounded-2xl px-4 py-3">
                        <div className="flex flex-wrap items-start justify-between gap-3">
                          <div>
                            <div className="font-medium text-[color:var(--lr-ink)]">
                              {l.label ?? "Pickup"}
                            </div>
                            <div className="mt-1 text-sm text-[color:var(--lr-muted)]">
                              {l.address1}, {l.city}, {l.region} {l.postal_code} ·{" "}
                              {l.timezone}
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              className="lr-btn lr-chip px-3 py-2 text-sm font-semibold text-rose-900 disabled:opacity-50"
                              disabled={!!deletingLocationId}
                              onClick={() => void deleteLocation(l.id)}
                              aria-label={`Remove ${l.label ?? "pickup location"}`}
                              title="Remove location"
                            >
                              {deletingLocationId === l.id ? "Removing…" : "Remove"}
                            </button>
                          </div>
                        </div>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <div className="text-sm text-[color:var(--lr-muted)]">
                    No pickup locations yet.
                  </div>
                )}
              </div>

              <details className="lr-chip rounded-2xl p-4" open={!locations?.length}>
                <summary className="cursor-pointer text-sm font-semibold text-[color:var(--lr-ink)]">
                  Add a location
                </summary>
                <div className="mt-2 text-sm text-[color:var(--lr-muted)]">
                  Keep it simple: label + address + timezone.
                </div>

                <div className="mt-4 grid gap-2 md:grid-cols-2">
                  <input
                    className="lr-field px-3 py-2 text-sm"
                    value={locLabel}
                    onChange={(e) => setLocLabel(e.target.value)}
                    placeholder="Label (optional)"
                  />
                  <TimezoneCombobox
                    value={locTz}
                    onChange={setLocTz}
                    placeholder="Timezone (auto-detected)"
                    invalid={!!(locTouched.timezone && locErrors.timezone)}
                    onTouched={() =>
                      setLocTouched((p) => ({ ...p, timezone: true }))
                    }
                  />
                  {locTouched.timezone && locErrors.timezone ? (
                    <span className="text-[11px] text-rose-900 md:col-span-2">
                      {locErrors.timezone}
                    </span>
                  ) : null}

                  <div className="relative md:col-span-2">
                    <input
                      className="lr-field w-full px-3 py-2 text-sm"
                      value={addrQuery}
                      onChange={(e) => {
                        setAddrQuery(e.target.value);
                        setAddrOpen(true);
                        if (!addrSessionToken) setAddrSessionToken(newPlacesSessionToken());
                      }}
                      onFocus={() => {
                        setAddrOpen(true);
                        if (!addrSessionToken) setAddrSessionToken(newPlacesSessionToken());
                      }}
                      onBlur={() => {
                        // Delay close so click selection works.
                        window.setTimeout(() => setAddrOpen(false), 120);
                      }}
                      onKeyDown={(e) => {
                        if (!addrOpen || !addrPredictions.length) return;
                        if (e.key === "ArrowDown") {
                          e.preventDefault();
                          setAddrActiveIndex((i) =>
                            Math.min(i + 1, addrPredictions.length - 1),
                          );
                        } else if (e.key === "ArrowUp") {
                          e.preventDefault();
                          setAddrActiveIndex((i) => Math.max(i - 1, 0));
                        } else if (e.key === "Enter") {
                          e.preventDefault();
                          const p = addrPredictions[addrActiveIndex];
                          if (p) void selectPrediction(p);
                        } else if (e.key === "Escape") {
                          e.preventDefault();
                          setAddrOpen(false);
                        }
                      }}
                      placeholder="Search address (autocomplete)"
                      aria-label="Search address"
                      autoComplete="off"
                    />
                    {addrOpen && (addrLoading || addrPredictions.length) ? (
                      <div className="absolute z-20 mt-2 w-full overflow-hidden rounded-2xl border border-[color:var(--lr-border)] bg-white/95 shadow-[0_18px_50px_rgba(38,28,10,0.16)] backdrop-blur">
                        {addrLoading ? (
                          <div className="px-3 py-2 text-sm text-[color:var(--lr-muted)]">
                            Searching…
                          </div>
                        ) : null}
                        {!addrLoading ? (
                          <ul className="max-h-64 overflow-auto py-1">
                            {addrPredictions.map((p, idx) => {
                              const active = idx === addrActiveIndex;
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

                  <input
                    className={fieldClass(
                      "lr-field px-3 py-2 text-sm md:col-span-2",
                      !!(locTouched.address1 && locErrors.address1),
                    )}
                    value={locAddress1}
                    onChange={(e) => setLocAddress1(e.target.value)}
                    onBlur={() =>
                      setLocTouched((p) => ({ ...p, address1: true }))
                    }
                    placeholder="Address"
                    aria-invalid={!!(locTouched.address1 && locErrors.address1)}
                  />
                  {locTouched.address1 && locErrors.address1 ? (
                    <span className="text-[11px] text-rose-900 md:col-span-2">
                      {locErrors.address1}
                    </span>
                  ) : null}
                  <input
                    className={fieldClass(
                      "lr-field px-3 py-2 text-sm",
                      !!(locTouched.city && locErrors.city),
                    )}
                    value={locCity}
                    onChange={(e) => setLocCity(e.target.value)}
                    onBlur={() => setLocTouched((p) => ({ ...p, city: true }))}
                    placeholder="City"
                    aria-invalid={!!(locTouched.city && locErrors.city)}
                  />
                  {locTouched.city && locErrors.city ? (
                    <span className="text-[11px] text-rose-900">
                      {locErrors.city}
                    </span>
                  ) : null}
                  <input
                    className={fieldClass(
                      "lr-field px-3 py-2 text-sm",
                      !!(locTouched.region && locErrors.region),
                    )}
                    value={locRegion}
                    onChange={(e) => setLocRegion(e.target.value)}
                    onBlur={() =>
                      setLocTouched((p) => ({ ...p, region: true }))
                    }
                    placeholder="State/Region"
                    aria-invalid={!!(locTouched.region && locErrors.region)}
                  />
                  {locTouched.region && locErrors.region ? (
                    <span className="text-[11px] text-rose-900">
                      {locErrors.region}
                    </span>
                  ) : null}
                  <input
                    className={fieldClass(
                      "lr-field px-3 py-2 text-sm",
                      !!(locTouched.postal && locErrors.postal),
                    )}
                    value={locPostal}
                    onChange={(e) => setLocPostal(e.target.value)}
                    onBlur={() =>
                      setLocTouched((p) => ({ ...p, postal: true }))
                    }
                    placeholder="Postal code"
                    aria-invalid={!!(locTouched.postal && locErrors.postal)}
                  />
                  {locTouched.postal && locErrors.postal ? (
                    <span className="text-[11px] text-rose-900">
                      {locErrors.postal}
                    </span>
                  ) : null}
                </div>

                {(locErrors.address1 ||
                  locErrors.city ||
                  locErrors.region ||
                  locErrors.postal ||
                  locErrors.timezone) && (
                  <div className="mt-3 text-sm text-rose-900">
                    Please fill the required fields.
                  </div>
                )}

                <button
                  className="mt-4 lr-btn lr-btn-primary inline-flex items-center justify-center px-4 py-2 text-sm font-semibold disabled:opacity-50"
                  style={{ width: isOnboarding && wizardStep === 1 ? "100%" : undefined }}
                  disabled={
                    savingLocation ||
                    derivingTimezone
                  }
                  onClick={createLocation}
                  type="button"
                >
                  {savingLocation
                    ? "Saving…"
                    : derivingTimezone
                      ? "Detecting timezone…"
                      : "Save location"}
                </button>
              </details>
            </>
          ) : (
            <div className="grid gap-3">
              {locations?.[0] ? (
                <div className="lr-chip rounded-2xl px-4 py-3">
                  <div className="text-xs font-semibold uppercase tracking-wide text-[color:var(--lr-muted)]">
                    Current location
                  </div>
                  <div className="mt-1 font-semibold text-[color:var(--lr-ink)]">
                    {locations[0].label ?? "Pickup"}
                  </div>
                  <div className="mt-1 text-sm text-[color:var(--lr-muted)]">
                    {locations[0].address1}, {locations[0].city},{" "}
                    {locations[0].region} {locations[0].postal_code}
                  </div>
                </div>
              ) : null}
              <button
                type="button"
                className="lr-btn lr-chip w-fit px-4 py-2 text-sm font-semibold text-[color:var(--lr-ink)]"
                onClick={() => {
                  setWizardStep(1);
                  setShowLocationSetup(true);
                  window.setTimeout(() => scrollToSection("setup-location"), 0);
                }}
              >
                Manage pickup locations
              </button>
            </div>
          )}
        </section>

        {canShowAdvanced && showAdvanced ? (
        <section className="lr-card lr-animate grid gap-4 p-6">
          <div>
            <h2 className="text-base font-semibold">Pickup windows</h2>
            <p className="mt-1 text-sm text-[color:var(--lr-muted)]">
              The time and place you commit to being there. Buyers pay up front
              and pick up locally.
            </p>
          </div>

          {windows?.length ? (
            <ul className="grid gap-2">
              {windows.map((w) => {
                const selected = selectedWindowId === w.id;
                return (
                  <li
                    key={w.id}
                    className="lr-chip flex flex-wrap items-center justify-between gap-3 rounded-2xl px-4 py-3"
                  >
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <div className="font-medium text-[color:var(--lr-ink)]">
                          {new Date(w.start_at).toLocaleString()} to{" "}
                          {new Date(w.end_at).toLocaleTimeString()}
                        </div>
                        <StatusPill status={w.status} />
                      </div>
                      <div className="mt-1 text-sm text-[color:var(--lr-muted)]">
                        {w.pickup_location.label ?? "Pickup"} · cutoff{" "}
                        {new Date(w.cutoff_at).toLocaleString()}
                      </div>
                    </div>

                    <button
                      type="button"
                      className={`lr-btn px-4 py-2 text-sm font-semibold ${
                        selected
                          ? "lr-btn-primary"
                          : "lr-chip text-[color:var(--lr-ink)]"
                      }`}
                      onClick={() => setSelectedWindowId(w.id)}
                    >
                      {selected ? "Active" : "Make active"}
                    </button>
                  </li>
                );
              })}
            </ul>
          ) : (
            <div className="text-sm text-[color:var(--lr-muted)]">
              No pickup windows yet.
            </div>
          )}

          <div className="lr-chip grid gap-3 rounded-2xl p-4">
            <div>
              <div className="text-sm font-semibold text-[color:var(--lr-ink)]">
                Add a pickup window
              </div>
              <div className="mt-1 text-sm text-[color:var(--lr-muted)]">
                Start and end times are in your browser&apos;s timezone.
              </div>
            </div>

            <div className="grid gap-2 md:grid-cols-2">
              <label className="grid gap-1">
                <span className="text-xs font-semibold text-[color:var(--lr-muted)]">
                  Location
                </span>
                <select
                  className="lr-field px-3 py-2 text-sm"
                  value={windowLocationId}
                  onChange={(e) => setWindowLocationId(e.target.value)}
                >
                  <option value="" disabled>
                    Select…
                  </option>
                  {(locations ?? []).map((l) => (
                    <option key={l.id} value={l.id}>
                      {l.label ?? "Pickup"} ({l.city})
                    </option>
                  ))}
                </select>
              </label>

              <label className="grid gap-1">
                <span className="text-xs font-semibold text-[color:var(--lr-muted)]">
                  Status
                </span>
                <select
                  className="lr-field px-3 py-2 text-sm"
                  value={windowStatus}
                  onChange={(e) => {
                    const next = e.target.value;
                    if (
                      next === "published" &&
                      (!startAtLocal || !endAtLocal || !cutoffAtLocal)
                    ) {
                      setError("Add start, end, and cutoff before publishing.");
                      setWindowStatus("draft");
                      return;
                    }
                    setWindowStatus(next);
                  }}
                >
                  <option value="draft">draft</option>
                  <option value="published">published</option>
                  <option value="canceled">canceled</option>
                  <option value="completed">completed</option>
                </select>
              </label>

              <label className="grid gap-1">
                <span className="text-xs font-semibold text-[color:var(--lr-muted)]">
                  Start
                </span>
                <input
                  className="lr-field px-3 py-2 text-sm"
                  type="datetime-local"
                  value={startAtLocal}
                  onChange={(e) => setStartAtLocal(e.target.value)}
                />
              </label>

              <label className="grid gap-1">
                <span className="text-xs font-semibold text-[color:var(--lr-muted)]">
                  End
                </span>
                <input
                  className="lr-field px-3 py-2 text-sm"
                  type="datetime-local"
                  value={endAtLocal}
                  onChange={(e) => setEndAtLocal(e.target.value)}
                />
              </label>

              <label className="grid gap-1 md:col-span-2">
                <span className="text-xs font-semibold text-[color:var(--lr-muted)]">
                  Cutoff
                </span>
                <input
                  className="lr-field px-3 py-2 text-sm"
                  type="datetime-local"
                  value={cutoffAtLocal}
                  onChange={(e) => setCutoffAtLocal(e.target.value)}
                />
              </label>

              <label className="grid gap-1 md:col-span-2">
                <span className="text-xs font-semibold text-[color:var(--lr-muted)]">
                  Notes
                </span>
                <input
                  className="lr-field px-3 py-2 text-sm"
                  value={windowNotes}
                  onChange={(e) => setWindowNotes(e.target.value)}
                  placeholder="Optional"
                />
              </label>
            </div>

            <button
              className="lr-btn lr-btn-primary inline-flex items-center justify-center px-4 py-2 text-sm font-semibold disabled:opacity-50"
              disabled={
                !windowLocationId ||
                !startAtLocal ||
                !endAtLocal ||
                !cutoffAtLocal
              }
              onClick={createWindow}
              type="button"
            >
              Create pickup window
            </button>
          </div>
        </section>
        ) : null}

        {canShowAdvanced && showAdvanced ? (
        <section className="lr-card lr-animate grid gap-4 p-6">
          <div>
            <h2 className="text-base font-semibold">Products</h2>
            <p className="mt-1 text-sm text-[color:var(--lr-muted)]">
              Your catalog. Products become offerings when attached to a pickup
              window.
            </p>
          </div>

          {products?.length ? (
            <ul className="grid gap-2">
              {products.map((p) => (
                <li key={p.id} className="lr-chip rounded-2xl px-4 py-3">
                  <div className="flex flex-wrap items-baseline justify-between gap-3">
                    <div className="font-medium text-[color:var(--lr-ink)]">
                      {p.title}
                    </div>
                    <div className="text-xs font-semibold text-[color:var(--lr-muted)]">
                      {p.unit}
                    </div>
                  </div>
                  {p.description ? (
                    <div className="mt-1 text-sm text-[color:var(--lr-muted)]">
                      {p.description}
                    </div>
                  ) : null}
                </li>
              ))}
            </ul>
          ) : (
            <div className="text-sm text-[color:var(--lr-muted)]">
              No products yet.
            </div>
          )}

          <div className="lr-chip grid gap-3 rounded-2xl p-4">
            <div className="text-sm font-semibold text-[color:var(--lr-ink)]">
              Add a product
            </div>
            <div className="grid gap-2 md:grid-cols-2">
              <input
                className="lr-field px-3 py-2 text-sm md:col-span-2"
                value={productTitle}
                onChange={(e) => setProductTitle(e.target.value)}
                placeholder="Title (e.g. Eggs (dozen))"
              />
              <input
                className="lr-field px-3 py-2 text-sm"
                value={productUnit}
                onChange={(e) => setProductUnit(e.target.value)}
                placeholder="Unit (each, lb, bunch)"
              />
              <input
                className="lr-field px-3 py-2 text-sm md:col-span-2"
                value={productDesc}
                onChange={(e) => setProductDesc(e.target.value)}
                placeholder="Description (optional)"
              />
            </div>
            <button
              className="lr-btn lr-btn-primary inline-flex items-center justify-center px-4 py-2 text-sm font-semibold disabled:opacity-50"
              disabled={!productTitle.trim() || !productUnit.trim()}
              onClick={createProduct}
              type="button"
            >
              Create product
            </button>
          </div>
        </section>
        ) : null}

        {canShowAdvanced && showAdvanced ? (
        <section className="lr-card lr-animate grid gap-4 p-6">
          <div>
            <h2 className="text-base font-semibold">Offerings</h2>
            <p className="mt-1 text-sm text-[color:var(--lr-muted)]">
              A product plus a price and limited quantity, published for the
              active pickup window.
            </p>
          </div>

          {offerings?.length ? (
            <ul className="grid gap-2">
              {offerings.map((o) => (
                <li key={o.id} className="lr-chip rounded-2xl px-4 py-3">
                  <div className="flex flex-wrap items-baseline justify-between gap-3">
                    <div className="font-medium text-[color:var(--lr-ink)]">
                      {o.product.title}
                    </div>
                    <div className="text-xs font-semibold text-[color:var(--lr-muted)]">
                      {formatMoney(o.price_cents)}
                    </div>
                  </div>
                  <div className="mt-1 text-sm text-[color:var(--lr-muted)]">
                    Available{" "}
                    <span className="font-semibold text-[color:var(--lr-ink)]">
                      {o.quantity_available}
                    </span>
                    {" · "}Reserved{" "}
                    <span className="font-semibold text-[color:var(--lr-ink)]">
                      {o.quantity_reserved}
                    </span>
                  </div>
                </li>
              ))}
            </ul>
          ) : selectedWindowId ? (
            <div className="text-sm text-[color:var(--lr-muted)]">
              No offerings yet for this window.
            </div>
          ) : (
            <div className="text-sm text-[color:var(--lr-muted)]">
              Select an active pickup window above to manage offerings.
            </div>
          )}

          <div className="lr-chip grid gap-3 rounded-2xl p-4">
            <div>
              <div className="text-sm font-semibold text-[color:var(--lr-ink)]">
                Add an offering
              </div>
              <div className="mt-1 text-sm text-[color:var(--lr-muted)]">
                Choose a product, set a price, and publish a limited batch.
              </div>
            </div>

            <div className="grid gap-2 md:grid-cols-2">
              <label className="grid gap-1 md:col-span-2">
                <span className="text-xs font-semibold text-[color:var(--lr-muted)]">
                  Product
                </span>
                <select
                  className="lr-field px-3 py-2 text-sm"
                  value={offeringProductId}
                  onChange={(e) => setOfferingProductId(e.target.value)}
                  disabled={!products?.length}
                >
                  <option value="">Select…</option>
                  {(products ?? []).map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.title} ({p.unit})
                    </option>
                  ))}
                </select>
              </label>

              <label className="grid gap-1">
                <span className="text-xs font-semibold text-[color:var(--lr-muted)]">
                  Price (USD)
                </span>
                <input
                  className="lr-field px-3 py-2 text-sm"
                  inputMode="decimal"
                  value={offeringPriceUsd}
                  onChange={(e) => setOfferingPriceUsd(e.target.value)}
                  placeholder={toUSDInput(500)}
                />
              </label>

              <label className="grid gap-1">
                <span className="text-xs font-semibold text-[color:var(--lr-muted)]">
                  Quantity available
                </span>
                <input
                  className="lr-field px-3 py-2 text-sm"
                  type="number"
                  value={offeringQty}
                  onChange={(e) => setOfferingQty(Number(e.target.value))}
                  min={0}
                />
              </label>
            </div>

            <button
              className="lr-btn lr-btn-primary inline-flex items-center justify-center px-4 py-2 text-sm font-semibold disabled:opacity-50"
              disabled={!readyForOfferings || !offeringProductId}
              onClick={createOffering}
              type="button"
            >
              Create offering
            </button>
          </div>
        </section>
        ) : null}

        {!isOnboarding || (setupProgress.hasLocation && (wizardStep >= 2 || showBoxSetup)) ? (
        <section id="setup-box" className="lr-card lr-animate grid gap-4 p-6">
          <div>
            <h2 className="text-base font-semibold">Subscription boxes</h2>
            <p className="mt-1 text-sm text-[color:var(--lr-muted)]">
              Curated seasonal boxes for recurring buyers. Print a farmstand QR
              to turn walk-up buyers into subscriptions.
            </p>
          </div>

          {plans?.length ? (
            <ul className="grid gap-3">
              {plans.map((p) => (
                <li key={p.id} className="lr-chip rounded-2xl p-4">
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div className="min-w-[240px]">
                      <div className="flex flex-wrap items-center gap-2">
                        <div className="font-semibold text-[color:var(--lr-ink)]">
                          {p.title}
                        </div>
                        <span className="lr-chip rounded-full px-3 py-1 text-xs font-semibold text-[color:var(--lr-muted)]">
                          {p.cadence}
                        </span>
                        {p.is_live ? (
                          <span className="lr-chip rounded-full px-3 py-1 text-xs font-semibold text-[color:var(--lr-leaf)]">
                            live
                          </span>
                        ) : (
                          <span className="lr-chip rounded-full px-3 py-1 text-xs font-semibold text-[color:var(--lr-clay)]">
                            draft
                          </span>
                        )}
                        {!p.is_active ? (
                          <span className="lr-chip rounded-full px-3 py-1 text-xs font-semibold text-[color:var(--lr-clay)]">
                            inactive
                          </span>
                        ) : null}
                      </div>
                      <div className="mt-1 text-sm text-[color:var(--lr-muted)]">
                        ${(p.price_cents / 100).toFixed(2)} · cap{" "}
                        {p.subscriber_limit} · next{" "}
                        {new Date(p.next_start_at).toLocaleString()}
                      </div>
                      <div className="mt-2 flex flex-wrap gap-2">
                        <Link
                          className="lr-btn lr-chip px-3 py-2 text-sm font-semibold text-[color:var(--lr-ink)]"
                          href={`/boxes/${p.id}`}
                          target="_blank"
                          rel="noreferrer"
                        >
                          {p.is_live ? "Buyer page" : "Preview buyer page"}
                        </Link>
                        <button
                          type="button"
                          className="lr-btn lr-btn-primary px-3 py-2 text-sm font-semibold"
                          onClick={() => generateNextCycle(p.id)}
                          disabled={generatingCycle}
                        >
                          {generatingCycle
                            ? "Generating…"
                            : p.is_live
                            ? "Generate next cycle"
                            : "Go live (generate first cycle)"}
                        </button>
                      </div>
                    </div>

                    <div className="grid gap-2 justify-items-end">
                      {p.is_live ? (
                        <>
                          <QrCode
                            value={
                              siteOrigin
                                ? `${siteOrigin}/b/${p.id}`
                                : `/b/${p.id}`
                            }
                            size={140}
                            label="Farmstand QR"
                          />
                          <div className="flex flex-wrap justify-end gap-2">
                            <Link
                              className="lr-btn lr-chip px-3 py-2 text-sm font-semibold text-[color:var(--lr-ink)]"
                              href={`/boxes/${p.id}/qr`}
                              target="_blank"
                              rel="noreferrer"
                            >
                              Print poster
                            </Link>
                            <button
                              type="button"
                              className="lr-btn lr-chip px-3 py-2 text-sm font-semibold text-[color:var(--lr-ink)]"
                              onClick={() => {
                                const url = siteOrigin
                                  ? `${siteOrigin}/b/${p.id}`
                                  : `/b/${p.id}`;
                                navigator.clipboard
                                  .writeText(url)
                                  .then(() =>
                                    showToast({
                                      kind: "success",
                                      message: "Buyer link copied.",
                                    }),
                                  )
                                  .catch(() =>
                                    showToast({
                                      kind: "error",
                                      message:
                                        "Could not copy. Your browser may block clipboard access.",
                                    }),
                                  );
                              }}
                            >
                              Copy link
                            </button>
                          </div>
                          <div className="max-w-[14rem] text-right text-xs text-[color:var(--lr-muted)]">
                            Tip: print this QR at the farmstand.
                          </div>
                        </>
                      ) : (
                        <div className="lr-chip grid gap-2 rounded-2xl p-4 text-right">
                          <div className="text-xs font-semibold uppercase tracking-wide text-[color:var(--lr-muted)]">
                            Farmstand QR
                          </div>
                          <div className="text-xs text-[color:var(--lr-muted)]">
                            Go live to enable the buyer QR.
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <div className="text-sm text-[color:var(--lr-muted)]">
              No subscription boxes yet.
            </div>
          )}

          {showFullBox ? (
          <details
            className="lr-chip rounded-2xl p-4"
            open={!plans?.length}
          >
            <summary className="cursor-pointer text-sm font-semibold text-[color:var(--lr-ink)]">
              Create a box
            </summary>
            <div className="mt-2 text-sm text-[color:var(--lr-muted)]">
              Start with a curated seasonal box. Add-ons come later.
            </div>

            <div className="mt-4 grid gap-2 md:grid-cols-2">
              <label className="grid gap-1 md:col-span-2">
                <span className="text-xs font-semibold text-[color:var(--lr-muted)]">
                  Title
                </span>
                <input
                  className={fieldClass(
                    "lr-field px-3 py-2 text-sm",
                    !!(planTouched.title && planErrors.title),
                  )}
                  value={planTitle}
                  onChange={(e) => setPlanTitle(e.target.value)}
                  onBlur={() => setPlanTouched((p) => ({ ...p, title: true }))}
                  placeholder="Seasonal box"
                  aria-invalid={!!(planTouched.title && planErrors.title)}
                />
                {planTouched.title && planErrors.title ? (
                  <span className="text-[11px] text-rose-900">
                    {planErrors.title}
                  </span>
                ) : null}
              </label>
              <label className="grid gap-1 md:col-span-2">
                <span className="text-xs font-semibold text-[color:var(--lr-muted)]">
                  Description (optional)
                </span>
                <input
                  className="lr-field px-3 py-2 text-sm"
                  value={planDesc}
                  onChange={(e) => setPlanDesc(e.target.value)}
                  placeholder="A rotating selection of what's fresh."
                />
              </label>
              <label className="grid gap-1">
                <span className="text-xs font-semibold text-[color:var(--lr-muted)]">
                  Cadence
                </span>
                <select
                  className="lr-field px-3 py-2 text-sm"
                  value={planCadence}
                  onChange={(e) =>
                    setPlanCadence(
                      e.target.value as "weekly" | "biweekly" | "monthly",
                    )
                  }
                >
                  <option value="weekly">weekly</option>
                  <option value="biweekly">biweekly</option>
                  <option value="monthly">monthly</option>
                </select>
              </label>
              <label className="grid gap-1">
                <span className="text-xs font-semibold text-[color:var(--lr-muted)]">
                  Capacity
                </span>
                <input
                  className="lr-field px-3 py-2 text-sm"
                  type="number"
                  min={1}
                  value={planLimit}
                  onChange={(e) => setPlanLimit(Number(e.target.value))}
                />
              </label>
              <label className="grid gap-1">
                <span className="text-xs font-semibold text-[color:var(--lr-muted)]">
                  Price (USD)
                </span>
                <input
                  className={fieldClass(
                    "lr-field px-3 py-2 text-sm",
                    !!(planTouched.price && planErrors.price),
                  )}
                  inputMode="decimal"
                  value={planPriceUsd}
                  onChange={(e) => setPlanPriceUsd(e.target.value)}
                  onBlur={() => setPlanTouched((p) => ({ ...p, price: true }))}
                  placeholder="25.00"
                  aria-invalid={!!(planTouched.price && planErrors.price)}
                />
                {planTouched.price && planErrors.price ? (
                  <span className="text-[11px] text-rose-900">
                    {planErrors.price}
                  </span>
                ) : null}
              </label>
              <label className="grid gap-1">
                <span className="text-xs font-semibold text-[color:var(--lr-muted)]">
                  Pickup location
                </span>
                <select
                  className={fieldClass(
                    "lr-field px-3 py-2 text-sm",
                    !!(
                      planTouched.pickup_location_id &&
                      planErrors.pickup_location_id
                    ),
                  )}
                  value={planLocationId}
                  onChange={(e) => setPlanLocationId(e.target.value)}
                  onBlur={() =>
                    setPlanTouched((p) => ({ ...p, pickup_location_id: true }))
                  }
                  aria-invalid={
                    !!(
                      planTouched.pickup_location_id &&
                      planErrors.pickup_location_id
                    )
                  }
                >
                  <option value="" disabled>
                    Select…
                  </option>
                  {(locations ?? []).map((l) => (
                    <option key={l.id} value={l.id}>
                      {l.label ?? "Pickup"} ({l.city})
                    </option>
                  ))}
                </select>
                {planTouched.pickup_location_id &&
                planErrors.pickup_location_id ? (
                  <span className="text-[11px] text-rose-900">
                    {planErrors.pickup_location_id}
                  </span>
                ) : null}
              </label>
              <label className="grid gap-1 md:col-span-2">
                <span className="text-xs font-semibold text-[color:var(--lr-muted)]">
                  First pickup start (local)
                </span>
                <input
                  className={fieldClass(
                    "lr-field px-3 py-2 text-sm",
                    !!(
                      planTouched.first_start_at_local &&
                      planErrors.first_start_at_local
                    ),
                  )}
                  type="datetime-local"
                  value={planFirstStartLocal}
                  onChange={(e) => setPlanFirstStartLocal(e.target.value)}
                  onBlur={() =>
                    setPlanTouched((p) => ({ ...p, first_start_at_local: true }))
                  }
                  aria-invalid={
                    !!(
                      planTouched.first_start_at_local &&
                      planErrors.first_start_at_local
                    )
                  }
                />
                {planTouched.first_start_at_local &&
                planErrors.first_start_at_local ? (
                  <span className="text-[11px] text-rose-900">
                    {planErrors.first_start_at_local}
                  </span>
                ) : null}
              </label>
              <label className="grid gap-1">
                <span className="text-xs font-semibold text-[color:var(--lr-muted)]">
                  Duration (minutes)
                </span>
                <input
                  className="lr-field px-3 py-2 text-sm"
                  type="number"
                  min={30}
                  value={planDurationMin}
                  onChange={(e) => setPlanDurationMin(Number(e.target.value))}
                />
                <span className="text-[11px] text-[color:var(--lr-muted)]">
                  How long buyers have to pick up once the window starts.
                </span>
              </label>
              <label className="grid gap-1">
                <span className="text-xs font-semibold text-[color:var(--lr-muted)]">
                  Cutoff (hours before)
                </span>
                <input
                  className="lr-field px-3 py-2 text-sm"
                  type="number"
                  min={0}
                  value={planCutoffHours}
                  onChange={(e) => setPlanCutoffHours(Number(e.target.value))}
                />
                <span className="text-[11px] text-[color:var(--lr-muted)]">
                  Buyers must subscribe at least this many hours before pickup.
                </span>
              </label>
            </div>

            <button
              type="button"
              className="mt-4 lr-btn lr-btn-primary inline-flex items-center justify-center px-4 py-2 text-sm font-semibold disabled:opacity-50"
              style={{ width: isOnboarding && wizardStep === 2 ? "100%" : undefined }}
              disabled={creatingPlan}
              onClick={createPlan}
            >
              {creatingPlan ? "Creating…" : "Create box"}
            </button>
          </details>
          ) : (
            <div className="rounded-2xl bg-white/60 p-4 text-sm text-[color:var(--lr-muted)] ring-1 ring-[color:var(--lr-border)]">
              Box created. You can edit box details later.
              <button
                type="button"
                className="ml-2 lr-btn lr-chip px-3 py-1.5 text-sm font-semibold text-[color:var(--lr-ink)]"
                onClick={() => {
                  setWizardStep(2);
                  setShowBoxSetup(true);
                  window.setTimeout(() => scrollToSection("setup-box"), 0);
                }}
              >
                Edit
              </button>
            </div>
          )}
        </section>
        ) : (
          <section id="setup-box" className="lr-card lr-animate grid gap-4 p-6">
            <div>
              <h2 className="text-base font-semibold">Subscription boxes</h2>
              <p className="mt-1 text-sm text-[color:var(--lr-muted)]">
                {setupProgress.hasLocation
                  ? "Next step: create your first seasonal box."
                  : "Next step: add a pickup location, then create your first seasonal box."}
              </p>
            </div>
            <button
              type="button"
              className="lr-btn lr-chip w-fit px-4 py-2 text-sm font-semibold text-[color:var(--lr-ink)]"
              onClick={() => goToStep(1, "setup-location")}
            >
              Go to pickup locations
            </button>
          </section>
        )}
      </div>

      {isOnboarding ? (
        <section
          id="setup-go-live"
          className="lr-card lr-card-strong lr-animate grid gap-4 p-6"
        >
          <div>
            <h2 className="text-base font-semibold">Go live</h2>
            <p className="mt-1 text-sm text-[color:var(--lr-muted)]">
              Going live generates your first pickup cycle. That unlocks the
              farmstand QR and lets buyers start subscribing.
            </p>
          </div>

          {wizardStep !== 3 ? (
            <div className="rounded-2xl bg-white/60 p-4 text-sm text-[color:var(--lr-muted)] ring-1 ring-[color:var(--lr-border)]">
              Finish steps 1 and 2 to unlock go-live.
            </div>
          ) : !primaryPlan ? (
            <div className="grid gap-3">
              <div className="rounded-2xl bg-white/60 p-4 text-sm text-[color:var(--lr-muted)] ring-1 ring-[color:var(--lr-border)]">
                Create your first box to continue.
              </div>
              <button
                type="button"
                className="lr-btn lr-btn-primary w-fit px-4 py-2 text-sm font-semibold"
                onClick={() => goToStep(2, "setup-box")}
              >
                Go to box setup
              </button>
            </div>
          ) : primaryPlan.is_live ? (
            <div className="rounded-2xl bg-white/60 p-4 text-sm text-[color:var(--lr-muted)] ring-1 ring-[color:var(--lr-border)]">
              You are live.
            </div>
          ) : (
            <div className="grid gap-3">
              <div className="lr-chip rounded-2xl px-4 py-3">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <div className="font-semibold text-[color:var(--lr-ink)]">
                      {primaryPlan.title}
                    </div>
                    <div className="mt-1 text-sm text-[color:var(--lr-muted)]">
                      {primaryPlan.cadence} · {formatMoney(primaryPlan.price_cents)} · cap{" "}
                      {primaryPlan.subscriber_limit}
                    </div>
                  </div>
                  <span className="lr-chip rounded-full px-3 py-1 text-xs font-semibold text-[color:var(--lr-clay)]">
                    draft
                  </span>
                </div>
              </div>

              <button
                type="button"
                className="lr-btn lr-btn-primary px-4 py-2 text-sm font-semibold"
                onClick={() => generateNextCycle(primaryPlan.id)}
                disabled={generatingCycle}
                style={{ width: isOnboarding && wizardStep === 3 ? "100%" : undefined }}
              >
                {generatingCycle ? "Generating…" : "Generate first cycle and go live"}
              </button>

              <div className="text-xs text-[color:var(--lr-muted)]">
                This creates a pickup window automatically and sets your box to live.
              </div>
            </div>
          )}
        </section>
      ) : null}

      {!isOnboarding ? (
      <section className="lr-card lr-animate grid gap-4 p-6">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="text-base font-semibold">Orders</h2>
            <p className="mt-1 text-sm text-[color:var(--lr-muted)]">
              Mark orders ready, then confirm pickup. Reviews unlock for buyers
              after pickup.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            {(
              [
                ["all", "All"],
                ["placed", "Placed"],
                ["ready", "Ready"],
                ["picked_up", "Picked up"],
                ["no_show", "No show"],
                ["canceled", "Canceled"],
              ] as const
            ).map(([k, label]) => {
              const active = orderFilter === k;
              const count = orderCounts[k];
              return (
                <button
                  key={k}
                  type="button"
                  className={`lr-btn px-3 py-1.5 text-sm font-semibold ${
                    active
                      ? "lr-btn-primary"
                      : "lr-chip text-[color:var(--lr-ink)]"
                  }`}
                  onClick={() => setOrderFilter(k)}
                  aria-pressed={active}
                >
                  {label}{" "}
                  <span className="opacity-80" aria-label={`${count} orders`}>
                    {count}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {payoutSummary ? (
          <div className="rounded-2xl bg-white/60 p-4 text-sm ring-1 ring-[color:var(--lr-border)]">
            <div className="flex flex-wrap items-baseline justify-between gap-4">
              <div className="font-semibold text-[color:var(--lr-ink)]">
                Payout summary (est.)
              </div>
              <div className="text-base font-semibold text-[color:var(--lr-ink)]">
                {formatMoney(payoutSummary.seller_payout_cents)}
              </div>
            </div>
            <div className="mt-2 grid gap-1 text-xs text-[color:var(--lr-muted)]">
              <div>
                Picked up: {payoutSummary.picked_up_count} ·{" "}
                {formatMoney(payoutSummary.payout_picked_up_cents)}
              </div>
              <div>
                No-show fees: {payoutSummary.no_show_count} ·{" "}
                {formatMoney(payoutSummary.payout_no_show_cents)}
              </div>
              <div>
                Platform fee collected:{" "}
                {formatMoney(payoutSummary.platform_fee_cents)}
              </div>
            </div>
          </div>
        ) : null}

        {filteredOrders?.length ? (
          <ul className="grid gap-2">
            {filteredOrders.map((o) => (
              <li key={o.id} className="lr-chip rounded-2xl px-4 py-3">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div className="min-w-[240px]">
                      <div className="flex flex-wrap items-center gap-2">
                        <div className="font-medium text-[color:var(--lr-ink)]">
                          {o.buyer_name ? `${o.buyer_name} · ` : ""}
                          {o.buyer_email}
                        </div>
                        <StatusPill status={o.status} />
                        <PaymentPill status={o.payment_status} />
                      </div>
                  <div className="mt-1 text-sm text-[color:var(--lr-muted)]">
                    Total{" "}
                    <span className="font-semibold text-[color:var(--lr-ink)]">
                      {formatMoney(o.total_cents)}
                    </span>
                    {" · "}Placed{" "}
                    <span className="font-medium text-[color:var(--lr-ink)]">
                      {new Date(o.created_at).toLocaleString()}
                    </span>
                  </div>
                  <div className="mt-1 text-sm text-[color:var(--lr-muted)]">
                    Seller payout (est.){" "}
                    <span className="font-semibold text-[color:var(--lr-ink)]">
                      {formatMoney(o.subtotal_cents)}
                    </span>
                    {o.payment_method === "card" && (o.buyer_fee_cents ?? 0) > 0 ? (
                      <>
                        {" · "}Service fee{" "}
                        <span className="font-semibold text-[color:var(--lr-ink)]">
                          {formatMoney(o.buyer_fee_cents)}
                        </span>
                      </>
                    ) : null}
                  </div>
                  {o.status === "no_show" && (o.captured_cents ?? 0) > 0 ? (
                    <div className="mt-1 text-sm text-[color:var(--lr-muted)]">
                      No-show fee{" "}
                      <span className="font-semibold text-[color:var(--lr-ink)]">
                        {formatMoney(o.captured_cents)}
                      </span>
                    </div>
                  ) : null}
                  <div className="mt-2 grid gap-1">
                    {o.items.map((it) => (
                      <div
                        key={it.id}
                          className="text-sm text-[color:var(--lr-muted)]"
                        >
                          <span className="font-semibold text-[color:var(--lr-ink)]">
                            {it.quantity}×
                          </span>{" "}
                          {it.product_title}{" "}
                          <span className="opacity-85">
                            ({it.product_unit})
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    {o.status === "placed" ? (
                      <>
                        <button
                          type="button"
                          className="lr-btn lr-btn-primary px-3 py-2 text-sm font-semibold"
                          onClick={() => setOrderStatus(o.id, "ready")}
                        >
                          Mark ready
                        </button>
                        <button
                          type="button"
                          className="lr-btn lr-chip px-3 py-2 text-sm font-semibold text-rose-900"
                          onClick={() => setOrderStatus(o.id, "canceled")}
                        >
                          Cancel
                        </button>
                      </>
                    ) : null}

                    {o.status === "ready" ? (
                      <>
                        <div className="grid gap-2">
                          <label className="grid gap-1">
                            <span className="text-xs font-semibold text-[color:var(--lr-muted)]">
                              Pickup code
                            </span>
                            <input
                              className="lr-field w-40 px-3 py-2 text-sm font-mono tracking-widest"
                              inputMode="numeric"
                              placeholder="123456"
                              value={pickupCodeByOrderId[o.id] ?? ""}
                              onChange={(e) =>
                                setPickupCodeByOrderId((prev) => ({
                                  ...prev,
                                  [o.id]: e.target.value,
                                }))
                              }
                            />
                          </label>
                          <div className="flex flex-wrap gap-2">
                            <button
                              type="button"
                              className="lr-btn lr-btn-primary px-3 py-2 text-sm font-semibold"
                              onClick={() => confirmPickup(o.id)}
                            >
                              Confirm pickup
                            </button>
                            <button
                              type="button"
                              className="lr-btn lr-chip px-3 py-2 text-sm font-semibold text-[color:var(--lr-ink)]"
                              onClick={() => setScanOrderId(o.id)}
                            >
                              Scan QR
                            </button>
                          </div>
                        </div>
                        <div className="grid content-start gap-2">
                          <button
                            type="button"
                            className="lr-btn lr-chip px-3 py-2 text-sm font-semibold text-[color:var(--lr-clay)]"
                            onClick={() =>
                              setOrderStatus(o.id, "no_show", {
                                waive_fee: false,
                              })
                            }
                            title="Capture a small no-show fee (default $5) when authorized."
                          >
                            No show (charge fee)
                          </button>
                          <button
                            type="button"
                            className="lr-btn lr-chip px-3 py-2 text-sm font-semibold text-[color:var(--lr-muted)]"
                            onClick={() =>
                              setOrderStatus(o.id, "no_show", { waive_fee: true })
                            }
                            title="Void the authorization (waive fee)."
                          >
                            No show (waive)
                          </button>
                        </div>
                      </>
                    ) : null}
                  </div>
                </div>
              </li>
            ))}
          </ul>
        ) : selectedWindowId ? (
          <div className="text-sm text-[color:var(--lr-muted)]">
            No orders yet for this window.
          </div>
        ) : (
          <div className="text-sm text-[color:var(--lr-muted)]">
            Select an active pickup window above to view orders.
          </div>
        )}
      </section>
      ) : null}

      <QrScannerModal
        open={scanOrderId !== null}
        onClose={() => setScanOrderId(null)}
        onScan={(res) => {
          const parsed = res.parsed;
          if (parsed) {
            // If the QR includes a different order_id, fill that order instead.
            const targetOrderId = parsed.order_id;
            setPickupCodeByOrderId((prev) => ({
              ...prev,
              [targetOrderId]: parsed.pickup_code,
            }));
            return;
          }
          // If a generic QR was scanned, try to extract a 6-digit code.
          const m = res.raw.match(/\b([0-9]{6})\b/);
          if (!m) {
            setError("Scanned QR did not contain a valid pickup code.");
            return;
          }
          const target = scanOrderId;
          if (!target) return;
          setPickupCodeByOrderId((prev) => ({ ...prev, [target]: m[1] ?? "" }));
        }}
      />
    </div>
  );
}
