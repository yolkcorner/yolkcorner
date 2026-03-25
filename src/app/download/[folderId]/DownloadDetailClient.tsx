"use client";

import * as React from "react";
import {
  ArrowLeft,
  Download,
  X,
  ZoomIn,
  ZoomOut,
  ChevronLeft,
  ChevronRight,
  Loader2,
} from "lucide-react";
import AlbumPasswordModal from "./AlbumPasswordModal";
import Link from "next/link";
import Layout from "@/components/Layout";
import Image from "next/image";
import { useLang } from "@/lib/i18n";
import { createPortal } from "react-dom";

type Photo = {
  id: string;
  name: string;
  type: "folder" | "image";
  previewUrl: string | null;
  downloadUrl: string | null;
  createdTime?: string;
  width?: number | null;
  height?: number | null;
};

const extractTrailingNumber = (name: string): number | null => {
  const match = name.match(/(\d+)(?!.*\d)/);
  if (!match) return null;
  return Number(match[1]);
};

const compareFileNameDesc = (a: Photo, b: Photo): number => {
  const numberA = extractTrailingNumber(a.name);
  const numberB = extractTrailingNumber(b.name);

  if (numberA !== null && numberB !== null && numberA !== numberB) {
    return numberB - numberA;
  }

  return b.name.localeCompare(a.name, undefined, {
    numeric: true,
    sensitivity: "base",
  });
};

