import { promises as fs } from "node:fs";
import path from "node:path";
import { isFirestoreConfigured, readFromFirestore, writeToFirestore } from "@/lib/firestore";
import {
  defaultSiteContent,
  HeroSlide,
  SiteContent,
  ServiceCategory,
} from "@/lib/site-content-types";

const dataDir = path.join(process.cwd(), "data");
const contentPath = path.join(dataDir, "site-content.json");
const useFirestoreStorage = isFirestoreConfigured();
const urlValidationCache = new Map<string, { ok: boolean; checkedAt: number }>();
const validationTtlMs = 10 * 60 * 1000;

const normalizeCategories = (content: SiteContent): SiteContent => {
  const byId = new Map<string, ServiceCategory>();

  for (const item of content.services.categories) {
    byId.set(item.id, item);
  }

  for (const item of content.portfolio.categories) {
    if (!byId.has(item.id)) byId.set(item.id, item);
  }

  const merged = Array.from(byId.values());

  return {
    ...content,
    services: {
      ...content.services,
      categories: merged,
    },
    portfolio: {
      ...content.portfolio,
      categories: merged,
      albums: content.portfolio.albums,
    },
  };
};

const normalizeHeroSlides = (content: SiteContent): SiteContent => {
  const hero = content.hero;
  const legacySlide: HeroSlide = {
    id: "hero-slide-1",
    title: hero.title || defaultSiteContent.hero.title,
    titleEn: hero.titleEn || defaultSiteContent.hero.titleEn || "",
    subtitle: hero.subtitle || defaultSiteContent.hero.subtitle,
    subtitleEn: hero.subtitleEn || defaultSiteContent.hero.subtitleEn || "",
    ctaLabel: hero.ctaLabel || defaultSiteContent.hero.ctaLabel,
    ctaLabelEn: hero.ctaLabelEn || defaultSiteContent.hero.ctaLabelEn || "",
    ctaHref: hero.ctaHref || defaultSiteContent.hero.ctaHref,
    showCta: hero.showCta !== false,
    secondaryButtonLabel:
      hero.secondaryButtonLabel || defaultSiteContent.hero.secondaryButtonLabel,
    secondaryButtonLabelEn:
      hero.secondaryButtonLabelEn ||
      defaultSiteContent.hero.secondaryButtonLabelEn ||
      "",
    secondaryButtonHref:
      hero.secondaryButtonHref || defaultSiteContent.hero.secondaryButtonHref,
    showSecondaryButton: hero.showSecondaryButton !== false,
    backgroundUrl: hero.backgroundUrl || defaultSiteContent.hero.backgroundUrl,
  };

  const sourceSlides = Array.isArray(hero.slides) && hero.slides.length > 0
    ? hero.slides
    : [legacySlide];

  const normalizedSlides = sourceSlides.map((slide, index) => ({
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
      slide.secondaryButtonLabel || defaultSiteContent.hero.secondaryButtonLabel,
    secondaryButtonLabelEn:
      slide.secondaryButtonLabelEn ||
      defaultSiteContent.hero.secondaryButtonLabelEn ||
      "",
    secondaryButtonHref:
      slide.secondaryButtonHref || defaultSiteContent.hero.secondaryButtonHref,
    showSecondaryButton: slide.showSecondaryButton !== false,
    backgroundUrl: slide.backgroundUrl || defaultSiteContent.hero.backgroundUrl,
  }));

  const first = normalizedSlides[0] || legacySlide;

  return {
    ...content,
    hero: {
      ...hero,
      title: first.title,
      titleEn: first.titleEn,
      subtitle: first.subtitle,
      subtitleEn: first.subtitleEn,
      ctaLabel: first.ctaLabel,
      ctaLabelEn: first.ctaLabelEn,
      ctaHref: first.ctaHref,
      showCta: first.showCta,
      secondaryButtonLabel: first.secondaryButtonLabel,
      secondaryButtonLabelEn: first.secondaryButtonLabelEn,
      secondaryButtonHref: first.secondaryButtonHref,
      showSecondaryButton: first.showSecondaryButton,
      backgroundUrl: first.backgroundUrl,
      slides: normalizedSlides,
    },
  };
};

