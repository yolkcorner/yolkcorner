import type { Metadata } from "next";
import PortfolioDetailClient from "./PortfolioDetailClient";
import { readSiteContent } from "@/lib/site-content-server";

const fallbackSiteUrl = "http://localhost:3000";

const truncateText = (value: string, maxLength = 160) => {
  const normalized = value.replace(/\s+/g, " ").trim();
  if (normalized.length <= maxLength) return normalized;
  return `${normalized.slice(0, maxLength - 1).trim()}...`;
};

type PortfolioPageProps = {
  params: Promise<{ albumId: string }>;
};

export async function generateMetadata({
  params,
}: PortfolioPageProps): Promise<Metadata> {
  const { albumId } = await params;
  const content = await readSiteContent();
  const siteName = content.branding.siteName?.trim() || "Yolk Corner";
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL?.trim() || fallbackSiteUrl;
  const allowIndexing = content.seo.allowIndexing !== false;
  const item = content.portfolio.albums.find((album) => album.id === albumId);

  if (!item) {
    return {
      title: `Portfolio | ${siteName}`,
      description:
        content.seo.descriptionEn || content.seo.descriptionTh || siteName,
      robots: {
        index: false,
        follow: false,
      },
    };
  }

  const title =
    item.nameEn?.trim() || item.name?.trim() || `Portfolio | ${siteName}`;
  const description = truncateText(
    item.topTextEn?.trim() || item.topText?.trim() || `${title} photo album`,
    170,
  );
  const canonical = `${siteUrl}/portfolio/${item.id}`;
  const imageUrl =
    item.coverUrl || content.branding.logoUrl || "/logo.png?v=20260313";

  return {
    title,
    description,
    alternates: {
      canonical,
    },
    openGraph: {
      type: "website",
      url: canonical,
      siteName,
      title,
      description,
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
      index: allowIndexing,
      follow: allowIndexing,
    },
  };
}

export default async function PortfolioDetailPage({
  params,
}: PortfolioPageProps) {
  const { albumId } = await params;
  const content = await readSiteContent();
  const siteName = content.branding.siteName?.trim() || "Yolk Corner";
  const siteUrl = (
    process.env.NEXT_PUBLIC_SITE_URL?.trim() || fallbackSiteUrl
  ).replace(/\/$/, "");
  const item = content.portfolio.albums.find((album) => album.id === albumId);

  const breadcrumbSchema = item
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
            name: "Portfolio",
            item: `${siteUrl}/portfolio`,
          },
          {
            "@type": "ListItem",
            position: 3,
            name: item.nameEn || item.name || "Album",
            item: `${siteUrl}/portfolio/${item.id}`,
          },
        ],
      }
    : null;

  const gallerySchema = item
    ? {
        "@context": "https://schema.org",
        "@type": "ImageGallery",
        "@id": `${siteUrl}/portfolio/${item.id}#gallery`,
        url: `${siteUrl}/portfolio/${item.id}`,
        name: item.nameEn || item.name || siteName,
        description: truncateText(
          item.topTextEn || item.topText || siteName,
          170,
        ),
        numberOfItems: item.images.length,
        about: item.nameEn || item.name || undefined,
        publisher: {
          "@type": "Organization",
          name: siteName,
        },
      }
    : null;

  const faqSchema = item
    ? {
        "@context": "https://schema.org",
        "@type": "FAQPage",
        mainEntity: [
          {
            "@type": "Question",
            name: "How can I view all photos in this album?",
            acceptedAnswer: {
              "@type": "Answer",
              text: "Open the album and scroll down to see the full gallery. Click any photo to view it in a larger lightbox.",
            },
          },
          {
            "@type": "Question",
            name: "Can I zoom in while viewing an image?",
            acceptedAnswer: {
              "@type": "Answer",
              text: "Yes. Open an image in the lightbox and use the zoom controls or touch gestures on mobile.",
            },
          },
          {
            "@type": "Question",
            name: "How often is the portfolio updated?",
            acceptedAnswer: {
              "@type": "Answer",
              text: "The portfolio is updated whenever new albums are published by the team.",
            },
          },
        ],
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
      {gallerySchema && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(gallerySchema) }}
        />
      )}
      {faqSchema && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }}
        />
      )}
      <PortfolioDetailClient albumId={albumId} />
    </>
  );
}
