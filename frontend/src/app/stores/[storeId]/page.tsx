import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { api } from "@/lib/api";
import type { PickupWindow, SubscriptionPlan, Offering, ReviewsResponse } from "@/lib/api";
import { formatMoney } from "@/lib/ui";
import { ReviewSummary, ReviewCard } from "@/components/review-card";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ storeId: string }>;
}): Promise<Metadata> {
  const { storeId } = await params;
  try {
    const store = await api.getStore(storeId);
    const title = `${store.name} — Local Roots`;
    const description = store.description
      ? `${store.description.slice(0, 150)} — subscribe to farm boxes and pick up fresh food.`
      : `Subscribe to farm boxes from ${store.name} and pick up fresh, local food.`;
    return {
      title,
      description,
      openGraph: { title, description, type: "website" },
    };
  } catch {
    return { title: "Farm — Local Roots" };
  }
}

/* ── helpers ─────────────────────────────────────────────────────── */

function cadenceLabel(c: string) {
  if (c === "weekly") return "Weekly";
  if (c === "biweekly") return "Every two weeks";
  if (c === "monthly") return "Monthly";
  return c;
}

function formatDate(iso: string, tz: string) {
  return new Intl.DateTimeFormat("en-US", {
    timeZone: tz || "UTC",
    weekday: "short",
    month: "short",
    day: "numeric",
  }).format(new Date(iso));
}

