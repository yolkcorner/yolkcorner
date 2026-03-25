"use client";

import { useEffect, useRef, useState } from "react";
import { useLang } from "@/lib/i18n";
import type { Translations } from "@/lib/i18n";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { cn, getCachebustedUrl } from "@/lib/utils";
import { Globe } from "lucide-react";
import { useSiteContent } from "@/hooks/use-site-content";
import { useLoading } from "@/context/LoadingContext";

type NavLabelKey = keyof Translations["nav"];

const links = [
  { href: "/", labelKey: "home" },
  { href: "/about", labelKey: "about" },
  { href: "/portfolio", labelKey: "portfolio" },
  { href: "/blog", labelKey: "story" },
  { href: "/news", labelKey: "news" },
  { href: "/download", labelKey: "download" },
  { href: "/contact", labelKey: "contact" },
] satisfies ReadonlyArray<{ href: string; labelKey: NavLabelKey }>;

export default function Navbar() {
  const { t, lang, setLang } = useLang();
  const pathname = usePathname();
  const { content } = useSiteContent();
  const { showLoading } = useLoading();
  const [mobileOpen, setMobileOpen] = useState(false);
  const menuButtonRef = useRef<HTMLButtonElement | null>(null);
  const mobileMenuRef = useRef<HTMLDivElement | null>(null);
  const wasMobileOpenRef = useRef(false);

  useEffect(() => {
    if (!mobileOpen) {
      document.body.style.overflow = "";
      return;
    }

    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, [mobileOpen]);

  useEffect(() => {
    if (!mobileOpen) return;

    const focusable = mobileMenuRef.current?.querySelectorAll<HTMLElement>(
      'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])',
    );

    const firstFocusable = focusable?.[0];
    const lastFocusable = focusable?.[focusable.length - 1];
    firstFocusable?.focus();

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        setMobileOpen(false);
        return;
      }

      if (event.key !== "Tab" || !focusable || focusable.length === 0) return;

      const activeElement = document.activeElement as HTMLElement | null;
      if (event.shiftKey) {
        if (
          activeElement === firstFocusable ||
          !mobileMenuRef.current?.contains(activeElement)
        ) {
          event.preventDefault();
          lastFocusable?.focus();
        }
      } else if (activeElement === lastFocusable) {
        event.preventDefault();
        firstFocusable?.focus();
      }
    };

    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [mobileOpen]);

  useEffect(() => {
    if (wasMobileOpenRef.current && !mobileOpen) {
      menuButtonRef.current?.focus();
    }

    wasMobileOpenRef.current = mobileOpen;
  }, [mobileOpen]);

  const toggleLanguage = () => {
    setLang(lang === "th" ? "en" : "th");
  };

  const nextLangLabel =
    lang === "th" ? t.navbar.languageEn : t.navbar.languageTh;

  return (
    <nav className="fixed top-0 left-0 right-0 bg-background p-4 z-50 drop-shadow-[-2px_2px_4px_rgba(0,0,0,0.25)]">
      <div className="container mx-auto px-4 flex items-center h-14 md:h-16">
        <Link
          href="/"
          className="inline-flex items-center relative h-18 w-20 hover:scale-115 transition-transform duration-300"
          aria-label={t.navbar.logoHomeAria}
        >
          <Image
            src={getCachebustedUrl(content.branding.logoUrl)}
            alt={t.navbar.logoAlt}
            fill
            unoptimized
            className="object-contain"
            sizes="80px"
            priority
            loading="eager"
            fetchPriority="high"
          />
        </Link>

        <div className="ml-auto hidden lg:flex gap-6 items-center">
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              onClick={showLoading}
              className={cn(
                "h-11 inline-flex items-center text-sm uppercase tracking-wider transition-colors",
                pathname === link.href
                  ? "text-primary"
                  : "text-foreground hover:text-primary",
              )}
            >
              {t.nav[link.labelKey]}
            </Link>
          ))}

          <div className="border-l pl-4">
            <button
              onClick={toggleLanguage}
              aria-label={t.common.switchLanguage}
              className="min-h-11 px-3 rounded-full  flex items-center gap-2 text-muted-foreground hover:text-foreground hover:border-primary transition-colors"
            >
              <Globe className="w-4 h-4" />
              <span className="text-xs font-semibold tracking-wide">
                {nextLangLabel}
              </span>
            </button>
          </div>
        </div>

        <button
          ref={menuButtonRef}
          onClick={() => setMobileOpen((prev) => !prev)}
          aria-label={mobileOpen ? t.common.close : t.common.menu}
          className="ml-auto md:flex lg:hidden h-11 w-11 items-center justify-center hover:scale-115 transition-transform duration-300"
        >
          {mobileOpen ? (
            <svg
              width="26"
              height="21"
              viewBox="0 0 153 123"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
              aria-hidden="true"
            >
              <path
                d="M14.0738 14.8695C14.0738 40.793 12.4106 80.0207 13.217 104.457C13.6014 116.104 100.815 106.825 135.026 100.016C151.902 96.6572 139.222 77.5164 142.17 58.0297C143.635 48.3473 142.599 32.791 140.519 24.1628C138.44 15.5347 134.282 14.2434 127.15 13.5782C96.4304 12.2673 59.7379 10.9565 35.9608 9.3326C32.5965 9 28.4384 9 24.1542 9"
                stroke="black"
                strokeWidth="18"
                strokeLinecap="round"
              />
              <path
                d="M30.4497 31.7707C33.7762 35.0185 48.8464 42.8053 63.5763 52.9302C86.6226 67.5549 110.236 87.1786 113.588 92.06C115.276 94.3589 116.939 96.2958 123.693 100.248"
                stroke="url(#closeButtonGradientA)"
                strokeWidth="18"
                strokeLinecap="round"
              />
              <path
                d="M40.5298 96.3347C46.3764 90.4848 58.12 82.6784 72.8122 68.0243C84.1863 56.6796 90.0748 49.418 98.0383 41.5823C101.818 37.6791 106.027 34.3922 111.055 31.79C113.587 30.4792 116.082 29.1879 121.173 25.901"
                stroke="url(#closeButtonGradientB)"
                strokeWidth="18"
                strokeLinecap="round"
              />
              <defs>
                <linearGradient
                  id="closeButtonGradientA"
                  x1="77.0714"
                  y1="31.7707"
                  x2="77.0714"
                  y2="100.248"
                  gradientUnits="userSpaceOnUse"
                >
                  <stop stopColor="#F29A2D" />
                  <stop offset="1" stopColor="#F4822A" />
                </linearGradient>
                <linearGradient
                  id="closeButtonGradientB"
                  x1="80.8513"
                  y1="25.901"
                  x2="80.8513"
                  y2="96.3347"
                  gradientUnits="userSpaceOnUse"
                >
                  <stop stopColor="#F29A2D" />
                  <stop offset="1" stopColor="#F4822A" />
                </linearGradient>
              </defs>
            </svg>
          ) : (
            <svg
              width="26"
              height="19"
              viewBox="0 0 149 107"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
              aria-hidden="true"
            >
              <path
                d="M16.0596 8.5C16.8439 8.5 17.6283 8.5 35.6802 8.5C53.7321 8.5 89.0279 8.5 108.387 8.89218C127.746 9.28435 130.099 10.0687 134.901 13.2536"
                stroke="black"
                strokeWidth="17"
                strokeLinecap="round"
              />
              <path
                d="M16.0596 53.6593C16.8439 53.6593 17.6283 53.6593 20.3854 52.8749C23.1425 52.0906 27.8486 50.5219 47.9208 49.7138C67.9931 48.9056 103.289 48.9056 139.654 48.9056"
                stroke="url(#menuButtonGradient)"
                strokeWidth="17"
                strokeLinecap="round"
              />
              <path
                d="M12.5 89.8114C12.7077 89.8114 12.9154 89.8114 29.8453 89.9152C46.7752 90.0191 80.4211 90.2268 98.0653 90.4376C118.221 91.0701 123.035 91.6932 126.912 92.7411C128.505 93.1659 129.335 93.3736 132.079 93.5876"
                stroke="black"
                strokeWidth="17"
                strokeLinecap="round"
              />
              <defs>
                <linearGradient
                  id="menuButtonGradient"
                  x1="16.0596"
                  y1="51.2825"
                  x2="139.654"
                  y2="51.2825"
                  gradientUnits="userSpaceOnUse"
                >
                  <stop stopColor="#D6651C" />
                  <stop offset="1" stopColor="#F29A2D" />
                </linearGradient>
              </defs>
            </svg>
          )}
        </button>
      </div>

      {mobileOpen && (
        <div
          className="lg:hidden fixed inset-0 top-20 md:top-16 z-40"
          onClick={() => setMobileOpen(false)}
        >
          <div
            ref={mobileMenuRef}
            className="bg-background/95 backdrop-blur"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="container mx-auto px-4 py-8 flex flex-col gap-2">
              {links.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={() => {
                    showLoading();
                    setMobileOpen(false);
                  }}
                  className={cn(
                    "px-3 min-h-11 rounded-md text-sm uppercase tracking-wider transition-colors flex items-center",
                    pathname === link.href
                      ? "text-primary"
                      : "text-foreground hover:scale-105 transition-transform duration-300",
                  )}
                >
                  {t.nav[link.labelKey]}
                </Link>
              ))}

              <div className="pt-2 mt-1">
                <button
                  onClick={toggleLanguage}
                  className="w-full px-3 min-h-11 rounded-md flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
                >
                  <Globe className="w-4 h-4" />
                  <span>
                    {t.common.switchLanguage}: {nextLangLabel}
                  </span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </nav>
  );
}
