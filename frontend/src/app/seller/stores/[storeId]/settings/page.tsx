"use client";

import Link from "next/link";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { Suspense, useCallback, useEffect, useMemo, useState } from "react";
import {
  sellerApi,
  type SellerPickupLocation,
  type SellerPickupWindow,
  type SellerProduct,
  type SellerOffering,
  type SellerSubscriptionPlan,
  type SellerStore,
} from "@/lib/seller-api";
import { session } from "@/lib/session";
import { useToast } from "@/components/toast";
import { formatMoney, friendlyErrorMessage } from "@/lib/ui";
import { AddressAutocomplete } from "@/components/seller/address-autocomplete";
import { ImageUpload } from "@/components/seller/image-upload";
import { TimezoneCombobox } from "@/components/seller/timezone-combobox";
import { ConfirmDialog } from "@/components/confirm-dialog";

function toIso(dtLocal: string): string {
  const d = new Date(dtLocal);
  return d.toISOString();
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

function formatWindowLabel(w: SellerPickupWindow): string {
  const start = new Date(w.start_at);
  const end = new Date(w.end_at);
  return `${start.toLocaleString()} - ${end.toLocaleTimeString()} (${w.status})`;
}

export default function SettingsPage() {
  return <Suspense><SettingsInner /></Suspense>;
}

function SettingsInner() {
  const params = useParams<{ storeId: string }>();
  const storeId = params.storeId;
  const router = useRouter();
  const searchParams = useSearchParams();
  const { showToast, clearToast } = useToast();

  const [token, setToken] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Connect / Payouts
  const [connectStatus, setConnectStatus] = useState<string>("none");
  const [connectLoading, setConnectLoading] = useState(false);
  const [connectError, setConnectError] = useState("");

  // Data
  const [store, setStore] = useState<SellerStore | null>(null);
  const [locations, setLocations] = useState<SellerPickupLocation[] | null>(null);
  const [plans, setPlans] = useState<SellerSubscriptionPlan[] | null>(null);
  const [windows, setWindows] = useState<SellerPickupWindow[] | null>(null);
  const [products, setProducts] = useState<SellerProduct[] | null>(null);
  const [offerings, setOfferings] = useState<SellerOffering[] | null>(null);

  // Store details form
  const [storeName, setStoreName] = useState("");
  const [storeDesc, setStoreDesc] = useState("");
  const [storePhone, setStorePhone] = useState("");
  const [savingStore, setSavingStore] = useState(false);

  // Pickup location edit
  const [locLabel, setLocLabel] = useState("");
  const [locTz, setLocTz] = useState("");
  const [locAddress1, setLocAddress1] = useState("");
  const [locCity, setLocCity] = useState("");
  const [locRegion, setLocRegion] = useState("");
  const [locPostal, setLocPostal] = useState("");
  const [locCountry, setLocCountry] = useState("US");
  const [locLat, setLocLat] = useState<number | null>(null);
  const [locLng, setLocLng] = useState<number | null>(null);
  const [savingLocation, setSavingLocation] = useState(false);

  // Box edit
  const [boxTitle, setBoxTitle] = useState("");
  const [boxPriceUsd, setBoxPriceUsd] = useState("");
  const [boxLimit, setBoxLimit] = useState(25);
  const [boxActive, setBoxActive] = useState(true);
  const [savingBox, setSavingBox] = useState(false);

  // Advanced tools
  const [showAdvanced, setShowAdvanced] = useState(false);

  // Delete store
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deletingStore, setDeletingStore] = useState(false);

  // Pickup windows form
  const [windowLocationId, setWindowLocationId] = useState("");
  const [startAtLocal, setStartAtLocal] = useState("");
  const [endAtLocal, setEndAtLocal] = useState("");
  const [cutoffAtLocal, setCutoffAtLocal] = useState("");
  const [windowNotes, setWindowNotes] = useState("");
  const [windowStatus, setWindowStatus] = useState("draft");
  const [creatingWindow, setCreatingWindow] = useState(false);

  // Products form
  const [productTitle, setProductTitle] = useState("");
  const [productUnit, setProductUnit] = useState("each");
  const [productDesc, setProductDesc] = useState("");
  const [creatingProduct, setCreatingProduct] = useState(false);

  // Offerings form
  const [selectedWindowId, setSelectedWindowId] = useState("");
  const [offeringProductId, setOfferingProductId] = useState("");
  const [offeringPriceUsd, setOfferingPriceUsd] = useState("");
  const [offeringQty, setOfferingQty] = useState(0);
  const [creatingOffering, setCreatingOffering] = useState(false);

  const primaryLocation = useMemo(() => (locations ?? [])[0] ?? null, [locations]);
  const primaryPlan = useMemo(
    () => (plans ?? []).find((p) => p.is_active) ?? (plans ?? [])[0] ?? null,
    [plans],
  );

  const isLoading = store === null || locations === null || plans === null;

  // Auth check
  useEffect(() => {
    const t = session.getToken();
    if (!t) {
      router.replace("/seller/login");
      return;
    }
    setToken(t);
  }, [router]);

  // Load data
  const refreshAll = useCallback(async function refreshAll(t: string) {
    const [storeList, ls, ws, ps, sps, cs] = await Promise.all([
      sellerApi.listMyStores(t),
      sellerApi.listPickupLocations(t, storeId),
      sellerApi.listPickupWindows(t, storeId),
      sellerApi.listProducts(t, storeId),
      sellerApi.listSubscriptionPlans(t, storeId),
      sellerApi.connectStatus(t, storeId).catch(() => ({ status: "none" })),
    ]);
    setConnectStatus(cs.status);
    const s = storeList.find((st) => st.id === storeId) ?? null;
    setStore(s);
    setLocations(ls);
    setWindows(ws);
    setProducts(ps);
    setPlans(sps);

    // Populate form fields from fetched data
    if (s) {
      setStoreName(s.name);
      setStoreDesc(s.description ?? "");
      setStorePhone(s.phone ?? "");
    }

    const loc = ls[0] ?? null;
    if (loc) {
      setLocLabel(loc.label ?? "");
      setLocTz(loc.timezone);
      setLocAddress1(loc.address1);
      setLocCity(loc.city);
      setLocRegion(loc.region);
      setLocPostal(loc.postal_code);
      setLocCountry(loc.country);
    }

    const plan =
      sps.find((p) => p.is_active) ?? sps[0] ?? null;
    if (plan) {
      setBoxTitle(plan.title);
      setBoxPriceUsd(toUSDInput(plan.price_cents));
      setBoxLimit(plan.subscriber_limit);
      setBoxActive(plan.is_active);
    }

    setWindowLocationId((prev) => {
      if (prev && ls.some((l) => l.id === prev)) return prev;
      return ls[0]?.id ?? "";
    });
    setSelectedWindowId((prev) => {
      if (prev && ws.some((w) => w.id === prev)) return prev;
      return ws[0]?.id ?? "";
    });
  }, [storeId]);

  useEffect(() => {
    if (!token) return;
    setError(null);
    refreshAll(token).catch((e: unknown) => setError(friendlyErrorMessage(e)));
  }, [token, storeId, refreshAll]);

  // Handle Connect return/refresh query params.
  useEffect(() => {
    if (!token) return;
    const connectParam = searchParams.get("connect");
    if (connectParam === "return") {
      // Returned from Stripe onboarding — refresh status.
      sellerApi.connectStatus(token, storeId)
        .then((cs) => {
          setConnectStatus(cs.status);
          if (cs.status === "active") {
            showToast({ kind: "success", message: "Payouts are now active!" });
          } else {
            showToast({ kind: "info", message: "Payout setup in progress. You may need to complete a few more steps." });
          }
        })
        .catch(() => {});
    } else if (connectParam === "refresh") {
      showToast({ kind: "info", message: "Your onboarding link expired. Click 'Continue setup' to get a new one." });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, searchParams]);

  // Load offerings when window changes
  useEffect(() => {
    if (!token || !selectedWindowId) return;
    sellerApi
      .listOfferings(token, storeId, selectedWindowId)
      .then(setOfferings)
      .catch(() => setOfferings(null));
  }, [token, storeId, selectedWindowId]);

  // -- Save handlers --

  async function saveStore() {
    if (!token) return;
    clearToast();
    setSavingStore(true);
    try {
      const updated = await sellerApi.updateStore(token, storeId, {
        name: storeName.trim(),
        description: storeDesc.trim() || null,
        phone: storePhone.trim() || null,
      });
      setStore(updated);
      showToast({ kind: "success", message: "Store details saved." });
    } catch (e: unknown) {
      showToast({ kind: "error", message: friendlyErrorMessage(e) });
    } finally {
      setSavingStore(false);
    }
  }

  async function saveLocation() {
    if (!token || !primaryLocation) return;
    clearToast();

    if (!locAddress1.trim()) {
      showToast({ kind: "error", message: "Address is required." });
      return;
    }
    if (!locCity.trim()) {
      showToast({ kind: "error", message: "City is required." });
      return;
    }
    if (!locRegion.trim()) {
      showToast({ kind: "error", message: "State/region is required." });
      return;
    }
    if (!locPostal.trim()) {
      showToast({ kind: "error", message: "Postal code is required." });
      return;
    }
    if (!locTz.trim()) {
      showToast({ kind: "error", message: "Timezone is required." });
      return;
    }

    setSavingLocation(true);
    try {
      await sellerApi.updatePickupLocation(token, storeId, primaryLocation.id, {
        label: locLabel.trim() || null,
        address1: locAddress1.trim(),
        city: locCity.trim(),
        region: locRegion.trim(),
        postal_code: locPostal.trim(),
        country: locCountry,
        timezone: locTz,
        lat: locLat,
        lng: locLng,
      });
      showToast({ kind: "success", message: "Pickup spot updated." });
      await refreshAll(token);
    } catch (e: unknown) {
      showToast({ kind: "error", message: friendlyErrorMessage(e) });
    } finally {
      setSavingLocation(false);
    }
  }

  async function saveBox() {
    if (!token || !primaryPlan) return;
    clearToast();

    const cents = parseUSDToCents(boxPriceUsd);
    if (cents === null) {
      showToast({ kind: "error", message: "Price must be a valid USD amount (e.g. 25.00)." });
      return;
    }
    if (cents <= 0 && boxActive) {
      showToast({ kind: "error", message: "Price must be greater than $0.00." });
      return;
    }
    if (!boxTitle.trim()) {
      showToast({ kind: "error", message: "Box title is required." });
      return;
    }

    setSavingBox(true);
    try {
      await sellerApi.updateSubscriptionPlan(token, storeId, primaryPlan.id, {
        title: boxTitle.trim(),
        price_cents: cents ?? 0,
        subscriber_limit: boxLimit,
        is_active: boxActive,
      });
      showToast({
        kind: "success",
        message: boxActive ? "Farm box updated." : "Farm box deactivated.",
      });
      await refreshAll(token);
    } catch (e: unknown) {
      showToast({ kind: "error", message: friendlyErrorMessage(e) });
    } finally {
      setSavingBox(false);
    }
  }

  async function handleConnectOnboard() {
    if (!token) return;
    setConnectLoading(true);
    setConnectError("");
    try {
      const result = await sellerApi.connectOnboard(token, storeId);
      window.location.href = result.url;
    } catch (e: unknown) {
      const msg = friendlyErrorMessage(e);
      setConnectError(msg);
      showToast({ kind: "error", message: msg });
      setConnectLoading(false);
    }
  }

  async function handleConnectRefresh() {
    if (!token) return;
    setConnectLoading(true);
    setConnectError("");
    try {
      const result = await sellerApi.connectRefreshLink(token, storeId);
      window.location.href = result.url;
    } catch (e: unknown) {
      const msg = friendlyErrorMessage(e);
      setConnectError(msg);
      showToast({ kind: "error", message: msg });
      setConnectLoading(false);
    }
  }

  async function createWindow() {
    if (!token) return;
    clearToast();
    if (!windowLocationId || !startAtLocal || !endAtLocal || !cutoffAtLocal) {
      showToast({ kind: "error", message: "Fill in all required fields." });
      return;
    }
    setCreatingWindow(true);
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
      showToast({ kind: "success", message: "Pickup window created." });
      await refreshAll(token);
    } catch (e: unknown) {
      showToast({ kind: "error", message: friendlyErrorMessage(e) });
    } finally {
      setCreatingWindow(false);
    }
  }

  async function createProduct() {
    if (!token) return;
    clearToast();
    if (!productTitle.trim()) {
      showToast({ kind: "error", message: "Product title is required." });
      return;
    }
    setCreatingProduct(true);
    try {
      await sellerApi.createProduct(token, storeId, {
        title: productTitle.trim(),
        unit: productUnit,
        description: productDesc.trim() || null,
        is_active: true,
        is_perishable: true,
      });
      setProductTitle("");
      setProductDesc("");
      showToast({ kind: "success", message: "Product created." });
      await refreshAll(token);
    } catch (e: unknown) {
      showToast({ kind: "error", message: friendlyErrorMessage(e) });
    } finally {
      setCreatingProduct(false);
    }
  }

  async function createOffering() {
    if (!token || !selectedWindowId) return;
    clearToast();
    const cents = parseUSDToCents(offeringPriceUsd);
    if (cents === null) {
      showToast({ kind: "error", message: "Price must be a valid USD amount." });
      return;
    }
    if (!offeringProductId) {
      showToast({ kind: "error", message: "Select a product." });
      return;
    }
    setCreatingOffering(true);
    try {
      await sellerApi.createOffering(token, storeId, selectedWindowId, {
        product_id: offeringProductId,
        price_cents: cents ?? 0,
        quantity_available: offeringQty,
        status: "active",
      });
      setOfferingQty(0);
      setOfferingPriceUsd("");
      showToast({ kind: "success", message: "Offering created." });
      setOfferings(
        await sellerApi.listOfferings(token, storeId, selectedWindowId),
      );
    } catch (e: unknown) {
      showToast({ kind: "error", message: friendlyErrorMessage(e) });
    } finally {
      setCreatingOffering(false);
    }
  }

  return (
    <div className="grid gap-8">
      {/* Header */}
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div className="grid gap-2">
          <Link
            className="lr-btn lr-chip inline-flex w-fit items-center gap-2 px-4 py-2 text-sm font-medium text-[color:var(--lr-ink)]"
            href={`/seller/stores/${storeId}`}
          >
            <span aria-hidden="true">&larr;</span>
            Dashboard
          </Link>
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">Settings</h1>
            <div className="mt-1 text-sm text-[color:var(--lr-muted)]">
              Edit your store, pickup spot, farm box, and advanced tools.
            </div>
          </div>
        </div>
      </header>

      <nav className="flex gap-4 border-b border-[color:var(--lr-border)] pb-2 text-sm">
        <a href="#store-details" className="text-[color:var(--lr-muted)] hover:text-[color:var(--lr-ink)]">Store details</a>
        <a href="#pickup-spot" className="text-[color:var(--lr-muted)] hover:text-[color:var(--lr-ink)]">Pickup spot</a>
        <a href="#farm-box" className="text-[color:var(--lr-muted)] hover:text-[color:var(--lr-ink)]">Farm box</a>
        <a href="#payouts" className="text-[color:var(--lr-muted)] hover:text-[color:var(--lr-ink)]">Payouts</a>
        <a href="#advanced" className="text-[color:var(--lr-muted)] hover:text-[color:var(--lr-ink)]">Advanced</a>
      </nav>

      {error ? (
        <div className="lr-card border-rose-200 bg-rose-50/60 p-4 text-sm text-rose-900">
          {error}
        </div>
      ) : null}

      {isLoading ? (
        <div className="lr-card lr-animate p-6 text-sm text-[color:var(--lr-muted)]">
          Loading settings...
        </div>
      ) : (
        <>
          {/* Section 1: Store Details */}
          <section id="store-details" className="lr-card lr-animate grid gap-4 p-6 scroll-mt-4">
            <div>
              <h2 className="text-base font-semibold">Store details</h2>
              <p className="mt-1 text-sm text-[color:var(--lr-muted)]">
                Your store name, description, and contact info.
              </p>
            </div>

            <div className="grid gap-3">
              <ImageUpload
                currentUrl={store?.image_url ?? null}
                storagePath={`stores/${storeId}/cover`}
                onUploaded={async (url) => {
                  await sellerApi.updateStore(token!, storeId, { image_url: url });
                  showToast({ kind: "success", message: "Photo saved." });
                  await refreshAll(token!);
                }}
                onRemoved={async () => {
                  await sellerApi.updateStore(token!, storeId, { image_url: "" });
                  showToast({ kind: "success", message: "Photo removed." });
                  await refreshAll(token!);
                }}
                placeholderText="Add a cover photo — this appears on your store page and farm listings."
                aspectRatio="3/1"
              />

              <label className="grid gap-1">
                <span className="text-sm font-medium text-[color:var(--lr-muted)]">
                  Name
                </span>
                <input
                  className="lr-field px-3 py-2 text-sm"
                  value={storeName}
                  onChange={(e) => setStoreName(e.target.value)}
                  placeholder="Store name"
                />
              </label>
              <label className="grid gap-1">
                <span className="text-sm font-medium text-[color:var(--lr-muted)]">
                  Description
                </span>
                <textarea
                  className="lr-field min-h-20 px-3 py-2 text-sm"
                  value={storeDesc}
                  onChange={(e) => setStoreDesc(e.target.value)}
                  placeholder="What you sell and how pickup works."
                />
              </label>
              <label className="grid gap-1">
                <span className="text-sm font-medium text-[color:var(--lr-muted)]">
                  Phone
                </span>
                <input
                  className="lr-field px-3 py-2 text-sm"
                  value={storePhone}
                  onChange={(e) => setStorePhone(e.target.value)}
                  placeholder="Optional"
                />
              </label>
              <div className="flex justify-end pt-1">
                <button
                  type="button"
                  className="lr-btn lr-btn-primary px-5 py-2 text-sm font-medium disabled:opacity-50"
                  disabled={!storeName.trim() || savingStore}
                  onClick={saveStore}
                >
                  {savingStore ? "Saving..." : "Save"}
                </button>
              </div>
            </div>
          </section>

          {/* Section 2: Pickup Spot */}
          <section id="pickup-spot" className="lr-card lr-animate grid gap-4 p-6 scroll-mt-4">
            <div>
              <h2 className="text-base font-semibold">Pickup spot</h2>
              <p className="mt-1 text-sm text-[color:var(--lr-muted)]">
                Where buyers pick up their orders.
              </p>
            </div>

            {primaryLocation ? (
              <div className="grid gap-3">
                <div className="lr-chip rounded-2xl px-4 py-3">
                  <div className="text-sm text-[color:var(--lr-muted)]">
                    Current: <span className="font-medium text-[color:var(--lr-ink)]">{primaryLocation.label ?? "Pickup"}</span>
                    {" "}&middot; {primaryLocation.address1}, {primaryLocation.city}, {primaryLocation.region} {primaryLocation.postal_code}
                    {" "}&middot; {primaryLocation.timezone}
                  </div>
                </div>

                <label className="grid gap-1">
                  <span className="text-sm font-medium text-[color:var(--lr-muted)]">
                    Label
                  </span>
                  <input
                    className="lr-field px-3 py-2 text-sm"
                    value={locLabel}
                    onChange={(e) => setLocLabel(e.target.value)}
                    placeholder="e.g. Main pickup"
                  />
                </label>

                <div className="grid gap-1">
                  <span className="text-sm font-medium text-[color:var(--lr-muted)]">
                    Address
                  </span>
                  <AddressAutocomplete
                    token={token!}
                    initialQuery={`${primaryLocation.address1}, ${primaryLocation.city}, ${primaryLocation.region}`}
                    onSelect={(details) => {
                      setLocAddress1(details.address1);
                      setLocCity(details.city);
                      setLocRegion(details.region);
                      setLocPostal(details.postal_code);
                      setLocCountry(details.country);
                      setLocLat(details.lat);
                      setLocLng(details.lng);
                      if (details.timezone) setLocTz(details.timezone);
                    }}
                    onError={(msg) =>
                      showToast({ kind: "error", message: msg })
                    }
                  />
                  <div className="mt-1 text-xs text-[color:var(--lr-muted)]">
                    {locAddress1 ? `${locAddress1}, ${locCity}, ${locRegion} ${locPostal}` : "Search to update address fields"}
                  </div>
                </div>

                <ImageUpload
                  currentUrl={primaryLocation?.photo_url ?? null}
                  storagePath={`stores/${storeId}/pickup-spots/${primaryLocation?.id}`}
                  onUploaded={async (url) => {
                    await sellerApi.updatePickupLocation(token!, storeId, primaryLocation!.id, { photo_url: url });
                    showToast({ kind: "success", message: "Photo saved." });
                    await refreshAll(token!);
                  }}
                  onRemoved={async () => {
                    await sellerApi.updatePickupLocation(token!, storeId, primaryLocation!.id, { photo_url: "" });
                    showToast({ kind: "success", message: "Photo removed." });
                    await refreshAll(token!);
                  }}
                  placeholderText="Add a photo of the pickup spot — helps buyers know what to look for when they arrive."
                  aspectRatio="4/3"
                />

                <label className="grid gap-1">
                  <span className="text-sm font-medium text-[color:var(--lr-muted)]">
                    Timezone
                  </span>
                  <TimezoneCombobox
                    value={locTz}
                    onChange={setLocTz}
                    placeholder="Timezone"
                  />
                </label>

                <div className="flex justify-end pt-1">
                  <button
                    type="button"
                    className="lr-btn lr-btn-primary px-5 py-2 text-sm font-medium disabled:opacity-50"
                    disabled={savingLocation}
                    onClick={saveLocation}
                  >
                    {savingLocation ? "Updating..." : "Update"}
                  </button>
                </div>
              </div>
            ) : (
              <div className="text-sm text-[color:var(--lr-muted)]">
                No pickup location set up yet.{" "}
                <Link
                  href={`/seller/stores/${storeId}`}
                  className="font-medium underline"
                >
                  Go to dashboard
                </Link>{" "}
                to create one.
              </div>
            )}
          </section>

          {/* Section 3: Farm Box */}
          <section id="farm-box" className="lr-card lr-animate grid gap-4 p-6 scroll-mt-4">
            <div>
              <h2 className="text-base font-semibold">Farm box</h2>
              <p className="mt-1 text-sm text-[color:var(--lr-muted)]">
                Your subscription plan for recurring pickups.
              </p>
            </div>

            {primaryPlan ? (
              <div className="grid gap-3">
                <div className="lr-chip rounded-2xl px-4 py-3">
                  <div className="flex flex-wrap items-center gap-2 text-sm text-[color:var(--lr-muted)]">
                    <span>
                      Current: <span className="font-medium text-[color:var(--lr-ink)]">{primaryPlan.title}</span>
                    </span>
                    <span>&middot; {formatMoney(primaryPlan.price_cents)}</span>
                    <span>&middot; {primaryPlan.cadence}</span>
                    <span
                      className={`lr-chip rounded-full px-2 py-0.5 text-xs font-semibold ${
                        primaryPlan.is_active
                          ? "text-[color:var(--lr-leaf)]"
                          : "text-rose-700"
                      }`}
                    >
                      {primaryPlan.is_active ? "active" : "inactive"}
                    </span>
                  </div>
                </div>

                <label className="grid gap-1">
                  <span className="text-sm font-medium text-[color:var(--lr-muted)]">
                    Title
                  </span>
                  <input
                    className="lr-field px-3 py-2 text-sm"
                    value={boxTitle}
                    onChange={(e) => setBoxTitle(e.target.value)}
                    placeholder="e.g. Weekly Farm Box"
                  />
                </label>

                <ImageUpload
                  currentUrl={primaryPlan?.image_url ?? null}
                  storagePath={`stores/${storeId}/products/${primaryPlan?.product_id}`}
                  onUploaded={async (url) => {
                    await sellerApi.updateSubscriptionPlan(token!, storeId, primaryPlan!.id, { image_url: url });
                    showToast({ kind: "success", message: "Photo saved." });
                    await refreshAll(token!);
                  }}
                  onRemoved={async () => {
                    await sellerApi.updateSubscriptionPlan(token!, storeId, primaryPlan!.id, { image_url: "" });
                    showToast({ kind: "success", message: "Photo removed." });
                    await refreshAll(token!);
                  }}
                  placeholderText="Add a photo of this box — buyers will see this on your store page."
                  aspectRatio="4/3"
                />

                <label className="grid gap-1">
                  <span className="text-sm font-medium text-[color:var(--lr-muted)]">
                    Price (USD)
                  </span>
                  <input
                    className="lr-field px-3 py-2 text-sm"
                    type="text"
                    inputMode="decimal"
                    value={boxPriceUsd}
                    onChange={(e) => setBoxPriceUsd(e.target.value)}
                    placeholder="25.00"
                  />
                </label>

                <label className="grid gap-1">
                  <span className="text-sm font-medium text-[color:var(--lr-muted)]">
                    Max customers
                  </span>
                  <input
                    className="lr-field px-3 py-2 text-sm"
                    type="number"
                    min={1}
                    value={boxLimit}
                    onChange={(e) =>
                      setBoxLimit(Math.max(1, Number.parseInt(e.target.value) || 1))
                    }
                  />
                </label>

                <label className="flex items-center gap-3 py-1">
                  <input
                    type="checkbox"
                    checked={boxActive}
                    onChange={(e) => setBoxActive(e.target.checked)}
                    className="h-4 w-4 accent-[var(--lr-leaf)]"
                  />
                  <span className="text-sm font-medium text-[color:var(--lr-ink)]">
                    Active
                  </span>
                  <span className="text-xs text-[color:var(--lr-muted)]">
                    Uncheck to deactivate this box
                  </span>
                </label>

                <div className="flex justify-end pt-1">
                  <button
                    type="button"
                    className="lr-btn lr-btn-primary px-5 py-2 text-sm font-medium disabled:opacity-50"
                    disabled={!boxTitle.trim() || savingBox}
                    onClick={saveBox}
                  >
                    {savingBox ? "Updating..." : "Update"}
                  </button>
                </div>
              </div>
            ) : (
              <div className="text-sm text-[color:var(--lr-muted)]">
                No farm box created yet.{" "}
                <Link
                  href={`/seller/stores/${storeId}`}
                  className="font-medium underline"
                >
                  Go to dashboard
                </Link>{" "}
                to set one up.
              </div>
            )}
          </section>

          {/* Section 4: Payouts */}
          <section id="payouts" className="lr-card lr-animate grid gap-4 p-6 scroll-mt-4">
            <div>
              <h2 className="text-base font-semibold">Payouts</h2>
              <p className="mt-1 text-sm text-[color:var(--lr-muted)]">
                Connect your bank account so you get paid when customers pick up.
              </p>
            </div>

            {connectStatus === "active" ? (
              <div className="lr-chip rounded-2xl px-4 py-3">
                <div className="flex items-center gap-2 text-sm">
                  <span
                    className="inline-block h-2.5 w-2.5 rounded-full"
                    style={{ backgroundColor: "var(--lr-leaf)" }}
                  />
                  <span className="font-semibold text-[color:var(--lr-ink)]">
                    Payouts active
                  </span>
                </div>
                <p className="mt-1 text-xs text-[color:var(--lr-muted)]">
                  Your bank account is connected. You&apos;ll receive payouts
                  automatically when customers complete pickup.
                </p>
              </div>
            ) : connectStatus === "restricted" ? (
              <div className="lr-chip rounded-2xl border-amber-200 bg-amber-50/60 px-4 py-3">
                <div className="flex items-center gap-2 text-sm">
                  <span className="inline-block h-2.5 w-2.5 rounded-full bg-amber-500" />
                  <span className="font-semibold text-amber-900">
                    Action needed
                  </span>
                </div>
                <p className="mt-1 text-xs text-amber-800">
                  Stripe requires additional information to continue processing payouts.
                </p>
                <button
                  type="button"
                  className="lr-btn lr-btn-primary mt-3 px-5 py-2 text-sm font-medium disabled:opacity-50"
                  disabled={connectLoading}
                  onClick={handleConnectRefresh}
                >
                  {connectLoading ? "Redirecting..." : "Complete setup"}
                </button>
                {connectError && (
                  <p className="mt-2 text-sm text-rose-600">{connectError}</p>
                )}
              </div>
            ) : connectStatus === "onboarding" ? (
              <div className="lr-chip rounded-2xl px-4 py-3">
                <div className="flex items-center gap-2 text-sm">
                  <span className="inline-block h-2.5 w-2.5 rounded-full bg-amber-400" />
                  <span className="font-semibold text-[color:var(--lr-ink)]">
                    Setup in progress
                  </span>
                </div>
                <p className="mt-1 text-xs text-[color:var(--lr-muted)]">
                  You started setting up payouts but haven&apos;t finished yet.
                </p>
                <button
                  type="button"
                  className="lr-btn lr-btn-primary mt-3 px-5 py-2 text-sm font-medium disabled:opacity-50"
                  disabled={connectLoading}
                  onClick={handleConnectRefresh}
                >
                  {connectLoading ? "Redirecting..." : "Continue setup"}
                </button>
                {connectError && (
                  <p className="mt-2 text-sm text-rose-600">{connectError}</p>
                )}
              </div>
            ) : (
              <div className="grid gap-3">
                <p className="text-sm text-[color:var(--lr-muted)]">
                  You need to connect your bank account before you can go live
                  and start accepting orders with card payments.
                </p>
                <button
                  type="button"
                  className="lr-btn lr-btn-primary w-fit px-5 py-2 text-sm font-medium disabled:opacity-50"
                  disabled={connectLoading}
                  onClick={handleConnectOnboard}
                >
                  {connectLoading ? "Redirecting..." : "Set up payouts"}
                </button>
                {connectError && (
                  <p className="text-sm text-rose-600">{connectError}</p>
                )}
              </div>
            )}
          </section>

          {/* Section 5: Advanced Tools (collapsible) */}
          <section id="advanced" className="lr-card lr-animate grid gap-0 overflow-hidden scroll-mt-4">
            <button
              type="button"
              className="flex w-full items-center justify-between p-6 text-left"
              onClick={() => setShowAdvanced((v) => !v)}
              aria-expanded={showAdvanced}
            >
              <div>
                <h2 className="text-base font-semibold">Advanced tools</h2>
                <p className="mt-1 text-sm text-[color:var(--lr-muted)]">
                  Pickup windows, products, and offerings.
                </p>
              </div>
              <span
                className="text-lg text-[color:var(--lr-muted)] transition-transform"
                style={{ transform: showAdvanced ? "rotate(180deg)" : undefined }}
                aria-hidden="true"
              >
                &#9662;
              </span>
            </button>

            {showAdvanced ? (
              <div className="grid gap-6 border-t border-[color:var(--lr-border)] p-6">
                {/* Pickup Windows */}
                <div className="grid gap-3">
                  <h3 className="text-sm font-semibold">Pickup windows</h3>

                  {(windows ?? []).length ? (
                    <ul className="grid gap-2">
                      {(windows ?? []).map((w) => (
                        <li key={w.id} className="lr-chip rounded-xl px-3 py-2 text-sm">
                          <div className="font-medium text-[color:var(--lr-ink)]">
                            {formatWindowLabel(w)}
                          </div>
                          <div className="text-xs text-[color:var(--lr-muted)]">
                            {w.pickup_location.label ?? "Pickup"} &middot;{" "}
                            {w.pickup_location.city}, {w.pickup_location.region}
                          </div>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <div className="text-sm text-[color:var(--lr-muted)]">
                      No pickup windows yet.
                    </div>
                  )}

                  <details className="lr-chip rounded-2xl p-4">
                    <summary className="cursor-pointer text-sm font-semibold text-[color:var(--lr-ink)]">
                      Create pickup window
                    </summary>
                    <div className="mt-3 grid gap-3">
                      <label className="grid gap-1">
                        <span className="text-sm font-medium text-[color:var(--lr-muted)]">
                          Location
                        </span>
                        <select
                          className="lr-field px-3 py-2 text-sm"
                          value={windowLocationId}
                          onChange={(e) => setWindowLocationId(e.target.value)}
                        >
                          <option value="">Select location...</option>
                          {(locations ?? []).map((l) => (
                            <option key={l.id} value={l.id}>
                              {l.label ?? "Pickup"} - {l.city}, {l.region}
                            </option>
                          ))}
                        </select>
                      </label>
                      <label className="grid gap-1">
                        <span className="text-sm font-medium text-[color:var(--lr-muted)]">
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
                        <span className="text-sm font-medium text-[color:var(--lr-muted)]">
                          End
                        </span>
                        <input
                          className="lr-field px-3 py-2 text-sm"
                          type="datetime-local"
                          value={endAtLocal}
                          onChange={(e) => setEndAtLocal(e.target.value)}
                        />
                      </label>
                      <label className="grid gap-1">
                        <span className="text-sm font-medium text-[color:var(--lr-muted)]">
                          Cutoff
                        </span>
                        <input
                          className="lr-field px-3 py-2 text-sm"
                          type="datetime-local"
                          value={cutoffAtLocal}
                          onChange={(e) => setCutoffAtLocal(e.target.value)}
                        />
                      </label>
                      <label className="grid gap-1">
                        <span className="text-sm font-medium text-[color:var(--lr-muted)]">
                          Status
                        </span>
                        <select
                          className="lr-field px-3 py-2 text-sm"
                          value={windowStatus}
                          onChange={(e) => setWindowStatus(e.target.value)}
                        >
                          <option value="draft">Draft</option>
                          <option value="active">Active</option>
                        </select>
                      </label>
                      <label className="grid gap-1">
                        <span className="text-sm font-medium text-[color:var(--lr-muted)]">
                          Notes
                        </span>
                        <input
                          className="lr-field px-3 py-2 text-sm"
                          value={windowNotes}
                          onChange={(e) => setWindowNotes(e.target.value)}
                          placeholder="Optional"
                        />
                      </label>
                      <div className="flex justify-end">
                        <button
                          type="button"
                          className="lr-btn lr-btn-primary px-5 py-2 text-sm font-medium disabled:opacity-50"
                          disabled={creatingWindow}
                          onClick={createWindow}
                        >
                          {creatingWindow ? "Creating..." : "Create window"}
                        </button>
                      </div>
                    </div>
                  </details>
                </div>

                {/* Products */}
                <div className="grid gap-3">
                  <h3 className="text-sm font-semibold">Products</h3>

                  {(products ?? []).length ? (
                    <ul className="grid gap-2">
                      {(products ?? []).map((p) => (
                        <li key={p.id} className="lr-chip rounded-xl px-3 py-2 text-sm">
                          <span className="font-medium text-[color:var(--lr-ink)]">
                            {p.title}
                          </span>
                          <span className="text-[color:var(--lr-muted)]">
                            {" "}&middot; {p.unit}
                            {p.description ? ` &middot; ${p.description}` : ""}
                          </span>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <div className="text-sm text-[color:var(--lr-muted)]">
                      No products yet.
                    </div>
                  )}

                  <details className="lr-chip rounded-2xl p-4">
                    <summary className="cursor-pointer text-sm font-semibold text-[color:var(--lr-ink)]">
                      Create product
                    </summary>
                    <div className="mt-3 grid gap-3">
                      <label className="grid gap-1">
                        <span className="text-sm font-medium text-[color:var(--lr-muted)]">
                          Title
                        </span>
                        <input
                          className="lr-field px-3 py-2 text-sm"
                          value={productTitle}
                          onChange={(e) => setProductTitle(e.target.value)}
                          placeholder="e.g. Heirloom Tomatoes"
                        />
                      </label>
                      <label className="grid gap-1">
                        <span className="text-sm font-medium text-[color:var(--lr-muted)]">
                          Unit
                        </span>
                        <select
                          className="lr-field px-3 py-2 text-sm"
                          value={productUnit}
                          onChange={(e) => setProductUnit(e.target.value)}
                        >
                          <option value="each">each</option>
                          <option value="lb">lb</option>
                          <option value="oz">oz</option>
                          <option value="bunch">bunch</option>
                          <option value="pint">pint</option>
                          <option value="quart">quart</option>
                          <option value="dozen">dozen</option>
                        </select>
                      </label>
                      <label className="grid gap-1">
                        <span className="text-sm font-medium text-[color:var(--lr-muted)]">
                          Description
                        </span>
                        <input
                          className="lr-field px-3 py-2 text-sm"
                          value={productDesc}
                          onChange={(e) => setProductDesc(e.target.value)}
                          placeholder="Optional"
                        />
                      </label>
                      <div className="flex justify-end">
                        <button
                          type="button"
                          className="lr-btn lr-btn-primary px-5 py-2 text-sm font-medium disabled:opacity-50"
                          disabled={!productTitle.trim() || creatingProduct}
                          onClick={createProduct}
                        >
                          {creatingProduct ? "Creating..." : "Create product"}
                        </button>
                      </div>
                    </div>
                  </details>
                </div>

                {/* Offerings */}
                <div className="grid gap-3">
                  <h3 className="text-sm font-semibold">Offerings</h3>
                  <p className="text-sm text-[color:var(--lr-muted)]">
                    Attach products to a pickup window with a price and quantity.
                  </p>

                  <label className="grid gap-1">
                    <span className="text-sm font-medium text-[color:var(--lr-muted)]">
                      Pickup window
                    </span>
                    <select
                      className="lr-field px-3 py-2 text-sm"
                      value={selectedWindowId}
                      onChange={(e) => setSelectedWindowId(e.target.value)}
                    >
                      <option value="">Select a window...</option>
                      {(windows ?? []).map((w) => (
                        <option key={w.id} value={w.id}>
                          {formatWindowLabel(w)}
                        </option>
                      ))}
                    </select>
                  </label>

                  {selectedWindowId && (offerings ?? []).length ? (
                    <ul className="grid gap-2">
                      {(offerings ?? []).map((o) => (
                        <li key={o.id} className="lr-chip rounded-xl px-3 py-2 text-sm">
                          <span className="font-medium text-[color:var(--lr-ink)]">
                            {o.product.title}
                          </span>
                          <span className="text-[color:var(--lr-muted)]">
                            {" "}&middot; {formatMoney(o.price_cents)} &middot; {o.quantity_available} avail
                            {" "}&middot; {o.quantity_reserved} reserved &middot; {o.status}
                          </span>
                        </li>
                      ))}
                    </ul>
                  ) : selectedWindowId ? (
                    <div className="text-sm text-[color:var(--lr-muted)]">
                      No offerings for this window.
                    </div>
                  ) : null}

                  {selectedWindowId && (products ?? []).length ? (
                    <details className="lr-chip rounded-2xl p-4">
                      <summary className="cursor-pointer text-sm font-semibold text-[color:var(--lr-ink)]">
                        Create offering
                      </summary>
                      <div className="mt-3 grid gap-3">
                        <label className="grid gap-1">
                          <span className="text-sm font-medium text-[color:var(--lr-muted)]">
                            Product
                          </span>
                          <select
                            className="lr-field px-3 py-2 text-sm"
                            value={offeringProductId}
                            onChange={(e) => setOfferingProductId(e.target.value)}
                          >
                            <option value="">Select product...</option>
                            {(products ?? []).map((p) => (
                              <option key={p.id} value={p.id}>
                                {p.title} ({p.unit})
                              </option>
                            ))}
                          </select>
                        </label>
                        <label className="grid gap-1">
                          <span className="text-sm font-medium text-[color:var(--lr-muted)]">
                            Price (USD)
                          </span>
                          <input
                            className="lr-field px-3 py-2 text-sm"
                            type="text"
                            inputMode="decimal"
                            value={offeringPriceUsd}
                            onChange={(e) => setOfferingPriceUsd(e.target.value)}
                            placeholder="5.00"
                          />
                        </label>
                        <label className="grid gap-1">
                          <span className="text-sm font-medium text-[color:var(--lr-muted)]">
                            Quantity available
                          </span>
                          <input
                            className="lr-field px-3 py-2 text-sm"
                            type="number"
                            min={0}
                            value={offeringQty}
                            onChange={(e) =>
                              setOfferingQty(
                                Math.max(0, Number.parseInt(e.target.value) || 0),
                              )
                            }
                          />
                        </label>
                        <div className="flex justify-end">
                          <button
                            type="button"
                            className="lr-btn lr-btn-primary px-5 py-2 text-sm font-medium disabled:opacity-50"
                            disabled={creatingOffering}
                            onClick={createOffering}
                          >
                            {creatingOffering ? "Creating..." : "Create offering"}
                          </button>
                        </div>
                      </div>
                    </details>
                  ) : null}
                </div>
              </div>
            ) : null}
          </section>

          {/* ── Danger Zone ── */}
          <section className="mt-12 rounded-2xl border-2 border-rose-200 bg-rose-50/50 p-6">
            <h2 className="text-base font-semibold text-rose-700">Danger zone</h2>
            <p className="mt-1 text-sm text-[color:var(--lr-muted)]">
              Permanently delete this farm and all associated data.
            </p>
            <button
              type="button"
              className="mt-4 rounded-full px-5 py-2 text-sm font-semibold bg-rose-600 text-white hover:bg-rose-700 transition-colors disabled:opacity-50"
              disabled={deletingStore}
              onClick={() => setShowDeleteConfirm(true)}
            >
              {deletingStore ? "Deleting..." : "Delete farm"}
            </button>
          </section>

          {/* ── Support ── */}
          <section className="lr-card p-6">
            <h2 className="text-base font-semibold text-[color:var(--lr-ink)]">Support</h2>
            <p className="mt-1 text-sm text-[color:var(--lr-muted)]">
              Only needed if you contact support.
            </p>
            <div className="mt-3 flex items-center gap-2">
              <span className="lr-chip rounded-xl px-3 py-2 font-mono text-xs text-[color:var(--lr-ink)]">
                {storeId}
              </span>
              <button
                type="button"
                className="lr-btn lr-chip px-3 py-2 text-xs font-semibold text-[color:var(--lr-ink)]"
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
                Copy Store ID
              </button>
            </div>
          </section>

          <ConfirmDialog
            open={showDeleteConfirm}
            title="Delete farm?"
            message="This will permanently delete your farm, including all orders, pickup history, and settings. This cannot be undone."
            confirmLabel="Delete farm"
            destructive
            onCancel={() => setShowDeleteConfirm(false)}
            onConfirm={async () => {
              setShowDeleteConfirm(false);
              setDeletingStore(true);
              try {
                const t = session.getToken();
                if (!t) throw new Error("Not authenticated");
                await sellerApi.deleteStore(t, storeId);
                showToast({ message: "Farm deleted", kind: "success" });
                router.push("/seller");
              } catch (err) {
                showToast({ message: friendlyErrorMessage(err), kind: "error" });
              } finally {
                setDeletingStore(false);
              }
            }}
          />
        </>
      )}
    </div>
  );
}
