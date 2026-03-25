import type { Metadata } from "next";
import NewsListClient from "./NewsListClient";
import { readSiteContent } from "@/lib/site-content-server";
import { isNewsActive, sortNewsNewestFirst } from "@/lib/news";

const fallbackSiteUrl = "http://localhost:3000";

const truncateText = (value: string, maxLength = 160) => {
  const normalized = value.replace(/\s+/g, " ").trim();
  if (normalized.length <= maxLength) return normalized;
  return `${normalized.slice(0, maxLength - 1).trim()}...`;
};

export async function generateMetadata(): Promise<Metadata> {
  const content = await readSiteContent();
  const siteName = content.branding.siteName?.trim() || "Yolk Corner";
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL?.trim() || fallbackSiteUrl;
  const allowIndexing = content.seo.allowIndexing !== false;
  const title =
    content.news.titleEn?.trim() || content.news.title?.trim() || "News";
  const description =
    content.seo.descriptionEn?.trim() ||
    content.seo.descriptionTh?.trim() ||
    `${title} from ${siteName}`;

  return {
    title,
    description,
    alternates: {
      canonical: `${siteUrl}/news`,
      languages: {
        th: `${siteUrl}/news`,
        en: `${siteUrl}/news?lang=en`,
      },
    },
    robots: {
      index: allowIndexing,
      follow: allowIndexing,
    },
    openGraph: {
      type: "website",
      url: `${siteUrl}/news`,
      siteName,
      title,
      description,
    },
    twitter: {
      card: "summary",
      title,
      description,
    },
  };
}

export default async function NewsPage() {
  const content = await readSiteContent();
  const siteName = content.branding.siteName?.trim() || "Yolk Corner";
  const siteUrl = (
    process.env.NEXT_PUBLIC_SITE_URL?.trim() || fallbackSiteUrl
  ).replace(/\/$/, "");
  const items = sortNewsNewestFirst(content.news.items).filter((item) =>
    isNewsActive(item),
  );

  const webPageSchema = {
    "@context": "https://schema.org",
    "@type": "WebPage",
    "@id": `${siteUrl}/news#webpage`,
    url: `${siteUrl}/news`,
    name: content.news.titleEn || content.news.title || "News",
    description: truncateText(
      content.seo.descriptionEn || content.seo.descriptionTh || siteName,
      170,
    ),
    inLanguage: ["th", "en"],
    isPartOf: {
      "@type": "WebSite",
      "@id": `${siteUrl}/#website`,
    },
  };

  const itemListSchema = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    "@id": `${siteUrl}/news#itemlist`,
    name: "News and promotions",
    numberOfItems: items.length,
    itemListElement: items.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      url: `${siteUrl}/news/${item.id}`,
      name: item.titleEn || item.title || `News ${index + 1}`,
    })),
  };

  const faqSchema = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: [
      {
        "@type": "Question",
        name: "What can I find on this news page?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "This page includes active news updates and promotions published by the team.",
        },
      },
      {
        "@type": "Question",
        name: "How do I read full details of a news item?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Select any news card to open its detail page with the full content.",
        },
      },
    ],
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(webPageSchema) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(itemListSchema) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }}
      />
      <NewsListClient />
    </>
  );
}
