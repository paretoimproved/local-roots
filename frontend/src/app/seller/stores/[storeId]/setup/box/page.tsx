"use client";

import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import {
  sellerApi,
  type SellerSubscriptionPlan,
} from "@/lib/seller-api";
import { session } from "@/lib/session";
import { useToast } from "@/components/toast";
import { fieldClass, friendlyErrorMessage } from "@/lib/ui";
import { ImageUpload } from "@/components/seller/image-upload";

function parseUSDToCents(raw: string): number | null {
  const v = raw.trim();
  if (!v) return 0;
  const n = Number.parseFloat(v);
  if (!Number.isFinite(n)) return null;
  const cents = Math.round(n * 100);
  if (cents < 0) return null;
  return cents;
}

function toUSDInput(cents: number): string {
  return (cents / 100).toFixed(2);
}

function defaultFirstPickup(): string {
  const now = new Date();
  const d = new Date(now);
  const targetDow = 6; // Saturday
  const daysAhead = (targetDow - d.getDay() + 7) % 7;
  d.setDate(d.getDate() + daysAhead);
  d.setHours(10, 0, 0, 0);
  if (daysAhead === 0 && now.getTime() >= d.getTime()) d.setDate(d.getDate() + 7);
  const pad2 = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}T${pad2(d.getHours())}:${pad2(d.getMinutes())}`;
}

type Cadence = "weekly" | "biweekly" | "monthly";

const CADENCE_OPTIONS: { value: Cadence; label: string }[] = [
  { value: "weekly", label: "Every week" },
  { value: "biweekly", label: "Every 2 weeks" },
  { value: "monthly", label: "Monthly" },
];

export default function BoxPage() {
  const params = useParams<{ storeId: string }>();
  const storeId = params.storeId;
  const router = useRouter();
  const { showToast, clearToast } = useToast();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [existingPlan, setExistingPlan] = useState<SellerSubscriptionPlan | null>(null);
  const [locationId, setLocationId] = useState<string | null>(null);

  // Form fields
  const [title, setTitle] = useState("Weekly Farm Box");
  const [description, setDescription] = useState("");
  const [priceUsd, setPriceUsd] = useState("");
  const [cadence, setCadence] = useState<Cadence>("weekly");
  const [subscriberLimit, setSubscriberLimit] = useState(25);
  const [firstStartAt, setFirstStartAt] = useState(defaultFirstPickup);

  // Validation
  const [touched, setTouched] = useState(false);
  const titleErr = touched && !title.trim();
  const priceErr = touched && (parseUSDToCents(priceUsd) === null || parseUSDToCents(priceUsd) === 0);
  const limitErr = touched && subscriberLimit < 1;
  const dateErr = touched && !firstStartAt;

  useEffect(() => {
    const token = session.getToken();
    if (!token) {
      router.replace("/seller/login");
      return;
    }

    let cancelled = false;

    async function load() {
      try {
        const [locations, plans] = await Promise.all([
          sellerApi.listPickupLocations(token!, storeId),
          sellerApi.listSubscriptionPlans(token!, storeId),
        ]);

        if (cancelled) return;

        if (locations.length === 0) {
          router.replace(`/seller/stores/${storeId}/setup/location`);
          return;
        }

        setLocationId(locations[0].id);

        if (plans.length > 0) {
          const plan = plans.find((p) => p.is_active) ?? plans[0];
          setExistingPlan(plan);
          setTitle(plan.title);
          setDescription(plan.description ?? "");
          setPriceUsd(toUSDInput(plan.price_cents));
          setCadence(plan.cadence as Cadence);
          setSubscriberLimit(plan.subscriber_limit);
          // Keep the default first pickup for editing since it's already set on the plan
        }
      } catch (e: unknown) {
        if (!cancelled) {
          showToast({ kind: "error", message: friendlyErrorMessage(e) });
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [storeId]);

  async function handleSubmit() {
    setTouched(true);
    clearToast();

    const cents = parseUSDToCents(priceUsd);
    if (!title.trim() || cents === null || cents <= 0 || subscriberLimit < 1 || !firstStartAt) {
      return;
    }

    const token = session.getToken();
    if (!token || !locationId) return;

    setSaving(true);
    try {
      const desc = description.trim() || null;
      if (existingPlan) {
        await sellerApi.updateSubscriptionPlan(token, storeId, existingPlan.id, {
          title: title.trim(),
          description: desc,
          price_cents: cents,
          subscriber_limit: subscriberLimit,
        });
        showToast({ kind: "success", message: "Box saved." });
        router.push(`/seller/stores/${storeId}/setup/payouts`);
      } else {
        const created = await sellerApi.createSubscriptionPlan(token, storeId, {
          pickup_location_id: locationId,
          title: title.trim(),
          description: desc,
          cadence,
          price_cents: cents,
          subscriber_limit: subscriberLimit,
          first_start_at_local: firstStartAt,
          duration_minutes: 120,
          cutoff_hours: 24,
        });
        setExistingPlan(created);
        showToast({ kind: "success", message: "Box saved. Add a photo below, then continue." });
      }
    } catch (e: unknown) {
      showToast({ kind: "error", message: friendlyErrorMessage(e) });
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div
          className="h-6 w-6 rounded-full border-2 border-[color:var(--lr-leaf)] border-t-transparent animate-spin"
          role="status"
          aria-label="Loading"
        />
      </div>
    );
  }

  return (
    <div className="lr-card lr-animate grid gap-6 p-6 sm:p-8">
      <div>
        <h1 className="text-xl font-semibold tracking-tight">
          Build your first farm box
        </h1>
        <p className="mt-1 text-sm text-[color:var(--lr-muted)]">
          Set up a recurring pickup box for your customers.
        </p>
      </div>

      {/* Box name */}
      <label className="grid gap-1">
        <span className="text-sm font-medium text-[color:var(--lr-muted)]">
          Box name
        </span>
        <input
          className={fieldClass("lr-field px-3 py-2 text-sm", titleErr)}
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="e.g. Weekly Farm Box"
        />
        {titleErr && (
          <span className="text-xs text-rose-600">Box name is required.</span>
        )}
        <p className="text-sm mt-1" style={{ color: 'var(--lr-muted)' }}>Tip: Keep it descriptive — &apos;Weekly Veggie Box&apos; or &apos;Farm Fresh Egg Share&apos;</p>
      </label>

      {/* Description */}
      <label className="grid gap-1">
        <span className="text-sm font-medium text-[color:var(--lr-muted)]">
          Description
        </span>
        <textarea
          className="lr-field min-h-20 px-3 py-2 text-sm"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="What's in the box? Tell your customers what to expect."
        />
        <span className="text-xs text-[color:var(--lr-muted)]">
          Optional. Shown on your box page.
        </span>
        <p className="text-sm mt-1" style={{ color: 'var(--lr-muted)' }}>Tip: Mention specific items like &apos;seasonal greens, fresh eggs, and honey&apos;</p>
      </label>

      {/* Price */}
      <label className="grid gap-1">
        <span className="text-sm font-medium text-[color:var(--lr-muted)]">
          Price per box
        </span>
        <div className="relative">
          <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-[color:var(--lr-muted)]">
            $
          </span>
          <input
            className={fieldClass("lr-field py-2 pl-7 pr-3 text-sm w-full", priceErr)}
            type="text"
            inputMode="decimal"
            value={priceUsd}
            onChange={(e) => setPriceUsd(e.target.value)}
            placeholder="25.00"
          />
        </div>
        {priceErr && (
          <span className="text-xs text-rose-600">
            Enter a valid price greater than $0.
          </span>
        )}
        <p className="text-sm mt-1" style={{ color: 'var(--lr-muted)' }}>Tip: Most farm boxes in your area are $35–55/week</p>
      </label>

      {/* Cadence radio buttons */}
      <fieldset className="grid gap-2">
        <legend className="text-sm font-medium text-[color:var(--lr-muted)]">
          How often?
        </legend>
        <div className="flex flex-wrap gap-2">
          {CADENCE_OPTIONS.map((opt) => {
            const selected = cadence === opt.value;
            return (
              <label
                key={opt.value}
                className={`lr-chip cursor-pointer rounded-full px-4 py-2 text-sm font-medium transition-colors ${
                  selected
                    ? "border-[color:var(--lr-leaf)] bg-[color:var(--lr-leaf)]/10 text-[color:var(--lr-leaf)]"
                    : "text-[color:var(--lr-ink)] hover:bg-white/80"
                }`}
              >
                <input
                  type="radio"
                  name="cadence"
                  value={opt.value}
                  checked={selected}
                  onChange={() => setCadence(opt.value)}
                  className="sr-only"
                />
                {opt.label}
              </label>
            );
          })}
        </div>
      </fieldset>

      {/* Max customers */}
      <label className="grid gap-1">
        <span className="text-sm font-medium text-[color:var(--lr-muted)]">
          How many customers?
        </span>
        <input
          className={fieldClass("lr-field px-3 py-2 text-sm", limitErr)}
          type="number"
          min={1}
          value={subscriberLimit}
          onChange={(e) =>
            setSubscriberLimit(Math.max(1, Number.parseInt(e.target.value) || 1))
          }
        />
        {limitErr ? (
          <span className="text-xs text-rose-600">Must be at least 1.</span>
        ) : (
          <span className="text-xs text-[color:var(--lr-muted)]">
            You can always change this later.
          </span>
        )}
      </label>

      {/* First pickup */}
      <label className="grid gap-1">
        <span className="text-sm font-medium text-[color:var(--lr-muted)]">
          When&apos;s your first pickup?
        </span>
        <input
          className={fieldClass("lr-field px-3 py-2 text-sm", dateErr)}
          type="datetime-local"
          value={firstStartAt}
          onChange={(e) => setFirstStartAt(e.target.value)}
        />
        {dateErr && (
          <span className="text-xs text-rose-600">Pick a date and time.</span>
        )}
      </label>

      {/* Box photo (shown after plan is saved) */}
      {existingPlan && (
        <div className="grid gap-1">
          <span className="text-sm font-medium text-[color:var(--lr-muted)]">
            Box photo
          </span>
          <ImageUpload
            currentUrl={existingPlan.image_url ?? null}
            storagePath={`stores/${storeId}/products/${existingPlan.product_id}`}
            onUploaded={async (url) => {
              const t = session.getToken();
              if (!t) return;
              try {
                await sellerApi.updateSubscriptionPlan(t, storeId, existingPlan.id, { image_url: url });
                setExistingPlan((p) => p ? { ...p, image_url: url } : p);
                showToast({ kind: "success", message: "Photo saved." });
              } catch (e: unknown) {
                showToast({ kind: "error", message: friendlyErrorMessage(e) });
              }
            }}
            onRemoved={async () => {
              const t = session.getToken();
              if (!t) return;
              try {
                await sellerApi.updateSubscriptionPlan(t, storeId, existingPlan.id, { image_url: "" });
                setExistingPlan((p) => p ? { ...p, image_url: null } : p);
                showToast({ kind: "success", message: "Photo removed." });
              } catch (e: unknown) {
                showToast({ kind: "error", message: friendlyErrorMessage(e) });
              }
            }}
            placeholderText="Add a photo of your box"
            aspectRatio="4/3"
          />
          <span className="text-xs text-[color:var(--lr-muted)]">
            Optional. Shown on your box listing.
          </span>
        </div>
      )}

      {/* Save / Continue buttons */}
      <div className="flex justify-end gap-3 pt-2">
        <button
          type="button"
          className="lr-btn lr-btn-primary px-6 py-2.5 text-sm font-medium disabled:opacity-50"
          disabled={saving}
          onClick={handleSubmit}
        >
          {saving ? "Saving..." : existingPlan ? "Save" : "Save box"}
        </button>
        {existingPlan && (
          <button
            type="button"
            className="lr-btn lr-btn-primary px-6 py-2.5 text-sm font-medium"
            onClick={() => router.push(`/seller/stores/${storeId}/setup/payouts`)}
          >
            Continue &rarr;
          </button>
        )}
      </div>
    </div>
  );
}
