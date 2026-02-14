"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import {
  sellerApi,
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

  const [selectedWindowId, setSelectedWindowId] = useState<string>("");

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
      setOfferings(await sellerApi.listOfferings(token, storeId, selectedWindowId));
    } catch (e: unknown) {
      setError(String(e));
    }
  }

  return (
    <div className="grid gap-8">
      <div className="flex flex-wrap items-baseline justify-between gap-4">
        <div>
          <Link className="text-sm text-zinc-600 hover:text-zinc-950" href="/seller">
            ← Back to seller
          </Link>
          <h1 className="mt-2 text-2xl font-semibold tracking-tight">Store</h1>
          <p className="mt-1 text-sm text-zinc-600">
            Store ID: <span className="font-mono text-xs">{storeId}</span>
          </p>
        </div>
      </div>

      {error ? (
        <div className="rounded-xl bg-rose-50 p-4 text-sm text-rose-800 ring-1 ring-rose-200">
          {error}
        </div>
      ) : null}

      <section className="grid gap-3 rounded-2xl bg-white p-6 shadow-sm ring-1 ring-zinc-950/5">
        <h2 className="text-base font-semibold">Pickup locations</h2>
        <div className="grid gap-2 text-sm text-zinc-700">
          {locations?.length ? (
            <ul className="grid gap-2">
              {locations.map((l) => (
                <li key={l.id} className="rounded-xl bg-zinc-50 px-4 py-3 ring-1 ring-zinc-950/5">
                  <div className="font-medium text-zinc-950">{l.label ?? "Pickup"}</div>
                  <div className="text-sm text-zinc-600">
                    {l.address1}, {l.city}, {l.region} {l.postal_code} ({l.timezone})
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <div className="text-sm text-zinc-600">No pickup locations yet.</div>
          )}
        </div>

        <div className="mt-2 grid gap-2 rounded-xl bg-zinc-50 p-4 ring-1 ring-zinc-950/5">
          <div className="text-sm font-medium text-zinc-800">Add a location</div>
          <div className="grid gap-2 md:grid-cols-2">
            <input className="rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm" value={locLabel} onChange={(e) => setLocLabel(e.target.value)} placeholder="Label" />
            <input className="rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm" value={locTz} onChange={(e) => setLocTz(e.target.value)} placeholder="Timezone (e.g. America/Los_Angeles)" />
            <input className="rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm md:col-span-2" value={locAddress1} onChange={(e) => setLocAddress1(e.target.value)} placeholder="Address" />
            <input className="rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm" value={locCity} onChange={(e) => setLocCity(e.target.value)} placeholder="City" />
            <input className="rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm" value={locRegion} onChange={(e) => setLocRegion(e.target.value)} placeholder="State/Region" />
            <input className="rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm" value={locPostal} onChange={(e) => setLocPostal(e.target.value)} placeholder="Postal code" />
          </div>
          <button
            className="inline-flex items-center justify-center rounded-full bg-zinc-950 px-4 py-2 text-sm font-medium text-zinc-50 hover:bg-zinc-800 disabled:opacity-50"
            disabled={!locAddress1.trim() || !locCity.trim() || !locRegion.trim() || !locPostal.trim()}
            onClick={createLocation}
            type="button"
          >
            Create location
          </button>
        </div>
      </section>

      <section className="grid gap-3 rounded-2xl bg-white p-6 shadow-sm ring-1 ring-zinc-950/5">
        <h2 className="text-base font-semibold">Pickup windows</h2>

        {windows?.length ? (
          <ul className="grid gap-2">
            {windows.map((w) => (
              <li
                key={w.id}
                className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-zinc-50 px-4 py-3 ring-1 ring-zinc-950/5"
              >
                <div>
                  <div className="font-medium text-zinc-950">
                    {new Date(w.start_at).toLocaleString()} to{" "}
                    {new Date(w.end_at).toLocaleTimeString()}
                  </div>
                  <div className="text-sm text-zinc-600">
                    {w.pickup_location.label ?? "Pickup"} | {w.status}
                  </div>
                </div>
                <button
                  type="button"
                  className="rounded-full px-4 py-2 text-sm font-medium text-zinc-700 ring-1 ring-zinc-950/15 hover:bg-white"
                  onClick={() => setSelectedWindowId(w.id)}
                >
                  {selectedWindowId === w.id ? "Selected" : "Select"}
                </button>
              </li>
            ))}
          </ul>
        ) : (
          <div className="text-sm text-zinc-600">No pickup windows yet.</div>
        )}

        <div className="mt-2 grid gap-2 rounded-xl bg-zinc-50 p-4 ring-1 ring-zinc-950/5">
          <div className="text-sm font-medium text-zinc-800">Add a pickup window</div>
          <div className="grid gap-2 md:grid-cols-2">
            <label className="grid gap-1">
              <span className="text-xs font-medium text-zinc-700">Location</span>
              <select
                className="rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm"
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
              <span className="text-xs font-medium text-zinc-700">Status</span>
              <select
                className="rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm"
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
              <span className="text-xs font-medium text-zinc-700">Start</span>
              <input
                className="rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm"
                type="datetime-local"
                value={startAtLocal}
                onChange={(e) => setStartAtLocal(e.target.value)}
              />
            </label>
            <label className="grid gap-1">
              <span className="text-xs font-medium text-zinc-700">End</span>
              <input
                className="rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm"
                type="datetime-local"
                value={endAtLocal}
                onChange={(e) => setEndAtLocal(e.target.value)}
              />
            </label>
            <label className="grid gap-1 md:col-span-2">
              <span className="text-xs font-medium text-zinc-700">Cutoff</span>
              <input
                className="rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm"
                type="datetime-local"
                value={cutoffAtLocal}
                onChange={(e) => setCutoffAtLocal(e.target.value)}
              />
            </label>
            <label className="grid gap-1 md:col-span-2">
              <span className="text-xs font-medium text-zinc-700">Notes</span>
              <input
                className="rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm"
                value={windowNotes}
                onChange={(e) => setWindowNotes(e.target.value)}
                placeholder="Optional"
              />
            </label>
          </div>
          <button
            className="inline-flex items-center justify-center rounded-full bg-zinc-950 px-4 py-2 text-sm font-medium text-zinc-50 hover:bg-zinc-800 disabled:opacity-50"
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

      <section className="grid gap-3 rounded-2xl bg-white p-6 shadow-sm ring-1 ring-zinc-950/5">
        <h2 className="text-base font-semibold">Products</h2>
        {products?.length ? (
          <ul className="grid gap-2">
            {products.map((p) => (
              <li key={p.id} className="rounded-xl bg-zinc-50 px-4 py-3 ring-1 ring-zinc-950/5">
                <div className="flex items-baseline justify-between gap-4">
                  <div className="font-medium text-zinc-950">{p.title}</div>
                  <div className="text-xs text-zinc-600">{p.unit}</div>
                </div>
                {p.description ? (
                  <div className="mt-1 text-sm text-zinc-600">{p.description}</div>
                ) : null}
              </li>
            ))}
          </ul>
        ) : (
          <div className="text-sm text-zinc-600">No products yet.</div>
        )}

        <div className="mt-2 grid gap-2 rounded-xl bg-zinc-50 p-4 ring-1 ring-zinc-950/5">
          <div className="text-sm font-medium text-zinc-800">Add a product</div>
          <div className="grid gap-2 md:grid-cols-2">
            <input className="rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm md:col-span-2" value={productTitle} onChange={(e) => setProductTitle(e.target.value)} placeholder="Title (e.g. Eggs (dozen))" />
            <input className="rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm" value={productUnit} onChange={(e) => setProductUnit(e.target.value)} placeholder="Unit (each, lb, bunch)" />
            <input className="rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm md:col-span-2" value={productDesc} onChange={(e) => setProductDesc(e.target.value)} placeholder="Description (optional)" />
          </div>
          <button
            className="inline-flex items-center justify-center rounded-full bg-zinc-950 px-4 py-2 text-sm font-medium text-zinc-50 hover:bg-zinc-800 disabled:opacity-50"
            disabled={!productTitle.trim() || !productUnit.trim()}
            onClick={createProduct}
            type="button"
          >
            Create product
          </button>
        </div>
      </section>

      <section className="grid gap-3 rounded-2xl bg-white p-6 shadow-sm ring-1 ring-zinc-950/5">
        <h2 className="text-base font-semibold">Offerings</h2>
        <p className="text-sm text-zinc-600">
          Offerings are attached to a pickup window.
        </p>

        <label className="grid gap-1">
          <span className="text-xs font-medium text-zinc-700">Pickup window</span>
          <select
            className="rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm"
            value={selectedWindowId}
            onChange={(e) => setSelectedWindowId(e.target.value)}
          >
            <option value="" disabled>
              Select…
            </option>
            {(windows ?? []).map((w) => (
              <option key={w.id} value={w.id}>
                {new Date(w.start_at).toLocaleString()} ({w.status})
              </option>
            ))}
          </select>
        </label>

        {offerings?.length ? (
          <ul className="grid gap-2">
            {offerings.map((o) => (
              <li key={o.id} className="rounded-xl bg-zinc-50 px-4 py-3 ring-1 ring-zinc-950/5">
                <div className="flex items-baseline justify-between gap-4">
                  <div className="font-medium text-zinc-950">{o.product.title}</div>
                  <div className="text-xs text-zinc-600">
                    ${(o.price_cents / 100).toFixed(2)} | qty {o.quantity_available}
                  </div>
                </div>
              </li>
            ))}
          </ul>
        ) : selectedWindowId ? (
          <div className="text-sm text-zinc-600">No offerings yet.</div>
        ) : (
          <div className="text-sm text-zinc-600">Select a pickup window.</div>
        )}

        <div className="mt-2 grid gap-2 rounded-xl bg-zinc-50 p-4 ring-1 ring-zinc-950/5">
          <div className="text-sm font-medium text-zinc-800">Add an offering</div>
          <div className="grid gap-2 md:grid-cols-2">
            <label className="grid gap-1 md:col-span-2">
              <span className="text-xs font-medium text-zinc-700">Product</span>
              <select
                className="rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm"
                value={offeringProductId}
                onChange={(e) => setOfferingProductId(e.target.value)}
              >
                <option value="" disabled>
                  Select…
                </option>
                {(products ?? []).map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.title} ({p.unit})
                  </option>
                ))}
              </select>
            </label>
            <label className="grid gap-1">
              <span className="text-xs font-medium text-zinc-700">Price (cents)</span>
              <input
                className="rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm"
                type="number"
                value={offeringPriceCents}
                onChange={(e) => setOfferingPriceCents(Number(e.target.value))}
                min={0}
              />
            </label>
            <label className="grid gap-1">
              <span className="text-xs font-medium text-zinc-700">Quantity available</span>
              <input
                className="rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm"
                type="number"
                value={offeringQty}
                onChange={(e) => setOfferingQty(Number(e.target.value))}
                min={0}
              />
            </label>
          </div>
          <button
            className="inline-flex items-center justify-center rounded-full bg-zinc-950 px-4 py-2 text-sm font-medium text-zinc-50 hover:bg-zinc-800 disabled:opacity-50"
            disabled={!readyForOfferings || !offeringProductId}
            onClick={createOffering}
            type="button"
          >
            Create offering
          </button>
        </div>
      </section>
    </div>
  );
}

