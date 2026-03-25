"use client";

import Image from "next/image";
import Link from "next/link";
import { ChangeEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import AdminSectionLayout from "@/components/admin/AdminSectionLayout";
import { FloatingLabelInput } from "@/components/FloatingLabelInput";
import { useLang } from "@/lib/i18n";
import { extractR2Key } from "@/lib/r2";
import {
  HeroSlide,
  SiteContent,
  defaultSiteContent,
} from "@/lib/site-content-types";

interface UploadAssetOptions {
  folder?: string;
  publicId?: string;
  overwrite?: boolean;
  deletePublicId?: string;
}

const HERO_RECOMMENDED_WIDTH = 1920;
const HERO_RECOMMENDED_HEIGHT = 1080;

const createId = (prefix: string) =>
  `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

const createEmptySlide = (): HeroSlide => ({
  id: createId("hero-slide"),
  title: "",
  titleEn: "",
  subtitle: "",
  subtitleEn: "",
  ctaLabel: "",
  ctaLabelEn: "",
  ctaHref: "/portfolio",
  showCta: true,
  secondaryButtonLabel: "เกี่ยวกับเรา",
  secondaryButtonLabelEn: "About",
  secondaryButtonHref: "/about",
  showSecondaryButton: true,
  backgroundUrl: "/hero-bg.png",
});

const normalizeHeroSlides = (hero: SiteContent["hero"]): HeroSlide[] => {
  const fallback: HeroSlide = {
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

  const sourceSlides =
    Array.isArray(hero.slides) && hero.slides.length > 0
      ? hero.slides
      : [fallback];

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
      slide.secondaryButtonLabel ||
      defaultSiteContent.hero.secondaryButtonLabel,
    secondaryButtonLabelEn:
      slide.secondaryButtonLabelEn ||
      defaultSiteContent.hero.secondaryButtonLabelEn ||
      "",
    secondaryButtonHref:
      slide.secondaryButtonHref || defaultSiteContent.hero.secondaryButtonHref,
    showSecondaryButton: slide.showSecondaryButton !== false,
    backgroundUrl: slide.backgroundUrl || "/hero-bg.png",
  }));
};

const withCacheBust = (url: string, token: string) => {
  const separator = url.includes("?") ? "&" : "?";
  return `${url}${separator}v=${encodeURIComponent(token)}`;
};

async function uploadAsset(
  file: File,
  options?: UploadAssetOptions,
): Promise<string> {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("folder", options?.folder || "Yolk Corner/content-manager");
  if (options?.publicId) formData.append("publicId", options.publicId);
  if (typeof options?.overwrite === "boolean") {
    formData.append("overwrite", options.overwrite ? "1" : "0");
  }
  if (options?.deletePublicId) {
    formData.append("deletePublicId", options.deletePublicId);
  }

  const res = await fetch("/api/admin/upload", {
    method: "POST",
    body: formData,
    credentials: "include",
  });

  const data = await res.json().catch(() => null);
  if (res.status === 401) {
    throw new Error("unauthorized");
  }

  if (!res.ok || !data?.url) {
    throw new Error(data?.error || "Upload failed");
  }

  return data.url as string;
}

export default function AdminHeroPage() {
  const { lang } = useLang();
  const isTh = lang === "th";
  const router = useRouter();
  const [content, setContent] = useState<SiteContent>(defaultSiteContent);
  const [draftSlides, setDraftSlides] = useState<HeroSlide[]>(
    defaultSiteContent.hero.slides || [createEmptySlide()],
  );
  const [heroDraftFiles, setHeroDraftFiles] = useState<Record<string, File>>(
    {},
  );
  const [heroPreviewUrls, setHeroPreviewUrls] = useState<
    Record<string, string>
  >({});

  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [previewHeroIndex, setPreviewHeroIndex] = useState(0);

  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<HeroSlide | null>(null);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editModalSlide, setEditModalSlide] = useState<HeroSlide | null>(null);
  const [editModalFile, setEditModalFile] = useState<File | null>(null);
  const [editModalPreview, setEditModalPreview] = useState("");
  const safePreviewHeroIndex =
    draftSlides.length > 0 ? previewHeroIndex % draftSlides.length : 0;
  const currentPreviewSlide = draftSlides[safePreviewHeroIndex] || null;

  useEffect(() => {
    const initialize = async () => {
      try {
        const contentRes = await fetch("/api/content", { cache: "no-store" });
        if (!contentRes.ok) {
          setMessage(
            isTh ? "โหลดข้อมูล Hero ไม่สำเร็จ" : "Failed to load Hero content",
          );
          return;
        }

        const contentData = await contentRes.json();
        if (contentData?.content) {
          const loaded = contentData.content as SiteContent;
          setContent(loaded);
          setDraftSlides(normalizeHeroSlides(loaded.hero));
        }
      } catch (error) {
        console.error(error);
        setMessage(
          isTh ? "โหลดข้อมูล Hero ไม่สำเร็จ" : "Failed to load Hero content",
        );
      }
    };

    initialize();
  }, [isTh]);

  useEffect(() => {
    return () => {
      Object.values(heroPreviewUrls).forEach((url) => URL.revokeObjectURL(url));
    };
  }, [heroPreviewUrls]);

  useEffect(() => {
    if (draftSlides.length <= 1) return;

    const timer = window.setInterval(() => {
      setPreviewHeroIndex((prev) => (prev + 1) % draftSlides.length);
    }, 5000);

    return () => window.clearInterval(timer);
  }, [draftSlides.length]);

  useEffect(() => {
    if (draftSlides.length === 0) {
      setPreviewHeroIndex(0);
      return;
    }

    if (previewHeroIndex > draftSlides.length - 1) {
      setPreviewHeroIndex(0);
    }
  }, [draftSlides.length, previewHeroIndex]);

  const clearHeroDraftImages = () => {
    Object.values(heroPreviewUrls).forEach((url) => URL.revokeObjectURL(url));
    setHeroPreviewUrls({});
    setHeroDraftFiles({});
  };

  const saveContent = async (nextContent: SiteContent) => {
    const saveRes = await fetch("/api/content", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content: nextContent }),
      credentials: "include",
    });

    const saveData = await saveRes.json().catch(() => null);
    if (saveRes.status === 401) {
      throw new Error("unauthorized");
    }

    if (!saveRes.ok || !saveData?.content) {
      throw new Error(
        saveData?.error ||
          (isTh ? "บันทึกข้อมูลไม่สำเร็จ" : "Failed to save content"),
      );
    }

    const saved = saveData.content as SiteContent;
    setContent(saved);
    return saved;
  };

  const addSlide = () => {
    setEditModalSlide(createEmptySlide());
    setEditModalFile(null);
    if (editModalPreview) URL.revokeObjectURL(editModalPreview);
    setEditModalPreview("");
    setEditModalOpen(true);
    setOpenMenuId(null);
    setMessage("");
  };

  const openEditModal = (slide: HeroSlide) => {
    setEditModalSlide({ ...slide });
    setEditModalFile(null);
    if (editModalPreview) URL.revokeObjectURL(editModalPreview);
    setEditModalPreview("");
    setEditModalOpen(true);
    setOpenMenuId(null);
    setMessage("");
  };

  const closeEditModal = () => {
    setEditModalOpen(false);
    setEditModalSlide(null);
    setEditModalFile(null);
    if (editModalPreview) URL.revokeObjectURL(editModalPreview);
    setEditModalPreview("");
  };

  const onEditModalFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0] || null;
    if (!file) return;
    if (editModalPreview) URL.revokeObjectURL(editModalPreview);
    setEditModalFile(file);
    setEditModalPreview(URL.createObjectURL(file));
  };

  const persistHero = async (options?: {
    nextDraftSlides?: HeroSlide[];
    nextHeroDraftFiles?: Record<string, File>;
    successMessage?: string;
  }) => {
    const slidesToSave = options?.nextDraftSlides || draftSlides;
    const heroFilesToSave = options?.nextHeroDraftFiles || heroDraftFiles;

    setSaving(true);
    setMessage(
      isTh ? "กำลังบันทึก Hero carousel..." : "Saving Hero carousel...",
    );

    try {
      const existingSlides = normalizeHeroSlides(content.hero);
      let slidesWithImages = [...slidesToSave];

      for (const slide of slidesToSave) {
        const draftFile = heroFilesToSave[slide.id];
        if (!draftFile) continue;

        const currentImageUrl =
          existingSlides.find((item) => item.id === slide.id)?.backgroundUrl ||
          null;

        const uploadedUrl = await uploadAsset(draftFile, {
          folder: "Yolk Corner/hero/slides",
          publicId: slide.id,
          overwrite: true,
          deletePublicId: extractR2Key(currentImageUrl) || undefined,
        });

        const backgroundUrl = withCacheBust(
          uploadedUrl,
          `${slide.id}-${Date.now()}`,
        );

        slidesWithImages = slidesWithImages.map((item) =>
          item.id === slide.id ? { ...item, backgroundUrl } : item,
        );
      }

      const normalizedSlides = slidesWithImages.map((slide) => ({
        ...slide,
        title: slide.title.trim(),
        titleEn: (slide.titleEn || "").trim(),
        subtitle: slide.subtitle.trim(),
        subtitleEn: (slide.subtitleEn || "").trim(),
        ctaLabel: slide.ctaLabel.trim(),
        ctaLabelEn: (slide.ctaLabelEn || "").trim(),
        ctaHref: (slide.ctaHref || "").trim() || "/portfolio",
        showCta: slide.showCta !== false,
        secondaryButtonLabel: (slide.secondaryButtonLabel || "").trim(),
        secondaryButtonLabelEn: (slide.secondaryButtonLabelEn || "").trim(),
        secondaryButtonHref:
          (slide.secondaryButtonHref || "").trim() || "/about",
        showSecondaryButton: slide.showSecondaryButton !== false,
        backgroundUrl: slide.backgroundUrl || "/hero-bg.png",
      }));

      const first = normalizedSlides[0] || createEmptySlide();

      const nextContent: SiteContent = {
        ...content,
        hero: {
          ...content.hero,
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

      const saved = await saveContent(nextContent);
      setContent(saved);
      setDraftSlides(normalizeHeroSlides(saved.hero));
      clearHeroDraftImages();
      setMessage(
        options?.successMessage ||
          (isTh
            ? "บันทึก Hero carousel เรียบร้อยแล้ว"
            : "Hero carousel saved successfully"),
      );
      return true;
    } catch (error) {
      if (error instanceof Error && error.message === "unauthorized") {
        setMessage(
          isTh
            ? "เซสชันหมดอายุ กรุณาเข้าสู่ระบบใหม่"
            : "Session expired. Please sign in again",
        );
        router.push("/admin/login");
      } else {
        console.error(error);
        setMessage(
          isTh
            ? "บันทึก Hero carousel ไม่สำเร็จ"
            : "Failed to save Hero carousel",
        );
      }
      return false;
    } finally {
      setSaving(false);
    }
  };

  const saveEditModal = async () => {
    if (!editModalSlide) return;

    const exists = draftSlides.some((slide) => slide.id === editModalSlide.id);
    const nextDraftSlides = exists
      ? draftSlides.map((s) =>
          s.id === editModalSlide.id ? { ...editModalSlide } : s,
        )
      : [...draftSlides, { ...editModalSlide }];

    let nextHeroDraftFiles = heroDraftFiles;
    let nextHeroPreviewUrls = heroPreviewUrls;

    if (editModalFile) {
      const id = editModalSlide.id;
      const newPreviewUrl = URL.createObjectURL(editModalFile);
      nextHeroDraftFiles = { ...heroDraftFiles, [id]: editModalFile as File };
      nextHeroPreviewUrls = { ...heroPreviewUrls };
      if (nextHeroPreviewUrls[id]) URL.revokeObjectURL(nextHeroPreviewUrls[id]);
      nextHeroPreviewUrls[id] = newPreviewUrl;
    }

    setDraftSlides(nextDraftSlides);
    setHeroDraftFiles(nextHeroDraftFiles);
    if (editModalFile) {
      setHeroPreviewUrls(nextHeroPreviewUrls);
    }

    const saved = await persistHero({
      nextDraftSlides,
      nextHeroDraftFiles,
      successMessage: isTh
        ? "บันทึก Hero carousel เรียบร้อยแล้ว"
        : "Hero carousel saved successfully",
    });

    if (!saved) return;

    setEditModalOpen(false);
    setEditModalSlide(null);
    setEditModalFile(null);
    setEditModalPreview("");
  };

  const requestDeleteSlide = (slide: HeroSlide) => {
    setOpenMenuId(null);
    setDeleteTarget(slide);
  };

  const confirmDeleteSlide = async () => {
    if (!deleteTarget) return;
    if (draftSlides.length <= 1) {
      setMessage(
        isTh ? "ต้องมีอย่างน้อย 1 สไลด์" : "At least one slide is required",
      );
      setDeleteTarget(null);
      return;
    }

    const targetId = deleteTarget.id;
    const nextDraftSlides = draftSlides.filter(
      (slide) => slide.id !== targetId,
    );
    const nextHeroDraftFiles = { ...heroDraftFiles };
    delete nextHeroDraftFiles[targetId];

    const nextHeroPreviewUrls = { ...heroPreviewUrls };
    const preview = nextHeroPreviewUrls[targetId];
    if (preview) URL.revokeObjectURL(preview);
    delete nextHeroPreviewUrls[targetId];

    setDraftSlides(nextDraftSlides);
    setHeroDraftFiles(nextHeroDraftFiles);
    setHeroPreviewUrls(nextHeroPreviewUrls);
    setDeleteTarget(null);

    await persistHero({
      nextDraftSlides,
      nextHeroDraftFiles,
      successMessage: isTh
        ? "ลบสไลด์ Hero เรียบร้อยแล้ว"
        : "Hero slide deleted successfully",
    });
  };

  return (
    <AdminSectionLayout
      title={isTh ? "ฮีโร่" : "Hero"}
      description={
        isTh
          ? "จัดการ Hero Carousel: เพิ่ม/ลบ/แก้ไขสไลด์, รูปพื้นหลัง และลิงก์ปลายทางเมื่อคลิก"
          : "Manage Hero carousel: add/delete/edit slides, background image, and destination links."
      }
    >
      <section className="rounded-lg border border-border bg-card p-6 space-y-6">
        <div className="rounded-md border border-border bg-background p-4">
          <p className="text-sm text-muted-foreground">
            {isTh
              ? "Hero carousel บนหน้าแรกจะเปลี่ยนอัตโนมัติทุก 5 วินาที และรองรับการกดจุดเพื่อสลับสไลด์"
              : "The homepage Hero carousel auto-rotates every 5 seconds and supports dot navigation."}
          </p>
          <p className="mt-2 text-sm text-muted-foreground">
            {isTh
              ? `แนะนำขนาดภาพอย่างน้อย ${HERO_RECOMMENDED_WIDTH} × ${HERO_RECOMMENDED_HEIGHT} px (16:9) เพื่อความคมชัด`
              : `Recommended size: at least ${HERO_RECOMMENDED_WIDTH} x ${HERO_RECOMMENDED_HEIGHT} px (16:9).`}
          </p>
        </div>

        <div className="rounded-md border border-border bg-background p-3">
          <p className="mb-3 text-sm font-semibold">
            {isTh ? "ตัวอย่าง Hero บนหน้าแรก" : "Homepage Hero Preview"}
          </p>
          <section className="relative min-h-80 overflow-hidden rounded-md md:min-h-110">
            <div className="absolute inset-0">
              {draftSlides.map((slide, index) => {
                const preview =
                  heroPreviewUrls[slide.id] ||
                  slide.backgroundUrl ||
                  "/hero-bg.png";

                return (
                  <Image
                    key={slide.id}
                    src={preview}
                    alt={slide.title || `Hero slide ${index + 1}`}
                    fill
                    sizes="(max-width: 768px) 100vw, 90vw"
                    className={`absolute inset-0 h-full w-full object-cover transition-opacity duration-1000 ${
                      index === safePreviewHeroIndex
                        ? "opacity-100"
                        : "opacity-0"
                    } brightness-110 saturate-110`}
                  />
                );
              })}
              <div className="absolute inset-0 bg-linear-to-r from-black/40 via-black/18 to-transparent" />
              <div className="absolute inset-0 bg-linear-to-t from-black/16 via-transparent to-transparent" />
            </div>

            <div className="relative flex min-h-80 items-center px-5 py-10 md:min-h-110 md:px-8">
              <div className="max-w-xl space-y-4 text-white">
                <h3 className="font-heading whitespace-pre-line text-2xl font-bold leading-tight md:text-4xl">
                  {currentPreviewSlide?.title ||
                    (isTh ? "ตัวอย่างหัวข้อ Hero" : "Hero Title Preview")}
                </h3>
                <p className="text-sm text-white/90 md:text-base">
                  {currentPreviewSlide?.subtitle ||
                    (isTh ? "ตัวอย่างคำโปรย Hero" : "Hero Subtitle Preview")}
                </p>

                <div className="flex flex-wrap gap-3">
                  {currentPreviewSlide?.showCta !== false && (
                    <Link
                      href={currentPreviewSlide?.ctaHref || "/portfolio"}
                      className="inline-flex items-center rounded-none border border-primary bg-primary px-5 py-2.5 text-xs font-semibold text-white transition-colors hover:bg-[#e8871a] md:text-sm"
                    >
                      {currentPreviewSlide?.ctaLabel ||
                        (isTh ? "ปุ่มหลัก" : "Primary Button")}
                    </Link>
                  )}
                  {currentPreviewSlide?.showSecondaryButton !== false && (
                    <Link
                      href={
                        currentPreviewSlide?.secondaryButtonHref || "/about"
                      }
                      className="inline-flex items-center rounded-none border border-white/60 bg-white/10 px-5 py-2.5 text-xs font-semibold text-white transition-colors hover:bg-white/20 md:text-sm"
                    >
                      {currentPreviewSlide?.secondaryButtonLabel ||
                        (isTh ? "ปุ่มรอง" : "Secondary Button")}
                    </Link>
                  )}
                </div>
              </div>
            </div>

            {draftSlides.length > 1 && (
              <div className="pointer-events-none absolute inset-x-0 bottom-4 z-10 flex justify-center px-4">
                <div className="pointer-events-auto flex items-center gap-2 rounded-full bg-black/35 px-4 py-2 backdrop-blur-sm">
                  {draftSlides.map((slide, index) => (
                    <button
                      type="button"
                      aria-label={`hero-${index + 1}`}
                      key={slide.id}
                      onClick={() => setPreviewHeroIndex(index)}
                      className={`h-2.5 w-2.5 rounded-full transition-all ${
                        index === safePreviewHeroIndex
                          ? "scale-110 bg-primary"
                          : "bg-white/50 hover:bg-white/80"
                      }`}
                    />
                  ))}
                </div>
              </div>
            )}
          </section>
        </div>

        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold">
            {isTh ? "รายการสไลด์ Hero" : "Hero Slides"}
          </h2>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {draftSlides.map((slide, index) => {
            const preview =
              heroPreviewUrls[slide.id] ||
              slide.backgroundUrl ||
              "/hero-bg.png";

            return (
              <div
                key={slide.id}
                className="relative overflow-hidden rounded-md border border-border bg-background"
              >
                {/* 3-dot menu */}
                <div className="absolute right-2 top-2 z-20">
                  <button
                    type="button"
                    onClick={() =>
                      setOpenMenuId((prev) =>
                        prev === slide.id ? null : slide.id,
                      )
                    }
                    className="rounded-md border border-border bg-background px-2 py-1 text-xs"
                    aria-label={isTh ? "เมนู" : "Menu"}
                  >
                    ...
                  </button>
                  {openMenuId === slide.id && (
                    <div className="absolute right-0 mt-1 w-28 rounded-md border border-border bg-background shadow-md">
                      <button
                        type="button"
                        onClick={() => openEditModal(slide)}
                        className="block w-full px-3 py-2 text-left text-xs hover:bg-secondary"
                      >
                        {isTh ? "แก้ไข" : "Edit"}
                      </button>
                      <button
                        type="button"
                        onClick={() => requestDeleteSlide(slide)}
                        className="block w-full px-3 py-2 text-left text-xs hover:bg-secondary"
                      >
                        {isTh ? "ลบ" : "Delete"}
                      </button>
                    </div>
                  )}
                </div>

                {/* Background preview */}
                <div className="relative aspect-video overflow-hidden border-b border-border">
                  <Image
                    src={preview}
                    alt={slide.title || `Hero slide ${index + 1}`}
                    fill
                    sizes="(max-width: 1024px) 100vw, 400px"
                    className="object-cover"
                  />
                </div>

                {/* Info */}
                <div className="p-3 space-y-1.5">
                  <span className="inline-block rounded-full bg-secondary px-2.5 py-0.5 text-xs text-muted-foreground">
                    Slide {index + 1}
                  </span>
                  <p className="line-clamp-1 text-sm font-semibold">
                    {slide.title || "-"}
                  </p>
                  <p className="line-clamp-1 text-xs text-muted-foreground">
                    {slide.titleEn || "-"}
                  </p>
                  <p className="line-clamp-1 text-xs text-muted-foreground">
                    {slide.subtitle || "-"}
                  </p>
                  <p className="line-clamp-1 text-xs text-muted-foreground">
                    {slide.subtitleEn || "-"}
                  </p>
                  {slide.showCta && (
                    <p className="line-clamp-1 text-xs text-[#FF5B00]">
                      CTA: {slide.ctaLabel || "-"} / {slide.ctaLabelEn || "-"}
                    </p>
                  )}
                  {slide.showSecondaryButton !== false && (
                    <p className="line-clamp-1 text-xs text-muted-foreground">
                      {isTh ? "ปุ่มรอง" : "Secondary"}:{" "}
                      {slide.secondaryButtonLabel || "-"} /{" "}
                      {slide.secondaryButtonLabelEn || "-"}
                    </p>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        <div className="flex flex-wrap items-center justify-end gap-2">
          <button
            type="button"
            onClick={addSlide}
            disabled={saving}
            className="rounded-md border border-[#FF5B00] bg-[#FF5B00] px-4 py-2 text-sm text-white transition-colors hover:bg-[#e65200] disabled:opacity-60"
          >
            {isTh ? "เพิ่มสไลด์" : "Add Slide"}
          </button>
        </div>

        {message && (
          <p className="text-sm text-muted-foreground" role="status">
            {message}
          </p>
        )}

        <p className="text-xs text-muted-foreground">
          {isTh
            ? "รองรับไฟล์ภาพ Hero: PNG, JPG, WEBP, AVIF (ไม่เกิน 12MB)"
            : "Supported Hero formats: PNG, JPG, WEBP, AVIF (max 12MB)."}
        </p>
      </section>

      {/* Edit Modal */}
      {editModalOpen && editModalSlide && (
        <div className="fixed inset-0 z-60 flex items-center justify-center bg-black/45 p-4">
          <div className="relative w-full max-w-2xl">
            <button
              type="button"
              onClick={closeEditModal}
              className="absolute top-0 -right-10 sm:-right-11 inline-flex h-8 w-8 items-center justify-center rounded-md border border-border bg-background text-sm font-semibold transition-all duration-200 hover:scale-105 hover:bg-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF5B00]"
              aria-label={isTh ? "ปิด" : "Close"}
            >
              X
            </button>
            <div
              className="max-h-[90vh] w-full overflow-y-auto rounded-lg border border-border bg-card p-5"
              onClick={(e) => e.stopPropagation()}
            >
              <h3 className="text-lg font-semibold">
                {isTh ? "แก้ไขสไลด์ Hero" : "Edit Hero Slide"}
              </h3>

              <div className="mt-4 space-y-3">
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                  {isTh ? "ตัวอย่างบนหน้าแรก" : "Preview On Home Hero"}
                </p>
                <div className="relative overflow-hidden rounded-md border border-border bg-background">
                  <div className="relative min-h-64 overflow-hidden md:min-h-72">
                    <Image
                      src={
                        editModalPreview ||
                        heroPreviewUrls[editModalSlide.id] ||
                        editModalSlide.backgroundUrl ||
                        "/hero-bg.png"
                      }
                      alt="preview"
                      fill
                      sizes="(max-width: 1024px) 100vw, 600px"
                      className="object-cover"
                    />
                    <div className="absolute inset-0 bg-linear-to-r from-black/80 via-black/60 to-black/35" />

                    <div className="relative flex min-h-64 items-end p-4 md:min-h-72 md:p-6">
                      <div className="max-w-lg space-y-3 text-white">
                        <h4 className="font-heading whitespace-pre-line text-lg font-bold leading-tight md:text-2xl">
                          {editModalSlide.title ||
                            (isTh
                              ? "ตัวอย่างหัวข้อ Hero"
                              : "Hero Title Preview")}
                        </h4>
                        <p className="text-xs text-white/90 md:text-sm">
                          {editModalSlide.subtitle ||
                            (isTh
                              ? "ตัวอย่างคำโปรย Hero"
                              : "Hero Subtitle Preview")}
                        </p>

                        <div className="flex flex-wrap gap-2">
                          {editModalSlide.showCta && (
                            <span className="inline-flex items-center rounded-none border border-primary bg-primary px-4 py-2 text-xs font-semibold text-white md:text-sm">
                              {editModalSlide.ctaLabel ||
                                (isTh ? "ปุ่มหลัก" : "Primary Button")}
                            </span>
                          )}
                          {editModalSlide.showSecondaryButton !== false && (
                            <span className="inline-flex items-center rounded-none border border-white/60 bg-white/10 px-4 py-2 text-xs font-semibold text-white md:text-sm">
                              {editModalSlide.secondaryButtonLabel ||
                                (isTh ? "ปุ่มรอง" : "Secondary Button")}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
                <input
                  type="file"
                  accept="image/png,image/jpeg,image/webp,image/avif"
                  onChange={onEditModalFileChange}
                  className="block w-full cursor-pointer rounded-md border border-border bg-background px-3 py-2 text-sm file:mr-3 file:rounded-md file:border-0 file:bg-[#FF5B00] file:px-3 file:py-2 file:text-white"
                />

                {/* Title */}
                <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                  <FloatingLabelInput
                    value={editModalSlide.title}
                    onChange={(e) =>
                      setEditModalSlide((prev) =>
                        prev ? { ...prev, title: e.target.value } : prev,
                      )
                    }
                    label="หัวข้อ (TH)"
                    id="hero-title-th"
                  />
                  <FloatingLabelInput
                    value={editModalSlide.titleEn || ""}
                    onChange={(e) =>
                      setEditModalSlide((prev) =>
                        prev ? { ...prev, titleEn: e.target.value } : prev,
                      )
                    }
                    label={isTh ? "หัวข้อ (EN)" : "Title (EN)"}
                    id="hero-title-en"
                  />
                  <FloatingLabelInput
                    value={editModalSlide.subtitle}
                    onChange={(e) =>
                      setEditModalSlide((prev) =>
                        prev ? { ...prev, subtitle: e.target.value } : prev,
                      )
                    }
                    label="คำโปรย (TH)"
                    id="hero-subtitle-th"
                  />
                  <FloatingLabelInput
                    value={editModalSlide.subtitleEn || ""}
                    onChange={(e) =>
                      setEditModalSlide((prev) =>
                        prev ? { ...prev, subtitleEn: e.target.value } : prev,
                      )
                    }
                    label="Subtitle (EN)"
                    id="hero-subtitle-en"
                  />
                </div>

                {/* CTA */}
                <div className="space-y-3 rounded-md border border-border p-3">
                  <label className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={editModalSlide.showCta}
                      onChange={(e) =>
                        setEditModalSlide((prev) =>
                          prev ? { ...prev, showCta: e.target.checked } : prev,
                        )
                      }
                    />
                    {isTh ? "แสดงปุ่ม CTA บนสไลด์" : "Show CTA button on slide"}
                  </label>
                  <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                    <FloatingLabelInput
                      value={editModalSlide.ctaLabel}
                      onChange={(e) =>
                        setEditModalSlide((prev) =>
                          prev ? { ...prev, ctaLabel: e.target.value } : prev,
                        )
                      }
                      label="ข้อความบนปุ่ม CTA (TH)"
                      id="hero-cta-label-th"
                    />
                    <FloatingLabelInput
                      value={editModalSlide.ctaLabelEn || ""}
                      onChange={(e) =>
                        setEditModalSlide((prev) =>
                          prev ? { ...prev, ctaLabelEn: e.target.value } : prev,
                        )
                      }
                      label="ข้อความบนปุ่ม CTA (EN)"
                      id="hero-cta-label-en"
                    />
                  </div>
                  <FloatingLabelInput
                    value={editModalSlide.ctaHref}
                    onChange={(e) =>
                      setEditModalSlide((prev) =>
                        prev ? { ...prev, ctaHref: e.target.value } : prev,
                      )
                    }
                    label={
                      isTh
                        ? "ลิงก์ปลายทาง เช่น /portfolio หรือ https://example.com"
                        : "Destination link e.g. /portfolio or https://example.com"
                    }
                    id="hero-cta-href"
                  />
                </div>

                <div className="space-y-3 rounded-md border border-border p-3">
                  <label className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={editModalSlide.showSecondaryButton !== false}
                      onChange={(e) =>
                        setEditModalSlide((prev) =>
                          prev
                            ? {
                                ...prev,
                                showSecondaryButton: e.target.checked,
                              }
                            : prev,
                        )
                      }
                    />
                    {isTh
                      ? "แสดงปุ่มรองบนสไลด์"
                      : "Show secondary button on slide"}
                  </label>
                  <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                    <FloatingLabelInput
                      value={editModalSlide.secondaryButtonLabel || ""}
                      onChange={(e) =>
                        setEditModalSlide((prev) =>
                          prev
                            ? {
                                ...prev,
                                secondaryButtonLabel: e.target.value,
                              }
                            : prev,
                        )
                      }
                      label="ข้อความบนปุ่มรอง (TH)"
                      id="hero-secondary-label-th"
                    />
                    <FloatingLabelInput
                      value={editModalSlide.secondaryButtonLabelEn || ""}
                      onChange={(e) =>
                        setEditModalSlide((prev) =>
                          prev
                            ? {
                                ...prev,
                                secondaryButtonLabelEn: e.target.value,
                              }
                            : prev,
                        )
                      }
                      label="ข้อความบนปุ่มรอง (EN)"
                      id="hero-secondary-label-en"
                    />
                  </div>
                  <FloatingLabelInput
                    value={editModalSlide.secondaryButtonHref || ""}
                    onChange={(e) =>
                      setEditModalSlide((prev) =>
                        prev
                          ? {
                              ...prev,
                              secondaryButtonHref: e.target.value,
                            }
                          : prev,
                      )
                    }
                    label={
                      isTh
                        ? "ลิงก์ปลายทางปุ่มรอง เช่น /about หรือ https://example.com"
                        : "Secondary button link e.g. /about or https://example.com"
                    }
                    id="hero-secondary-href"
                  />
                </div>
              </div>

              <div className="mt-5 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={closeEditModal}
                  disabled={saving}
                  className="rounded-md border border-border px-4 py-2 text-sm transition-all duration-200 hover:-translate-y-0.5 hover:bg-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF5B00] disabled:opacity-60"
                >
                  {isTh ? "ยกเลิก" : "Cancel"}
                </button>
                <button
                  type="button"
                  onClick={saveEditModal}
                  disabled={saving}
                  className="rounded-md border border-[#FF5B00] bg-[#FF5B00] px-4 py-2 text-sm text-white transition-all duration-200 hover:-translate-y-0.5 hover:bg-[#e65200] hover:shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF5B00] disabled:opacity-60"
                >
                  {saving
                    ? isTh
                      ? "กำลังบันทึก..."
                      : "Saving..."
                    : isTh
                      ? "บันทึก"
                      : "Save"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteTarget && (
        <div className="fixed inset-0 z-60 flex items-center justify-center bg-black/60 p-4">
          <div className="relative w-full max-w-md rounded-lg border border-border bg-card p-6">
            <button
              type="button"
              onClick={() => setDeleteTarget(null)}
              className="absolute top-0 -right-10 sm:-right-11 inline-flex h-8 w-8 items-center justify-center rounded-md border border-border bg-background text-sm font-semibold transition-all duration-200 hover:scale-105 hover:bg-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF5B00]"
              aria-label={isTh ? "ปิด" : "Close"}
            >
              X
            </button>
            <p className="text-sm text-foreground">
              {isTh
                ? `ต้องการลบสไลด์ “${deleteTarget.title || "Slide"}” จริงหรือไม่?`
                : `Are you sure you want to delete slide “${deleteTarget.title || "Slide"}”?`}
            </p>
            <div className="mt-4 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setDeleteTarget(null)}
                className="rounded-md border border-border px-4 py-2 text-sm transition-all duration-200 hover:-translate-y-0.5 hover:bg-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF5B00]"
              >
                {isTh ? "ยกเลิก" : "Cancel"}
              </button>
              <button
                type="button"
                onClick={confirmDeleteSlide}
                className="rounded-md border border-[#FF5B00] bg-[#FF5B00] px-4 py-2 text-sm text-white transition-all duration-200 hover:-translate-y-0.5 hover:bg-[#e65200] hover:shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF5B00]"
              >
                {isTh ? "ใช่, ลบ" : "Yes, Delete"}
              </button>
            </div>
          </div>
        </div>
      )}
    </AdminSectionLayout>
  );
}
