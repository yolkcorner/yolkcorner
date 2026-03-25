"use client";

import { motion } from "framer-motion";
import Layout from "@/components/Layout";
import Link from "next/link";
import Image from "next/image";
import { Suspense, useMemo } from "react";
import { useSearchParams } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { useSiteContent } from "@/hooks/use-site-content";
import { useLang } from "@/lib/i18n";
import { pickLangText } from "@/lib/content-text";

function PortfolioSuspenseFallback() {
  const { t } = useLang();
  return (
    <section className="py-14 md:py-20">
      <div className="container mx-auto px-4 text-center text-muted-foreground">
        {t.portfolio.suspenseFallback}
      </div>
    </section>
  );
}

export default function PortfolioListClient() {
  return (
    <Layout>
      <Suspense fallback={<PortfolioSuspenseFallback />}>
        <PortfolioContent />
      </Suspense>
    </Layout>
  );
}

function PortfolioContent() {
  const { t, lang } = useLang();
  const { content, loading } = useSiteContent();
  const searchParams = useSearchParams();

  const selectedCategoryId = searchParams.get("category");

  const selectedCategory = useMemo(() => {
    if (!selectedCategoryId) return null;
    return content.portfolio.categories.find(
      (category) => category.id === selectedCategoryId,
    );
  }, [selectedCategoryId, content.portfolio.categories]);

  const albumsInCategory = useMemo(() => {
    if (!selectedCategoryId) return [];
    return content.portfolio.albums.filter(
      (album) => album.categoryId === selectedCategoryId,
    );
  }, [selectedCategoryId, content.portfolio.albums]);

  return (
    <section className="py-14 md:py-20">
      <div className="container mx-auto px-4">
        <motion.h1
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="font-heading text-xl mb-6 md:mb-10 drop-shadow-[-2px_2px_4px_rgba(0,0,0,0.25)]"
        >
          {pickLangText(
            content.portfolio.title,
            content.portfolio.titleEn,
            lang,
          ) || t.portfolio.title}
        </motion.h1>

        {loading ? (
          <div className="text-center text-muted-foreground drop-shadow-[-2px_2px_4px_rgba(0,0,0,0.25)]">
            {t.common.loading}
          </div>
        ) : !selectedCategory ? (
          <div className="grid grid-cols-2 md:grid-cols-3 gap-6 max-w-8xl mx-auto ">
            {content.portfolio.categories.map((category, index) => (
              <motion.div
                key={category.id}
                initial={{ opacity: 0, scale: 0.985 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.08 }}
                className="group bg-card  overflow-hidden rounded-md drop-shadow-[-2px_2px_4px_rgba(0,0,0,0.25)]"
              >
                <Link
                  href={`/portfolio?category=${category.id}`}
                  className="block"
                >
                  <div className="aspect-video overflow-hidden relative">
                    <Image
                      src={category.coverUrl || "/hero-bg.png"}
                      alt={pickLangText(category.name, category.nameEn, lang)}
                      fill
                      priority={index === 0}
                      sizes="(max-width: 640px) 100vw, 50vw"
                      className="object-cover group-hover:scale-105 transition-all duration-300 ease-in-out"
                    />
                    <div className="absolute inset-0 flex items-end p-4">
                      <h3 className="font-heading text-sm md:text-xl text-white tracking-wide">
                        {pickLangText(category.name, category.nameEn, lang)}
                      </h3>
                    </div>
                  </div>
                </Link>
              </motion.div>
            ))}
          </div>
        ) : (
          <>
            <div className="mb-8 flex items-center gap-3">
              <Link
                href="/portfolio"
                className="inline-flex items-center gap-2 text-primary hover:underline"
              >
                <ArrowLeft size={18} />
                {t.common.back}
              </Link>
              <span className="text-muted-foreground">/</span>
              <span className="font-semibold">
                {pickLangText(
                  selectedCategory.name,
                  selectedCategory.nameEn,
                  lang,
                )}
              </span>
            </div>

            {albumsInCategory.length === 0 ? (
              <div className="text-center text-muted-foreground">
                {t.common.noAlbums}
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-6 ">
                {albumsInCategory.map((album, index) => (
                  <motion.div
                    key={album.id}
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: index * 0.08 }}
                    className="group bg-card border border-border overflow-hidden hover:border-primary/50 rounded-md drop-shadow-[-2px_2px_4px_rgba(0,0,0,0.25)]"
                  >
                    <Link href={`/portfolio/${album.id}`} className="block">
                      <div className="aspect-video overflow-hidden relative">
                        <Image
                          src={album.coverUrl || "/hero-bg.png"}
                          alt={pickLangText(album.name, album.nameEn, lang)}
                          fill
                          priority={index === 0}
                          sizes="(max-width: 640px) 100vw, 50vw"
                          className="object-cover group-hover:scale-105 transition-all duration-300 ease-in-out rounded-md drop-shadow-[-2px_2px_4px_rgba(0,0,0,0.25)]"
                        />
                        <div className="absolute inset-0 bg-linear-to-r from-black/40 via-black/18 to-transparent" />
                        <div className="absolute top-0 left-4 right-0 p-4">
                          <h3 className="font-heading text-xl text-white tracking-wide">
                            {pickLangText(album.name, album.nameEn, lang)}
                          </h3>
                        </div>
                        {pickLangText(album.topText, album.topTextEn, lang) && (
                          <div className="absolute bottom-4 left-4 right-4 rounded-md bg-black/25 px-3 py-2 ">
                            <p className="text-xs sm:text-sm text-white">
                              {pickLangText(
                                album.topText,
                                album.topTextEn,
                                lang,
                              )}
                            </p>
                            <p className="text-xs text-white/80 mt-1">
                              {album.images.length} {t.common.photosUnit}
                            </p>
                          </div>
                        )}
                      </div>
                    </Link>
                  </motion.div>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </section>
  );
}
