"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { useLang } from "@/lib/i18n";

const getPageTitle = (
  pathname: string,
  userTitle: {
    home: string;
    about: string;
    gallery: string;
    portfolio: string;
    portfolioDetail: string;
    blog: string;
    blogDetail: string;
    news: string;
    newsDetail: string;
    download: string;
    downloadGallery: string;
    contact: string;
    fallback: string;
  },
): string => {
  if (pathname === "/") return userTitle.home;
  if (pathname === "/about") return userTitle.about;
  if (pathname === "/gallery") return userTitle.gallery;
  if (pathname === "/portfolio") return userTitle.portfolio;
  if (pathname.startsWith("/portfolio/")) return userTitle.portfolioDetail;
  if (pathname === "/blog") return userTitle.blog;
  if (pathname.startsWith("/blog/")) return userTitle.blogDetail;
  if (pathname === "/news") return userTitle.news;
  if (pathname.startsWith("/news/")) return userTitle.newsDetail;
  if (pathname === "/download") return userTitle.download;
  if (pathname.startsWith("/download/")) return userTitle.downloadGallery;
  if (pathname === "/contact") return userTitle.contact;

  if (pathname === "/admin") return "Admin Dashboard";
  if (pathname === "/admin/login") return "Admin Login";
  if (pathname === "/admin/logo") return "Admin Logo";
  if (pathname === "/admin/hero") return "Admin Hero";
  if (pathname === "/admin/about") return "Admin About";
  if (pathname === "/admin/categories") return "Admin Categories";
  if (pathname === "/admin/portfolio") return "Admin Portfolio";
  if (pathname === "/admin/contact") return "Admin Contact";
  if (pathname === "/admin/news") return "Admin News & Promotions";
  if (pathname === "/admin/blog") return "Admin Blog";
  if (pathname === "/admin/seo") return "Admin SEO";

  return userTitle.fallback;
};

interface BrowserTitleProps {
  siteName: string;
}

export default function BrowserTitle({ siteName }: BrowserTitleProps) {
  const pathname = usePathname();
  const { t } = useLang();

  useEffect(() => {
    const pageTitle = getPageTitle(pathname || "/", t.browserTitle);
    document.title = `${siteName} | ${pageTitle}`;
  }, [pathname, siteName, t.browserTitle]);

  return null;
}
