import { useLang } from "@/lib/i18n";
import Image from "next/image";
import Link from "next/link";
import { useSiteContent } from "@/hooks/use-site-content";
import { getCachebustedUrl } from "@/lib/utils";

const normalizeSocialUrl = (url: string) => {
  const trimmed = url.trim();
  if (!trimmed) return "";
  if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) {
    return trimmed;
  }
  return `https://${trimmed}`;
};

export default function Footer() {
  const { t } = useLang();
  const { content } = useSiteContent();
  const socialLinks = [
    {
      key: "facebook",
      enabled: content.contact.socials.facebook.enabled,
      url: normalizeSocialUrl(content.contact.socials.facebook.url),
      iconSrc: "/social/facebook.svg",
      label: t.social.facebook,
    },
    {
      key: "instagram",
      enabled: content.contact.socials.instagram.enabled,
      url: normalizeSocialUrl(content.contact.socials.instagram.url),
      iconSrc: "/social/instagram.svg",
      label: t.social.instagram,
    },
    {
      key: "tiktok",
      enabled: content.contact.socials.tiktok.enabled,
      url: normalizeSocialUrl(content.contact.socials.tiktok.url),
      iconSrc: "/social/tiktok.svg",
      label: t.social.tiktok,
    },
    {
      key: "line",
      enabled: content.contact.socials.line.enabled,
      url: normalizeSocialUrl(content.contact.socials.line.url),
      iconSrc: "/social/line.svg",
      label: t.social.line,
    },
  ].filter((item) => item.enabled && item.url);

  return (
    <footer className="bg-background border-t border-border py-10 shadow-[-2px_2px_4px_0px_rgba(0,0,0,0.25)]">
      <div className="container mx-auto px-4">
        <div className="flex flex-col md:flex-row items-center justify-between gap-8">
          <Link
            href="/"
            className="flex items-center gap-3 text-center md:text-left relative h-14 w-14 hover:transform hover:scale-115 transition-transform duration-300"
          >
            <Image
              src={getCachebustedUrl(content.branding.logoUrl)}
              alt={t.navbar.logoAlt}
              fill
              unoptimized
              className="object-contain"
              sizes="80px"
              loading="eager"
              fetchPriority="high"
            />
          </Link>
          <div className="flex flex-col items-center gap-4 md:items-end">
            <p className="text-xs text-muted-foreground text-center md:text-right">
              {t.footer.copyrightPrefix} {t.footer.rights}
            </p>
            {socialLinks.length > 0 && (
              <div className="mt-5 flex justify-center gap-3 ">
                {socialLinks.map((item) => (
                  <a
                    key={item.key}
                    href={item.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex h-10 w-10 items-center justify-center hover:scale-115 transition-transform duration-300"
                    aria-label={item.label}
                  >
                    <Image
                      src={item.iconSrc}
                      alt={item.label}
                      width={22}
                      height={22}
                      className="h-5 w-5"
                    />
                  </a>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="mt-6 flex justify-center">
          <Link
            href="/admin/login"
            className="text-[11px] text-muted-foreground/80 hover:text-muted-foreground transition-colors"
          >
            {t.footer.adminLogin}
          </Link>
        </div>
      </div>
    </footer>
  );
}
