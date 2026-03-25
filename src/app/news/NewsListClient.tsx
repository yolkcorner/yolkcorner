"use client";

import Image from "next/image";
import Link from "next/link";
import { motion } from "framer-motion";
import Layout from "@/components/Layout";
import { useLang } from "@/lib/i18n";
import { useSiteContent } from "@/hooks/use-site-content";
import { pickLangText } from "@/lib/content-text";
import { isNewsActive, sortNewsNewestFirst } from "@/lib/news";

export default function NewsListClient() {
  const { lang, t } = useLang();
  const { content, loading } = useSiteContent();

  const items = loading
    ? []
    : sortNewsNewestFirst(content.news.items).filter((item) =>
        isNewsActive(item),
      );

  const pageTitle = loading
    ? t.newsPage.loadingTitle
    : pickLangText(content.news.title, content.news.titleEn, lang);

  return (
    <Layout>
      <section className="py-14 md:py-20">
        <div className="container mx-auto px-4">
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="font-heading text-xl mb-10 md:mb-16"
          >
            {pageTitle}
          </motion.h1>

          {loading ? (
            <p className="text-center text-muted-foreground">
              {t.common.loading}
            </p>
          ) : items.length === 0 ? (
            <p className="text-center text-muted-foreground">
              {t.newsPage.noNews}
            </p>
          ) : (
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3 rounded-md drop-shadow-[-2px_2px_4px_rgba(0,0,0,0.25)]">
              {items.map((item, index) => (
                <motion.div
                  key={item.id}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: index * 0.08 }}
                  className="group bg-card rounded-md transition-all"
                >
                  <Link href={`/news/${item.id}`} className="block">
                    <div className="aspect-3/4 overflow-hidden relative rounded-md">
                      <Image
                        src={item.imageUrl || "/hero-bg.png"}
                        alt={pickLangText(item.title, item.titleEn, lang)}
                        fill
                        sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                        className="object-cover group-hover:scale-105 transition-transform rounded-md "
                      />
                      <div className="absolute inset-0 bg-linear-to-t from-black/70 via-black/10 to-transparent" />
                      <div className="absolute bottom-0 left-0 right-0 p-4">
                        <h2 className="font-heading text-xl text-white tracking-wide line-clamp-2">
                          {pickLangText(item.title, item.titleEn, lang)}
                        </h2>
                      </div>
                    </div>
                  </Link>
                </motion.div>
              ))}
            </div>
          )}
        </div>
      </section>
    </Layout>
  );
}