const normalizeSectionTitles = (
  content: SiteContent,
): { content: SiteContent; changed: boolean } => {
  let changed = false;
  const next: SiteContent = JSON.parse(JSON.stringify(content));

  const isNewsTh =
    (next.news.title || "").trim() === "ข่าวสารและโปรโมชั่น";
  const isNewsEn = ["News & Promotions", "News & Promotion"].includes(
    (next.news.titleEn || "").trim(),
  );
  const isStoryThWrong =
    (next.story.title || "").trim() === "ข่าวสารและโปรโมชั่น";
  const isStoryEnWrong = ["News & Promotions", "News & Promotion"].includes(
    (next.story.titleEn || "").trim(),
  );
  const isStoryThBlog = (next.story.title || "").trim() === "บล็อก";
  const isStoryEnBlog = (next.story.titleEn || "").trim() === "Blog";

  if (isStoryThWrong || (!isStoryThBlog && isNewsTh)) {
    next.story.title = defaultSiteContent.story.title;
    changed = true;
  }

  if (isStoryEnWrong || (!isStoryEnBlog && isNewsEn)) {
    next.story.titleEn = defaultSiteContent.story.titleEn || "Blog";
    changed = true;
  }

  if ((next.news.title || "").trim() === "บล็อก") {
    next.news.title = defaultSiteContent.news.title;
    changed = true;
  }

  if ((next.news.titleEn || "").trim() === "Blog") {
    next.news.titleEn = defaultSiteContent.news.titleEn || "News & Promotions";
    changed = true;
  }

  return { content: next, changed };
};

const isRemoteImageUrl = (url: string | null | undefined) =>
  Boolean(
    url && (
      // ...existing code...
      url.startsWith("https://pub-") ||
      (process.env.R2_PUBLIC_URL && url.startsWith(process.env.R2_PUBLIC_URL))
    )
  );

const hasFreshValidation = (url: string) => {
  const cached = urlValidationCache.get(url);
  if (!cached) return false;
  return Date.now() - cached.checkedAt < validationTtlMs;
};

const validateRemoteUrl = async (url: string): Promise<boolean> => {
  if (hasFreshValidation(url)) {
    return urlValidationCache.get(url)?.ok ?? false;
  }

  try {
    const res = await fetch(url, {
      method: "HEAD",
      cache: "no-store",
    });

    const ok = res.ok;
    urlValidationCache.set(url, { ok, checkedAt: Date.now() });
    return ok;
  } catch {
    urlValidationCache.set(url, { ok: false, checkedAt: Date.now() });
    return false;
  }
};

const sanitizeBrokenImageUrls = async (
  content: SiteContent,
): Promise<{ content: SiteContent; changed: boolean }> => {
  const next: SiteContent = JSON.parse(JSON.stringify(content));
  let changed = false;

  const fallbackHero = "/hero-bg.png";
  const fallbackLogo = "/logo.png?v=20260313";

  const remoteUrls = new Set<string>();

  if (isRemoteImageUrl(next.branding.logoUrl)) {
    remoteUrls.add(next.branding.logoUrl);
  }

  if (isRemoteImageUrl(next.hero.backgroundUrl)) {
    remoteUrls.add(next.hero.backgroundUrl);
  }

  for (const slide of next.hero.slides || []) {
    if (isRemoteImageUrl(slide.backgroundUrl)) {
      remoteUrls.add(slide.backgroundUrl);
    }
  }

  for (const category of next.services.categories) {
    if (isRemoteImageUrl(category.coverUrl)) {
      remoteUrls.add(category.coverUrl);
    }
  }

  for (const category of next.portfolio.categories) {
    if (isRemoteImageUrl(category.coverUrl)) {
      remoteUrls.add(category.coverUrl);
    }
  }

  for (const item of next.news.items) {
    if (isRemoteImageUrl(item.imageUrl)) {
      remoteUrls.add(item.imageUrl);
    }
  }

  for (const item of next.story.items) {
    if (isRemoteImageUrl(item.imageUrl)) {
      remoteUrls.add(item.imageUrl);
    }
    for (const imageUrl of item.images || []) {
      if (isRemoteImageUrl(imageUrl)) {
        remoteUrls.add(imageUrl);
      }
    }
  }

  const urlStatus = new Map<string, boolean>();
  await Promise.all(
    Array.from(remoteUrls).map(async (url) => {
      const ok = await validateRemoteUrl(url);
      urlStatus.set(url, ok);
    }),
  );

  const ensureValid = (
    value: string,
    fallback: string,
  ): string => {
    if (!isRemoteImageUrl(value)) return value;
    return urlStatus.get(value) === false ? fallback : value;
  };

  const nextLogo = ensureValid(next.branding.logoUrl, fallbackLogo);
  if (nextLogo !== next.branding.logoUrl) {
    next.branding.logoUrl = nextLogo;
    changed = true;
  }

  const nextHero = ensureValid(next.hero.backgroundUrl, fallbackHero);
  if (nextHero !== next.hero.backgroundUrl) {
    next.hero.backgroundUrl = nextHero;
    changed = true;
  }

  next.hero.slides = (next.hero.slides || []).map((slide) => {
    const backgroundUrl = ensureValid(slide.backgroundUrl, fallbackHero);
    if (backgroundUrl !== slide.backgroundUrl) {
      changed = true;
      return { ...slide, backgroundUrl };
    }
    return slide;
  });

  next.services.categories = next.services.categories.map((category) => {
    const coverUrl = ensureValid(category.coverUrl, fallbackHero);
    if (coverUrl !== category.coverUrl) {
      changed = true;
      return { ...category, coverUrl };
    }
    return category;
  });

  next.portfolio.categories = next.portfolio.categories.map((category) => {
    const coverUrl = ensureValid(category.coverUrl, fallbackHero);
    if (coverUrl !== category.coverUrl) {
      changed = true;
      return { ...category, coverUrl };
    }
    return category;
  });

  next.news.items = next.news.items.map((item) => {
    const imageUrl = ensureValid(item.imageUrl, fallbackHero);
    if (imageUrl !== item.imageUrl) {
      changed = true;
      return { ...item, imageUrl };
    }
    return item;
  });

  next.story.items = next.story.items.map((item) => {
    const imageUrl = ensureValid(item.imageUrl, fallbackHero);
    const images = (item.images || []).map((galleryImageUrl) =>
      ensureValid(galleryImageUrl, fallbackHero),
    );
    if (imageUrl !== item.imageUrl) {
      changed = true;
      return { ...item, imageUrl, images };
    }
    if (JSON.stringify(images) !== JSON.stringify(item.images || [])) {
      changed = true;
      return { ...item, images };
    }
    return item;
  });

  return { content: next, changed };
};

