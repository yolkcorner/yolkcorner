import type { Metadata } from "next";
import DownloadDetailClient from "./DownloadDetailClient";
import { readSiteContent } from "@/lib/site-content-server";
import { getDownloadFolderName, normalizeEventId } from "@/lib/download-r2";

const fallbackSiteUrl = "http://localhost:3000";

const truncateText = (value: string, maxLength = 160) => {
  const normalized = value.replace(/\s+/g, " ").trim();
  if (normalized.length <= maxLength) return normalized;
  return `${normalized.slice(0, maxLength - 1).trim()}...`;
};

const getFolderName = async (folderId: string): Promise<string | null> => {
  try {
    return await getDownloadFolderName(folderId);
  } catch {
    return null;
  }
};

type DownloadPageProps = {
  params: Promise<{ folderId: string }>;
};

export async function generateMetadata({
  params,
}: DownloadPageProps): Promise<Metadata> {
  const { folderId } = await params;
  const safeFolderId = normalizeEventId(folderId);
  const content = await readSiteContent();
  const siteName = content?.branding?.siteName?.trim() || "Yolk Corner";
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL?.trim() || fallbackSiteUrl;
  const allowIndexing = content?.seo?.allowIndexing !== false;
  const folderName = await getFolderName(safeFolderId);
  const title = folderName
    ? `${folderName} | Download`
    : `Download | ${siteName}`;
  const description = truncateText(
    folderName
      ? `Browse and download photos from ${folderName}.`
      : "Browse and download your event photos.",
    170,
  );
  const canonical = `${siteUrl}/download/${safeFolderId}`;
  const imageUrl = content?.branding?.logoUrl || "/logo.png?v=20260313";

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

export default async function DownloadDetailPage({
  params,
}: DownloadPageProps) {
  const { folderId } = await params;
  const safeFolderId = normalizeEventId(folderId);
  const content = await readSiteContent();
  const siteName = content?.branding?.siteName?.trim() || "Yolk Corner";
  const siteUrl = (
    process.env.NEXT_PUBLIC_SITE_URL?.trim() || fallbackSiteUrl
  ).replace(/\/$/, "");
  const folderName = await getFolderName(safeFolderId);
  const resolvedName = folderName || "Event Gallery";

  const breadcrumbSchema = {
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
        name: "Download",
        item: `${siteUrl}/download`,
      },
      {
        "@type": "ListItem",
        position: 3,
        name: resolvedName,
        item: `${siteUrl}/download/${safeFolderId}`,
      },
    ],
  };

  const collectionSchema = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    "@id": `${siteUrl}/download/${safeFolderId}#collection`,
    url: `${siteUrl}/download/${safeFolderId}`,
    name: resolvedName,
    description: `Photo download page for ${resolvedName}.`,
    isPartOf: {
      "@type": "WebSite",
      name: siteName,
      url: siteUrl,
    },
  };

  const faqSchema = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: [
      {
        "@type": "Question",
        name: "How do I download photos from this gallery?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Open a photo in the lightbox and press the download button. On mobile iOS devices, use Save to Photos when available.",
        },
      },
      {
        "@type": "Question",
        name: "Can I browse the gallery on mobile?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Yes. The gallery supports swipe navigation, pinch to zoom, and responsive layout on mobile devices.",
        },
      },
      {
        "@type": "Question",
        name: "Why do new photos appear while I scroll?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "The page uses incremental loading to fetch more photos automatically, which helps keep performance smooth.",
        },
      },
    ],
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(collectionSchema) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }}
      />
      <DownloadDetailClient folderId={safeFolderId} />
    </>
  );
}
