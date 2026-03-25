import type { Metadata } from "next";
import BlogListClient from "./BlogListClient";
import { readSiteContent } from "@/lib/site-content-server";
import { isStoryPublished, sortStoryNewestFirst } from "@/lib/story";

const fallbackSiteUrl = "http://localhost:3000";

const truncateText = (value: string, maxLength = 160) => {
  const normalized = value.replace(/\s+/g, " ").trim();
  if (normalized.length <= maxLength) return normalized;
  return `${normalized.slice(0, maxLength - 1).trim()}...`;
};

export async function generateMetadata(): Promise<Metadata> {
  const content = await readSiteContent();
  const siteName = content.branding.siteName?.trim() || "ํYolk Corner";
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL?.trim() || fallbackSiteUrl;
  const allowIndexing = content.seo.allowIndexing !== false;
  const title =
    content.story.titleEn?.trim() || content.story.title?.trim() || "Blog";
  const description =
    content.seo.descriptionEn?.trim() ||
    content.seo.descriptionTh?.trim() ||
    `${title} from ${siteName}`;

  return {
    title,
    description,
    alternates: {
      canonical: `${siteUrl}/blog`,
      languages: {
        th: `${siteUrl}/blog`,
        en: `${siteUrl}/blog?lang=en`,
      },
    },
    robots: {
      index: allowIndexing,
      follow: allowIndexing,
    },
    openGraph: {
      type: "website",
      url: `${siteUrl}/blog`,
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

export default async function BlogPage() {
  const content = await readSiteContent();
  const siteName = content.branding.siteName?.trim() || "Yolk Corner";
  const siteUrl = (
    process.env.NEXT_PUBLIC_SITE_URL?.trim() || fallbackSiteUrl
  ).replace(/\/$/, "");
  const items = sortStoryNewestFirst(content.story.items).filter((item) =>
    isStoryPublished(item),
  );

  const webPageSchema = {
    "@context": "https://schema.org",
    "@type": "WebPage",
    "@id": `${siteUrl}/blog#webpage`,
    url: `${siteUrl}/blog`,
    name: content.story.titleEn || content.story.title || "Blog",
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
    "@id": `${siteUrl}/blog#itemlist`,
    name: "Blog posts",
    numberOfItems: items.length,
    itemListElement: items.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      url: `${siteUrl}/blog/${item.id}`,
      name: item.titleEn || item.title || `Blog ${index + 1}`,
    })),
  };

  const faqSchema = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: [
      {
        "@type": "Question",
        name: "How often is the blog updated?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "New blog entries are added whenever fresh stories are published.",
        },
      },
      {
        "@type": "Question",
        name: "Where can I read the full story?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Open any card on this page to view the full blog detail and gallery.",
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
      <BlogListClient />
    </>
  );
}
