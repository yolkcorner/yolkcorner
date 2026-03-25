"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  ArrowLeft,
  Check,
  ChevronLeft,
  ChevronRight,
  Copy,
  Loader2,
  X,
  ZoomIn,
  ZoomOut,
} from "lucide-react";
import Layout from "@/components/Layout";
import { useLang } from "@/lib/i18n";
import { useSiteContent } from "@/hooks/use-site-content";
import { pickLangText } from "@/lib/content-text";
import { isStoryPublished } from "@/lib/story";
import { createPortal } from "react-dom";

export default function StoryDetailClient({ blogId }: { blogId: string }) {
  const { lang, t } = useLang();
  const { content, loading } = useSiteContent();
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [scale, setScale] = useState(1);
  const [modalImageLoading, setModalImageLoading] = useState(false);
  const [translateX, setTranslateX] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [copied, setCopied] = useState(false);

  const touchStartX = useRef<number | null>(null);
  const pinchStartDistance = useRef<number | null>(null);
  const pinchStartScale = useRef(1);
  const isPinching = useRef(false);
  const lastTapTime = useRef(0);

  const item = useMemo(
    () => content.story.items.find((story) => story.id === blogId) || null,
    [content.story.items, blogId],
  );

  const galleryImages = useMemo(() => item?.images || [], [item]);

  const closeModal = useCallback(() => {
    setSelectedIndex(null);
    setModalImageLoading(false);
    setScale(1);
    setTranslateX(0);
  }, []);

  const openModal = useCallback((index: number) => {
    setSelectedIndex(index);
    setModalImageLoading(true);
    setScale(1);
    setTranslateX(0);
  }, []);

  useEffect(() => {
    if (selectedIndex !== null) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }

    return () => {
      document.body.style.overflow = "";
    };
  }, [selectedIndex]);

  useEffect(() => {
    if (selectedIndex === null || galleryImages.length === 0) return;

    const current = galleryImages[selectedIndex];
    const next = galleryImages[(selectedIndex + 1) % galleryImages.length];
    const prev =
      galleryImages[
        (selectedIndex - 1 + galleryImages.length) % galleryImages.length
      ];

    [current, next, prev].forEach((url) => {
      if (!url) return;
      const image = new window.Image();
      image.src = url;
    });
  }, [selectedIndex, galleryImages]);

  const goNext = useCallback(() => {
    if (selectedIndex === null || galleryImages.length === 0) return;
    setScale(1);
    setModalImageLoading(true);
    setSelectedIndex((prev) =>
      prev === null ? null : (prev + 1) % galleryImages.length,
    );
    setTranslateX(0);
  }, [selectedIndex, galleryImages.length]);

  const goPrev = useCallback(() => {
    if (selectedIndex === null || galleryImages.length === 0) return;
    setScale(1);
    setModalImageLoading(true);
    setSelectedIndex((prev) =>
      prev === null
        ? null
        : (prev - 1 + galleryImages.length) % galleryImages.length,
    );
    setTranslateX(0);
  }, [selectedIndex, galleryImages.length]);

  useEffect(() => {
    const handleKey = (event: KeyboardEvent) => {
      if (selectedIndex === null) return;
      if (event.key === "Escape") closeModal();
      if (event.key === "ArrowRight") goNext();
      if (event.key === "ArrowLeft") goPrev();
    };

    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [selectedIndex, closeModal, goNext, goPrev]);

  if (loading) {
    return (
      <Layout>
        <section className="py-20 container mx-auto px-4 text-center text-muted-foreground">
          {t.blogDetail.loading}
        </section>
      </Layout>
    );
  }

  if (!item || !isStoryPublished(item)) {
    return (
      <Layout>
        <section className="py-20 container mx-auto px-4 text-center text-muted-foreground">
          {t.blogDetail.notFound}
        </section>
      </Layout>
    );
  }

  const title = pickLangText(item.title, item.titleEn, lang);
  const body = pickLangText(item.body, item.bodyEn, lang);
  const coverAlt = pickLangText(item.coverAltTh, item.coverAltEn, lang).trim();
  const tags = lang === "th" ? item.seoTagsTh || [] : item.seoTagsEn || [];
  const shareUrl =
    typeof window !== "undefined"
      ? window.location.href
      : `${(process.env.NEXT_PUBLIC_SITE_URL || "").replace(/\/$/, "")}/blog/${blogId}`;
  const encodedUrl = encodeURIComponent(shareUrl);
  const encodedTitle = encodeURIComponent(title);

  const shareLinks = {
    facebook: `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`,
    x: `https://twitter.com/intent/tweet?text=${encodedTitle}&url=${encodedUrl}`,
    line: `https://social-plugins.line.me/lineit/share?url=${encodedUrl}`,
    linkedin: `https://www.linkedin.com/sharing/share-offsite/?url=${encodedUrl}`,
  };

  const handleCopyShareUrl = async () => {
    if (!shareUrl) return;

    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch (error) {
      console.error(error);
    }
  };

  const getTouchDistance = (touches: React.TouchList) => {
    if (touches.length < 2) return 0;
    const dx = touches[0].clientX - touches[1].clientX;
    const dy = touches[0].clientY - touches[1].clientY;
    return Math.hypot(dx, dy);
  };

  const handleTouchStart = (event: React.TouchEvent) => {
    if (event.touches.length === 2) {
      isPinching.current = true;
      pinchStartDistance.current = getTouchDistance(event.touches);
      pinchStartScale.current = scale;
      setIsDragging(false);
      touchStartX.current = null;
      return;
    }

    if (event.touches.length === 1) {
      touchStartX.current = event.touches[0].clientX;
      setIsDragging(true);
    }
  };

  const handleTouchMove = (event: React.TouchEvent) => {
    if (event.touches.length === 2 && pinchStartDistance.current) {
      event.preventDefault();
      const currentDistance = getTouchDistance(event.touches);
      const ratio = currentDistance / pinchStartDistance.current;
      const nextScale = Math.min(
        Math.max(pinchStartScale.current * ratio, 1),
        3,
      );
      setScale(nextScale);
      setTranslateX(0);
      return;
    }

    if (scale > 1) return;
    if (!isDragging || touchStartX.current === null) return;
    const diff = event.touches[0].clientX - touchStartX.current;
    setTranslateX(diff);
  };

  const handleTouchEnd = (event: React.TouchEvent) => {
    const wasPinching = isPinching.current;
    isPinching.current = false;
    pinchStartDistance.current = null;
    setIsDragging(false);

    const canSwipe = scale === 1;
    const didSwipe = canSwipe && Math.abs(translateX) > 70;

    if (didSwipe) {
      if (translateX > 0) goPrev();
      else goNext();
    }

    if (!wasPinching && !didSwipe && event.changedTouches.length === 1) {
      const now = Date.now();
      const isDoubleTap = now - lastTapTime.current < 300;
      if (isDoubleTap) {
        setScale((prev) => (prev === 1 ? 1.5 : 1));
        lastTapTime.current = 0;
      } else {
        lastTapTime.current = now;
      }
    }

    setTranslateX(0);
    touchStartX.current = null;
  };

  return (
    <Layout>
      <section className="py-14 md:py-20">
        <div className="container mx-auto px-4 max-w-4xl">
          <Link
            href="/blog"
            className="inline-flex items-center gap-2 text-primary hover:underline mb-6"
          >
            <ArrowLeft size={18} />
            {t.blogDetail.back}
          </Link>

          <div className="overflow-hidden rounded-lg border border-border bg-card">
            <div className="relative aspect-video">
              <Image
                src={item.imageUrl || "/hero-bg.png"}
                alt={coverAlt || title}
                fill
                priority
                sizes="(max-width: 1024px) 100vw, 1024px"
                className="object-cover"
              />
            </div>
            <div className="p-6 md:p-8 space-y-5">
              <h1 className="font-heading text-xl ">{title}</h1>

              {tags.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {tags.map((tag) => (
                    <span
                      key={`${item.id}-${tag}`}
                      className="rounded-full border border-border bg-background px-3 py-1 text-xs text-foreground"
                    >
                      #{tag}
                    </span>
                  ))}
                </div>
              )}

              <p className="whitespace-pre-wrap text-base text-foreground">
                {body}
              </p>

              {galleryImages.length > 0 && (
                <div className="space-y-3">
                  <h2 className="text-lg font-semibold">
                    {t.blogDetail.galleryTitle}
                  </h2>
                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
                    {galleryImages.map((imageUrl, index) => (
                      <div
                        key={`${item.id}-gallery-${index}`}
                        className="cursor-pointer relative aspect-square overflow-hidden rounded-md border border-border bg-muted drop-shadow-[-2px_2px_4px_rgba(0,0,0,0.25)]"
                        onClick={() => openModal(index)}
                      >
                        <Image
                          src={imageUrl}
                          alt={
                            pickLangText(
                              item.galleryAltTh?.[index],
                              item.galleryAltEn?.[index],
                              lang,
                            ).trim() || `${title} ${index + 1}`
                          }
                          fill
                          sizes="(max-width: 768px) 50vw, 25vw"
                          className="object-cover hover:brightness-75 transition"
                        />
                        <div className="absolute inset-0 flex items-center justify-center opacity-0 hover:opacity-100 transition bg-black/50">
                          <ZoomIn size={24} className="text-white" />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              <div className="rounded-xl border border-border bg-background/70 p-4 md:p-5 space-y-3">
                <p className="text-sm font-semibold text-foreground">
                  {t.blogDetail.shareTitle}
                </p>

                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <a
                    href={shareLinks.facebook}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={`group flex items-center justify-between rounded-lg border border-[#1877F2] bg-linear-to-r from-[#1877F2] to-[#1459B8] px-4 py-3 text-white transition hover:brightness-105 ${
                      shareUrl ? "" : "pointer-events-none opacity-50"
                    }`}
                  >
                    <span className="flex items-center gap-3">
                      <span className="flex h-8 w-8 items-center justify-center rounded-full bg-white/20">
                        <svg
                          viewBox="0 0 24 24"
                          aria-hidden="true"
                          className="h-4 w-4 fill-current"
                        >
                          <path d="M13.5 22v-8h2.7l.4-3h-3.1V9.1c0-.9.3-1.6 1.6-1.6h1.7V4.8c-.3 0-1.2-.1-2.3-.1-2.3 0-3.9 1.4-3.9 4V11H8v3h2.6v8h2.9z" />
                        </svg>
                      </span>
                      <span className="text-sm font-semibold">
                        {t.blogDetail.shareFacebook}
                      </span>
                    </span>
                    <span className="text-xs opacity-85">
                      {t.blogDetail.recommended}
                    </span>
                  </a>

                  <a
                    href={shareLinks.line}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={`flex items-center justify-between rounded-lg border border-[#06C755]/40 bg-[#06C755]/10 px-4 py-3 text-sm font-medium text-foreground transition hover:bg-[#06C755]/20 ${
                      shareUrl ? "" : "pointer-events-none opacity-50"
                    }`}
                  >
                    <span>LINE</span>
                    <span className="text-xs text-muted-foreground">Share</span>
                  </a>

                  <a
                    href={shareLinks.x}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={`flex items-center justify-between rounded-lg border border-border bg-background px-4 py-3 text-sm font-medium text-foreground transition hover:bg-secondary ${
                      shareUrl ? "" : "pointer-events-none opacity-50"
                    }`}
                  >
                    <span>X</span>
                    <span className="text-xs text-muted-foreground">Tweet</span>
                  </a>

                  <button
                    type="button"
                    onClick={handleCopyShareUrl}
                    disabled={!shareUrl}
                    className="flex items-center justify-between rounded-lg border border-border bg-background px-4 py-3 text-sm font-medium text-foreground transition hover:bg-secondary disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <span>{t.blogDetail.copyLink}</span>
                    {copied ? (
                      <Check className="h-4 w-4 text-green-600" />
                    ) : (
                      <Copy className="h-4 w-4" />
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>

          {selectedIndex !== null &&
            galleryImages[selectedIndex] &&
            typeof document !== "undefined" &&
            createPortal(
              <div
                className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-4"
                onClick={closeModal}
              >
                <div
                  className="relative flex flex-col items-center"
                  onClick={(event) => event.stopPropagation()}
                >
                  <button
                    className="absolute -top-12 right-0 bg-black/80 p-3 rounded-full text-white z-30"
                    onClick={closeModal}
                  >
                    <X size={22} />
                  </button>

                  <div className="relative min-h-[45vh] min-w-[70vw] flex items-center justify-center">
                    {modalImageLoading && (
                      <div className="absolute inset-0 z-20 flex items-center justify-center rounded-lg bg-black/30">
                        <div className="flex items-center gap-2 rounded-md bg-black/70 px-3 py-2 text-sm text-white">
                          <Loader2 className="h-4 w-4 animate-spin" />
                          <span>{t.common.loading}</span>
                        </div>
                      </div>
                    )}

                    <Image
                      key={galleryImages[selectedIndex]}
                      src={galleryImages[selectedIndex]}
                      alt={`${title} ${selectedIndex + 1}`}
                      unoptimized
                      width={1400}
                      height={600}
                      sizes="92vw"
                      className="max-h-[75vh] max-w-[92vw] object-contain transition-transform duration-300"
                      style={{
                        transform: `translateX(${translateX}px) scale(${scale})`,
                        opacity: modalImageLoading ? 0.25 : 1,
                        touchAction: "none",
                      }}
                      onLoad={() => setModalImageLoading(false)}
                      onError={() => setModalImageLoading(false)}
                      onDoubleClick={() =>
                        setScale((prev) => (prev === 1 ? 1.5 : 1))
                      }
                      onTouchStart={handleTouchStart}
                      onTouchMove={handleTouchMove}
                      onTouchEnd={handleTouchEnd}
                    />

                    <button
                      onClick={goPrev}
                      className="hidden md:flex absolute -left-16 top-1/2 -translate-y-1/2 bg-primary p-4 rounded-full text-white z-40"
                    >
                      <ChevronLeft size={28} />
                    </button>

                    <button
                      onClick={goNext}
                      className="hidden md:flex absolute -right-16 top-1/2 -translate-y-1/2 bg-primary p-4 rounded-full text-white z-40"
                    >
                      <ChevronRight size={28} />
                    </button>
                  </div>

                  <div className="mt-3 w-full max-w-[92vw] flex justify-center md:justify-between items-center px-2 relative z-40">
                    <div className="hidden md:flex gap-3">
                      <button
                        onClick={() =>
                          setScale((value) => Math.min(value + 0.3, 3))
                        }
                        className="bg-primary p-3 rounded-full text-white shadow-md"
                      >
                        <ZoomIn size={20} />
                      </button>

                      <button
                        onClick={() =>
                          setScale((value) => Math.max(value - 0.3, 1))
                        }
                        className="bg-primary p-3 rounded-full text-white shadow-md"
                      >
                        <ZoomOut size={20} />
                      </button>
                    </div>

                    <p className="text-sm text-white bg-black/50 rounded-md px-3 py-1">
                      {selectedIndex + 1} / {galleryImages.length}
                    </p>
                  </div>
                </div>
              </div>,
              document.body,
            )}
        </div>
      </section>
    </Layout>
  );
}
