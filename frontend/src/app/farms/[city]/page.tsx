import type { Metadata } from "next";
import Link from "next/link";
import { api } from "@/lib/api";
import type { Store } from "@/lib/api";
import { StoreCard } from "@/components/store-card";

/* ── helpers ─────────────────────────────────────────────────────── */

type CityEntry = {
  city: string;
  region: string;
  slug: string;
  store_count: number;
};

function matchCity(slug: string, cities: CityEntry[]): CityEntry | null {
  return cities.find((c) => c.slug === slug) ?? null;
}

type StoreWithNew = Store & { isNew: boolean };

function storesInCity(stores: Store[], city: CityEntry): StoreWithNew[] {
  const c = city.city.toLowerCase();
  const r = city.region.toLowerCase();
  const now = Date.now();
  const thirtyDays = 30 * 24 * 60 * 60 * 1000;
  return stores
    .filter(
      (s) =>
        s.city?.toLowerCase() === c && s.region?.toLowerCase() === r,
    )
    .map((s) => ({
      ...s,
      isNew: now - new Date(s.created_at).getTime() < thirtyDays,
    }));
}

function jsonLd(city: CityEntry, stores: Store[]) {
  return {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: `Local Farms in ${city.city}, ${city.region}`,
    description: `Browse ${stores.length} local farm${stores.length !== 1 ? "s" : ""} offering fresh pickup boxes in ${city.city}, ${city.region}.`,
    numberOfItems: stores.length,
    itemListElement: stores.map((s, i) => ({
      "@type": "ListItem",
      position: i + 1,
      item: {
        "@type": "LocalBusiness",
        "@id": `${process.env.NEXT_PUBLIC_SITE_URL ?? "https://localroots.farm"}/stores/${s.id}`,
        name: s.name,
        ...(s.description ? { description: s.description } : {}),
        ...(s.image_url ? { image: s.image_url } : {}),
        address: {
          "@type": "PostalAddress",
          addressLocality: city.city,
          addressRegion: city.region,
        },
      },
    })),
  };
}

/* ── metadata ────────────────────────────────────────────────────── */

export async function generateMetadata({
  params,
}: {
  params: Promise<{ city: string }>;
}): Promise<Metadata> {
  const { city: slug } = await params;
  try {
    const cities = await api.listCities();
    const entry = matchCity(slug, cities);
    if (!entry) return { title: "City — Local Roots" };

    const title = `Local Farms in ${entry.city}, ${entry.region} — Local Roots`;
    const description = `Browse ${entry.store_count} local farm${entry.store_count !== 1 ? "s" : ""} offering fresh pickup boxes in ${entry.city}, ${entry.region}. Subscribe for weekly farm-fresh food.`;
    return {
      title,
      description,
      openGraph: { title, description, type: "website" },
    };
  } catch {
    return { title: "City — Local Roots" };
  }
}

/* ── page ────────────────────────────────────────────────────────── */