const ensureLocalFile = async () => {
  await fs.mkdir(dataDir, { recursive: true });
  try {
    await fs.access(contentPath);
  } catch {
    await fs.writeFile(
      contentPath,
      JSON.stringify(defaultSiteContent, null, 2),
      "utf-8",
    );
  }
};

const readRawContent = async () => {
  if (useFirestoreStorage) {
    const raw = await readFromFirestore();
    if (raw) return raw;

    const fallbackRaw = JSON.stringify(defaultSiteContent, null, 2);
    await writeToFirestore(fallbackRaw);
    return fallbackRaw;
  }

  await ensureLocalFile();
  return fs.readFile(contentPath, "utf-8");
};

const writeRawContent = async (content: SiteContent) => {
  const raw = JSON.stringify(content, null, 2);

  if (useFirestoreStorage) {
    await writeToFirestore(raw);
    return;
  }

  await ensureLocalFile();
  await fs.writeFile(contentPath, raw, "utf-8");
};

export const readSiteContent = async (): Promise<SiteContent> => {
  const raw = await readRawContent();

  try {
    const parsed = JSON.parse(raw) as SiteContent;
    const normalized = normalizeHeroSlides(normalizeCategories({
      ...defaultSiteContent,
      ...parsed,
      branding: {
        ...defaultSiteContent.branding,
        ...parsed.branding,
      },
      hero: {
        ...defaultSiteContent.hero,
        ...parsed.hero,
      },
      services: {
        ...defaultSiteContent.services,
        ...parsed.services,
      },
      about: {
        ...defaultSiteContent.about,
        ...parsed.about,
      },
      portfolio: {
        ...defaultSiteContent.portfolio,
        ...parsed.portfolio,
      },
      contact: {
        ...defaultSiteContent.contact,
        ...parsed.contact,
        socials: {
          ...defaultSiteContent.contact.socials,
          ...parsed.contact?.socials,
        },
      },
      news: {
        ...defaultSiteContent.news,
        ...parsed.news,
      },
      story: {
        ...defaultSiteContent.story,
        ...parsed.story,
      },
      seo: {
        ...defaultSiteContent.seo,
        ...parsed.seo,
      },
    }));
    const titleNormalized = normalizeSectionTitles(normalized);

    const sanitized = await sanitizeBrokenImageUrls(titleNormalized.content);
    if (titleNormalized.changed || sanitized.changed) {
      await writeRawContent(sanitized.content);
    }

    return sanitized.content;
  } catch {
    await writeSiteContent(defaultSiteContent);
    return defaultSiteContent;
  }
};

export const writeSiteContent = async (content: SiteContent) => {
  const normalized = normalizeHeroSlides(normalizeCategories(content));
  const titleNormalized = normalizeSectionTitles(normalized);
  await writeRawContent(titleNormalized.content);
};