function formatTime(iso: string, tz: string) {
  return new Intl.DateTimeFormat("en-US", {
    timeZone: tz || "UTC",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(iso));
}

function formatNext(plan: SubscriptionPlan) {
  const tz = plan.pickup_location.timezone || "UTC";
  const start = new Date(plan.next_start_at);
  return new Intl.DateTimeFormat("en-US", {
    timeZone: tz,
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(start);
}

function fullAddress(loc: { address1: string; city: string; region: string; postal_code: string }) {
  return `${loc.address1}, ${loc.city}, ${loc.region} ${loc.postal_code}`;
}

function mapsDirectionsUrl(address: string) {
  return `https://maps.google.com/maps/dir/?api=1&destination=${encodeURIComponent(address)}`;
}

function staticMapUrl(lat: number, lng: number) {
  const key = process.env.NEXT_PUBLIC_GOOGLE_MAPS_KEY;
  if (!key) return null;
  return `https://maps.googleapis.com/maps/api/staticmap?center=${lat},${lng}&zoom=14&size=400x250&markers=color:green%7C${lat},${lng}&key=${key}&style=feature:poi|visibility:off`;
}

/* Group pickup windows by location ID */
type LocationGroup = {
  locationId: string;
  label: string | null;
  address1: string;
  city: string;
  region: string;
  postal_code: string;
  timezone: string;
  lat: number | null;
  lng: number | null;
  instructions: string | null;
  photo_url: string | null;
  windows: PickupWindow[];
};

function groupByLocation(windows: PickupWindow[]): LocationGroup[] {
  const map = new Map<string, LocationGroup>();
  for (const pw of windows) {
    const loc = pw.pickup_location;
    const key = loc.id;
    let group = map.get(key);
    if (!group) {
      group = {
        locationId: key,
        label: loc.label,
        address1: loc.address1,
        city: loc.city,
        region: loc.region,
        postal_code: loc.postal_code,
        timezone: loc.timezone,
        lat: loc.lat ?? null,
        lng: loc.lng ?? null,
        instructions: loc.instructions ?? null,
        photo_url: loc.photo_url ?? null,
        windows: [],
      };
      map.set(key, group);
    }
    group.windows.push(pw);
  }
  return Array.from(map.values());
}

/* ── page ────────────────────────────────────────────────────────── */

export default async function StoreDetailPage({
  params,
}: {
  params: Promise<{ storeId: string }>;
}) {
  const { storeId } = await params;

  const [storeResult, windowsResult, plansResult, reviewsResult] =
    await Promise.allSettled([
      api.getStore(storeId),
      api.listStorePickupWindows(storeId),
      api.listStoreSubscriptionPlans(storeId),
      api.listStoreReviews(storeId),
    ]);

  const store = storeResult.status === "fulfilled" ? storeResult.value : null;
  const windows = windowsResult.status === "fulfilled" ? windowsResult.value : [];
  const plans = plansResult.status === "fulfilled" ? plansResult.value : [];
  const reviews: ReviewsResponse | null =
    reviewsResult.status === "fulfilled" ? reviewsResult.value : null;

  if (!store) {
    const err =
      storeResult.status === "rejected"
        ? storeResult.reason instanceof Error
          ? storeResult.reason.message
          : "Unknown error"
        : "Store not found";
    return (
      <div className="grid gap-6">
        <div className="lr-card lr-card-strong p-6">
          <p className="text-sm font-medium text-[color:var(--lr-ink)]">
            Could not load store
          </p>
          <p className="mt-2 text-sm text-[color:var(--lr-muted)]">{err}</p>
        </div>
      </div>
    );
  }

  const storeName = store.name;
  const livePlans = plans.filter((p) => p.is_live);
  const locationGroups = groupByLocation(windows);

  // Find the first upcoming window for walk-up items
  const nextWindow = windows[0] ?? null;
  let walkUpOfferings: Offering[] = [];
  if (nextWindow) {
    try {
      walkUpOfferings = await api.listPickupWindowOfferings(nextWindow.id);
    } catch {
      // silently fail — walk-up section just won't show
    }
  }

  const hasSubscriptions = livePlans.length > 0;
  const hasWalkUp = walkUpOfferings.length > 0;
  const hasAvailable = hasSubscriptions || hasWalkUp;
  const hasReviews = reviews && reviews.review_count > 0;

  return (
    <div className="grid gap-8">
      {/* ── Breadcrumb ────────────────────────────────────────── */}
      <nav className="text-sm text-[color:var(--lr-muted)]">
        <Link className="hover:text-[color:var(--lr-ink)] hover:underline" href="/stores">
          Farms
        </Link>
        <span className="mx-2">→</span>
        <span className="text-[color:var(--lr-ink)]">{storeName}</span>
      </nav>

      {/* ── Hero section ──────────────────────────────────────── */}
      {store.image_url ? (
        <section className="relative aspect-[3/1] w-full overflow-hidden rounded-2xl">
          <Image
            src={store.image_url}
            alt={storeName}
            fill
            className="object-cover"
            sizes="(max-width: 768px) 100vw, 900px"
            priority
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
          <div className="absolute bottom-0 left-0 right-0 grid gap-1 p-5 sm:p-6">
            <h1 className="text-2xl font-semibold tracking-tight text-white sm:text-3xl">
              {storeName}
            </h1>
            {store.city && store.region ? (
              <p className="text-sm text-white/80">
                {store.city}, {store.region}
              </p>
            ) : null}
            {hasReviews ? (
              <div className="mt-1">
                <ReviewSummary
                  avgRating={reviews.avg_rating}
                  reviewCount={reviews.review_count}
                  className="inline-flex items-center gap-2 text-sm text-white/80"
                />
              </div>
            ) : null}
          </div>
        </section>
      ) : (
        <section className="grid gap-2">
          <h1 className="text-3xl font-semibold tracking-tight text-[color:var(--lr-ink)]">
            {storeName}
          </h1>
          {store.description ? (
            <p className="text-sm text-[color:var(--lr-muted)]">
              {store.description}
            </p>
          ) : null}
          {hasReviews ? (
            <div className="mt-1">
              <ReviewSummary
                avgRating={reviews.avg_rating}
                reviewCount={reviews.review_count}
              />
            </div>
          ) : null}
        </section>
      )}

      {/* ── Pickup locations ──────────────────────────────────── */}
      {locationGroups.length > 0 ? (
        <section className="grid gap-4">
          <h2 className="text-base font-semibold text-[color:var(--lr-ink)]">
            Pickup locations
          </h2>
          <div className="grid gap-4">
            {locationGroups.map((loc) => {
              const addr = fullAddress(loc);
              const mapUrl =
                loc.lat != null && loc.lng != null
                  ? staticMapUrl(loc.lat, loc.lng)
                  : null;
              const dirUrl = mapsDirectionsUrl(addr);

              return (
                <div
                  key={loc.locationId}
                  className="lr-card lr-card-strong overflow-hidden"
                >
                  <div className="grid gap-0 sm:grid-cols-[1fr_auto]">
                    {/* Mobile: photo or map on top */}
                    <div className="sm:hidden">
                      {loc.photo_url ? (
                        <div className="relative h-[130px] w-full">
                          <Image
                            src={loc.photo_url}
                            alt={loc.label ?? "Pickup spot"}
                            fill
                            className="object-cover"
                            sizes="100vw"
                          />
                        </div>
                      ) : loc.lat && loc.lng && mapUrl ? (
                        <a
                          href={dirUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="block"
                        >
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={mapUrl}
                            alt={`Map of ${loc.label ?? addr}`}
                            className="h-40 w-full object-cover"
                          />
                        </a>
                      ) : null}
                    </div>

                    {/* Left side: details */}
                    <div className="p-5">
                      <div className="text-base font-semibold text-[color:var(--lr-ink)]">
                        {loc.label ?? "Pickup spot"}
                      </div>
                      <div className="mt-1 text-sm text-[color:var(--lr-muted)]">
                        <a
                          href={dirUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="hover:text-[color:var(--lr-ink)] hover:underline"
                        >
                          {addr}
                        </a>
                      </div>

                      {loc.instructions ? (
                        <div className="mt-3">
                          <div className="text-xs font-semibold uppercase tracking-wide text-[color:var(--lr-muted)]">
                            What to expect
                          </div>
                          <p className="mt-1 text-sm text-[color:var(--lr-ink)]">
                            {loc.instructions}
                          </p>
                        </div>
                      ) : null}

                      {loc.windows.length > 0 ? (
                        <div className="mt-4">
                          <div className="text-xs font-semibold uppercase tracking-wide text-[color:var(--lr-muted)]">
                            Upcoming pickups
                          </div>
                          <ul className="mt-2 grid gap-1">
                            {loc.windows.slice(0, 3).map((pw) => (
                              <li
                                key={pw.id}
                                className="text-sm text-[color:var(--lr-muted)]"
                              >
                                {formatDate(pw.start_at, loc.timezone)} ·{" "}
                                {formatTime(pw.start_at, loc.timezone)} –{" "}
                                {formatTime(pw.end_at, loc.timezone)}
                              </li>
                            ))}
                            {loc.windows.length > 3 ? (
                              <li className="text-xs text-[color:var(--lr-muted)]">
                                +{loc.windows.length - 3} more pickups
                              </li>
                            ) : null}
                          </ul>
                        </div>
                      ) : null}
                    </div>

                    {/* Right side: photo or static map (desktop only) */}
                    <div className="hidden sm:block">
                      {loc.photo_url ? (
                        <div className="relative h-full w-[200px]">
                          <Image
                            src={loc.photo_url}
                            alt={loc.label ?? "Pickup spot"}
                            fill
                            className="object-cover"
                            sizes="200px"
                          />
                        </div>
                      ) : loc.lat && loc.lng && mapUrl ? (
                        <a
                          href={dirUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="block h-full"
                        >
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={mapUrl}
                            alt={`Map of ${loc.label ?? addr}`}
                            className="h-full w-60 object-cover"
                          />
                        </a>
                      ) : (
                        <div className="flex h-full w-60 items-center justify-center bg-white/40 text-[color:var(--lr-muted)]">
                          <a
                            href={dirUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="grid justify-items-center gap-2 p-6 text-center hover:text-[color:var(--lr-ink)]"
                          >
                            <svg aria-hidden="true" className="h-8 w-8" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
                              <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1 1 15 0Z" />
                            </svg>
                            <span className="text-xs">Get directions</span>
                          </a>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      ) : null}

      {/* ── What's available ──────────────────────────────────── */}
      <section className="grid gap-4">
        <h2 className="text-base font-semibold text-[color:var(--lr-ink)]">
          What&apos;s available
        </h2>

        {!hasAvailable ? (
          <div className="lr-card lr-card-strong p-6">
            <p className="text-sm text-[color:var(--lr-muted)]">
              This farm hasn&apos;t posted any offerings yet. Check back soon.
            </p>
          </div>
        ) : null}

        {/* Subscription boxes */}
        {hasSubscriptions ? (
          <div className="grid gap-4 md:grid-cols-2">
            {livePlans.map((p) => (
              <Link
                key={p.id}
                href={`/boxes/${p.id}`}
                className="lr-card lr-card-strong flex flex-col overflow-hidden transition hover:-translate-y-0.5 hover:shadow-[0_22px_60px_rgba(38,28,10,0.14)]"
              >
                {p.image_url ? (
                  <div className="relative aspect-[16/9] w-full">
                    <Image
                      src={p.image_url}
                      alt={p.title}
                      fill
                      className="object-cover"
                      sizes="(max-width: 768px) 100vw, 400px"
                    />
                  </div>
                ) : null}
                <div className="flex flex-1 flex-col gap-3 p-5">
                  <div>
                    <div className="text-lg font-semibold text-[color:var(--lr-ink)]">
                      {p.title}
                    </div>
                    {p.description ? (
                      <p className="mt-1 text-sm text-[color:var(--lr-muted)]">
                        {p.description}
                      </p>
                    ) : null}
                  </div>
                  <div className="text-xl font-bold text-[color:var(--lr-leaf)]">
                    {formatMoney(p.price_cents)}
                    <span className="text-sm font-normal text-[color:var(--lr-muted)]">
                      {" "}/ box
                    </span>
                  </div>
                  <div className="flex flex-wrap items-center gap-2 text-sm text-[color:var(--lr-muted)]">
                    <span className="lr-chip rounded-full px-3 py-1">
                      {cadenceLabel(p.cadence)}
                    </span>
                    <span className="lr-chip rounded-full px-3 py-1">
                      Next: {formatNext(p)}
                    </span>
                  </div>
                  <div className="mt-auto pt-2">
                    <span className="lr-btn lr-btn-primary px-4 py-2 text-sm font-semibold">
                      Subscribe
                    </span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        ) : null}

        {/* Walk-up items */}
        {hasWalkUp && nextWindow ? (
          <div className="grid gap-3">
            <h3 className="text-sm font-semibold text-[color:var(--lr-muted)]">
              Or buy once at the next pickup
            </h3>
            <div className="grid gap-2 sm:grid-cols-2">
              {walkUpOfferings.slice(0, 8).map((o) => (
                <div
                  key={o.id}
                  className="lr-card lr-card-strong flex items-center gap-3 p-3"
                >
                  <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-lg bg-[color:var(--lr-leaf)]/10">
                    <svg aria-hidden="true" className="h-6 w-6 text-[color:var(--lr-leaf)]" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.042A8.967 8.967 0 0 0 6 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 0 1 6 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 0 1 6-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0 0 18 18a8.967 8.967 0 0 0-6 2.292m0-14.25v14.25" />
                    </svg>
                  </div>
                  <div className="min-w-0">
                    <div className="text-sm font-semibold text-[color:var(--lr-ink)]">
                      {o.product.title}
                    </div>
                    <div className="text-sm text-[color:var(--lr-muted)]">
                      {formatMoney(o.price_cents)} / {o.product.unit} · {o.quantity_remaining} left
                    </div>
                  </div>
                </div>
              ))}
            </div>
            <div>
              <Link
                className="lr-btn lr-btn-primary px-4 py-2 text-sm font-semibold"
                href={`/pickup-windows/${nextWindow.id}`}
              >
                Shop this pickup
              </Link>
            </div>
          </div>
        ) : null}
      </section>

      {/* ── Reviews ───────────────────────────────────────────── */}
      {hasReviews && reviews.reviews.length > 0 ? (
        <section className="grid gap-4">
          <h2 className="text-base font-semibold text-[color:var(--lr-ink)]">
            What buyers are saying
          </h2>
          <div className="grid gap-3">
            {reviews.reviews.slice(0, 3).map((r) => (
              <ReviewCard key={r.id} review={r} />
            ))}
          </div>
          {reviews.review_count > 3 ? (
            <Link
              className="text-sm text-[color:var(--lr-muted)] hover:text-[color:var(--lr-ink)] hover:underline"
              href={`/stores/${storeId}/boxes`}
            >
              See all {reviews.review_count} reviews
            </Link>
          ) : null}
        </section>
      ) : null}
    </div>
  );
}
