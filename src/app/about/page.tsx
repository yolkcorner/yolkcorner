"use client";

import { useLang } from "@/lib/i18n";
import { motion } from "framer-motion";
import Layout from "@/components/Layout";
import { UserRound } from "lucide-react";
import { useSiteContent } from "@/hooks/use-site-content";
import Image from "next/image";
import { pickLangText } from "@/lib/content-text";

const normalizeSocialLink = (url: string) => {
  const trimmed = url.trim();
  if (!trimmed) return "";
  if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) {
    return trimmed;
  }
  return `https://${trimmed}`;
};

export default function AboutPage() {
  const { t, lang } = useLang();
  const { content, loading } = useSiteContent();

  const sectionTitle = loading
    ? t.about.title
    : pickLangText(content.about.title, content.about.titleEn, lang);
  const sectionSubtitle = loading
    ? t.about.subtitle
    : pickLangText(content.about.subtitle, content.about.subtitleEn, lang);
  const members = loading
    ? [
        {
          id: "fallback-1",
          name: `${t.about.memberLabel} 1`,
          nameEn: `Member 1`,
          positionTitle: t.members.role1,
          positionTitleEn: t.members.role1,
          positionDescription: t.members.role1,
          positionDescriptionEn: t.members.role1,
          contactPhone: "",
          portfolioLink: "",
          socials: {
            instagram: { enabled: false, url: "" },
            facebook: { enabled: false, url: "" },
            tiktok: { enabled: false, url: "" },
          },
          imageUrl: "",
          roleTitle: t.members.role1,
          details: t.members.role1,
        },
        {
          id: "fallback-2",
          name: `${t.about.memberLabel} 2`,
          nameEn: `Member 2`,
          positionTitle: t.members.role2,
          positionTitleEn: t.members.role2,
          positionDescription: t.members.role2,
          positionDescriptionEn: t.members.role2,
          contactPhone: "",
          portfolioLink: "",
          socials: {
            instagram: { enabled: false, url: "" },
            facebook: { enabled: false, url: "" },
            tiktok: { enabled: false, url: "" },
          },
          imageUrl: "",
          roleTitle: t.members.role2,
          details: t.members.role2,
        },
      ]
    : content.about.members;

  return (
    <Layout>
      <section className="py-14 md:py-20">
        <div className="container mx-auto px-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-10 md:mb-16"
          >
            <h1 className="font-heading text-xl  ">{sectionTitle}</h1>
            <p className="mt-3 md:mt-4 text-muted-foreground  md:text-lg max-w-xl ">
              {sectionSubtitle}
            </p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {members.map((member, i) => {
              const name =
                pickLangText(member.name, member.nameEn, lang) ||
                `${t.about.memberLabel} ${i + 1}`;
              const positionTitle = pickLangText(
                member.positionTitle || member.roleTitle,
                member.positionTitleEn,
                lang,
              );
              const positionDescription = pickLangText(
                member.positionDescription || member.details,
                member.positionDescriptionEn,
                lang,
              );
              const contactPhone = member.contactPhone || "";
              const instagramUrl =
                member.socials?.instagram?.enabled &&
                member.socials.instagram.url
                  ? normalizeSocialLink(member.socials.instagram.url)
                  : "";
              const facebookUrl =
                member.socials?.facebook?.enabled && member.socials.facebook.url
                  ? normalizeSocialLink(member.socials.facebook.url)
                  : "";
              const tiktokUrl =
                member.socials?.tiktok?.enabled && member.socials.tiktok.url
                  ? normalizeSocialLink(member.socials.tiktok.url)
                  : "";
              const hasSocials = Boolean(
                instagramUrl || facebookUrl || tiktokUrl,
              );

              return (
                <motion.div
                  key={member.id}
                  initial={{ opacity: 0, y: 24 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.15 }}
                  className="bg-card border border-border p-6 md:p-8 text-center group rounded-md drop-shadow-[-2px_2px_4px_rgba(0,0,0,0.25)] transform 
            transition-all 
            duration-300 
            ease-in-out 
            hover:scale-102"
                >
                  <div className="mb-6">
                    {member.imageUrl ? (
                      <div className="mx-auto w-[90%] max-w-60 overflow-hidden rounded-md border border-border">
                        <Image
                          src={member.imageUrl}
                          alt={name}
                          width={240}
                          height={320}
                          sizes="(max-width: 768px) 90vw, 240px"
                          priority={i === 0}
                          loading={i === 0 ? "eager" : "lazy"}
                          className="h-auto w-full object-cover"
                        />
                      </div>
                    ) : (
                      <div className="w-20 h-20 md:w-24 md:h-24 mx-auto rounded-md bg-secondary flex items-center justify-center">
                        <UserRound className="w-16 h-16 md:w-20 md:h-20 text-primary" />
                      </div>
                    )}
                  </div>
                  <h3 className="font-heading text-2xl tracking-wider">
                    {name}
                  </h3>
                  {positionTitle && (
                    <p className="text-sm text-primary mt-2">{positionTitle}</p>
                  )}
                  {positionDescription && (
                    <p className="text-sm text-muted-foreground mt-2">
                      {positionDescription}
                    </p>
                  )}
                  {contactPhone && (
                    <p className="text-sm text-muted-foreground mt-2">
                      {contactPhone}
                    </p>
                  )}
                  {hasSocials && (
                    <div className="mt-4 flex items-center justify-center gap-3">
                      {instagramUrl && (
                        <a
                          href={instagramUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-border text-muted-foreground transition-all duration-300 ease-in-out hover:scale-130"
                          aria-label={t.social.instagram}
                        >
                          <Image
                            src="/social/instagram.svg"
                            alt={t.social.instagram}
                            width={18}
                            height={18}
                            className="h-4.5 w-4.5"
                          />
                        </a>
                      )}
                      {facebookUrl && (
                        <a
                          href={facebookUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-border text-muted-foreground transition-all duration-300 ease-in-out hover:scale-130"
                          aria-label={t.social.facebook}
                        >
                          <Image
                            src="/social/facebook.svg"
                            alt={t.social.facebook}
                            width={18}
                            height={18}
                            className="h-4.5 w-4.5"
                          />
                        </a>
                      )}
                      {tiktokUrl && (
                        <a
                          href={tiktokUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-border text-muted-foreground transition-all duration-300 ease-in-out hover:scale-130"
                          aria-label={t.social.tiktok}
                        >
                          <Image
                            src="/social/tiktok.svg"
                            alt={t.social.tiktok}
                            width={18}
                            height={18}
                            className="h-4.5 w-4.5"
                          />
                        </a>
                      )}
                    </div>
                  )}
                </motion.div>
              );
            })}
          </div>
        </div>
      </section>
    </Layout>
  );
}
