import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  const base = process.env.NEXT_PUBLIC_SITE_URL || "https://localroots.com";
  return {
    rules: { userAgent: "*", allow: "/", disallow: ["/seller/", "/buyer/", "/pickup/"] },
    sitemap: `${base}/sitemap.xml`,
  };
}
