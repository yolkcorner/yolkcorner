"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import { useLang } from "@/lib/i18n";
import { cn, getCachebustedUrl } from "@/lib/utils";
import { useSiteContent } from "@/hooks/use-site-content";
import {
  BookText,
  FolderOpen,
  Globe,
  Grid3X3,
  ImageIcon,
  LogOut,
  Menu,
  MessageSquare,
  Newspaper,
  Search,
  Sparkles,
  PenSquare,
  X,
} from "lucide-react";

import { Lock as LockIcon } from "lucide-react";

const adminItems = [
  {
    href: "/admin/password",
    labelTh: "การจัดการโฟโต้บูธ",
    labelEn: "Photo Booth Management",
    icon: LockIcon,
  },
  {
    href: "/admin/logo",
    labelTh: "โลโก้เว็บไซต์",
    labelEn: "Website Logo",
    icon: ImageIcon,
  },
  { href: "/admin/hero", labelTh: "ฮีโร่", labelEn: "Hero", icon: Sparkles },
  {
    href: "/admin/about",
    labelTh: "เกี่ยวกับเรา",
    labelEn: "About",
    icon: BookText,
  },
  {
    href: "/admin/categories",
    labelTh: "บริการของเรา",
    labelEn: "Services",
    icon: Grid3X3,
  },
  {
    href: "/admin/portfolio",
    labelTh: "ผลงาน",
    labelEn: "Portfolio",
    icon: FolderOpen,
  },
  {
    href: "/admin/contact",
    labelTh: "ติดต่อเรา",
    labelEn: "Contact",
    icon: MessageSquare,
  },
  {
    href: "/admin/news",
    labelTh: "ข่าวสารและโปรโมชั่น",
    labelEn: "News & Promotions",
    icon: Newspaper,
  },
  {
    href: "/admin/blog",
    labelTh: "บล็อก",
    labelEn: "Blog",
    icon: PenSquare,
  },
  {
    href: "/admin/opening-modal",
    labelTh: "กล่องป๊อปอัพ",
    labelEn: "Pop-up Modal",
    icon: Sparkles,
  },
  {
    href: "/admin/seo",
    labelTh: "SEO",
    labelEn: "SEO",
    icon: Search,
  },
];

interface AdminNavLinksProps {
  pathname: string;
  isTh: boolean;
  onNavigate?: () => void;
}

function AdminNavLinks({ pathname, isTh, onNavigate }: AdminNavLinksProps) {
  return (
    <div className="flex flex-col gap-2">
      {adminItems.map((item) => {
        const Icon = item.icon;
        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={onNavigate}
            className={cn(
              "flex items-center gap-3 rounded-xl border border-transparent px-3 py-2.5 text-sm transition",
              pathname === item.href
                ? "border-[#ff7a2e] bg-linear-to-r from-[#ff8b3d] to-[#ff5b00] text-white shadow-[0_8px_22px_rgba(255,91,0,0.32)]"
                : "text-[#4d3a2e] hover:border-[#ebd5bf] hover:bg-[#fff3e5]",
            )}
          >
            <Icon className="h-4 w-4 shrink-0" />
            <span className="truncate">
              {isTh ? item.labelTh : item.labelEn}
            </span>
          </Link>
        );
      })}
    </div>
  );
}

