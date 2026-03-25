"use client";

import { useMemo } from "react";
import Image from "next/image";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import Layout from "@/components/Layout";
import { useLang } from "@/lib/i18n";
import { useSiteContent } from "@/hooks/use-site-content";
import { pickLangText } from "@/lib/content-text";
import { isNewsActive } from "@/lib/news";

export default function NewsDetailClient({ newsId }: { newsId: string }) {
  const { lang, t } = useLang();
  const { content, loading } = useSiteContent();

  const item = useMemo(
    () => content.news.items.find((news) => news.id === newsId) || null,
    [content.news.items, newsId],
  );

  if (loading) {
    return (
      <Layout>
        <section className="py-20 container mx-auto px-4 text-center text-muted-foreground">
          {t.newsDetail.loading}
        </section>
      </Layout>
    );
  }

  if (!item || !isNewsActive(item)) {
    return (
      <Layout>
        <section className="py-20 container mx-auto px-4 text-center text-muted-foreground">
          {t.newsDetail.notFound}
        </section>
      </Layout>
    );
  }

  const title = pickLangText(item.title, item.titleEn, lang);
  const body = pickLangText(item.body, item.bodyEn, lang);

  return (
    <Layout>
      <section className="py-14 md:py-20">
        <div className="container mx-auto px-4 max-w-4xl">
          <Link
            href="/news"
            className="inline-flex items-center gap-2 text-primary hover:underline mb-6"
          >
            <ArrowLeft size={18} />
            {t.newsDetail.back}
          </Link>

          <div className="overflow-hidden  border border-border bg-card rounded-md drop-shadow-[-2px_2px_4px_rgba(0,0,0,0.25)]">
            <div className="relative aspect-3/4">
              <Image
                src={item.imageUrl || "/hero-bg.png"}
                alt={title}
                fill
                priority
                sizes="(max-width: 768px) 100vw, (max-width: 1200px) 70vw, 60vw"
                className="object-cover"
              />
            </div>
            <div className="p-6 md:p-8 space-y-5">
              <h1 className="font-heading text-xl ">{title}</h1>
              <p className="whitespace-pre-wrap text-base text-foreground">
                {body}
              </p>

              <Link
                href="/contact"
                className="inline-flex items-center rounded-md border border-[#FF5B00] bg-[#FF5B00] px-5 py-3 text-sm text-white transition-colors hover:bg-[#e65200] drop-shadow-[-2px_2px_4px_rgba(0,0,0,0.25)]"
              >
                {t.newsDetail.contactCta}
              </Link>
            </div>
          </div>
        </div>
      </section>
    </Layout>
  );
}
