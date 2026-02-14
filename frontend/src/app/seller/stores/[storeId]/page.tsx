"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import {
  sellerApi,
  type SellerOrder,
  type SellerOffering,
  type SellerPickupLocation,
  type SellerPickupWindow,
  type SellerProduct,
} from "@/lib/seller-api";
import { session } from "@/lib/session";

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

function formatMoney(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`;
}

function formatWindowLabel(w: SellerPickupWindow): string {
  const start = new Date(w.start_at);
  const end = new Date(w.end_at);
  return `${start.toLocaleString()}–${end.toLocaleTimeString()} (${w.status})`;
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

export default function SellerStorePage() {
  const params = useParams<{ storeId: string }>();
  const storeId = params.storeId;
  const router = useRouter();

  const [token, setToken] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [locations, setLocations] = useState<SellerPickupLocation[] | null>(
    null,
  );
  const [windows, setWindows] = useState<SellerPickupWindow[] | null>(null);
  const [products, setProducts] = useState<SellerProduct[] | null>(null);
  const [offerings, setOfferings] = useState<SellerOffering[] | null>(null);
  const [orders, setOrders] = useState<SellerOrder[] | null>(null);

  const [selectedWindowId, setSelectedWindowId] = useState<string>("");
  const [orderFilter, setOrderFilter] = useState<OrderFilter>("all");

  // Create pickup location
  const [locLabel, setLocLabel] = useState("Main pickup");
  const [locAddress1, setLocAddress1] = useState("");
  const [locCity, setLocCity] = useState("");
  const [locRegion, setLocRegion] = useState("");
  const [locPostal, setLocPostal] = useState("");
  const [locTz, setLocTz] = useState(
    typeof Intl !== "undefined"
      ? Intl.DateTimeFormat().resolvedOptions().timeZone
      : "America/Los_Angeles",
  );

  // Create pickup window
  const [windowLocationId, setWindowLocationId] = useState("");
  const [startAtLocal, setStartAtLocal] = useState("");
  const [endAtLocal, setEndAtLocal] = useState("");
  const [cutoffAtLocal, setCutoffAtLocal] = useState("");
  const [windowNotes, setWindowNotes] = useState("");
  const [windowStatus, setWindowStatus] = useState("published");

  // Create product
  const [productTitle, setProductTitle] = useState("");
  const [productUnit, setProductUnit] = useState("each");
  const [productDesc, setProductDesc] = useState("");

  // Create offering
  const [offeringProductId, setOfferingProductId] = useState("");
  const [offeringPriceCents, setOfferingPriceCents] = useState(0);
  const [offeringQty, setOfferingQty] = useState(0);

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

  useEffect(() => {
    const t = session.getToken();
    if (!t) {
      router.replace("/seller/login");
      return;
    }
    setToken(t);
  }, [router]);

  async function refreshAll(t: string) {
    const [ls, ws, ps] = await Promise.all([
      sellerApi.listPickupLocations(t, storeId),
      sellerApi.listPickupWindows(t, storeId),
      sellerApi.listProducts(t, storeId),
    ]);
    setLocations(ls);
    setWindows(ws);
    setProducts(ps);
    if (!windowLocationId && ls.length) setWindowLocationId(ls[0].id);
    if (!selectedWindowId && ws.length) setSelectedWindowId(ws[0].id);
  }

  useEffect(() => {
    if (!token) return;
    setError(null);
    refreshAll(token).catch((e: unknown) => setError(String(e)));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, storeId]);

  useEffect(() => {
    if (!token || !selectedWindowId) return;
    setError(null);
    sellerApi
      .listOfferings(token, storeId, selectedWindowId)
      .then(setOfferings)
      .catch((e: unknown) => setError(String(e)));
  }, [token, storeId, selectedWindowId]);

  useEffect(() => {
    if (!token || !selectedWindowId) return;
    setError(null);
    sellerApi
      .listOrders(token, storeId, selectedWindowId)
      .then(setOrders)
      .catch((e: unknown) => setError(String(e)));
  }, [token, storeId, selectedWindowId]);

  async function createLocation() {
    if (!token) return;
    setError(null);
    try {
      await sellerApi.createPickupLocation(token, storeId, {
        label: locLabel || null,
        address1: locAddress1,
        address2: null,
        city: locCity,
        region: locRegion,
        postal_code: locPostal,
        timezone: locTz,
      });
      setLocAddress1("");
      setLocCity("");
      setLocRegion("");
      setLocPostal("");
      await refreshAll(token);
    } catch (e: unknown) {
      setError(String(e));
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
      setError(String(e));
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
      setError(String(e));
    }
  }

  async function createOffering() {
    if (!token || !selectedWindowId) return;
    setError(null);
    try {
      await sellerApi.createOffering(token, storeId, selectedWindowId, {
        product_id: offeringProductId,
        price_cents: offeringPriceCents,
        quantity_available: offeringQty,
        status: "active",
      });
      setOfferingQty(0);
      setOfferingPriceCents(0);
      setOfferings(
        await sellerApi.listOfferings(token, storeId, selectedWindowId),
      );
    } catch (e: unknown) {
      setError(String(e));
    }
  }

  async function setOrderStatus(
    orderId: string,
    status: "ready" | "picked_up" | "canceled" | "no_show",
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
      await sellerApi.updateOrderStatus(token, storeId, orderId, status);
      // Refresh both orders and offerings since inventory may have changed.
      const [os, ofs] = await Promise.all([
        sellerApi.listOrders(token, storeId, selectedWindowId),
        sellerApi.listOfferings(token, storeId, selectedWindowId),
      ]);
      setOrders(os);
      setOfferings(ofs);
    } catch (e: unknown) {
      setError(String(e));
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
            <div className="mt-1 flex flex-wrap items-center gap-2 text-sm text-[color:var(--lr-muted)]">
              <span>Store ID</span>
              <span className="lr-chip rounded-full px-3 py-1 font-mono text-xs text-[color:var(--lr-ink)]">
                {storeId}
              </span>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            className="lr-btn lr-chip px-4 py-2 text-sm font-medium text-[color:var(--lr-ink)]"
            onClick={() => {
              if (!token) return;
              setError(null);
              refreshAll(token).catch((e: unknown) => setError(String(e)));
            }}
          >
            Refresh
          </button>
          <button
            type="button"
            className="lr-btn px-4 py-2 text-sm font-medium text-[color:var(--lr-ink)]"
            onClick={() => {
              session.clearToken();
              router.replace("/seller/login");
            }}
          >
            Sign out
          </button>
        </div>
      </header>

      {error ? (
        <div className="lr-card border-rose-200 bg-rose-50/60 p-4 text-sm text-rose-900">
          {error}
        </div>
      ) : null}

      <section className="lr-card lr-card-strong lr-animate sticky top-3 z-10 grid gap-3 p-4 md:p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="text-xs font-semibold uppercase tracking-wide text-[color:var(--lr-muted)]">
              Active pickup window
            </div>
            <div className="mt-1 text-sm text-[color:var(--lr-muted)]">
              Offerings and orders are scoped to a single pickup window.
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
            Create a pickup window below, then select it here.
          </div>
        )}
      </section>

      <div className="grid gap-8 lg:grid-cols-2">
        <section className="lr-card lr-animate grid gap-4 p-6">
          <div>
            <h2 className="text-base font-semibold">Pickup locations</h2>
            <p className="mt-1 text-sm text-[color:var(--lr-muted)]">
              Where buyers show up. Add at least one location before publishing
              windows.
            </p>
          </div>

          <div className="grid gap-2">
            {locations?.length ? (
              <ul className="grid gap-2">
                {locations.map((l) => (
                  <li
                    key={l.id}
                    className="lr-chip rounded-2xl px-4 py-3"
                  >
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
                      <span className="font-mono text-[10px] text-[color:var(--lr-muted)]">
                        {l.id}
                      </span>
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

          <div className="lr-chip grid gap-3 rounded-2xl p-4">
            <div>
              <div className="text-sm font-semibold text-[color:var(--lr-ink)]">
                Add a location
              </div>
              <div className="mt-1 text-sm text-[color:var(--lr-muted)]">
                Keep it simple: label + address + timezone.
              </div>
            </div>

            <div className="grid gap-2 md:grid-cols-2">
              <input
                className="lr-field px-3 py-2 text-sm"
                value={locLabel}
                onChange={(e) => setLocLabel(e.target.value)}
                placeholder="Label"
              />
              <input
                className="lr-field px-3 py-2 text-sm"
                value={locTz}
                onChange={(e) => setLocTz(e.target.value)}
                placeholder="Timezone (e.g. America/Los_Angeles)"
              />
              <input
                className="lr-field px-3 py-2 text-sm md:col-span-2"
                value={locAddress1}
                onChange={(e) => setLocAddress1(e.target.value)}
                placeholder="Address"
              />
              <input
                className="lr-field px-3 py-2 text-sm"
                value={locCity}
                onChange={(e) => setLocCity(e.target.value)}
                placeholder="City"
              />
              <input
                className="lr-field px-3 py-2 text-sm"
                value={locRegion}
                onChange={(e) => setLocRegion(e.target.value)}
                placeholder="State/Region"
              />
              <input
                className="lr-field px-3 py-2 text-sm"
                value={locPostal}
                onChange={(e) => setLocPostal(e.target.value)}
                placeholder="Postal code"
              />
            </div>

            <button
              className="lr-btn lr-btn-primary inline-flex items-center justify-center px-4 py-2 text-sm font-semibold disabled:opacity-50"
              disabled={
                !locAddress1.trim() ||
                !locCity.trim() ||
                !locRegion.trim() ||
                !locPostal.trim()
              }
              onClick={createLocation}
              type="button"
            >
              Create location
            </button>
          </div>
        </section>

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
                  onChange={(e) => setWindowStatus(e.target.value)}
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
                  Price (cents)
                </span>
                <input
                  className="lr-field px-3 py-2 text-sm"
                  type="number"
                  value={offeringPriceCents}
                  onChange={(e) => setOfferingPriceCents(Number(e.target.value))}
                  min={0}
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
      </div>

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
                        <button
                          type="button"
                          className="lr-btn lr-btn-primary px-3 py-2 text-sm font-semibold"
                          onClick={() => setOrderStatus(o.id, "picked_up")}
                        >
                          Picked up
                        </button>
                        <button
                          type="button"
                          className="lr-btn lr-chip px-3 py-2 text-sm font-semibold text-[color:var(--lr-clay)]"
                          onClick={() => setOrderStatus(o.id, "no_show")}
                        >
                          No show
                        </button>
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
    </div>
  );
}
