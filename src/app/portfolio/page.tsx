import type { Metadata } from "next";
import PortfolioListClient from "./PortfolioListClient";
import { readSiteContent } from "@/lib/site-content-server";

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
    content.portfolio.titleEn?.trim() ||
    content.portfolio.title?.trim() ||
    "Portfolio";
  const description =
    content.seo.descriptionEn?.trim() ||
    content.seo.descriptionTh?.trim() ||
    `${title} from ${siteName}`;

  return {
    title,
    description,
    alternates: {
      canonical: `${siteUrl}/portfolio`,
      languages: {
        th: `${siteUrl}/portfolio`,
        en: `${siteUrl}/portfolio?lang=en`,
      },
    },
    robots: {
      index: allowIndexing,
      follow: allowIndexing,
    },
    openGraph: {
      type: "website",
      url: `${siteUrl}/portfolio`,
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

export default async function PortfolioPage() {
  const content = await readSiteContent();
  const siteName = content.branding.siteName?.trim() || "Yolk Corner";
  const siteUrl = (
    process.env.NEXT_PUBLIC_SITE_URL?.trim() || fallbackSiteUrl
  ).replace(/\/$/, "");

  const webPageSchema = {
    "@context": "https://schema.org",
    "@type": "WebPage",
    "@id": `${siteUrl}/portfolio#webpage`,
    url: `${siteUrl}/portfolio`,
    name: content.portfolio.titleEn || content.portfolio.title || "Portfolio",
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
    "@id": `${siteUrl}/portfolio#itemlist`,
    name: "Portfolio albums",
    numberOfItems: content.portfolio.albums.length,
    itemListElement: content.portfolio.albums.map((album, index) => ({
      "@type": "ListItem",
      position: index + 1,
      url: `${siteUrl}/portfolio/${album.id}`,
      name: album.nameEn || album.name || `Album ${index + 1}`,
    })),
  };

  const faqSchema = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: [
      {
        "@type": "Question",
        name: "How can I browse the portfolio by category?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Open a portfolio category first, then choose an album to view all photos in detail.",
        },
      },
      {
        "@type": "Question",
        name: "Can I open a full album from this page?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Yes. Click any album card to open its dedicated detail page.",
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
      <PortfolioListClient />
    </>
  );
}
