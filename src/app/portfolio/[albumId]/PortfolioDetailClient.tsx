"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import Layout from "@/components/Layout";
import {
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  Loader2,
  X,
  ZoomIn,
  ZoomOut,
} from "lucide-react";
import { useLang } from "@/lib/i18n";
import { SiteContent } from "@/lib/site-content-types";
import { createPortal } from "react-dom";
import { pickLangText } from "@/lib/content-text";

interface Album {
  id: string;
  categoryId: string;
  name: string;
  nameEn?: string;
  coverUrl: string;
  topText: string;
  topTextEn?: string;
  images: string[];
}

const extractTrailingNumber = (name: string): number | null => {
  const match = name.match(/(\d+)(?!.*\d)/);
  if (!match) return null;
  return Number(match[1]);
};

const getFileNameFromUrl = (url: string) => {
  const withoutQuery = url.split("?")[0];
  const segments = withoutQuery.split("/");
  const raw = segments[segments.length - 1] || "";
  return decodeURIComponent(raw);
};

const compareImageAsc = (a: string, b: string) => {
  const fileA = getFileNameFromUrl(a);
  const fileB = getFileNameFromUrl(b);

  const numberA = extractTrailingNumber(fileA);
  const numberB = extractTrailingNumber(fileB);

  if (numberA !== null && numberB !== null && numberA !== numberB) {
    return numberA - numberB;
  }

  return fileA.localeCompare(fileB, undefined, {
    numeric: true,
    sensitivity: "base",
  });
};

