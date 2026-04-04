import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  const siteUrl =
    process.env.NEXT_PUBLIC_SITE_URL || "https://localroots.farm";

  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/seller/", "/auth/", "/login", "/register"],
    },
    sitemap: `${siteUrl}/sitemap.xml`,
  };
}
