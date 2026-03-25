"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useLang } from "@/lib/i18n";
import { AnimatePresence, motion } from "framer-motion";
import Link from "next/link";
import Image from "next/image";
import Layout from "@/components/Layout";
import { useSiteContent } from "@/hooks/use-site-content";
import { pickLangText } from "@/lib/content-text";
import { isNewsActive, sortNewsNewestFirst } from "@/lib/news";
import { isStoryPublished, sortStoryNewestFirst } from "@/lib/story";
import { HeroSlide } from "@/lib/site-content-types";
import { ArrowRight } from "lucide-react";

export default function Home() {
  const { t, lang } = useLang();
  const { content, loading } = useSiteContent();
  const [activeHeroIndex, setActiveHeroIndex] = useState(0);
  const [activePromotionIndex, setActivePromotionIndex] = useState(0);
  const promotionSwipeStartX = useRef<number | null>(null);

  const heroSlides = useMemo<HeroSlide[]>(() => {
    if (loading) {
      return [
        {
          id: "hero-loading",
          title: t?.hero?.title || "Yolk Corner PRODUCTION",
          titleEn: t?.hero?.title || "Yolk Corner PRODUCTION",
          subtitle:
            t?.hero?.subtitle || "Creating professional content with passion",
          subtitleEn:
            t?.hero?.subtitle || "Creating professional content with passion",
          ctaLabel: t?.hero?.cta || "View Our Work",
          ctaLabelEn: t?.hero?.cta || "View Our Work",
          ctaHref: "/portfolio",
          showCta: true,
          secondaryButtonLabel: t?.nav?.about || "About",
          secondaryButtonLabelEn: "About",
          secondaryButtonHref: "/about",
          showSecondaryButton: true,
          backgroundUrl: "/hero-bg.png",
        },
      ];
    }

    const sourceSlides =
      Array.isArray(content?.hero?.slides) && content?.hero?.slides?.length > 0
        ? content.hero.slides
        : [
            {
              id: "hero-legacy",
              title: content?.hero?.title || "",
              titleEn: content?.hero?.titleEn || "",
              subtitle: content?.hero?.subtitle || "",
              subtitleEn: content?.hero?.subtitleEn || "",
              ctaLabel: content?.hero?.ctaLabel || "",
              ctaLabelEn: content?.hero?.ctaLabelEn || "",
              ctaHref: content?.hero?.ctaHref || "/portfolio",
              showCta: content?.hero?.showCta !== false,
              secondaryButtonLabel:
                content?.hero?.secondaryButtonLabel || "About",
              secondaryButtonLabelEn:
                content?.hero?.secondaryButtonLabelEn || "About",
              secondaryButtonHref:
                content?.hero?.secondaryButtonHref || "/about",
              showSecondaryButton: content?.hero?.showSecondaryButton !== false,
              backgroundUrl: content?.hero?.backgroundUrl || "/hero-bg.png",
            },
          ];

    return sourceSlides.map((slide, index) => ({
      id: slide.id || `hero-slide-${index + 1}`,
      title: slide.title || "",
      titleEn: slide.titleEn || "",
      subtitle: slide.subtitle || "",
      subtitleEn: slide.subtitleEn || "",
      ctaLabel: slide.ctaLabel || "",
      ctaLabelEn: slide.ctaLabelEn || "",
      ctaHref: slide.ctaHref || "/portfolio",
      showCta: slide.showCta !== false,
      secondaryButtonLabel:
        slide.secondaryButtonLabel || t?.nav?.about || "About",
      secondaryButtonLabelEn: slide.secondaryButtonLabelEn || "About",
      secondaryButtonHref: slide.secondaryButtonHref || "/about",
      showSecondaryButton: slide.showSecondaryButton !== false,
      backgroundUrl: slide.backgroundUrl || "/hero-bg.png",
    }));
  }, [
    content?.hero,
    loading,
    t?.hero?.cta,
    t?.hero?.subtitle,
    t?.hero?.title,
    t?.nav?.about,
  ]);

  const safeActiveHeroIndex =
    heroSlides.length > 0 ? activeHeroIndex % heroSlides.length : 0;

  useEffect(() => {
    // Warm up browser image cache to reduce visible flicker during slide changes.
    heroSlides.forEach((slide) => {
      const url = slide.backgroundUrl?.trim();
      if (!url) return;
      const preloadImg = new window.Image();
      preloadImg.src = url;
    });
  }, [heroSlides]);

  useEffect(() => {
    if (heroSlides.length <= 1) return;

    const timer = window.setInterval(() => {
      setActiveHeroIndex((prev) => (prev + 1) % heroSlides.length);
    }, 5000);

    return () => window.clearInterval(timer);
  }, [heroSlides.length]);

  const serviceTitle = loading
    ? t?.categories?.title || "Services"
    : pickLangText(
        content?.services?.title,
        content?.services?.titleEn,
        lang,
      ) ||
      t?.categories?.title ||
      "Services";
  const serviceCategories = loading ? [] : content?.services?.categories || [];
  const homePromotions = loading
    ? []
    : sortNewsNewestFirst(content?.news?.items || []).filter(
        (item) => item.showOnHome && isNewsActive(item),
      );
  const promotionSectionTitle = loading
    ? ""
    : pickLangText(content?.news?.title, content?.news?.titleEn, lang);
  const homeBlogs = loading
    ? []
    : sortStoryNewestFirst(content?.story?.items || [])
        .filter((item) => item.showOnHome && isStoryPublished(item))
        .slice(0, 6);
  const totalHomeBlogs = loading
    ? 0
    : sortStoryNewestFirst(content?.story?.items || []).filter(
        (item) => item.showOnHome && isStoryPublished(item),
      ).length;
  const hasMoreBlogsOnHome = totalHomeBlogs > homeBlogs.length;
  const blogSectionTitle = loading
    ? ""
    : pickLangText(content?.story?.title, content?.story?.titleEn, lang);
  const safeActivePromotionIndex =
    homePromotions.length > 0
      ? activePromotionIndex % homePromotions.length
      : 0;
  const currentHero = heroSlides[safeActiveHeroIndex];
  const heroTitle = pickLangText(
    currentHero?.title,
    currentHero?.titleEn,
    lang,
  ).trim();
  const heroSubtitle = pickLangText(
    currentHero?.subtitle,
    currentHero?.subtitleEn,
    lang,
  ).trim();
  const heroPrimaryLabel = pickLangText(
    currentHero?.ctaLabel,
    currentHero?.ctaLabelEn,
    lang,
  ).trim();
  const heroSecondaryLabel = pickLangText(
    currentHero?.secondaryButtonLabel,
    currentHero?.secondaryButtonLabelEn,
    lang,
  ).trim();
  const showPrimaryButton =
    currentHero?.showCta !== false && heroPrimaryLabel.length > 0;
  const showSecondaryButton =
    currentHero?.showSecondaryButton !== false && heroSecondaryLabel.length > 0;

  const nextPromotion = () => {
    if (homePromotions.length <= 1) return;
    setActivePromotionIndex((prev) => (prev + 1) % homePromotions.length);
  };

  const prevPromotion = () => {
    if (homePromotions.length <= 1) return;
    setActivePromotionIndex(
      (prev) => (prev - 1 + homePromotions.length) % homePromotions.length,
    );
  };

  const onPromotionPointerDown: React.PointerEventHandler<HTMLDivElement> = (
    event,
  ) => {
    promotionSwipeStartX.current = event.clientX;
  };

  const onPromotionPointerUp: React.PointerEventHandler<HTMLDivElement> = (
    event,
  ) => {
    if (promotionSwipeStartX.current === null) return;

    const deltaX = event.clientX - promotionSwipeStartX.current;
    promotionSwipeStartX.current = null;

    if (Math.abs(deltaX) < 28) return;
    if (deltaX < 0) {
      nextPromotion();
    } else {
      prevPromotion();
    }
  };

  const clearPromotionSwipe = () => {
    promotionSwipeStartX.current = null;
  };

  return (
    <Layout>
      {/* Hero Carousel */}
      <section className="relative w-full aspect-video max-h-80 md:max-h-180 overflow-hidden">
        <div className="absolute inset-0">
          <AnimatePresence mode="sync" initial={false}>
            <motion.img
              key={`${currentHero?.id || "hero"}-${currentHero?.backgroundUrl || ""}`}
              src={currentHero?.backgroundUrl || "/hero-bg.png"}
              alt={heroTitle || "Hero slide"}
              loading="eager"
              initial={{ opacity: 0, scale: 1.04 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 1.02 }}
              transition={{ duration: 1.1, ease: [0.22, 1, 0.36, 1] }}
              className="absolute inset-0 h-full w-full object-cover brightness-110 saturate-110"
            />
          </AnimatePresence>
          <div className="absolute inset-0 bg-linear-to-r from-black/40 via-black/18 to-transparent" />
          <div className="absolute inset-0 bg-linear-to-t from-black/16 via-transparent to-transparent" />
        </div>

        <div className="container relative mx-auto flex h-full items-center px-4 py-8 md:py-12 lg:py-16">
          <div className="max-w-xl space-y-3 md:space-y-6">
            <h1 className="font-heading whitespace-pre-line text-3xl md:text-4xl lg:text-5xl xl:text-6xl font-bold leading-tight text-white">
              {heroTitle || t.hero.title}
            </h1>
            <p className="text-sm md:text-base lg:text-lg text-white/90">
              {heroSubtitle || t.hero.subtitle}
            </p>

            {(showPrimaryButton || showSecondaryButton) && (
              <div className="flex flex-wrap gap-2 md:gap-3 pt-2">
                {showPrimaryButton && (
                  <Link
                    href={currentHero?.ctaHref || "/portfolio"}
                    className="inline-flex items-center gap-2 rounded-md border border-primary bg-primary px-4 md:px-6 py-2 md:py-3 text-xs md:text-sm font-semibold text-white transition-colors hover:bg-[#e8871a]"
                  >
                    {heroPrimaryLabel || t.hero.cta}
                    <ArrowRight className="h-3 w-3 md:h-4 md:w-4" />
                  </Link>
                )}

                {showSecondaryButton && (
                  <Link
                    href={currentHero?.secondaryButtonHref || "/about"}
                    className="inline-flex items-center gap-2 rounded-md border border-white/60 bg-white/10 px-4 md:px-6 py-2 md:py-3 text-xs md:text-sm font-semibold text-white transition-colors hover:bg-white/20"
                  >
                    {heroSecondaryLabel}
                  </Link>
                )}
              </div>
            )}
          </div>
        </div>

        {heroSlides.length > 1 && (
          <div className="pointer-events-none absolute inset-x-0 bottom-4 md:bottom-6 z-10 flex justify-center px-4">
            <div className="pointer-events-auto flex items-center gap-2 rounded-full bg-black/35 px-4 py-2 backdrop-blur-sm">
              {heroSlides.map((slide, index) => (
                <button
                  type="button"
                  aria-label={`hero-${index + 1}`}
                  key={slide.id}
                  onClick={() => setActiveHeroIndex(index)}
                  className={`h-2.5 w-2.5 rounded-full transition-all ${
                    index === safeActiveHeroIndex
                      ? "scale-110 bg-primary"
                      : "bg-white/50 hover:bg-white/80"
                  }`}
                />
              ))}
            </div>
          </div>
        )}
      </section>

      {/* Categories */}
      <section className=" py-14 md:py-20">
        <div className="container mx-auto px-4">
          <motion.h2
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            className="font-heading text-xl md:text-2xl text-start mb-8 md:mb-12 w-fit px-4 sm:px-6 md:px-8 drop-shadow-[-2px_2px_4px_rgba(0,0,0,0.25)]"
          >
            {serviceTitle}
          </motion.h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-2 gap-3 sm:gap-4 md:gap-6 lg:gap-10 px-4 sm:px-6 md:px-8 lg:px-10">
            {serviceCategories.map((category, i) => {
              return (
                <motion.div
                  key={category.id}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.1 }}
                  className="group bg-card rounded-md overflow-hidden transition-all shadow-[-2px_2px_4px_0px_rgba(0,0,0,0.25)]"
                >
                  <Link
                    href={`/portfolio?category=${category.id}&lang=${lang}`}
                    className="block h-full"
                  >
                    <div className="relative aspect-3/2 w-full overflow-hidden bg-black/5">
                      <Image
                        src={category.coverUrl || "/hero-bg.png"}
                        alt={category.name}
                        fill
                        sizes="(max-width: 768px) 50vw, 25vw"
                        loading={i < 2 ? "eager" : "lazy"}
                        className="object-cover transition-transform"
                      />
                      <div className="absolute inset-0 bg-linear-to-r from-black/40 via-black/18 to-transparent" />
                      <div className="absolute inset-0 flex items-end p-4">
                        <h2 className="font-heading  text-white tracking-wide">
                          {pickLangText(category.name, category.nameEn, lang)}
                        </h2>
                      </div>
                    </div>
                  </Link>
                </motion.div>
              );
            })}
          </div>
        </div>
      </section>

      {homePromotions.length > 0 && (
        <section className="overflow-x-hidden py-14 md:py-20">
          <div className="container mx-auto px-4">
            <motion.h2
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              viewport={{ once: true }}
              className="font-heading text-xl md:text-2xl text-center mb-8 md:mb-12 w-fit px-4 sm:px-6 md:px-8 mx-auto drop-shadow-[-2px_2px_4px_rgba(0,0,0,0.25)]"
            >
              {promotionSectionTitle ||
                (lang === "th" ? "ข่าวสารและโปรโมชั่น" : "News & Promotions")}
            </motion.h2>

            <div
              className="mx-auto w-full max-w-7xl touch-pan-y select-none"
              onPointerDown={onPromotionPointerDown}
              onPointerUp={onPromotionPointerUp}
              onPointerCancel={clearPromotionSwipe}
              onPointerLeave={clearPromotionSwipe}
            >
              <div className="relative mx-auto aspect-2/3 w-[70vw] max-w-sm overflow-visible xs:w-[65vw] sm:w-[50vw] md:w-[35vw] lg:w-[28vw]">
                {homePromotions.map((item, index) => {
                  const total = homePromotions.length;
                  let offset = index - safeActivePromotionIndex;
                  if (offset > total / 2) offset -= total;
                  if (offset < -total / 2) offset += total;

                  const distance = Math.abs(offset);
                  if (distance > 2) return null;

                  return (
                    <motion.div
                      key={item.id}
                      initial={false}
                      animate={{
                        opacity: 1,
                        scale: 1,
                        x: `${offset * 105}%`,
                      }}
                      transition={{ duration: 0.38, ease: [0.22, 1, 0.36, 1] }}
                      className="absolute inset-0 "
                      style={{ zIndex: 25 - distance }}
                    >
                      <Link
                        href={`/news/${item.id}`}
                        className="group block h-full overflow-hidden rounded-2xl border border-border bg-card shadow-[-2px_2px_4px_0px_rgba(0,0,0,0.25)]"
                      >
                        <div className="relative h-full w-full overflow-hidden">
                          <Image
                            src={item.imageUrl || "/hero-bg.png"}
                            alt={pickLangText(item.title, item.titleEn, lang)}
                            fill
                            sizes="(max-width: 768px) 58vw, (max-width: 1280px) 31vw, 26vw"
                            className="object-cover"
                          />
                          <div className="absolute inset-0 bg-linear-to-t from-black/50 via-black/10 to-transparent" />
                          <div className="absolute bottom-0 left-0 right-0 p-4">
                            <h3 className="font-heading text-base text-white tracking-wide line-clamp-2 md:text-lg">
                              {pickLangText(item.title, item.titleEn, lang)}
                            </h3>
                          </div>
                        </div>
                      </Link>
                    </motion.div>
                  );
                })}
              </div>
            </div>

            {homePromotions.length > 1 && (
              <div className="mt-8 flex items-center justify-center gap-2">
                {homePromotions.map((item, index) => (
                  <button
                    key={`promotion-dot-${item.id}`}
                    type="button"
                    onClick={() => setActivePromotionIndex(index)}
                    aria-label={`Go to promotion ${index + 1}`}
                    className="inline-flex h-2 w-2 items-center justify-center transition-transform hover:scale-110"
                  >
                    {index === safeActivePromotionIndex ? (
                      <svg
                        width="12"
                        height="12"
                        viewBox="0 0 101 102"
                        fill="none"
                        xmlns="http://www.w3.org/2000/svg"
                        aria-hidden="true"
                      >
                        <ellipse
                          cx="52.5"
                          cy="49"
                          rx="46.5"
                          ry="47"
                          fill="black"
                        />
                      </svg>
                    ) : (
                      <svg
                        width="12"
                        height="12"
                        viewBox="0 0 102 102"
                        fill="none"
                        xmlns="http://www.w3.org/2000/svg"
                        aria-hidden="true"
                      >
                        <circle cx="53" cy="49" r="47" fill="#F4822A" />
                      </svg>
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>
        </section>
      )}

      {homeBlogs.length > 0 && (
        <section className="py-14 md:py-20 ">
          <div className="container mx-auto px-4">
            <motion.h2
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              viewport={{ once: true }}
              className="font-heading  md:text-2xl text-center mb-10 md:mb-12 w-fit px-4 sm:px-6 md:px-8 lg:px-10 drop-shadow-[-2px_2px_4px_rgba(0,0,0,0.25)]"
            >
              {blogSectionTitle || (lang === "th" ? "บล็อก" : "Blog")}
            </motion.h2>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6 px-4 sm:px-6 md:px-8 lg:px-10">
              {homeBlogs.map((item, index) => (
                <motion.div
                  key={item.id}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: index * 0.08 }}
                  className="group bg-card rounded-md overflow-hidden hover:border-primary/50 transition-all"
                >
                  <Link href={`/blog/${item.id}`} className="block">
                    <div className="relative aspect-3/2 overflow-hidden ">
                      <Image
                        src={item.imageUrl || "/hero-bg.png"}
                        alt={pickLangText(item.title, item.titleEn, lang)}
                        fill
                        sizes="(max-width: 1024px) 100vw, 33vw"
                        className="object-cover"
                      />
                      <div className="absolute inset-0 bg-linear-to-t from-black/50 via-black/10 to-transparent" />
                      <div className="absolute bottom-0 left-0 right-0 p-4">
                        <h3 className="font-heading text-lg text-white tracking-wide line-clamp-2">
                          {pickLangText(item.title, item.titleEn, lang)}
                        </h3>
                      </div>
                    </div>
                  </Link>
                </motion.div>
              ))}
            </div>

            {hasMoreBlogsOnHome && (
              <div className="mt-8 text-center">
                <Link
                  href="/blog"
                  className="inline-flex items-center justify-center rounded-none border border-primary px-6 py-2 text-sm font-medium text-primary transition-colors hover:bg-primary hover:text-white"
                >
                  {lang === "th" ? "ดูเพิ่มเติม" : "See More"}
                </Link>
              </div>
            )}
          </div>
        </section>
      )}
    </Layout>
  );
}
