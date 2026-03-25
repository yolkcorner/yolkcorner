"use client";

import Image from "next/image";
import Link from "next/link";
import { motion } from "framer-motion";
import Layout from "@/components/Layout";
import { useLang } from "@/lib/i18n";
import { useSiteContent } from "@/hooks/use-site-content";
import { pickLangText } from "@/lib/content-text";
import { isStoryPublished, sortStoryNewestFirst } from "@/lib/story";

export default function BlogListClient() {
  const { lang, t } = useLang();
  const { content, loading } = useSiteContent();

  const items = loading
    ? []
    : sortStoryNewestFirst(content.story.items).filter((item) =>
        isStoryPublished(item),
      );

  const pageTitle = loading
    ? t.blogPage.loadingTitle
    : pickLangText(content.story.title, content.story.titleEn, lang);

  return (
    <Layout>
      <section className="py-14 md:py-20">
        <div className="container mx-auto px-4">
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="font-heading text-xl  mb-10 md:mb-16"
          >
            {pageTitle}
          </motion.h1>

          {loading ? (
            <p className="text-center text-muted-foreground">
              {t.common.loading}
            </p>
          ) : items.length === 0 ? (
            <p className="text-center text-muted-foreground">
              {t.blogPage.noPosts}
            </p>
          ) : (
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
              {items.map((item, index) => (
                <motion.div
                  key={item.id}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: index * 0.08 }}
                  className="group bg-card border border-border overflow-hidden hover:border-primary/50 transition-all"
                >
                  <Link href={`/blog/${item.id}`} className="block">
                    <div className="aspect-video overflow-hidden relative">
                      <Image
                        src={item.imageUrl || "/hero-bg.png"}
                        alt={pickLangText(item.title, item.titleEn, lang)}
                        fill
                        sizes="(max-width: 1024px) 100vw, 33vw"
                        className="object-cover group-hover:scale-105 transition-transform"
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
