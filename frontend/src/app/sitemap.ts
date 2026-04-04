import type { MetadataRoute } from "next";

type Store = { id: string };
type CityEntry = { slug: string };

const API_BASE =
  process.env.NEXT_PUBLIC_API_BASE_URL?.replace(/\/+$/, "") ||
  "http://localhost:8080";
const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL || "https://localroots.farm";

async function fetchJSON<T>(path: string): Promise<T> {
  try {
    const res = await fetch(`${API_BASE}${path}`, {
      headers: { "Content-Type": "application/json" },
    });
    if (!res.ok) return [] as unknown as T;
    return res.json() as Promise<T>;
  } catch {
    return [] as unknown as T;
  }
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [stores, cities] = await Promise.all([
    fetchJSON<Store[]>("/v1/stores"),
    fetchJSON<CityEntry[]>("/v1/cities"),
  ]);

  const now = new Date();

  const staticRoutes: MetadataRoute.Sitemap = [
    { url: SITE_URL, lastModified: now, changeFrequency: "weekly", priority: 1 },
    {
      url: `${SITE_URL}/stores`,
      lastModified: now,
      changeFrequency: "daily",
      priority: 0.9,
    },
  ];

  const storeRoutes: MetadataRoute.Sitemap = stores.map((s) => ({
    url: `${SITE_URL}/stores/${s.id}`,
    lastModified: now,
    changeFrequency: "daily" as const,
    priority: 0.8,
  }));

  const cityRoutes: MetadataRoute.Sitemap = cities.map((c) => ({
    url: `${SITE_URL}/farms/${c.slug}`,
    lastModified: now,
    changeFrequency: "weekly" as const,
    priority: 0.7,
  }));

  return [...staticRoutes, ...storeRoutes, ...cityRoutes];
}
