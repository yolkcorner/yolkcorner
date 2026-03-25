import type { Metadata } from "next";
import StoryDetailClient from "./StoryDetailClient";
import { readSiteContent } from "@/lib/site-content-server";
import { isStoryPublished } from "@/lib/story";

const fallbackSiteUrl = "http://localhost:3000";

const truncateText = (value: string, maxLength = 160) => {
  const normalized = value.replace(/\s+/g, " ").trim();
  if (normalized.length <= maxLength) return normalized;
  return `${normalized.slice(0, maxLength - 1).trim()}...`;
};

type BlogPageProps = {
  params: Promise<{ blogId: string }>;
};

export async function generateMetadata({
  params,
}: BlogPageProps): Promise<Metadata> {
  const { blogId } = await params;
  const content = await readSiteContent();
  const siteName = content.branding.siteName?.trim() || "Yolk Corner";
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL?.trim() || fallbackSiteUrl;
  const item = content.story.items.find((story) => story.id === blogId);
  const allowIndexing = content.seo.allowIndexing !== false;

  if (!item || !isStoryPublished(item)) {
    return {
      title: `Blog | ${siteName}`,
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
    item.seoTitleTh?.trim() ||
    item.titleEn?.trim() ||
    item.title?.trim() ||
    `Blog | ${siteName}`;
  const descriptionSource =
    item.seoDescriptionEn?.trim() ||
    item.seoDescriptionTh?.trim() ||
    item.summaryEn?.trim() ||
    item.summaryTh?.trim() ||
    item.bodyEn?.trim() ||
    item.body?.trim() ||
    content.seo.descriptionEn ||
    content.seo.descriptionTh ||
    siteName;
  const description = truncateText(descriptionSource, 170);
  const canonical = item.canonicalUrl?.trim() || `${siteUrl}/blog/${item.id}`;
  const imageUrl =
    item.imageUrl || content.branding.logoUrl || "/logo.png?v=20260313";
  const tags = [...(item.seoTagsEn || []), ...(item.seoTagsTh || [])].filter(
    Boolean,
  );
  const allowArticleIndexing = allowIndexing && item.noIndex !== true;

  return {
    title,
    description,
    keywords: tags,
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
      index: allowArticleIndexing,
      follow: allowArticleIndexing,
    },
  };
}

export default async function BlogDetailPage({ params }: BlogPageProps) {
  const { blogId } = await params;
  const content = await readSiteContent();
  const siteName = content.branding.siteName?.trim() || "Yolk Corner";
  const siteUrl = (
    process.env.NEXT_PUBLIC_SITE_URL?.trim() || fallbackSiteUrl
  ).replace(/\/$/, "");
  const item = content.story.items.find((story) => story.id === blogId);

  const articleSchema =
    item && isStoryPublished(item)
      ? {
          "@context": "https://schema.org",
          "@type": "BlogPosting",
          "@id": `${siteUrl}/blog/${item.id}#article`,
          headline: item.title || item.titleEn || siteName,
          alternativeHeadline: item.titleEn || item.title || undefined,
          image: item.imageUrl || undefined,
          inLanguage: ["th", "en"],
          articleSection: "Blog",
          keywords: [...(item.seoTagsTh || []), ...(item.seoTagsEn || [])],
          description: truncateText(
            item.summaryEn ||
              item.summaryTh ||
              item.seoDescriptionEn ||
              item.seoDescriptionTh ||
              item.body ||
              item.bodyEn ||
              siteName,
            170,
          ),
          mainEntityOfPage: `${siteUrl}/blog/${item.id}`,
          author: item.authorName
            ? {
                "@type": "Person",
                name: item.authorName,
                jobTitle: item.authorRole || undefined,
              }
            : undefined,
          dateCreated: item.createdAt,
          datePublished: item.createdAt,
          dateModified: item.updatedAt || item.createdAt,
          citation: (item.sourceLinks || []).filter(Boolean),
          publisher: {
            "@type": "Organization",
            name: siteName,
            logo: {
              "@type": "ImageObject",
              url: content.branding.logoUrl || "/logo.png?v=20260313",
            },
          },
        }
      : null;

  const breadcrumbSchema =
    item && isStoryPublished(item)
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
              name: "Blog",
              item: `${siteUrl}/blog`,
            },
            {
              "@type": "ListItem",
              position: 3,
              name: item.titleEn || item.title || "Blog detail",
              item: `${siteUrl}/blog/${item.id}`,
            },
          ],
        }
      : null;

  const faqSchema =
    item && isStoryPublished(item)
      ? {
          "@context": "https://schema.org",
          "@type": "FAQPage",
          mainEntity: (item.faqEn?.length || item.faqTh?.length
            ? [...(item.faqEn || []), ...(item.faqTh || [])]
            : [
                {
                  question: "What is this blog post about?",
                  answer: truncateText(
                    item.bodyEn || item.body || siteName,
                    220,
                  ),
                },
                {
                  question: "Can I share this blog post?",
                  answer:
                    "Yes. Use the built-in share options to share this post on social channels or copy the direct link.",
                },
              ]
          )
            .filter((faq) => faq.question?.trim() && faq.answer?.trim())
            .map((faq) => ({
              "@type": "Question",
              name: faq.question.trim(),
              acceptedAnswer: {
                "@type": "Answer",
                text: faq.answer.trim(),
              },
            })),
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
      <StoryDetailClient blogId={blogId} />
    </>
  );
}