export default function PortfolioDetailClient({
  albumId,
}: {
  albumId: string;
}) {
  const { t, lang } = useLang();
  const [album, setAlbum] = useState<Album | null>(null);
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [mounted, setMounted] = useState(false);
  const [scale, setScale] = useState(1);
  const [modalImageLoading, setModalImageLoading] = useState(false);
  const [translateX, setTranslateX] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [imageDimensions, setImageDimensions] = useState<
    Record<string, { width: number; height: number }>
  >({});

  const touchStartX = useRef<number | null>(null);
  const pinchStartDistance = useRef<number | null>(null);
  const pinchStartScale = useRef(1);
  const isPinching = useRef(false);
  const lastTapTime = useRef(0);

  const sortedImages = [...(album?.images || [])].sort(compareImageAsc);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (selectedIndex !== null) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
      setModalImageLoading(false);
    }

    return () => {
      document.body.style.overflow = "";
    };
  }, [selectedIndex]);

  useEffect(() => {
    if (selectedIndex === null || sortedImages.length === 0) return;

    const current = sortedImages[selectedIndex];
    const next = sortedImages[(selectedIndex + 1) % sortedImages.length];
    const prev =
      sortedImages[
        (selectedIndex - 1 + sortedImages.length) % sortedImages.length
      ];

    [current, next, prev].forEach((url) => {
      if (!url) return;
      const image = new window.Image();
      image.src = url;
    });
  }, [selectedIndex, sortedImages]);

  useEffect(() => {
    const fetchAlbum = async () => {
      try {
        const res = await fetch(`/api/content`, { cache: "no-store" });
        if (res.ok) {
          const data = await res.json();
          const content = data.content as SiteContent;
          const found = content.portfolio.albums.find(
            (item) => item.id === albumId,
          );
          setAlbum(found || null);
        }
      } catch (err) {
        console.error("Failed to load album:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchAlbum();
  }, [albumId]);

  useEffect(() => {
    sortedImages.forEach((url) => {
      if (imageDimensions[url]) return;

      const image = new window.Image();
      image.onload = () => {
        setImageDimensions((prev) => {
          if (prev[url]) return prev;
          return {
            ...prev,
            [url]: {
              width: image.naturalWidth || 1200,
              height: image.naturalHeight || 1200,
            },
          };
        });
      };
      image.src = url;
    });
  }, [sortedImages, imageDimensions]);

  const goNext = useCallback(() => {
    if (selectedIndex === null || sortedImages.length === 0) return;
    setScale(1);
    setModalImageLoading(true);
    setSelectedIndex((prev) =>
      prev === null ? null : (prev + 1) % sortedImages.length,
    );
    setTranslateX(0);
  }, [selectedIndex, sortedImages.length]);

  const goPrev = useCallback(() => {
    if (selectedIndex === null || sortedImages.length === 0) return;
    setScale(1);
    setModalImageLoading(true);
    setSelectedIndex((prev) =>
      prev === null
        ? null
        : (prev - 1 + sortedImages.length) % sortedImages.length,
    );
    setTranslateX(0);
  }, [selectedIndex, sortedImages.length]);

  useEffect(() => {
    const handleKey = (event: KeyboardEvent) => {
      if (selectedIndex === null) return;
      if (event.key === "Escape") setSelectedIndex(null);
      if (event.key === "ArrowRight") goNext();
      if (event.key === "ArrowLeft") goPrev();
    };

    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [selectedIndex, goNext, goPrev]);

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

  if (loading)
    return (
      <Layout>
        <div className="p-4">{t.common.loading}</div>
      </Layout>
    );

  if (!album)
    return (
      <Layout>
        <div className="p-4">{t.common.noAlbums}</div>
      </Layout>
    );

  return (
    <Layout>
      <section className="py-20">
        <div className="container mx-auto px-4">
          <div className="mb-8">
            <Link
              href="/portfolio"
              className="inline-flex items-center gap-2 text-primary hover:underline mb-4"
            >
              <ArrowLeft size={18} />
              {t.common.back}
            </Link>
            <h1 className="text-3xl md:text-4xl font-bold wrap-break-word">
              {pickLangText(album.name, album.nameEn, lang)}
            </h1>
            {pickLangText(album.topText, album.topTextEn, lang) && (
              <p className="text-base text-muted-foreground mt-2">
                {pickLangText(album.topText, album.topTextEn, lang)}
              </p>
            )}
            <p className="text-muted-foreground mt-2">
              {sortedImages.length} {t.common.photosUnit}
            </p>
          </div>

          {sortedImages.length === 0 ? (
            <p className="text-center text-muted-foreground">
              {t.common.noPhotos}
            </p>
          ) : (
            <div className="columns-2 gap-4 space-y-4 sm:columns-3 lg:columns-4 xl:columns-5">
              {sortedImages.map((img, idx) => {
                const dimensions = imageDimensions[img];

                return (
                  <button
                    key={`${img}-${idx}`}
                    type="button"
                    onClick={() => setSelectedIndex(idx)}
                    className="group relative mb-4 block w-full break-inside-avoid overflow-hidden rounded-lg bg-muted text-left drop-shadow-[-2px_2px_4px_rgba(0,0,0,0.25)]"
                  >
                    {dimensions ? (
                      <Image
                        src={img}
                        alt={`${album.name} ${idx}`}
                        width={dimensions.width}
                        height={dimensions.height}
                        sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, (max-width: 1280px) 25vw, 20vw"
                        className="block h-auto w-full transition duration-300 group-hover:brightness-90"
                      />
                    ) : (
                      <div className="min-h-40 w-full animate-pulse bg-black/5" />
                    )}
                    <div className="absolute inset-0 flex items-center justify-center opacity-0 transition group-hover:opacity-100 bg-black/35">
                      <ZoomIn size={24} className="text-white" />
                    </div>
                  </button>
                );
              })}
            </div>
          )}

          {mounted &&
            selectedIndex !== null &&
            sortedImages[selectedIndex] &&
            createPortal(
              <div
                className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-4"
                onClick={() => setSelectedIndex(null)}
              >
                <div
                  className="relative flex flex-col items-center"
                  onClick={(event) => event.stopPropagation()}
                >
                  <button
                    className="absolute -top-12 right-0 bg-black/80 p-3 rounded-full text-white z-30"
                    onClick={() => setSelectedIndex(null)}
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
                      key={sortedImages[selectedIndex]}
                      src={sortedImages[selectedIndex]}
                      alt={`${pickLangText(album.name, album.nameEn, lang)} ${selectedIndex + 1}`}
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
                      {selectedIndex + 1} / {sortedImages.length}
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
