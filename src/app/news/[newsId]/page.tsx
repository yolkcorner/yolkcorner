import type { Metadata } from "next";
import NewsDetailClient from "./NewsDetailClient";
import { readSiteContent } from "@/lib/site-content-server";
import { isNewsActive } from "@/lib/news";

const fallbackSiteUrl = "http://localhost:3000";

const truncateText = (value: string, maxLength = 160) => {
  const normalized = value.replace(/\s+/g, " ").trim();
  if (normalized.length <= maxLength) return normalized;
  return `${normalized.slice(0, maxLength - 1).trim()}...`;
};

type NewsPageProps = {
  params: Promise<{ newsId: string }>;
};

export async function generateMetadata({
  params,
}: NewsPageProps): Promise<Metadata> {
  const { newsId } = await params;
  const content = await readSiteContent();
  const siteName = content.branding.siteName?.trim() || "Yolk Corner";
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL?.trim() || fallbackSiteUrl;
  const item = content.news.items.find((news) => news.id === newsId);
  const allowIndexing = content.seo.allowIndexing !== false;

  if (!item || !isNewsActive(item)) {
    return {
      title: `News | ${siteName}`,
      description:
        content.seo.descriptionEn || content.seo.descriptionTh || siteName,
      robots: {
        index: false,
        follow: false,
      },
    };
  }

  const title =
    item.seoTitleEn?.trim() ||
    item.titleEn?.trim() ||
    item.seoTitleTh?.trim() ||
    item.title?.trim() ||
    `News | ${siteName}`;
  const descriptionSource =
    item.seoDescriptionEn?.trim() ||
    item.summaryEn?.trim() ||
    item.bodyEn?.trim() ||
    item.seoDescriptionTh?.trim() ||
    item.summaryTh?.trim() ||
    item.body?.trim() ||
    content.seo.descriptionEn ||
    content.seo.descriptionTh ||
    siteName;
  const description = truncateText(descriptionSource, 170);
  const canonical = item.canonicalUrl?.trim() || `${siteUrl}/news/${item.id}`;
  const imageUrl =
    item.imageUrl || content.branding.logoUrl || "/logo.png?v=20260313";
  const shouldIndex = allowIndexing && !item.noIndex;

  return {
    title,
    description,
    alternates: {
      canonical,
    },
    openGraph: {
      type: "article",
      url: canonical,
      siteName,
      title,
      description,
      publishedTime: item.createdAt,
      modifiedTime: item.updatedAt || item.createdAt,
      images: [
        {
          url: imageUrl,
          alt: title,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [imageUrl],
    },
    robots: {
      index: shouldIndex,
      follow: shouldIndex,
    },
  };
}

export default async function NewsDetailPage({ params }: NewsPageProps) {
  const { newsId } = await params;
  const content = await readSiteContent();
  const siteName = content.branding.siteName?.trim() || "Yolk Corner";
  const siteUrl = (
    process.env.NEXT_PUBLIC_SITE_URL?.trim() || fallbackSiteUrl
  ).replace(/\/$/, "");
  const item = content.news.items.find((news) => news.id === newsId);

  const articleSchema =
    item && isNewsActive(item)
      ? {
          "@context": "https://schema.org",
          "@type": "NewsArticle",
          "@id": `${siteUrl}/news/${item.id}#article`,
          headline:
            item.seoTitleTh ||
            item.title ||
            item.seoTitleEn ||
            item.titleEn ||
            siteName,
          alternativeHeadline:
            item.seoTitleEn ||
            item.titleEn ||
            item.seoTitleTh ||
            item.title ||
            undefined,
          image: item.imageUrl || undefined,
          datePublished: item.createdAt,
          dateModified: item.updatedAt || item.createdAt,
          inLanguage: ["th", "en"],
          description: truncateText(
            item.seoDescriptionEn ||
              item.summaryEn ||
              item.bodyEn ||
              item.seoDescriptionTh ||
              item.summaryTh ||
              item.body ||
              siteName,
            170,
          ),
          mainEntityOfPage: `${siteUrl}/news/${item.id}`,
          author: item.authorName
            ? {
                "@type": "Person",
                name: item.authorName,
                jobTitle: item.authorRole || undefined,
              }
            : undefined,
          publisher: {
            "@type": "Organization",
            name: siteName,
            logo: {
              "@type": "ImageObject",
              url: content.branding.logoUrl || "/logo.png?v=20260313",
            },
          },
          citation: (item.sourceLinks || []).filter(Boolean),
        }
      : null;

  const breadcrumbSchema =
    item && isNewsActive(item)
      ? {
          "@context": "https://schema.org",
          "@type": "BreadcrumbList",
          itemListElement: [
            {
              "@type": "ListItem",
              position: 1,
              name: "Home",
              item: `${siteUrl}/`,
            },
            {
              "@type": "ListItem",
              position: 2,
              name: "News",
              item: `${siteUrl}/news`,
            },
            {
              "@type": "ListItem",
              position: 3,
              name: item.titleEn || item.title || "News detail",
              item: `${siteUrl}/news/${item.id}`,
            },
          ],
        }
      : null;

  const faqEntries =
    item && isNewsActive(item)
      ? (
          (item.faqEn && item.faqEn.length > 0
            ? item.faqEn
            : item.faqTh || []) as Array<{
            question: string;
            answer: string;
          }>
        )
          .filter((faq) => faq.question?.trim() && faq.answer?.trim())
          .map((faq) => ({
            "@type": "Question",
            name: faq.question.trim(),
            acceptedAnswer: {
              "@type": "Answer",
              text: faq.answer.trim(),
            },
          }))
      : [];

  const faqSchema =
    item && isNewsActive(item) && faqEntries.length > 0
      ? {
          "@context": "https://schema.org",
          "@type": "FAQPage",
          mainEntity: faqEntries,
        }
      : null;

  return (
    <>
      {breadcrumbSchema && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }}
        />
      )}
      {articleSchema && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(articleSchema) }}
        />
      )}
      {faqSchema && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }}
        />
      )}
      <NewsDetailClient newsId={newsId} />
    </>
  );
}
