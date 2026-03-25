import type { MetadataRoute } from "next";
import { readSiteContent } from "@/lib/site-content-server";

export default async function robots(): Promise<MetadataRoute.Robots> {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL?.trim() || "http://localhost:3000";
  const host = new URL(siteUrl).host;
  const content = await readSiteContent();
  const allowIndexing = content.seo.allowIndexing !== false;

  return {
    rules: allowIndexing
      ? [
          {
            userAgent: "*",
            allow: "/",
            disallow: ["/admin", "/admin/*", "/api", "/api/*"],
          },
        ]
      : [
          {
            userAgent: "*",
            disallow: ["/"],
          },
        ],
    sitemap: `${siteUrl}/sitemap.xml`,
    host,
  };
}
