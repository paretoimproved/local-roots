"use client";

import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { sellerApi, type SellerPickupLocation } from "@/lib/seller-api";
import { session } from "@/lib/session";
import { useToast } from "@/components/toast";
import { friendlyErrorMessage } from "@/lib/ui";
import {
  AddressAutocomplete,
  type AddressSelection,
} from "@/components/seller/address-autocomplete";
import { TimezoneCombobox } from "@/components/seller/timezone-combobox";

export default function SetupLocationPage() {
  const router = useRouter();
  const params = useParams<{ storeId: string }>();
  const { showToast } = useToast();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [existing, setExisting] = useState<SellerPickupLocation | null>(null);

  // Address fields populated by AddressAutocomplete
  const [address1, setAddress1] = useState("");
  const [city, setCity] = useState("");
  const [region, setRegion] = useState("");
  const [postalCode, setPostalCode] = useState("");
  const [country, setCountry] = useState("US");
  const [lat, setLat] = useState<number | null>(null);
  const [lng, setLng] = useState<number | null>(null);
  const [timezone, setTimezone] = useState("");
  const [formattedAddress, setFormattedAddress] = useState("");
  const [addressSelected, setAddressSelected] = useState(false);

  // Whether timezone auto-detect failed
  const [tzFallback, setTzFallback] = useState(false);

  // Spot name
  const [label, setLabel] = useState("My farm");

  // Initial query for AddressAutocomplete (used for pre-fill)
  const [initialQuery, setInitialQuery] = useState<string | undefined>(
    undefined,
  );

  // Validation
  const [submitted, setSubmitted] = useState(false);

  // Fetch existing locations on mount
  useEffect(() => {
    const token = session.getToken();
    if (!token) {
      router.replace("/seller/login");
      return;
    }

    let cancelled = false;

    sellerApi
      .listPickupLocations(token, params.storeId)
      .then((locations) => {
        if (cancelled) return;
        if (locations.length > 0) {
          const loc = locations[0];
          setExisting(loc);
          setAddress1(loc.address1);
          setCity(loc.city);
          setRegion(loc.region);
          setPostalCode(loc.postal_code);
          setCountry(loc.country);
          setTimezone(loc.timezone);
          setLabel(loc.label ?? "My farm");
          setAddressSelected(true);

          // Build a formatted address for display
          const parts = [loc.address1, loc.city, loc.region, loc.postal_code]
            .filter(Boolean)
            .join(", ");
          setFormattedAddress(parts);
          setInitialQuery(parts);
        }
      })
      .catch((e: unknown) => {
        if (!cancelled) {
          showToast({
            kind: "error",
            message: friendlyErrorMessage(e),
          });
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [params.storeId, router, showToast]);

  const handleAddressSelect = useCallback((details: AddressSelection) => {
    setAddress1(details.address1);
    setCity(details.city);
    setRegion(details.region);
    setPostalCode(details.postal_code);
    setCountry(details.country);
    setLat(details.lat);
    setLng(details.lng);
    setFormattedAddress(details.formattedAddress);
    setAddressSelected(true);

    if (details.timezone) {
      setTimezone(details.timezone);
      setTzFallback(false);
    } else {
      setTimezone("");
      setTzFallback(true);
    }
  }, []);

  const isValid =
    address1.trim() !== "" &&
    city.trim() !== "" &&
    region.trim() !== "" &&
    postalCode.trim() !== "" &&
    timezone.trim() !== "";

  async function handleSubmit() {
    setSubmitted(true);
    if (!isValid) return;

    const token = session.getToken();
    if (!token) {
      router.replace("/seller/login");
      return;
    }

    setSaving(true);
    try {
      const input = {
        label: label.trim() || null,
        address1,
        city,
        region,
        postal_code: postalCode,
        country,
        timezone,
        lat,
        lng,
      };

      if (existing) {
        await sellerApi.updatePickupLocation(
          token,
          params.storeId,
          existing.id,
          input,
        );
      } else {
        await sellerApi.createPickupLocation(token, params.storeId, input);
      }

      router.push(`/seller/stores/${params.storeId}/setup/box`);
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

  const token = session.getToken();
  if (!token) return null;

  return (
    <div className="lr-animate">
      <h1 className="text-2xl font-bold text-[color:var(--lr-ink)]">
        Where will customers pick up their box?
      </h1>
      <p className="mt-2 text-sm text-[color:var(--lr-muted)]">
        Search for your farm or pickup address. We will auto-detect the
        timezone.
      </p>

      <div className="mt-6 space-y-4">
        {/* Address autocomplete */}
        <div>
          <label className="mb-1 block text-sm font-medium text-[color:var(--lr-ink)]">
            Pickup address
          </label>
          <AddressAutocomplete
            token={token}
            initialQuery={initialQuery}
            onSelect={handleAddressSelect}
            onError={(msg) =>
              showToast({ kind: "error", message: msg })
            }
          />
          {submitted && !addressSelected && (
            <p className="mt-1 text-xs text-rose-600">
              Please select an address from the dropdown.
            </p>
          )}
        </div>

        {/* Spot name */}
        <div>
          <label className="mb-1 block text-sm font-medium text-[color:var(--lr-ink)]">
            Spot name{" "}
            <span className="font-normal text-[color:var(--lr-muted)]">
              (optional)
            </span>
          </label>
          <input
            className="lr-field w-full px-3 py-2 text-sm"
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            placeholder="My farm"
          />
        </div>

        {/* Confirmation card */}
        {addressSelected && (
          <div className="lr-card-strong rounded-2xl p-4 lr-animate">
            <div className="flex items-start gap-3">
              <svg
                width="20"
                height="20"
                viewBox="0 0 20 20"
                fill="none"
                className="mt-0.5 shrink-0"
                aria-hidden="true"
              >
                <path
                  d="M5 10.5L8.5 14L15 6"
                  stroke="var(--lr-leaf)"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
              <div className="min-w-0">
                <p className="text-sm font-medium text-[color:var(--lr-ink)]">
                  {formattedAddress}
                </p>
                {timezone && (
                  <p className="mt-1 text-xs text-[color:var(--lr-muted)]">
                    Timezone: {timezone}
                  </p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Timezone fallback */}
        {tzFallback && (
          <div className="lr-animate">
            <label className="mb-1 block text-sm font-medium text-[color:var(--lr-ink)]">
              Timezone
            </label>
            <p className="mb-2 text-xs text-[color:var(--lr-muted)]">
              We could not detect the timezone automatically. Please select
              it below.
            </p>
            <TimezoneCombobox
              value={timezone}
              onChange={(tz) => {
                setTimezone(tz);
              }}
              invalid={submitted && timezone.trim() === ""}
            />
            {submitted && timezone.trim() === "" && (
              <p className="mt-1 text-xs text-rose-600">
                Please select a timezone.
              </p>
            )}
          </div>
        )}
      </div>

      {/* Continue button */}
      <div className="mt-8 flex justify-end">
        <button
          type="button"
          className="lr-btn lr-btn-primary px-6 py-2.5 text-sm font-semibold"
          disabled={saving}
          onClick={handleSubmit}
        >
          {saving ? (
            <span className="flex items-center gap-2">
              <span
                className="inline-block h-4 w-4 rounded-full border-2 border-white border-t-transparent animate-spin"
                aria-hidden="true"
              />
              Saving…
            </span>
          ) : (
            "Continue"
          )}
        </button>
      </div>
    </div>
  );
}
