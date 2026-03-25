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
    labelTh: "ตั้งรหัสผ่านดาวน์โหลด",
    labelEn: "Download Password",
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
              "flex items-center gap-3 rounded-md border border-transparent px-3 py-2 text-sm transition-colors",
              pathname === item.href
                ? "bg-[#FF5B00] text-white border-[#FF5B00]"
                : "text-foreground hover:bg-secondary",
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
      <div className="md:hidden rounded-lg border border-border bg-card p-3">
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
            <span className="text-sm font-semibold tracking-wide">Admin</span>
          </Link>

          <button
            type="button"
            onClick={() => setMobileOpen(true)}
            className="rounded-md border border-border p-2"
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
            className="flex h-full w-[90%] max-w-sm flex-col border-r border-border bg-card p-4"
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
                <span className="text-sm font-semibold tracking-wide">
                  Admin
                </span>
              </Link>
              <button
                type="button"
                onClick={() => setMobileOpen(false)}
                className="rounded-md border border-border p-2"
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

            <div className="mt-4 border-t border-border pt-4 space-y-2">
              <button
                type="button"
                onClick={() => {
                  handleToggleLanguage();
                  setMobileOpen(false);
                }}
                className="flex w-full items-center gap-2 rounded-md border border-border px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
              >
                <Globe className="h-4 w-4" />
                <span>
                  {t.common.switchLanguage}: {nextLangLabel}
                </span>
              </button>

              <button
                type="button"
                onClick={handleLogout}
                className="flex w-full items-center gap-2 rounded-md border border-border px-3 py-2 text-sm text-foreground transition-colors hover:bg-secondary"
              >
                <LogOut className="h-4 w-4" />
                <span>{t.common.logout}</span>
              </button>
            </div>
          </aside>
        </div>
      )}

      <aside className="hidden md:flex md:h-[calc(100vh-3rem)] md:sticky md:top-6 md:w-80 md:flex-col rounded-lg border border-border bg-card p-3">
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
            <span className="text-sm font-semibold tracking-wide">
              Admin Dashboard
            </span>
          </Link>
        </div>

        <div className="flex-1">
          <AdminNavLinks pathname={pathname} isTh={lang === "th"} />
        </div>

        <div className="mt-4 border-t border-border pt-4 space-y-2">
          <button
            type="button"
            onClick={handleToggleLanguage}
            className="flex w-full items-center gap-2 rounded-md border border-border px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
          >
            <Globe className="h-4 w-4" />
            <span>
              {t.common.switchLanguage}: {nextLangLabel}
            </span>
          </button>

          <button
            type="button"
            onClick={handleLogout}
            className="flex w-full items-center gap-2 rounded-md border border-border px-3 py-2 text-sm text-foreground transition-colors hover:bg-secondary"
          >
            <LogOut className="h-4 w-4" />
            <span>{t.common.logout}</span>
          </button>
        </div>
      </aside>
    </>
  );
}
