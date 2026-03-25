"use client";

import { useLang } from "@/lib/i18n";

export default function GalleryPage() {
  const { t } = useLang();

  return <div>{t.portfolio.title}</div>;
}