export default function AdminDashboardNav() {
  const pathname = usePathname();
  const router = useRouter();
  const { t, lang, setLang } = useLang();
  const { content } = useSiteContent();
  const [mobileOpen, setMobileOpen] = useState(false);
  const adminLogoSrc = getCachebustedUrl(content.branding.logoUrl);

  const nextLangLabel = lang === "th" ? "EN" : "TH";

  const handleToggleLanguage = () => {
    setLang(lang === "th" ? "en" : "th");
  };

  const handleLogout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/");
  };

  return (
    <>
      <div className="md:hidden rounded-2xl border border-white/60 bg-white/80 p-3 shadow-[0_10px_30px_rgba(120,58,12,0.1)] backdrop-blur-xl">
        <div className="flex items-center justify-between gap-3">
          <Link href="/admin" className="inline-flex items-center gap-2">
            <Image
              src={adminLogoSrc}
              alt="Yolk Corner"
              width={48}
              height={48}
              style={{ width: 48, height: 48 }}
              unoptimized
              loading="eager"
              fetchPriority="high"
              priority
            />
            <span className="text-sm font-semibold tracking-wide text-[#2b1a10]">
              Admin
            </span>
          </Link>

          <button
            type="button"
            onClick={() => setMobileOpen(true)}
            className="rounded-xl border border-[#e3d2bf] bg-[#f8eee2] p-2 text-[#4d3a2e]"
            aria-label={lang === "th" ? "เปิดเมนู" : "Open menu"}
          >
            <Menu className="h-4 w-4" />
          </button>
        </div>
      </div>

      {mobileOpen && (
        <div
          className="fixed inset-0 z-50 bg-black/60 md:hidden"
          onClick={() => setMobileOpen(false)}
        >
          <aside
            className="flex h-full w-[90%] max-w-sm flex-col border-r border-white/50 bg-[#fff9f1]/95 p-4 shadow-[0_20px_60px_rgba(120,58,12,0.2)] backdrop-blur-xl"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="mb-4 flex items-center justify-between">
              <Link
                href="/admin"
                onClick={() => setMobileOpen(false)}
                className="inline-flex items-center gap-2"
              >
                <Image
                  src={adminLogoSrc}
                  alt="Yolk Corner"
                  width={64}
                  height={64}
                  style={{ width: 64, height: 64 }}
                  unoptimized
                  loading="lazy"
                  fetchPriority="low"
                />
                <span className="text-sm font-semibold tracking-wide text-[#2b1a10]">
                  Admin
                </span>
              </Link>
              <button
                type="button"
                onClick={() => setMobileOpen(false)}
                className="rounded-xl border border-[#e3d2bf] bg-[#f8eee2] p-2 text-[#4d3a2e]"
                aria-label={lang === "th" ? "ปิดเมนู" : "Close menu"}
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="flex-1">
              <AdminNavLinks
                pathname={pathname}
                isTh={lang === "th"}
                onNavigate={() => setMobileOpen(false)}
              />
            </div>

            <div className="mt-4 space-y-2 border-t border-[#ead7c2] pt-4">
              <button
                type="button"
                onClick={() => {
                  handleToggleLanguage();
                  setMobileOpen(false);
                }}
                className="flex w-full items-center gap-2 rounded-xl border border-[#e3d2bf] bg-[#fff4e8] px-3 py-2 text-sm text-[#6f5a4b] transition hover:bg-[#ffe6cf] hover:text-[#2b1a10]"
              >
                <Globe className="h-4 w-4" />
                <span>
                  {t.common.switchLanguage}: {nextLangLabel}
                </span>
              </button>

              <button
                type="button"
                onClick={handleLogout}
                className="flex w-full items-center gap-2 rounded-xl border border-[#e3d2bf] bg-white/80 px-3 py-2 text-sm text-[#2b1a10] transition hover:bg-[#fff3e5]"
              >
                <LogOut className="h-4 w-4" />
                <span>{t.common.logout}</span>
              </button>
            </div>
          </aside>
        </div>
      )}

      <aside className="hidden rounded-3xl border border-white/60 bg-white/80 p-3 shadow-[0_16px_50px_rgba(120,58,12,0.14)] backdrop-blur-xl md:sticky md:top-0 md:flex md:h-[calc(100vh-3rem)] md:w-80 md:flex-col">
        <div className="mb-4 flex items-center gap-2">
          <Link href="/admin" className="inline-flex items-center gap-2">
            <Image
              src={adminLogoSrc}
              alt="Yolk Corner"
              width={64}
              height={64}
              style={{ width: 64, height: 64 }}
              unoptimized
              loading="eager"
              fetchPriority="high"
              priority
            />
            <span className="text-sm font-semibold tracking-wide text-[#2b1a10]">
              Admin Dashboard
            </span>
          </Link>
        </div>

        <div className="flex-1">
          <AdminNavLinks pathname={pathname} isTh={lang === "th"} />
        </div>

        <div className="mt-4 space-y-2 border-t border-[#ead7c2] pt-4">
          <button
            type="button"
            onClick={handleToggleLanguage}
            className="flex w-full items-center gap-2 rounded-xl border border-[#e3d2bf] bg-[#fff4e8] px-3 py-2 text-sm text-[#6f5a4b] transition hover:bg-[#ffe6cf] hover:text-[#2b1a10]"
          >
            <Globe className="h-4 w-4" />
            <span>
              {t.common.switchLanguage}: {nextLangLabel}
            </span>
          </button>

          <button
            type="button"
            onClick={handleLogout}
            className="flex w-full items-center gap-2 rounded-xl border border-[#e3d2bf] bg-white/80 px-3 py-2 text-sm text-[#2b1a10] transition hover:bg-[#fff3e5]"
          >
            <LogOut className="h-4 w-4" />
            <span>{t.common.logout}</span>
          </button>
        </div>
      </aside>
    </>
  );
}
