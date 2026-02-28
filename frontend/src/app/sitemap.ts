import type { MetadataRoute } from "next";

export default function sitemap(): MetadataRoute.Sitemap {
  const base = process.env.NEXT_PUBLIC_SITE_URL || "https://localroots.com";
  return [
    { url: base, lastModified: new Date(), changeFrequency: "weekly", priority: 1 },
    { url: `${base}/stores`, lastModified: new Date(), changeFrequency: "daily", priority: 0.9 },
    { url: `${base}/policies`, lastModified: new Date(), changeFrequency: "monthly", priority: 0.3 },
  ];
}
