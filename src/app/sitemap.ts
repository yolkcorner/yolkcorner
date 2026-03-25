import type { MetadataRoute } from "next";
import { readSiteContent } from "@/lib/site-content-server";
import { isNewsActive } from "@/lib/news";
import { isStoryPublished } from "@/lib/story";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL?.trim() || "http://localhost:3000";
  const content = await readSiteContent();
  const now = new Date();
  const newsLastModified = content.news.items
    .map((item) => item.updatedAt || item.createdAt)
    .filter(Boolean)
    .map((value) => new Date(value));
  const storyLastModified = content.story.items
    .map((item) => item.updatedAt || item.createdAt)
    .filter(Boolean)
    .map((value) => new Date(value));
  const latestContentUpdate =
    [...newsLastModified, ...storyLastModified]
      .sort((a, b) => b.getTime() - a.getTime())[0] || now;

  const staticRoutes: Array<{
    path: string;
    priority: number;
    changeFrequency: MetadataRoute.Sitemap[number]["changeFrequency"];
  }> = [
    { path: "", priority: 1, changeFrequency: "weekly" },
    { path: "/about", priority: 0.7, changeFrequency: "monthly" },
    { path: "/portfolio", priority: 0.9, changeFrequency: "weekly" },
    { path: "/download", priority: 0.8, changeFrequency: "weekly" },
    { path: "/contact", priority: 0.7, changeFrequency: "monthly" },
    { path: "/news", priority: 0.8, changeFrequency: "weekly" },
    { path: "/blog", priority: 0.8, changeFrequency: "weekly" },
  ];

  const staticEntries: MetadataRoute.Sitemap = staticRoutes.map((route) => ({
    url: `${siteUrl}${route.path}`,
    lastModified: latestContentUpdate,
    changeFrequency: route.changeFrequency,
    priority: route.priority,
  }));

  const newsEntries: MetadataRoute.Sitemap = content.news.items
    .filter((item) => isNewsActive(item))
    .map((item) => ({
      url: `${siteUrl}/news/${item.id}`,
      lastModified: new Date(item.updatedAt || item.createdAt),
      changeFrequency: "weekly",
      priority: 0.75,
    }));

  const storyEntries: MetadataRoute.Sitemap = content.story.items
    .filter((item) => isStoryPublished(item))
    .map((item) => ({
      url: `${siteUrl}/blog/${item.id}`,
      lastModified: new Date(item.updatedAt || item.createdAt),
      changeFrequency: "weekly",
      priority: 0.75,
    }));

  const portfolioEntries: MetadataRoute.Sitemap = content.portfolio.albums.map(
    (album) => ({
      url: `${siteUrl}/portfolio/${album.id}`,
      lastModified: latestContentUpdate,
      changeFrequency: "weekly",
      priority: 0.7,
    }),
  );

  const openingModalLandingEntries: MetadataRoute.Sitemap = content.openingModals
    .filter((item) => item.isActive && item.linkUrl?.trim())
    .map((item) => item.linkUrl.trim())
    .filter((url) => url.startsWith("/"))
    .map((url) => ({
      url: `${siteUrl}${url}`,
      lastModified: now,
      changeFrequency: "weekly" as const,
      priority: 0.6,
    }));

  const dedupedEntries = new Map<string, MetadataRoute.Sitemap[number]>();
  [...staticEntries, ...newsEntries, ...storyEntries, ...portfolioEntries, ...openingModalLandingEntries].forEach(
    (entry) => {
      dedupedEntries.set(entry.url, entry);
    },
  );

  return Array.from(dedupedEntries.values()).sort((a, b) =>
    a.url.localeCompare(b.url),
  );
}
