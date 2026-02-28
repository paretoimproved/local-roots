import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { api } from "@/lib/api";
import type { PickupWindowDetail, Offering } from "@/lib/api";
import { CheckoutForm, type PickupInfo } from "@/components/checkout-form";
import { RefreshButton } from "@/components/refresh-button";
import { formatMoney } from "@/lib/ui";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ pickupWindowId: string }>;
}): Promise<Metadata> {
  const { pickupWindowId } = await params;
  try {
    const pw = await api.getPickupWindow(pickupWindowId);
    const title = `${pw.store_name} Pickup — Local Roots`;
    return {
      title,
      description: `Shop fresh items from ${pw.store_name} and pick them up locally.`,
      openGraph: { title, type: "website" },
    };
  } catch {
    return { title: "Pickup — Local Roots" };
  }
}

function formatPickupDate(iso: string, tz: string) {
  return new Intl.DateTimeFormat("en-US", {
    timeZone: tz || "UTC",
    weekday: "short",
    month: "short",
    day: "numeric",
  }).format(new Date(iso));
}

function formatPickupTime(iso: string, tz: string) {
  return new Intl.DateTimeFormat("en-US", {
    timeZone: tz || "UTC",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(iso));
}

function shortDate(iso: string, tz: string) {
  return new Intl.DateTimeFormat("en-US", {
    timeZone: tz || "UTC",
    month: "short",
    day: "numeric",
  }).format(new Date(iso));
}

export default async function PickupWindowOfferingsPage({
  params,
}: {
  params: Promise<{ pickupWindowId: string }>;
}) {
  const { pickupWindowId } = await params;

  const [windowResult, offeringsResult] = await Promise.allSettled([
    api.getPickupWindow(pickupWindowId),
    api.listPickupWindowOfferings(pickupWindowId),
  ]);

  const windowDetail: PickupWindowDetail | null =
    windowResult.status === "fulfilled" ? windowResult.value : null;
  const offerings: Offering[] =
    offeringsResult.status === "fulfilled" ? offeringsResult.value : [];
  const offeringsError =
    offeringsResult.status === "rejected"
      ? offeringsResult.reason instanceof Error
        ? offeringsResult.reason.message
        : "Unknown error"
      : null;

  const tz = windowDetail?.pickup_location.timezone || "UTC";
  const storeName = windowDetail?.store_name ?? "Farm";
  const storeId = windowDetail?.store_id;
  const dateLabel = windowDetail
    ? `${formatPickupDate(windowDetail.start_at, tz)}, ${formatPickupTime(windowDetail.start_at, tz)}`
    : null;
  const breadcrumbDate = windowDetail
    ? `${shortDate(windowDetail.start_at, tz)} pickup`
    : "Pickup";

  const pickupInfo: PickupInfo | undefined = windowDetail
    ? {
        date: formatPickupDate(windowDetail.start_at, tz),
        time: formatPickupTime(windowDetail.start_at, tz),
        locationName: windowDetail.pickup_location.label,
        locationAddress: `${windowDetail.pickup_location.address1}, ${windowDetail.pickup_location.city}, ${windowDetail.pickup_location.region}`,
      }
    : undefined;

  return (
    <div className="grid gap-6">
      {/* Breadcrumb */}
      <nav className="text-sm text-[color:var(--lr-muted)]">
        <Link className="hover:text-[color:var(--lr-ink)] hover:underline" href="/stores">
          Farms
        </Link>
        <span className="mx-2">&rarr;</span>
        {storeId ? (
          <Link
            className="hover:text-[color:var(--lr-ink)] hover:underline"
            href={`/stores/${storeId}`}
          >
            {storeName}
          </Link>
        ) : (
          <span>{storeName}</span>
        )}
        <span className="mx-2">&rarr;</span>
        <span className="text-[color:var(--lr-ink)]">{breadcrumbDate}</span>
      </nav>

      {/* Heading */}
      <div className="grid gap-1">
        <h1 className="text-3xl font-semibold tracking-tight text-[color:var(--lr-ink)]">
          {storeName}
        </h1>
        {dateLabel ? (
          <p className="text-sm text-[color:var(--lr-muted)]">{dateLabel}</p>
        ) : null}
      </div>

      {offeringsError ? (
        <div className="lr-card lr-card-strong p-6">
          <p className="text-sm font-medium text-[color:var(--lr-ink)]">
            Could not load offerings
          </p>
          <p className="mt-2 text-sm text-[color:var(--lr-muted)]">{offeringsError}</p>
          <RefreshButton />
        </div>
      ) : null}

      {!offeringsError && offerings.length === 0 ? (
        <div className="lr-card lr-card-strong p-6">
          <p className="text-sm text-[color:var(--lr-muted)]">No offerings yet.</p>
        </div>
      ) : null}

      {offerings.length > 0 ? (
        <div className="grid gap-4 md:grid-cols-[1.35fr_0.9fr] md:items-start">
          <ul className="grid gap-3">
            {offerings.map((o) => (
              <li
                key={o.id}
                className="lr-card lr-card-strong p-6 transition hover:-translate-y-0.5 hover:shadow-[0_22px_60px_rgba(38,28,10,0.14)]"
              >
                <div className="flex items-center gap-4">
                  {o.product.image_url ? (
                    <div className="relative h-[80px] w-[80px] flex-shrink-0 overflow-hidden rounded-lg">
                      <Image
                        src={o.product.image_url}
                        alt={o.product.title}
                        fill
                        className="object-cover"
                        sizes="80px"
                      />
                    </div>
                  ) : null}
                  <div>
                    <h2 className="text-lg font-semibold text-[color:var(--lr-ink)]">
                      {o.product.title}
                    </h2>
                    <p className="mt-2 text-sm text-[color:var(--lr-muted)]">
                      {formatMoney(o.price_cents)} · {o.product.unit}
                      {o.product.description
                        ? ` · ${o.product.description}`
                        : ""}
                    </p>
                  </div>
                </div>
              </li>
            ))}
          </ul>

          <div className="md:sticky md:top-6">
            <CheckoutForm pickupWindowId={pickupWindowId} offerings={offerings} pickupInfo={pickupInfo} />
          </div>
        </div>
      ) : null}
    </div>
  );
}
