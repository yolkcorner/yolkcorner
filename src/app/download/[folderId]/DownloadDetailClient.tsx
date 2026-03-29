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

const compareByCreatedTimeDesc = (a: Photo, b: Photo): number => {
  if (a.createdTime && b.createdTime) {
    return b.createdTime.localeCompare(a.createdTime);
  }
  if (a.createdTime) return -1;
  if (b.createdTime) return 1;
  // fallback: sort by trailing number descending
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
  const PAGE_SIZE = 30;
  const LONG_PRESS_MS = 350;
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
  const { t, lang } = useLang();
  const isTh = lang === "th";

  const [photos, setPhotos] = React.useState<Photo[]>([]);
  const [selectedIndex, setSelectedIndex] = React.useState<number | null>(null);
  const [selectedPhotoId, setSelectedPhotoId] = React.useState<string | null>(
    null,
  );
  const [loading, setLoading] = React.useState(true);
  const [loadingMore, setLoadingMore] = React.useState(false);
  const [nextPageToken, setNextPageToken] = React.useState<string | null>(null);
  const [folderName, setFolderName] = React.useState("");
  const [hasMore, setHasMore] = React.useState(true);
  const [scale, setScale] = React.useState(1);
  const [mounted, setMounted] = React.useState(false);
  const [modalImageLoading, setModalImageLoading] = React.useState(false);
  const [downloading, setDownloading] = React.useState(false);
  const [batchDownloading, setBatchDownloading] = React.useState(false);
  const [downloadNotice, setDownloadNotice] = React.useState("");
  const [isIOS, setIsIOS] = React.useState(false);
  const [showIosHint, setShowIosHint] = React.useState(false);
  const [columnCount, setColumnCount] = React.useState(2);
  const [isLgUp, setIsLgUp] = React.useState(false);
  const [selectMode, setSelectMode] = React.useState(false);
  const [selectedPhotoIds, setSelectedPhotoIds] = React.useState<string[]>([]);

  const [translateX, setTranslateX] = React.useState(0);
  const [isDragging, setIsDragging] = React.useState(false);
  const touchStartX = React.useRef<number | null>(null);
  const pinchStartDistance = React.useRef<number | null>(null);
  const pinchStartScale = React.useRef(1);
  const isPinching = React.useRef(false);
  const lastTapTime = React.useRef(0);
  const suppressNextClickRef = React.useRef(false);
  const longPressTimeoutRef = React.useRef<number | null>(null);
  const longPressStartRef = React.useRef<{ x: number; y: number } | null>(null);
  const loadMoreRef = React.useRef<HTMLDivElement | null>(null);
  const autoRefreshInFlightRef = React.useRef(false);
  const eventSourceRef = React.useRef<EventSource | null>(null);
  const fallbackIntervalRef = React.useRef<number | null>(null);
  const reconnectTimeoutRef = React.useRef<number | null>(null);
  const wasModalOpenRef = React.useRef(false);

  const closeModal = React.useCallback(() => {
    setSelectedIndex(null);
    setSelectedPhotoId(null);
  }, []);

  const modalIndex = React.useMemo(() => {
    if (selectedPhotoId) {
      const idx = photos.findIndex((photo) => photo.id === selectedPhotoId);
      return idx >= 0 ? idx : null;
    }

    return selectedIndex;
  }, [photos, selectedPhotoId, selectedIndex]);

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

    const applyViewportState = () => {
      setIsLgUp(window.innerWidth >= 1024);
    };

    applyColumnCount();
    applyViewportState();
    window.addEventListener("resize", applyColumnCount);
    window.addEventListener("resize", applyViewportState);
    return () => {
      window.removeEventListener("resize", applyColumnCount);
      window.removeEventListener("resize", applyViewportState);
    };
  }, []);

  React.useEffect(() => {
    setSelectedPhotoIds((prev) => {
      if (prev.length === 0) return prev;
      const activeIds = new Set(photos.map((photo) => photo.id));
      const next = prev.filter((id) => activeIds.has(id));
      return next.length === prev.length ? prev : next;
    });
  }, [photos]);

  React.useEffect(() => {
    setSelectMode(false);
    setSelectedPhotoIds([]);
    setSelectedPhotoId(null);
  }, [folderId]);

  React.useEffect(() => {
    return () => {
      if (longPressTimeoutRef.current !== null) {
        window.clearTimeout(longPressTimeoutRef.current);
      }
    };
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
        const query = new URLSearchParams({ pageSize: String(PAGE_SIZE) });
        if (token) query.set("pageToken", token);

        const res = await fetch(`/api/photos/${folderId}?${query.toString()}`);
        const data = await res.json();

        setFolderName(data.folderName || "");

        if (Array.isArray(data.files)) {
          const images = data.files
            .filter((item: Photo) => item.type === "image")
            .sort(compareByCreatedTimeDesc);

          setPhotos((current) => {
            if (!isLoadMore) {
              return images;
            }

            const existingIds = new Set(current.map((item) => item.id));
            const appended = images.filter(
              (item: Photo) => !existingIds.has(item.id),
            );
            if (appended.length === 0) return current;
            // Re-sort combined list so any newly discovered photo ends up at top
            return [...current, ...appended].sort(compareByCreatedTimeDesc);
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
    [folderId, PAGE_SIZE],
  );

  const refreshLatestPhotos = React.useCallback(async () => {
    if (modalIndex !== null) return;
    if (!folderId || autoRefreshInFlightRef.current) return;
    if (
      typeof document !== "undefined" &&
      document.visibilityState === "hidden"
    ) {
      return;
    }

    autoRefreshInFlightRef.current = true;
    try {
      const query = new URLSearchParams({ pageSize: "200" });
      const res = await fetch(`/api/photos/${folderId}?${query.toString()}`);
      if (!res.ok) return;

      const data = await res.json();
      setFolderName(data.folderName || "");

      if (!Array.isArray(data.files)) return;

      const images = data.files
        .filter((item: Photo) => item.type === "image")
        .sort(compareByCreatedTimeDesc);

      setPhotos((current) => {
        if (current.length === 0) return current;

        const incomingMap = new Map<string, Photo>(
          images.map((item: Photo) => [item.id, item]),
        );
        let changed = false;

        const updatedCurrent = current.map((item) => {
          const incoming = incomingMap.get(item.id);
          if (!incoming) return item;

          if (
            item.previewUrl !== incoming.previewUrl ||
            item.downloadUrl !== incoming.downloadUrl ||
            item.name !== incoming.name
          ) {
            changed = true;
            return incoming;
          }

          return item;
        });

        const currentIds = new Set(current.map((item) => item.id));
        const newItems: Photo[] = [];

        for (const item of images) {
          const existing = currentIds.has(item.id);
          if (!existing) {
            newItems.push(item);
            changed = true;
          }
        }

        if (!changed) return current;
        if (newItems.length === 0) {
          return updatedCurrent;
        }

        // Place newly arrived latest photos at the top without reshuffling all loaded items.
        return [...newItems, ...updatedCurrent];
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
  }, [folderId, PAGE_SIZE, modalIndex]);

  React.useEffect(() => {
    const isOpen = modalIndex !== null;

    if (isOpen) {
      wasModalOpenRef.current = true;
      return;
    }

    if (wasModalOpenRef.current) {
      wasModalOpenRef.current = false;
      refreshLatestPhotos();
    }
  }, [modalIndex, refreshLatestPhotos]);

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
      // Fallback poll every 20s — SSE handles real-time delivery, this is only for SSE-down scenarios
      fallbackIntervalRef.current = window.setInterval(() => {
        refreshLatestPhotos();
      }, 20000);
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
          const payload = JSON.parse(event.data) as {
            type?: string;
            photo?: Photo;
          };
          if (payload.type === "new_photo" && payload.photo) {
            // Photo data arrives inline — prepend immediately, no extra fetch needed
            setPhotos((current) => {
              const exists = current.some((p) => p.id === payload.photo!.id);
              if (exists) return current;
              return [payload.photo!, ...current];
            });
          } else if (payload.type === "ready" || payload.type === "update") {
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
    if (modalIndex !== null) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
      setModalImageLoading(false);
    }
  }, [modalIndex]);

  React.useEffect(() => {
    if (modalIndex === null || photos.length === 0) return;

    const current = photos[modalIndex];
    const next = photos[(modalIndex + 1) % photos.length];
    const prev = photos[(modalIndex - 1 + photos.length) % photos.length];

    [current, next, prev].forEach((photo) => {
      if (!photo?.previewUrl) return;
      const image = new window.Image();
      image.src = photo.previewUrl;
    });
  }, [modalIndex, photos]);

  const goNext = React.useCallback(() => {
    if (modalIndex === null || photos.length === 0) return;
    setScale(1);
    setModalImageLoading(true);
    const nextIndex = (modalIndex + 1) % photos.length;
    setSelectedIndex(nextIndex);
    setSelectedPhotoId(photos[nextIndex]?.id || null);
    setTranslateX(0);
  }, [modalIndex, photos]);

  const goPrev = React.useCallback(() => {
    if (modalIndex === null || photos.length === 0) return;
    setScale(1);
    setModalImageLoading(true);
    const prevIndex = (modalIndex - 1 + photos.length) % photos.length;
    setSelectedIndex(prevIndex);
    setSelectedPhotoId(photos[prevIndex]?.id || null);
    setTranslateX(0);
  }, [modalIndex, photos]);

  React.useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (modalIndex === null) return;
      if (e.key === "Escape") closeModal();
      if (e.key === "ArrowRight") goNext();
      if (e.key === "ArrowLeft") goPrev();
    };

    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [modalIndex, goNext, goPrev, closeModal]);

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

  const downloadPhotoFile = React.useCallback(
    async (photo: Photo, allowIosShare = true) => {
      if (!photo.downloadUrl) {
        throw new Error("download url missing");
      }

      const ios = isIOSDevice();

      if (allowIosShare && ios && navigator.share) {
        try {
          const response = await fetch(photo.downloadUrl, {
            cache: "no-store",
          });
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
          const fallbackUrl = photo.previewUrl || photo.downloadUrl;
          window.open(fallbackUrl || "#", "_blank", "noopener,noreferrer");
          setDownloadNotice(t?.downloadDetail?.iosFallbackNotice || "");
          return;
        }
      }

      const response = await fetch(photo.downloadUrl, { cache: "no-store" });
      if (!response.ok) {
        throw new Error("failed to fetch download file");
      }

      const blob = await response.blob();
      const blobUrl = window.URL.createObjectURL(blob);

      const link = document.createElement("a");
      link.href = blobUrl;
      link.download = photo.name || "photo.jpg";
      link.rel = "noopener noreferrer";
      document.body.appendChild(link);
      link.click();
      link.remove();

      window.setTimeout(() => {
        window.URL.revokeObjectURL(blobUrl);
      }, 1500);
    },
    [t?.downloadDetail?.iosFallbackNotice],
  );

  const handleDownload = async (photo: Photo) => {
    setDownloading(true);
    setDownloadNotice("");
    try {
      await downloadPhotoFile(photo, true);
    } catch (error) {
      console.error(error);
      setDownloadNotice(t?.downloadDetail?.downloadFail || "");
    } finally {
      setDownloading(false);
    }
  };

  const selectedIdSet = React.useMemo(
    () => new Set(selectedPhotoIds),
    [selectedPhotoIds],
  );

  const togglePhotoSelection = (photoId: string) => {
    setSelectedPhotoIds((prev) => {
      if (prev.includes(photoId)) {
        return prev.filter((id) => id !== photoId);
      }
      return [...prev, photoId];
    });
  };

  const cancelSelection = React.useCallback(() => {
    setSelectMode(false);
    setSelectedPhotoIds([]);
  }, []);

  const startSelection = React.useCallback(() => {
    closeModal();
    setSelectMode(true);
  }, [closeModal]);

  const clearLongPressTimer = React.useCallback(() => {
    if (longPressTimeoutRef.current !== null) {
      window.clearTimeout(longPressTimeoutRef.current);
      longPressTimeoutRef.current = null;
    }
    longPressStartRef.current = null;
  }, []);

  const handlePhotoPointerDown = (
    photoId: string,
    event: React.PointerEvent<HTMLImageElement>,
  ) => {
    if (selectMode) return;
    if (selectedIndex !== null) return;
    if (event.pointerType === "mouse" && event.button !== 0) return;

    longPressStartRef.current = { x: event.clientX, y: event.clientY };
    longPressTimeoutRef.current = window.setTimeout(() => {
      closeModal();
      setSelectMode(true);
      setSelectedPhotoIds((prev) =>
        prev.includes(photoId) ? prev : [...prev, photoId],
      );
      suppressNextClickRef.current = true;
      longPressTimeoutRef.current = null;
    }, LONG_PRESS_MS);
  };

  const handlePhotoPointerMove = (
    event: React.PointerEvent<HTMLImageElement>,
  ) => {
    if (!longPressStartRef.current || longPressTimeoutRef.current === null) {
      return;
    }

    const dx = Math.abs(event.clientX - longPressStartRef.current.x);
    const dy = Math.abs(event.clientY - longPressStartRef.current.y);
    if (dx > 12 || dy > 12) {
      clearLongPressTimer();
    }
  };

  const handlePhotoClick = (photoId: string, index: number) => {
    if (suppressNextClickRef.current) {
      suppressNextClickRef.current = false;
      return;
    }

    if (selectMode) {
      togglePhotoSelection(photoId);
      return;
    }

    setSelectedIndex(index);
    setSelectedPhotoId(photoId);
    setScale(1);
    setModalImageLoading(true);
  };

  const handleDownloadSelected = async () => {
    if (selectedPhotoIds.length === 0 || batchDownloading) return;

    const selectedPhotos = photos.filter(
      (photo) => selectedIdSet.has(photo.id) && photo.downloadUrl,
    );

    if (selectedPhotos.length === 0) {
      setDownloadNotice(
        t?.downloadDetail?.noDownloadableSelected ||
          (isTh
            ? "ยังไม่ได้เลือกรูปภาพที่ดาวน์โหลดได้"
            : "No downloadable photos selected"),
      );
      return;
    }

    setBatchDownloading(true);
    setDownloadNotice("");

    let successCount = 0;
    try {
      const ios = isIOSDevice();
      if (ios && typeof navigator !== "undefined" && navigator.share) {
        const toFile = async (photo: Photo): Promise<File | null> => {
          if (!photo.downloadUrl) return null;

          const response = await fetch(photo.downloadUrl, {
            cache: "no-store",
          });
          if (!response.ok) return null;

          const blob = await response.blob();
          const fileName = photo.name || "photo.jpg";
          return new File([blob], fileName, {
            type: blob.type || "image/jpeg",
          });
        };

        const files: File[] = [];
        for (const photo of selectedPhotos) {
          const file = await toFile(photo);
          if (file) files.push(file);
        }

        const canShareFiles =
          typeof navigator.canShare === "function" &&
          files.length > 0 &&
          navigator.canShare({ files: [files[0]] });

        if (canShareFiles) {
          const chunkSize = 8;
          for (let i = 0; i < files.length; i += chunkSize) {
            const chunk = files.slice(i, i + chunkSize);
            if (!navigator.canShare || !navigator.canShare({ files: chunk })) {
              continue;
            }

            await navigator.share({
              files: chunk,
              title: "Photos",
            });
            successCount += chunk.length;
            await new Promise((resolve) => window.setTimeout(resolve, 180));
          }

          if (successCount > 0) {
            cancelSelection();
            return;
          }

          // Fallback when share is available but file-share is blocked
          const fallbackUrl =
            selectedPhotos[0]?.previewUrl || selectedPhotos[0]?.downloadUrl;
          if (fallbackUrl) {
            window.open(fallbackUrl, "_blank", "noopener,noreferrer");
          }
          setDownloadNotice(t?.downloadDetail?.iosFallbackNotice || "");
          return;
        }
      }

      for (const photo of selectedPhotos) {
        await downloadPhotoFile(photo, false);
        successCount += 1;
        await new Promise((resolve) => window.setTimeout(resolve, 220));
      }

      setDownloadNotice(
        (
          t?.downloadDetail?.batchDownloadStarted ||
          (isTh
            ? `เริ่มดาวน์โหลดแล้ว ${successCount} รูป`
            : `Started downloading ${successCount} photos`)
        ).replace("{count}", String(successCount)),
      );
      cancelSelection();
    } catch (error) {
      console.error(error);
      setDownloadNotice(t?.downloadDetail?.downloadFail || "");
    } finally {
      setBatchDownloading(false);
    }
  };

  const dismissIosHint = () => {
    if (typeof window !== "undefined") {
      window.localStorage.setItem("download-ios-hint-dismissed", "1");
    }
    setShowIosHint(false);
  };

  const selectedCountLabel = (
    t?.downloadDetail?.selectedCount ||
    (isTh
      ? `เลือกแล้ว ${selectedPhotoIds.length} รูป`
      : `${selectedPhotoIds.length} photos selected`)
  ).replace("{count}", String(selectedPhotoIds.length));

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
      <section className="py-20 pb-32 container mx-auto px-4">
        {/* ...existing code... */}
        <div className="mb-6 flex items-center justify-between gap-3">
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
          {photos.map((photo: Photo, index: number) => (
            <div key={photo.id}>
              <div className="relative aspect-square overflow-hidden rounded-lg">
                <Image
                  src={photo.previewUrl || ""}
                  alt={photo.name}
                  unoptimized
                  fill
                  priority={index === 0}
                  loading={index === 0 ? "eager" : "lazy"}
                  sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, (max-width: 1280px) 25vw, 20vw"
                  className={`object-cover cursor-pointer transition ${
                    selectedIdSet.has(photo.id)
                      ? "ring-2 ring-primary ring-offset-2"
                      : "hover:opacity-80"
                  }`}
                  style={{
                    WebkitTouchCallout: "none",
                    userSelect: "none",
                  }}
                  onPointerDown={(event) =>
                    handlePhotoPointerDown(photo.id, event)
                  }
                  onPointerMove={handlePhotoPointerMove}
                  onPointerUp={clearLongPressTimer}
                  onPointerCancel={clearLongPressTimer}
                  onPointerLeave={clearLongPressTimer}
                  onContextMenu={(event) => {
                    event.preventDefault();
                    if (selectMode) return;
                    closeModal();
                    setSelectMode(true);
                    setSelectedPhotoIds((prev) =>
                      prev.includes(photo.id) ? prev : [...prev, photo.id],
                    );
                  }}
                  onClick={() => handlePhotoClick(photo.id, index)}
                />

                {selectMode && (
                  <div
                    className={`pointer-events-none absolute right-2 top-2 flex h-6 w-6 items-center justify-center rounded-full border text-xs font-bold ${
                      selectedIdSet.has(photo.id)
                        ? "border-primary bg-primary text-white"
                        : "border-white/90 bg-black/35 text-white"
                    }`}
                  >
                    {selectedIdSet.has(photo.id) ? "\u2713" : ""}
                  </div>
                )}
              </div>
            </div>
          ))}
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
          !selectMode &&
          !loading &&
          photos.length > 0 &&
          isLgUp &&
          createPortal(
            <button
              type="button"
              onClick={startSelection}
              className="fixed bottom-3 left-1/2 z-80 min-h-11 -translate-x-1/2 rounded-full border  bg-primary px-5 py-2 text-sm font-semibold text-white shadow-[0_10px_30px_rgba(0,0,0,0.14)] backdrop-blur"
            >
              {t?.downloadDetail?.multiSelect || "Multi-select"}
            </button>,
            document.body,
          )}

        {mounted &&
          selectMode &&
          !loading &&
          photos.length > 0 &&
          createPortal(
            <div className="fixed bottom-3 left-1/2 z-80 w-[calc(100%-1rem)] max-w-lg -translate-x-1/2 rounded-2xl border border-[#e3d2bf] bg-white/95 p-3 shadow-[0_10px_30px_rgba(0,0,0,0.14)] backdrop-blur">
              <div className="mb-2 text-center text-sm text-[#4d3a2e]">
                {selectedCountLabel}
              </div>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={handleDownloadSelected}
                  disabled={batchDownloading || selectedPhotoIds.length === 0}
                  className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-primary px-3 py-2 text-sm font-semibold text-white disabled:opacity-60"
                >
                  <Download size={16} />
                  {batchDownloading
                    ? t?.downloadDetail?.downloadingBatch ||
                      t?.downloadDetail?.downloading ||
                      "Downloading..."
                    : t?.downloadDetail?.downloadAll || "Download all"}
                </button>

                <button
                  type="button"
                  onClick={cancelSelection}
                  disabled={batchDownloading}
                  className="min-h-11 rounded-lg border border-[#d7c4af] bg-white px-3 py-2 text-sm font-semibold text-[#4d3a2e] disabled:opacity-60"
                >
                  {t?.common?.cancel || "Cancel"}
                </button>
              </div>
            </div>,
            document.body,
          )}

        {mounted &&
          modalIndex !== null &&
          photos[modalIndex] &&
          createPortal(
            <div
              className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-4"
              onClick={closeModal}
            >
              <div
                className="relative flex flex-col items-center"
                onClick={(e) => e.stopPropagation()}
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
                        <span>{t?.common?.loading}</span>
                      </div>
                    </div>
                  )}
                  <Image
                    key={photos[modalIndex].id}
                    src={photos[modalIndex].previewUrl || ""}
                    alt={photos[modalIndex].name}
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

                  {photos[modalIndex].downloadUrl && (
                    <button
                      type="button"
                      onClick={() => handleDownload(photos[modalIndex])}
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