export default async function CityPage({
  params,
}: {
  params: Promise<{ city: string }>;
}) {
  const { city: slug } = await params;

  const [citiesResult, storesResult] = await Promise.allSettled([
    api.listCities(),
    api.listStores(),
  ]);

  const cities =
    citiesResult.status === "fulfilled" ? citiesResult.value : [];
  const allStores =
    storesResult.status === "fulfilled" ? storesResult.value : [];

  const entry = matchCity(slug, cities);

  /* ── city not found ──────────────────────────────────────────── */
  if (!entry) {
    return (
      <div className="grid gap-6">
        <nav className="text-sm text-[color:var(--lr-muted)]">
          <Link
            className="hover:text-[color:var(--lr-ink)] hover:underline"
            href="/stores"
          >
            All farms
          </Link>
        </nav>

        <div className="lr-card lr-card-strong p-8 text-center">
          <h1 className="text-2xl font-semibold text-[color:var(--lr-ink)]">
            City not found
          </h1>
          <p className="mt-2 text-sm text-[color:var(--lr-muted)]">
            We couldn&apos;t find a city matching &ldquo;{slug}&rdquo;. Browse
            all available farms instead.
          </p>
          <div className="mt-6">
            <Link
              className="lr-btn lr-btn-primary px-5 py-2.5 text-sm font-semibold"
              href="/stores"
            >
              Browse all farms
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const stores = storesInCity(allStores, entry);
  const cityLabel = `${entry.city}, ${entry.region}`;

  return (
    <div className="grid gap-8">
      {/* JSON-LD structured data */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd(entry, stores)) }}
      />

      {/* ── Breadcrumb ────────────────────────────────────────── */}
      <nav className="text-sm text-[color:var(--lr-muted)]">
        <Link
          className="hover:text-[color:var(--lr-ink)] hover:underline"
          href="/stores"
        >
          All farms
        </Link>
        <span className="mx-2">&rarr;</span>
        <span className="text-[color:var(--lr-ink)]">{cityLabel}</span>
      </nav>

      {/* ── Heading ───────────────────────────────────────────── */}
      <section className="grid gap-2">
        <h1 className="text-3xl font-semibold tracking-tight text-[color:var(--lr-ink)]">
          Local Farms in {cityLabel}
        </h1>
        <p className="text-sm text-[color:var(--lr-muted)]">
          {stores.length > 0
            ? `${stores.length} farm${stores.length !== 1 ? "s" : ""} offering fresh pickup boxes in ${cityLabel}.`
            : `Fresh farm food is coming to ${cityLabel}.`}
        </p>
      </section>

      {/* ── Eugene-specific content ───────────────────────────── */}
      {slug === 'eugene-or' && (
        <section className="lr-card p-6 mb-8">
          <h2 className="font-serif text-xl mb-2">Local Food in Eugene</h2>
          <p className="text-sm" style={{ color: 'var(--lr-muted)' }}>
            Eugene&apos;s Willamette Valley is home to some of Oregon&apos;s finest small farms.
            From the Lane County Farmers Market to neighborhood farm stands, local food
            is part of the culture here. Subscribe to a farm box and pick up fresh,
            seasonal food on your schedule.
          </p>
        </section>
      )}

      {/* ── Store grid ────────────────────────────────────────── */}
      {stores.length > 0 ? (
        <section className="lr-animate">
          <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {stores.map((s) => (
              <li key={s.id}>
                <StoreCard store={s} isNew={s.isNew} />
              </li>
            ))}
          </ul>
        </section>
      ) : (
        /* ── Empty state ──────────────────────────────────────── */
        <section className="lr-card lr-card-strong p-8 text-center">
          <div className="mx-auto max-w-md">
            <svg
              className="mx-auto h-12 w-12 text-[color:var(--lr-leaf)]/30"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={1.5}
              stroke="currentColor"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M12 21c-4-4-8-7.5-8-11a8 8 0 0 1 16 0c0 3.5-4 7-8 11Z"
              />
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M12 11a2 2 0 1 0 0-4 2 2 0 0 0 0 4Z"
              />
            </svg>
            <h2 className="mt-4 text-lg font-semibold text-[color:var(--lr-ink)]">
              No farms in {entry.city} yet
            </h2>
            <p className="mt-2 text-sm text-[color:var(--lr-muted)]">
              We&apos;re expanding to {cityLabel} soon. Browse farms in other
              cities, or check back later.
            </p>
            <div className="mt-6">
              <Link
                className="lr-btn lr-btn-primary px-5 py-2.5 text-sm font-semibold"
                href="/stores"
              >
                Browse all farms
              </Link>
            </div>
          </div>
        </section>
      )}

      {/* ── Other cities ──────────────────────────────────────── */}
      {cities.length > 1 ? (
        <section className="grid gap-4">
          <h2 className="text-base font-semibold text-[color:var(--lr-ink)]">
            Explore other cities
          </h2>
          <div className="flex flex-wrap gap-2">
            {cities
              .filter((c) => c.slug !== slug)
              .slice(0, 12)
              .map((c) => (
                <Link
                  key={c.slug}
                  href={`/farms/${c.slug}`}
                  className="lr-chip rounded-full px-3 py-1 text-sm font-medium transition hover:-translate-y-0.5 hover:shadow-[0_22px_60px_rgba(38,28,10,0.14)]"
                >
                  {c.city}, {c.region}
                  <span className="ml-1 text-[color:var(--lr-muted)]">
                    ({c.store_count})
                  </span>
                </Link>
              ))}
          </div>
        </section>
      ) : null}
    </div>
  );
}
