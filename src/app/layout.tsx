import type { Metadata } from "next";
import { Mali } from "next/font/google";
import "./globals.css";
import BrowserTitle from "@/components/BrowserTitle";
import { readSiteContent } from "@/lib/site-content-server";

const mali = Mali({
  variable: "--font-mali",
  subsets: ["thai", "latin"],
  weight: ["400", "500", "600", "700"],
  preload: true,
  display: "swap",
});

export async function generateMetadata(): Promise<Metadata> {
  const content = await readSiteContent();
  const siteName = content.branding.siteName?.trim() || "Yolk Corner";
  const logoUrl = content.branding.logoUrl || "/logo.png?v=20260313";
  const siteUrl =
    process.env.NEXT_PUBLIC_SITE_URL?.trim() || "http://localhost:3000";
  const keywords = [
    ...(content.seo.keywordsTh || []),
    ...(content.seo.keywordsEn || []),
  ];
  const fallbackDescription = siteName;
  const descriptionTh =
    content.seo.descriptionTh?.trim() || fallbackDescription;
  const descriptionEn =
    content.seo.descriptionEn?.trim() || fallbackDescription;
  const combinedDescription = `${descriptionTh} | ${descriptionEn}`;
  const allowIndexing = content.seo.allowIndexing !== false;
  const allowFollowing = content.seo.allowFollowing !== false;

  return {
    metadataBase: new URL(siteUrl),
    title: {
      default: siteName,
      template: `${siteName} | %s`,
    },
    description: combinedDescription,
    keywords,
    alternates: {
      canonical: "/",
      languages: {
        th: "/",
        en: "/?lang=en",
      },
    },
    openGraph: {
      type: "website",
      locale: "th_TH",
      alternateLocale: ["en_US"],
      siteName,
      title: siteName,
      description: combinedDescription,
      url: "/",
      images: [
        {
          url: logoUrl,
          alt: siteName,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title: siteName,
      description: combinedDescription,
      images: [logoUrl],
    },
    robots: {
      index: allowIndexing,
      follow: allowFollowing,
      googleBot: {
        index: allowIndexing,
        follow: allowFollowing,
      },
    },
    verification: {
      google: content.seo.googleSiteVerification?.trim() || undefined,
    },
    icons: {
      icon: logoUrl,
      shortcut: logoUrl,
      apple: logoUrl,
    },
  };
}

import { LangProvider } from "@/lib/i18n";
import MotionProvider from "@/components/MotionProvider";

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const content = await readSiteContent();
  const siteName = content.branding.siteName?.trim() || "Yolk Corner";
  const siteUrl =
    process.env.NEXT_PUBLIC_SITE_URL?.trim() || "http://localhost:3000";
  const sanitizedSiteUrl = siteUrl.replace(/\/$/, "");
  const logoUrl = content.branding.logoUrl || "/logo.png?v=20260313";
  const descriptionTh = content.seo.descriptionTh?.trim() || siteName;
  const socialLinks = [
    content.contact.socials.facebook,
    content.contact.socials.instagram,
    content.contact.socials.tiktok,
    content.contact.socials.line,
  ]
    .filter((item) => item.enabled && item.url?.trim())
    .map((item) => item.url.trim());

  const organizationSchema = {
    "@context": "https://schema.org",
    "@type": "Organization",
    "@id": `${sanitizedSiteUrl}/#organization`,
    name: siteName,
    url: sanitizedSiteUrl,
    logo: logoUrl.startsWith("http")
      ? logoUrl
      : `${sanitizedSiteUrl}${logoUrl.startsWith("/") ? "" : "/"}${logoUrl}`,
    description: descriptionTh,
    sameAs: socialLinks.length > 0 ? socialLinks : undefined,
  };

  const websiteSchema = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    "@id": `${sanitizedSiteUrl}/#website`,
    url: sanitizedSiteUrl,
    name: siteName,
    inLanguage: ["th", "en"],
    publisher: {
      "@id": `${sanitizedSiteUrl}/#organization`,
    },
  };

  return (
    <html lang="th">
      <body className={`${mali.variable} antialiased`}>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(organizationSchema),
          }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(websiteSchema),
          }}
        />
        <LangProvider>
          <BrowserTitle siteName={siteName} />
          <MotionProvider>{children}</MotionProvider>
        </LangProvider>
      </body>
    </html>
  );
}