export default function DownloadDetailClient({
  folderId,
}: {
  folderId: string;
}) {
  const [albumPassword, setAlbumPassword] = React.useState<string | undefined>(
    undefined,
  );
  // Removed unused passwordModalOpen state
  const [passwordError, setPasswordError] = React.useState<string | undefined>(
    undefined,
  );
  const [passwordEntered, setPasswordEntered] = React.useState<
    string | undefined
  >(undefined);
  const { t } = useLang();

  const [photos, setPhotos] = React.useState<Photo[]>([]);
  const [selectedIndex, setSelectedIndex] = React.useState<number | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [loadingMore, setLoadingMore] = React.useState(false);
  const [nextPageToken, setNextPageToken] = React.useState<string | null>(null);
  const [folderName, setFolderName] = React.useState("");
  const [hasMore, setHasMore] = React.useState(true);
  const [scale, setScale] = React.useState(1);
  const [mounted, setMounted] = React.useState(false);
  const [modalImageLoading, setModalImageLoading] = React.useState(false);
  const [downloading, setDownloading] = React.useState(false);
  const [downloadNotice, setDownloadNotice] = React.useState("");
  const [isIOS, setIsIOS] = React.useState(false);
  const [showIosHint, setShowIosHint] = React.useState(false);
  const [columnCount, setColumnCount] = React.useState(2);

  const [translateX, setTranslateX] = React.useState(0);
  const [isDragging, setIsDragging] = React.useState(false);
  const touchStartX = React.useRef<number | null>(null);
  const pinchStartDistance = React.useRef<number | null>(null);
  const pinchStartScale = React.useRef(1);
  const isPinching = React.useRef(false);
  const lastTapTime = React.useRef(0);
  const loadMoreRef = React.useRef<HTMLDivElement | null>(null);
  const autoRefreshInFlightRef = React.useRef(false);
  const eventSourceRef = React.useRef<EventSource | null>(null);
  const fallbackIntervalRef = React.useRef<number | null>(null);
  const reconnectTimeoutRef = React.useRef<number | null>(null);

  React.useEffect(() => {
    setMounted(true);
  }, []);

  // Fetch album password from SiteContent.downloadPasswords (event id key)
  React.useEffect(() => {
    fetch("/api/content")
      .then((res) => res.json())
      .then((data) => {
        const password = data.content?.downloadPasswords?.[folderId];
        setAlbumPassword(password || undefined);
      });
  }, [folderId]);

  React.useEffect(() => {
    const ios = isIOSDevice();
    setIsIOS(ios);
    if (!ios || typeof window === "undefined") return;

    const hintDismissed =
      window.localStorage.getItem("download-ios-hint-dismissed") === "1";
    setShowIosHint(!hintDismissed);
  }, []);

  React.useEffect(() => {
    if (typeof window === "undefined") return;

    const resolveColumnCount = () => {
      const width = window.innerWidth;
      if (width >= 1280) return 5;
      if (width >= 1024) return 4;
      if (width >= 640) return 3;
      return 2;
    };

    const applyColumnCount = () => {
      setColumnCount(resolveColumnCount());
    };

    applyColumnCount();
    window.addEventListener("resize", applyColumnCount);
    return () => window.removeEventListener("resize", applyColumnCount);
  }, []);

  const fetchPhotos = React.useCallback(
    async (token?: string | null) => {
      if (!folderId) return;

      const isLoadMore = !!token;
      if (isLoadMore) {
        setLoadingMore(true);
      } else {
        setLoading(true);
      }

      try {
        const query = new URLSearchParams({ pageSize: "50" });
        if (token) query.set("pageToken", token);

        const res = await fetch(`/api/photos/${folderId}?${query.toString()}`);
        const data = await res.json();

        setFolderName(data.folderName || "");

        if (Array.isArray(data.files)) {
          const images = data.files
            .filter((item: Photo) => item.type === "image")
            .sort(compareFileNameDesc);

          setPhotos((current) => {
            const merged = isLoadMore ? [...current, ...images] : images;
            return merged.sort(compareFileNameDesc);
          });
          const nextToken = data.nextPageToken || null;
          setNextPageToken(nextToken);
          setHasMore(Boolean(nextToken));
        }
      } catch (err) {
        console.error(err);
      } finally {
        if (isLoadMore) {
          setLoadingMore(false);
        } else {
          setLoading(false);
        }
      }
    },
    [folderId],
  );

  const refreshLatestPhotos = React.useCallback(async () => {
    if (!folderId || autoRefreshInFlightRef.current) return;
    if (
      typeof document !== "undefined" &&
      document.visibilityState === "hidden"
    ) {
      return;
    }

    autoRefreshInFlightRef.current = true;
    try {
      const query = new URLSearchParams({ pageSize: "50" });
      const res = await fetch(`/api/photos/${folderId}?${query.toString()}`);
      if (!res.ok) return;

      const data = await res.json();
      setFolderName(data.folderName || "");

      if (!Array.isArray(data.files)) return;

      const images = data.files
        .filter((item: Photo) => item.type === "image")
        .sort(compareFileNameDesc);

      setPhotos((current) => {
        if (current.length === 0) return current;

        const currentMap = new Map(current.map((item) => [item.id, item]));
        let changed = false;

        for (const item of images) {
          const existing = currentMap.get(item.id);
          if (!existing) {
            currentMap.set(item.id, item);
            changed = true;
            continue;
          }

          if (
            existing.previewUrl !== item.previewUrl ||
            existing.downloadUrl !== item.downloadUrl ||
            existing.name !== item.name
          ) {
            currentMap.set(item.id, item);
            changed = true;
          }
        }

        if (!changed) return current;
        return Array.from(currentMap.values()).sort(compareFileNameDesc);
      });

      const nextToken = data.nextPageToken || null;
      if (nextToken) {
        setNextPageToken((prev) => prev || nextToken);
        setHasMore(true);
      }
    } catch (err) {
      console.error("Auto-refresh failed:", err);
    } finally {
      autoRefreshInFlightRef.current = false;
    }
  }, [folderId]);

  React.useEffect(() => {
    if (albumPassword && passwordEntered !== albumPassword) {
      setPhotos([]);
      setNextPageToken(null);
      setHasMore(true);
      return;
    }
    fetchPhotos(null);
  }, [folderId, fetchPhotos, albumPassword, passwordEntered]);

  React.useEffect(() => {
    if (albumPassword && passwordEntered !== albumPassword) return;

    let disposed = false;
    let reconnectAttempt = 0;

    const stopFallbackPolling = () => {
      if (fallbackIntervalRef.current !== null) {
        window.clearInterval(fallbackIntervalRef.current);
        fallbackIntervalRef.current = null;
      }
    };

    const startFallbackPolling = () => {
      if (fallbackIntervalRef.current !== null) return;
      fallbackIntervalRef.current = window.setInterval(() => {
        refreshLatestPhotos();
      }, 5000);
    };

    const closeEventSource = () => {
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
        eventSourceRef.current = null;
      }
    };

    const clearReconnectTimer = () => {
      if (reconnectTimeoutRef.current !== null) {
        window.clearTimeout(reconnectTimeoutRef.current);
        reconnectTimeoutRef.current = null;
      }
    };

    const connectEventStream = () => {
      if (disposed) return;

      if (typeof EventSource === "undefined") {
        startFallbackPolling();
        return;
      }

      closeEventSource();

      const encodedFolderId = encodeURIComponent(folderId);
      const source = new EventSource(`/api/events/${encodedFolderId}/stream`);
      eventSourceRef.current = source;

      source.onopen = () => {
        reconnectAttempt = 0;
        clearReconnectTimer();
        stopFallbackPolling();
        refreshLatestPhotos();
      };

      source.onmessage = (event) => {
        try {
          const payload = JSON.parse(event.data) as { type?: string };
          if (payload.type === "update" || payload.type === "ready") {
            refreshLatestPhotos();
          }
        } catch {
          refreshLatestPhotos();
        }
      };

      source.onerror = () => {
        closeEventSource();
        startFallbackPolling();

        if (disposed || reconnectTimeoutRef.current !== null) return;

        reconnectAttempt += 1;
        const delay = Math.min(
          30000,
          1000 * 2 ** Math.min(reconnectAttempt, 5),
        );
        reconnectTimeoutRef.current = window.setTimeout(() => {
          reconnectTimeoutRef.current = null;
          connectEventStream();
        }, delay);
      };
    };

    startFallbackPolling();
    connectEventStream();

    const onVisible = () => {
      if (document.visibilityState === "visible") {
        refreshLatestPhotos();
        if (!eventSourceRef.current) {
          connectEventStream();
        }
      }
    };

    document.addEventListener("visibilitychange", onVisible);

    return () => {
      disposed = true;
      clearReconnectTimer();
      closeEventSource();
      stopFallbackPolling();
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [albumPassword, passwordEntered, refreshLatestPhotos, folderId]);

  React.useEffect(() => {
    const node = loadMoreRef.current;
    if (!node || loading || loadingMore || !hasMore || !nextPageToken) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const [entry] = entries;
        if (entry.isIntersecting && !loadingMore) {
          fetchPhotos(nextPageToken);
        }
      },
      { rootMargin: "300px" },
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, [loading, loadingMore, hasMore, nextPageToken, fetchPhotos]);

  React.useEffect(() => {
    if (selectedIndex !== null) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
      setModalImageLoading(false);
    }
  }, [selectedIndex]);

  React.useEffect(() => {
    if (selectedIndex === null || photos.length === 0) return;

    const current = photos[selectedIndex];
    const next = photos[(selectedIndex + 1) % photos.length];
    const prev = photos[(selectedIndex - 1 + photos.length) % photos.length];

    [current, next, prev].forEach((photo) => {
      if (!photo?.previewUrl) return;
      const image = new window.Image();
      image.src = photo.previewUrl;
    });
  }, [selectedIndex, photos]);

  const goNext = React.useCallback(() => {
    if (selectedIndex === null || photos.length === 0) return;
    setScale(1);
    setModalImageLoading(true);
    setSelectedIndex((prev) =>
      prev === null ? null : (prev + 1) % photos.length,
    );
    setTranslateX(0);
  }, [selectedIndex, photos.length]);

  const goPrev = React.useCallback(() => {
    if (selectedIndex === null || photos.length === 0) return;
    setScale(1);
    setModalImageLoading(true);
    setSelectedIndex((prev) =>
      prev === null ? null : (prev - 1 + photos.length) % photos.length,
    );
    setTranslateX(0);
  }, [selectedIndex, photos.length]);

  React.useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (selectedIndex === null) return;
      if (e.key === "Escape") setSelectedIndex(null);
      if (e.key === "ArrowRight") goNext();
      if (e.key === "ArrowLeft") goPrev();
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

  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 2) {
      isPinching.current = true;
      pinchStartDistance.current = getTouchDistance(e.touches);
      pinchStartScale.current = scale;
      setIsDragging(false);
      touchStartX.current = null;
      return;
    }

    if (e.touches.length === 1) {
      touchStartX.current = e.touches[0].clientX;
      setIsDragging(true);
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (e.touches.length === 2 && pinchStartDistance.current) {
      e.preventDefault();
      const currentDistance = getTouchDistance(e.touches);
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
    const diff = e.touches[0].clientX - touchStartX.current;
    setTranslateX(diff);
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
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

    if (!wasPinching && !didSwipe && e.changedTouches.length === 1) {
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

  const isIOSDevice = () => {
    if (typeof navigator === "undefined") return false;
    return (
      /iPad|iPhone|iPod/.test(navigator.userAgent) ||
      (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1)
    );
  };

  const handleDownload = async (photo: Photo) => {
    if (!photo.downloadUrl) return;

    setDownloading(true);
    try {
      const ios = isIOSDevice();

      if (ios && navigator.share) {
        try {
          const response = await fetch(photo.downloadUrl);
          if (!response.ok) throw new Error("fetch failed");

          const blob = await response.blob();
          const fileName = photo.name || "photo.jpg";
          const file = new File([blob], fileName, {
            type: blob.type || "image/jpeg",
          });

          if (
            typeof navigator.canShare === "function" &&
            navigator.canShare({ files: [file] })
          ) {
            await navigator.share({
              files: [file],
              title: fileName,
            });
            return;
          }
        } catch {
          // fallback below
        }

        const fallbackUrl = photo.previewUrl || photo.downloadUrl;
        window.open(fallbackUrl || "#", "_blank", "noopener,noreferrer");
        setDownloadNotice(t?.downloadDetail?.iosFallbackNotice || "");
        return;
      }

      await new Promise((resolve) => window.setTimeout(resolve, 800));

      const link = document.createElement("a");
      link.href = photo.downloadUrl;
      link.download = photo.name || "photo.jpg";
      link.rel = "noopener noreferrer";
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (error) {
      console.error(error);
      setDownloadNotice(t?.downloadDetail?.downloadFail || "");
    } finally {
      setDownloading(false);
    }
  };

  const dismissIosHint = () => {
    if (typeof window !== "undefined") {
      window.localStorage.setItem("download-ios-hint-dismissed", "1");
    }
    setShowIosHint(false);
  };

  const photoColumns = React.useMemo(() => {
    const totalColumns = Math.max(1, columnCount);
    const columns: Array<Array<{ photo: Photo; index: number }>> = Array.from(
      { length: totalColumns },
      () => [] as Array<{ photo: Photo; index: number }>,
    );

    photos.forEach((photo: Photo, index: number) => {
      columns[index % totalColumns].push({ photo, index });
    });

    return columns;
  }, [photos, columnCount]);

  // Password modal logic
  if (albumPassword && passwordEntered !== albumPassword) {
    // Detect Thai language from browser
    const isTh =
      typeof window !== "undefined" &&
      (navigator.language?.startsWith("th") || false);
    return (
      <AlbumPasswordModal
        isTh={isTh}
        error={passwordError}
        onSubmitAction={(pw) => {
          if (pw.length !== 4) {
            setPasswordError(
              isTh ? "กรุณากรอกให้ครบ 4 หลัก" : "Please enter all 4 digits",
            );
            return;
          }
          if (pw === albumPassword) {
            setPasswordEntered(pw);
            setPasswordError(undefined);
          } else {
            setPasswordError(isTh ? "รหัสไม่ถูกต้อง" : "Incorrect password");
          }
        }}
        onCloseAction={() => {
          // Actually allow cancel: reload page or redirect to download list
          if (typeof window !== "undefined") {
            window.location.href = "/download";
          }
        }}
      />
    );
  }

  return (
    <Layout>
      <section className="py-20 container mx-auto px-4">
        {/* ...existing code... */}
        <div className="mb-6">
          <Link
            href="/download"
            className="inline-flex items-center gap-2 text-primary hover:underline text-sm"
          >
            <ArrowLeft size={16} />
            {t?.downloadDetail?.backToDownload}
          </Link>
        </div>

        <h1 className="text-2xl sm:text-3xl font-bold text-center mb-8">
          {folderName || t?.common?.eventGallery}
        </h1>

        {loading && <p className="text-center">{t?.common?.loading}</p>}
        {!loading && photos.length === 0 && (
          <p className="text-center">{t?.common?.noPhotos}</p>
        )}

        {downloadNotice && (
          <p className="mb-4 text-center text-sm text-muted-foreground">
            {downloadNotice}
          </p>
        )}

        {isIOS && showIosHint && (
          <div className="mb-4 rounded-lg border bg-background/70 px-3 py-2 text-sm text-muted-foreground flex items-center justify-between gap-3">
            <p>{t?.downloadDetail?.iosHint}</p>
            <button
              type="button"
              onClick={dismissIosHint}
              className="shrink-0 rounded-md border px-2 py-1 text-xs"
            >
              {t?.downloadDetail?.dismiss}
            </button>
          </div>
        )}

        <div
          className="grid gap-3 md:gap-4"
          style={{
            gridTemplateColumns: `repeat(${Math.max(1, columnCount)}, minmax(0, 1fr))`,
          }}
        >
          {photoColumns.map(
            (
              column: Array<{ photo: Photo; index: number }>,
              columnIndex: number,
            ) => (
              <div
                key={`col-${columnIndex}`}
                className="flex flex-col gap-3 md:gap-4"
              >
                {column.map(
                  ({ photo, index }: { photo: Photo; index: number }) => (
                    <div key={photo.id}>
                      <Image
                        src={photo.previewUrl || ""}
                        alt={photo.name}
                        unoptimized
                        priority={index === 0}
                        loading={index === 0 ? "eager" : "lazy"}
                        width={photo.width || 1200}
                        height={photo.height || 800}
                        sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, (max-width: 1280px) 25vw, 20vw"
                        className="w-full rounded-lg cursor-pointer hover:opacity-80 transition"
                        onClick={() => {
                          setSelectedIndex(index);
                          setScale(1);
                          setModalImageLoading(true);
                        }}
                      />
                    </div>
                  ),
                )}
              </div>
            ),
          )}
        </div>

        {hasMore && (
          <div
            ref={loadMoreRef}
            className="h-12 flex items-center justify-center"
          >
            <p className="text-sm text-muted-foreground">
              {loadingMore ? t?.common?.loadMore : t?.common?.scrollToLoadMore}
            </p>
          </div>
        )}

        {mounted &&
          selectedIndex !== null &&
          photos[selectedIndex] &&
          createPortal(
            <div
              className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-4"
              onClick={() => setSelectedIndex(null)}
            >
              <div
                className="relative flex flex-col items-center"
                onClick={(e) => e.stopPropagation()}
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
                        <span>{t?.common?.loading}</span>
                      </div>
                    </div>
                  )}
                  <Image
                    key={photos[selectedIndex].id}
                    src={photos[selectedIndex].previewUrl || ""}
                    alt={photos[selectedIndex].name}
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

                <div className="mt-3 w-full max-w-[92vw] flex justify-between items-center px-2 relative z-40">
                  <div className="hidden md:flex gap-3">
                    <button
                      onClick={() => setScale((s) => Math.min(s + 0.3, 3))}
                      className="bg-primary p-3 rounded-full text-white shadow-md"
                    >
                      <ZoomIn size={20} />
                    </button>

                    <button
                      onClick={() => setScale((s) => Math.max(s - 0.3, 1))}
                      className="bg-primary p-3 rounded-full text-white shadow-md"
                    >
                      <ZoomOut size={20} />
                    </button>
                  </div>

                  {photos[selectedIndex].downloadUrl && (
                    <button
                      type="button"
                      onClick={() => handleDownload(photos[selectedIndex])}
                      disabled={downloading}
                      className="bg-primary text-white px-5 py-3 min-h-11 rounded-lg flex items-center gap-2 shadow-md disabled:opacity-60 md:ml-auto"
                    >
                      <Download size={18} />
                      {downloading
                        ? t?.downloadDetail?.downloading
                        : isIOS
                          ? t?.downloadDetail?.saveToPhotos
                          : t?.common?.download}
                    </button>
                  )}
                </div>
              </div>
            </div>,
            document.body,
          )}
      </section>
    </Layout>
  );
}
