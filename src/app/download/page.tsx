import type { Metadata } from "next";
import DownloadListClient from "./DownloadListClient";
import { readSiteContent } from "@/lib/site-content-server";
import { listDownloadFolders } from "@/lib/download-r2";

const fallbackSiteUrl = "http://localhost:3000";

type DownloadFolder = {
  id: string;
  name: string;
};

const getDownloadFolders = async (): Promise<DownloadFolder[]> => {
  try {
    const folders = await listDownloadFolders();
    return folders.map((folder) => ({ id: folder.id, name: folder.name }));
  } catch {
    return [];
  }
};

export async function generateMetadata(): Promise<Metadata> {
  const content = await readSiteContent();
  const siteName = content?.branding?.siteName?.trim() || "Yolk Corner";
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL?.trim() || fallbackSiteUrl;
  const allowIndexing = content?.seo?.allowIndexing !== false;
  const title = "Photo Download";
  const description =
    content?.seo?.descriptionEn?.trim() ||
    content?.seo?.descriptionTh?.trim() ||
    `Download event photos from ${siteName}`;

  return {
    title,
    description,
    alternates: {
      canonical: `${siteUrl}/download`,
      languages: {
        th: `${siteUrl}/download`,
        en: `${siteUrl}/download?lang=en`,
      },
    },
    robots: {
      index: allowIndexing,
      follow: allowIndexing,
    },
    openGraph: {
      type: "website",
      url: `${siteUrl}/download`,
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

export default async function DownloadPage() {
  const content = await readSiteContent();
  const siteName = content?.branding?.siteName?.trim() || "Yolk Corner";
  const siteUrl = (
    process.env.NEXT_PUBLIC_SITE_URL?.trim() || fallbackSiteUrl
  ).replace(/\/$/, "");
  const folders = await getDownloadFolders();

  const webPageSchema = {
    "@context": "https://schema.org",
    "@type": "WebPage",
    "@id": `${siteUrl}/download#webpage`,
    url: `${siteUrl}/download`,
    name: "Photo Download",
    description: `Download event photos from ${siteName}.`,
    inLanguage: ["th", "en"],
    isPartOf: {
      "@type": "WebSite",
      "@id": `${siteUrl}/#website`,
    },
  };

  const itemListSchema = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    "@id": `${siteUrl}/download#itemlist`,
    name: "Download galleries",
    numberOfItems: folders.length,
    itemListElement: folders.map((folder, index) => ({
      "@type": "ListItem",
      position: index + 1,
      url: `${siteUrl}/download/${folder.id}`,
      name: folder.name,
    })),
  };

  const faqSchema = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: [
      {
        "@type": "Question",
        name: "How do I open an event gallery?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Select an event card to open its gallery and view all available photos.",
        },
      },
      {
        "@type": "Question",
        name: "Can I download photos on mobile?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Yes. The download page supports mobile devices, including iOS save flow and touch-friendly navigation.",
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
      <DownloadListClient />
    </>
  );
}
