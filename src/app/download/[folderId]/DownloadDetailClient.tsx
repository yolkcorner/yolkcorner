"use client";

import * as React from "react";
import { createPortal } from "react-dom";
import {
  ArrowLeft,
  Camera,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Circle,
  Download,
  MessageCircle,
  RefreshCw,
  ScanFace,
  X,
  ZoomIn,
} from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import Layout from "@/components/Layout";
import { useLang } from "@/lib/i18n";

type Photo = { previewUrl: string; downloadUrl: string; name: string };
type Step =
  | "home"
  | "camera"
  | "searching"
  | "results"
  | "gallery"
  | "line-sent";

// ─── CameraView ───────────────────────────────────────────────────────────────
// Separate component so it has its own mount lifecycle.
// useEffect fires AFTER the <video> element is in the DOM, guaranteeing
// videoRef.current is valid before srcObject is assigned.
function CameraView({
  stream,
  onBlob,
  onClose,
  instructionText,
  hintText,
}: {
  stream: MediaStream;
  onBlob: (blob: Blob) => void;
  onClose: () => void;
  instructionText?: string;
  hintText?: string;
}) {
  const videoRef = React.useRef<HTMLVideoElement>(null);
  const canvasRef = React.useRef<HTMLCanvasElement>(null);

  React.useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    video.srcObject = stream;
    video.play().catch(console.error);
    return () => {
      video.srcObject = null;
    };
  }, [stream]);

  const handleCapture = () => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return;
    canvas.width = video.videoWidth || 640;
    canvas.height = video.videoHeight || 480;
    canvas.getContext("2d")?.drawImage(video, 0, 0);
    canvas.toBlob(
      (blob) => {
        if (blob) onBlob(blob);
      },
      "image/jpeg",
      0.92,
    );
  };

  return (
    <section className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-black">
      <button
        type="button"
        onClick={onClose}
        className="absolute right-4 top-4 z-10 inline-flex h-10 w-10 items-center justify-center rounded-full bg-white/20 text-white backdrop-blur hover:bg-white/30"
      >
        <X size={20} />
      </button>

      <p className="mb-4 text-sm font-medium text-white/80">
        {instructionText}
      </p>

      <div className="relative">
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          className="h-[60dvh] w-[80vw] max-w-sm rounded-2xl object-cover"
        />
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <div className="h-[55%] w-[60%] rounded-full border-4 border-white/60" />
        </div>
      </div>

      <p className="mt-4 text-xs text-white/60">{hintText}</p>

      <canvas ref={canvasRef} className="sr-only" />

      <button
        type="button"
        onClick={handleCapture}
        className="mt-6 inline-flex h-16 w-16 items-center justify-center rounded-full bg-white shadow-lg transition active:scale-95"
      >
        <Camera size={28} className="text-primary" />
      </button>
    </section>
  );
}
// ─────────────────────────────────────────────────────────────────────────────

function isIOSDevice() {
  if (typeof navigator === "undefined") return false;
  return (
    /iPad|iPhone|iPod/.test(navigator.userAgent) ||
    (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1)
  );
}

async function downloadPhoto(photo: Photo) {
  if (!photo.downloadUrl) return;
  const ios = isIOSDevice();
  if (ios && navigator.share) {
    try {
      const res = await fetch(photo.downloadUrl, { cache: "no-store" });
      const blob = await res.blob();
      const file = new File([blob], photo.name, {
        type: blob.type || "image/jpeg",
      });
      if (
        typeof navigator.canShare === "function" &&
        navigator.canShare({ files: [file] })
      ) {
        await navigator.share({ files: [file], title: photo.name });
        return;
      }
    } catch {
      // fall through
    }
    window.open(
      photo.previewUrl || photo.downloadUrl,
      "_blank",
      "noopener,noreferrer",
    );
    return;
  }
  // Relative URLs and same-origin absolute URLs (e.g. /api/photos/…?download=1)
  // work with a plain <a download> tag.  Only cross-origin URLs (R2 CDN) need
  // to be proxied because the browser ignores the download attribute for them.
  let href: string;
  try {
    const url = new URL(photo.downloadUrl);
    const isSameOrigin =
      typeof window !== "undefined" && url.origin === window.location.origin;
    if (isSameOrigin) {
      href = photo.downloadUrl;
    } else {
      // Cross-origin: proxy through our server so Content-Disposition is set.
      const key = url.pathname.replace(/^\//, "");
      href = `/api/download-proxy?key=${encodeURIComponent(key)}&name=${encodeURIComponent(photo.name)}`;
    }
  } catch {
    // Relative URL — use directly.
    href = photo.downloadUrl;
  }
  const link = document.createElement("a");
  link.href = href;
  link.download = photo.name;
  document.body.appendChild(link);
  link.click();
  link.remove();
}

// ─── Lightbox ─────────────────────────────────────────────────────────────────
function Lightbox({
  photos,
  idx,
  onClose,
  onNavigate,
  onDownload,
}: {
  photos: Photo[];
  idx: number;
  onClose: () => void;
  onNavigate: (idx: number) => void;
  onDownload: (photo: Photo) => void;
}) {
  const photo = photos[idx];
  if (!photo) return null;
  const hasPrev = idx > 0;
  const hasNext = idx < photos.length - 1;

  React.useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowLeft" && hasPrev) onNavigate(idx - 1);
      if (e.key === "ArrowRight" && hasNext) onNavigate(idx + 1);
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [idx, hasPrev, hasNext, onClose, onNavigate]);

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-black/90"
      onClick={onClose}
    >
      {/* Close */}
      <button
        type="button"
        onClick={onClose}
        className="absolute right-4 top-4 z-10 inline-flex h-10 w-10 items-center justify-center rounded-full bg-white/20 text-white backdrop-blur hover:bg-white/30"
      >
        <X size={20} />
      </button>

      {/* Counter */}
      {photos.length > 1 && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 rounded-full bg-black/50 px-3 py-1 text-xs text-white">
          {idx + 1} / {photos.length}
        </div>
      )}

      {/* Prev */}
      {hasPrev && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onNavigate(idx - 1);
          }}
          className="absolute left-3 top-1/2 z-10 -translate-y-1/2 inline-flex h-10 w-10 items-center justify-center rounded-full bg-white/20 text-white backdrop-blur hover:bg-white/30"
        >
          <ChevronLeft size={22} />
        </button>
      )}

      {/* Next */}
      {hasNext && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onNavigate(idx + 1);
          }}
          className="absolute right-3 top-1/2 z-10 -translate-y-1/2 inline-flex h-10 w-10 items-center justify-center rounded-full bg-white/20 text-white backdrop-blur hover:bg-white/30"
        >
          <ChevronRight size={22} />
        </button>
      )}

      {/* Image */}
      <div
        className="flex flex-1 w-full items-center justify-center px-16"
        onClick={(e) => e.stopPropagation()}
      >
        <img
          src={photo.previewUrl}
          alt={photo.name}
          className="max-h-[80dvh] max-w-full rounded-xl object-contain shadow-2xl"
        />
      </div>

      {/* Bottom bar */}
      <div
        className="w-full flex items-center justify-between gap-3 bg-black/60 px-6 py-4 backdrop-blur"
        onClick={(e) => e.stopPropagation()}
      >
        <p className="truncate text-sm text-white/80">{photo.name}</p>
        <button
          type="button"
          onClick={() => onDownload(photo)}
          className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-white transition hover:brightness-95"
        >
          <Download size={14} />
          ดาวน์โหลด
        </button>
      </div>
    </div>
  );
}

// ─── DownloadChoiceModal ──────────────────────────────────────────────────────
function DownloadChoiceModal({
  photos,
  folderId,
  onNoLine,
  onClose,
}: {
  photos: Photo[];
  folderId: string;
  onNoLine: () => void;
  onClose: () => void;
}) {
  return (
    <div
      className="fixed inset-0 z-10000 flex items-center justify-center bg-black/50 px-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-sm rounded-3xl bg-white px-6 pb-8 pt-6 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-1 flex items-center justify-between">
          <h3 className="text-base font-bold text-[#2b1a10]">
            ต้องการรับรูปอย่างไร?
          </h3>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-8 w-8 items-center justify-center rounded-full text-[#8a7263] hover:bg-[#f5e9dc]"
          >
            <X size={16} />
          </button>
        </div>
        {photos.length > 1 && (
          <p className="mb-2 text-xs text-[#8a7263]">
            เลือกแล้ว {photos.length} รูป
          </p>
        )}
        <div className="mt-5 space-y-3">
          <a
            href={`/api/line/auth?eventId=${encodeURIComponent(folderId)}`}
            className="group inline-flex w-full items-center justify-center gap-2.5 rounded-2xl bg-[#06C755] px-6 py-4 text-[15px] font-bold text-white shadow-[0_6px_24px_rgba(6,199,85,0.3)] transition-all hover:brightness-[1.03] active:scale-[0.98]"
          >
            <MessageCircle className="h-5 w-5" />
            รับภาพผ่าน LINE
          </a>
          <button
            type="button"
            onClick={onNoLine}
            className="group inline-flex w-full items-center justify-center gap-2.5 rounded-2xl bg-primary px-6 py-4 text-[15px] font-bold text-white shadow-[0_6px_24px_rgba(242,154,45,0.3)] transition-all hover:brightness-[1.03] active:scale-[0.98]"
          >
            <Download className="h-5 w-5" />
            ฉันไม่มี LINE — ดาวน์โหลดเลย
          </button>
        </div>
      </div>
    </div>
  );
}
// ─────────────────────────────────────────────────────────────────────────────

export default function DownloadDetailClient({
  folderId,
  folderName,
  mode,
  lineSession,
  urlError,
  faceRecognitionEnabled,
}: {
  folderId: string;
  folderName?: string;
  mode?: string;
  lineSession?: string;
  urlError?: string;
  faceRecognitionEnabled: boolean;
}) {
  const lineMode = mode === "line";
  const { t } = useLang();

  const [step, setStep] = React.useState<Step>(
    faceRecognitionEnabled ? "home" : "gallery",
  );
  const [errorMsg, setErrorMsg] = React.useState("");
  const [foundPhotos, setFoundPhotos] = React.useState<Photo[]>([]);
  const [galleryPhotos, setGalleryPhotos] = React.useState<Photo[]>([]);
  const [galleryLoading, setGalleryLoading] = React.useState(false);
  const [galleryLoadingMore, setGalleryLoadingMore] = React.useState(false);
  const [galleryNextPageToken, setGalleryNextPageToken] = React.useState<
    string | null
  >(null);
  const [galleryHasMore, setGalleryHasMore] = React.useState(false);
  const [galleryError, setGalleryError] = React.useState("");
  const [downloadingId, setDownloadingId] = React.useState<string | null>(null);
  const [selectedPhotos, setSelectedPhotos] = React.useState<Set<string>>(
    new Set(),
  );
  const [downloadingAll, setDownloadingAll] = React.useState(false);
  const [downloadProgress, setDownloadProgress] = React.useState<{
    current: number;
    total: number;
  } | null>(null);
  const [downloadedPhotos, setDownloadedPhotos] = React.useState<Set<string>>(
    new Set(),
  );
  const [lineSentCount, setLineSentCount] = React.useState(0);
  const [mounted, setMounted] = React.useState(false);
  const [cameraStream, setCameraStream] = React.useState<MediaStream | null>(
    null,
  );

  // Lightbox
  const [lightboxOpen, setLightboxOpen] = React.useState(false);
  const [lightboxPhotos, setLightboxPhotos] = React.useState<Photo[]>([]);
  const [lightboxIdx, setLightboxIdx] = React.useState(0);
  // Download choice modal
  const [choiceModal, setChoiceModal] = React.useState<Photo[] | null>(null);
  // Gallery multi-select
  const [gallerySelected, setGallerySelected] = React.useState<Set<string>>(
    new Set(),
  );

  React.useEffect(() => {
    setMounted(true);
  }, []);

  // Show URL-level errors from LINE OAuth callback (e.g. user denied, auth failed)
  React.useEffect(() => {
    if (!urlError) return;
    const msgs: Record<string, string> = {
      line_denied: "คุณปฏิเสธการเข้าสู่ระบบด้วย LINE",
      line_auth_failed: "ล็อกอิน LINE ไม่สำเร็จ กรุณาลองใหม่",
      invalid_state: "ลิงก์ LINE หมดอายุ กรุณาเริ่มใหม่",
      invalid_callback: "Callback ไม่ถูกต้อง กรุณาเริ่มใหม่",
    };
    setErrorMsg(msgs[urlError] ?? `เกิดข้อผิดพลาด: ${urlError}`);
  }, [urlError]);

  const stopCamera = React.useCallback(
    (stream?: MediaStream | null) => {
      const s = stream ?? cameraStream;
      if (s) s.getTracks().forEach((t) => t.stop());
      setCameraStream(null);
    },
    [cameraStream],
  );

  const loadGalleryPhotos = async (
    pageToken?: string | null,
    append = false,
  ) => {
    if (!append) {
      setGalleryLoading(true);
      setGalleryPhotos([]);
      setGalleryNextPageToken(null);
      setGalleryHasMore(false);
      setGalleryError("");
    } else {
      setGalleryLoadingMore(true);
    }

    try {
      const query = new URLSearchParams({ pageSize: "50" });
      if (pageToken) query.set("pageToken", pageToken);

      const res = await fetch(`/api/photos/${folderId}?${query.toString()}`, {
        cache: "no-store",
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Failed to load photos");

      const files = Array.isArray(data?.files)
        ? (data.files as Array<{
            previewUrl: string;
            downloadUrl: string;
            name: string;
          }>)
        : [];

      setGalleryPhotos((prev) => (append ? [...prev, ...files] : files));
      setGalleryNextPageToken(data?.nextPageToken ?? null);
      setGalleryHasMore(Boolean(data?.nextPageToken));
    } catch (error) {
      console.error("Failed to load gallery photos:", error);
      if (!append) {
        setGalleryPhotos([]);
      }
      setGalleryError("Failed to load photos. Please refresh.");
    } finally {
      if (!append) setGalleryLoading(false);
      setGalleryLoadingMore(false);
    }
  };

  const loadMoreGalleryPhotos = async () => {
    if (
      galleryLoading ||
      galleryLoadingMore ||
      !galleryNextPageToken ||
      !galleryHasMore
    ) {
      return;
    }

    await loadGalleryPhotos(galleryNextPageToken, true);
  };

  const handleGalleryScroll = (event: React.UIEvent<HTMLDivElement>) => {
    const container = event.currentTarget;
    const nearBottom =
      container.scrollTop + container.clientHeight >=
      container.scrollHeight - 220;

    if (nearBottom) {
      void loadMoreGalleryPhotos();
    }
  };

  React.useEffect(() => {
    if (!faceRecognitionEnabled) {
      void loadGalleryPhotos();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [faceRecognitionEnabled]);

  const startCamera = React.useCallback(async () => {
    setErrorMsg("");

    if (!navigator?.mediaDevices?.getUserMedia) {
      setErrorMsg(
        "เบราว์เซอร์นี้ไม่รองรับการใช้กล้อง กรุณาใช้ Chrome หรือ Safari",
      );
      return;
    }

    const attempts: MediaStreamConstraints[] = [
      { video: { facingMode: "user" } },
      { video: { facingMode: { ideal: "user" } } },
      { video: true },
    ];

    let stream: MediaStream | null = null;
    for (const constraints of attempts) {
      try {
        stream = await navigator.mediaDevices.getUserMedia(constraints);
        break;
      } catch {
        // try next fallback
      }
    }

    if (!stream) {
      setErrorMsg("ไม่สามารถเปิดกล้องได้ กรุณาอนุญาตการใช้กล้อง");
      return;
    }

    setCameraStream(stream);
    setStep("camera");
  }, []);

  const handleBlob = React.useCallback(
    async (blob: Blob) => {
      setCameraStream((s) => {
        if (s) s.getTracks().forEach((t) => t.stop());
        return null;
      });
      setStep("searching");

      const formData = new FormData();
      formData.append("selfie", blob, "selfie.jpg");
      formData.append("eventId", folderId);

      if (lineMode) {
        if (lineSession) formData.append("session", lineSession);
        // Request preview-only so server won't auto-push to LINE.
        formData.append("preview", "1");
        try {
          const res = await fetch("/api/face/search", {
            method: "POST",
            body: formData,
          });
          const data = await res.json();
          if (!res.ok) {
            setErrorMsg(data?.error || "เกิดข้อผิดพลาด");
            setStep("home");
            return;
          }
          // NOTE: changed behavior: always show the matched photos for preview
          // even if the backend attempted to push to LINE. User will select
          // which photos to send and explicitly trigger the LINE push.
          setFoundPhotos(data.photos ?? []);
          setStep("results");
        } catch {
          setErrorMsg("เครือข่ายขัดข้อง กรุณาลองใหม่");
          setStep("home");
        }
      } else {
        try {
          const res = await fetch("/api/face/browse", {
            method: "POST",
            body: formData,
          });
          const data = await res.json();
          if (!res.ok) {
            setErrorMsg(data?.error || "เกิดข้อผิดพลาด");
            setStep("home");
            return;
          }
          setFoundPhotos(data.photos ?? []);
          setStep("results");
        } catch {
          setErrorMsg("เครือข่ายขัดข้อง กรุณาลองใหม่");
          setStep("home");
        }
      }
    },
    [folderId, lineMode, lineSession],
  );

  const reset = () => {
    setStep(faceRecognitionEnabled ? "home" : "gallery");
    setFoundPhotos([]);
    setErrorMsg("");
    setLineSentCount(0);
    setSelectedPhotos(new Set());
    setGallerySelected(new Set());
    setDownloadedPhotos(new Set());
    setDownloadProgress(null);
  };

  const handleDownloadPhoto = async (photo: Photo) => {
    if (!lineMode) {
      setChoiceModal([photo]);
      return;
    }
    setDownloadingId(photo.name);
    try {
      await downloadPhoto(photo);
      setDownloadedPhotos((prev) => new Set([...prev, photo.name]));
    } catch {
      /* silent */
    } finally {
      setDownloadingId(null);
    }
  };

  const toggleSelect = (name: string) => {
    setSelectedPhotos((prev) => {
      const next = new Set(prev);
      if (next.has(name)) next.delete(name);
      else next.add(name);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedPhotos.size === foundPhotos.length) {
      setSelectedPhotos(new Set());
    } else {
      setSelectedPhotos(new Set(foundPhotos.map((p) => p.name)));
    }
  };

  const handleDownloadSelected = async () => {
    const toDownload = foundPhotos.filter((p) => selectedPhotos.has(p.name));
    if (!toDownload.length) return;
    if (!lineMode) {
      setChoiceModal(toDownload);
      return;
    }
    setDownloadingAll(true);
    setDownloadProgress({ current: 0, total: toDownload.length });
    for (let i = 0; i < toDownload.length; i++) {
      setDownloadProgress({ current: i + 1, total: toDownload.length });
      await downloadPhoto(toDownload[i]);
      setDownloadedPhotos((prev) => new Set([...prev, toDownload[i].name]));
      // small delay so browser doesn't block multiple simultaneous downloads
      await new Promise((r) => setTimeout(r, 400));
    }
    setDownloadingAll(false);
    setDownloadProgress(null);
  };

  const handleSendToLineSelected = async () => {
    const toSend = foundPhotos.filter((p) => selectedPhotos.has(p.name));
    if (!toSend.length) return;
    setDownloadingAll(true);
    try {
      const res = await fetch(`/api/line/push`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          session: lineSession,
          photos: toSend.map((p) => p.downloadUrl),
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setErrorMsg(data?.error || "ไม่สามารถส่งไปยัง LINE ได้");
        return;
      }
      setLineSentCount(data.sent ?? toSend.length);
      setStep("line-sent");
    } catch (err) {
      console.error(err);
      setErrorMsg("เครือข่ายขัดข้อง กรุณาลองใหม่");
    } finally {
      setDownloadingAll(false);
    }
  };

  const toggleGallerySelect = (name: string) => {
    setGallerySelected((prev) => {
      const next = new Set(prev);
      if (next.has(name)) next.delete(name);
      else next.add(name);
      return next;
    });
  };

  const toggleGallerySelectAll = () => {
    if (
      gallerySelected.size === galleryPhotos.length &&
      galleryPhotos.length > 0
    ) {
      setGallerySelected(new Set());
    } else {
      setGallerySelected(new Set(galleryPhotos.map((p) => p.name)));
    }
  };

  const openLightbox = (photos: Photo[], idx: number) => {
    setLightboxPhotos(photos);
    setLightboxIdx(idx);
    setLightboxOpen(true);
  };

  const handleGalleryDownloadSelected = () => {
    const toDownload = galleryPhotos.filter((p) =>
      gallerySelected.has(p.name),
    );
    if (!toDownload.length) return;
    if (!lineMode) {
      setChoiceModal(toDownload);
      return;
    }
    void (async () => {
      setDownloadingAll(true);
      setDownloadProgress({ current: 0, total: toDownload.length });
      for (let i = 0; i < toDownload.length; i++) {
        setDownloadProgress({ current: i + 1, total: toDownload.length });
        await downloadPhoto(toDownload[i]);
        setDownloadedPhotos((prev) =>
          new Set([...prev, toDownload[i].name]),
        );
        if (toDownload.length > 1)
          await new Promise((r) => setTimeout(r, 400));
      }
      setDownloadingAll(false);
      setDownloadProgress(null);
    })();
  };

  const handleGallerySendToLine = async () => {
    const toSend = galleryPhotos.filter((p) => gallerySelected.has(p.name));
    if (!toSend.length) return;
    setDownloadingAll(true);
    try {
      const res = await fetch(`/api/line/push`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          session: lineSession,
          photos: toSend.map((p) => p.downloadUrl),
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setErrorMsg(data?.error || "ไม่สามารถส่งไปยัง LINE ได้");
        return;
      }
      setLineSentCount(data.sent ?? toSend.length);
      setStep("line-sent");
    } catch (err) {
      console.error(err);
      setErrorMsg("เครือข่ายขัดข้อง กรุณาลองใหม่");
    } finally {
      setDownloadingAll(false);
    }
  };

  const handleChoiceNoLine = async () => {
    const photos = choiceModal;
    if (!photos) return;
    setChoiceModal(null);
    if (photos.length === 1) {
      const photo = photos[0];
      setDownloadingId(photo.name);
      try {
        await downloadPhoto(photo);
        setDownloadedPhotos((prev) => new Set([...prev, photo.name]));
      } catch {
        /* silent */
      } finally {
        setDownloadingId(null);
      }
      return;
    }
    setDownloadingAll(true);
    setDownloadProgress({ current: 0, total: photos.length });
    for (let i = 0; i < photos.length; i++) {
      setDownloadProgress({ current: i + 1, total: photos.length });
      await downloadPhoto(photos[i]);
      setDownloadedPhotos((prev) => new Set([...prev, photos[i].name]));
      await new Promise((r) => setTimeout(r, 400));
    }
    setDownloadingAll(false);
    setDownloadProgress(null);
  };

  const dt = t?.downloadDetail;

  return (
    <Layout>
      {/* Back link */}
      <div className="container mx-auto px-4 pt-14">
        <Link
          href="/download"
          className="group inline-flex items-center gap-2 rounded-full bg-white/60 px-4 py-2 text-sm font-medium text-primary shadow-sm backdrop-blur transition hover:bg-white hover:shadow-md"
        >
          <ArrowLeft
            size={16}
            className="transition-transform group-hover:-translate-x-0.5"
          />
          {dt?.backToDownload}
        </Link>
      </div>

      {/* ── HOME ─────────────────────────────────────────── */}
      {step === "home" && (
        <section className="flex items-start justify-center px-4 pb-10 pt-8">
          <div className="w-full max-w-sm">
            {/* Card */}
            <div className="overflow-hidden rounded-4xl bg-white shadow-[0_8px_40px_rgba(120,58,12,0.12),0_1.5px_4px_rgba(120,58,12,0.08)]">
              {/* Gradient header with icon */}
              <div className="relative flex items-center justify-center overflow-hidden bg-linear-to-br from-[#fff6ec] via-[#ffe8cc] to-[#ffd9a8] py-14">
                {/* Decorative circles */}
                <div className="absolute -right-10 -top-10 h-40 w-40 rounded-full bg-primary/[0.07]" />
                <div className="absolute -bottom-6 -left-6 h-28 w-28 rounded-full bg-primary/5" />
                {/* Icon */}
                <div className="relative flex h-32 w-32 items-center justify-center rounded-full bg-white shadow-[0_12px_40px_rgba(242,154,45,0.25)]">
                  <ScanFace
                    className="h-16 w-16 text-primary"
                    strokeWidth={1.4}
                  />
                  <span className="absolute inset-0 animate-[ping_2.5s_ease-in-out_infinite] rounded-full border-2 border-primary/20" />
                </div>
              </div>
              {/* Content */}
              <div className="px-7 pb-9 pt-7 text-center">
                {folderName && (
                  <p className="mb-3 text-[11px] font-bold uppercase tracking-[0.2em] text-primary/70">
                    {folderName}
                  </p>
                )}
                <h2 className="text-[1.4rem] font-bold leading-snug text-[#2b1a10]">
                  {lineMode
                    ? (dt?.lineFaceTitle ?? "เซลฟี่เพื่อรับรูปทาง LINE")
                    : (dt?.noLineScanTitle ?? "ถ่ายเซลฟี่เพื่อรับรูป")}
                </h2>
                <p className="mx-auto mt-3 max-w-65 text-[13px] leading-relaxed text-[#8a7263]">
                  {lineMode
                    ? (dt?.lineFaceDesc ??
                      "จัดใบหน้าให้อยู่ในกรอบ และเราจะส่งรูปเข้า LINE อัตโนมัติ")
                    : (dt?.noLineScanDesc ??
                      "จัดใบหน้าให้อยู่ในกรอบ เราจะค้นหารูปของคุณโดยอัตโนมัติ")}
                </p>
                {errorMsg && (
                  <p className="mt-3 rounded-xl bg-red-50 px-3 py-2 text-xs text-red-600">
                    {errorMsg}
                  </p>
                )}
                {/* Buttons */}
                <div className="mt-8 space-y-3">
                  {!lineMode && (
                    <a
                      href={`/api/line/auth?eventId=${encodeURIComponent(folderId)}`}
                      className="group inline-flex w-full items-center justify-center gap-2.5 rounded-2xl bg-[#06C755] px-6 py-4 text-[15px] font-bold text-white shadow-[0_6px_24px_rgba(6,199,85,0.3)] transition-all hover:shadow-[0_8px_28px_rgba(6,199,85,0.4)] hover:brightness-[1.03] active:scale-[0.98]"
                    >
                      <MessageCircle className="h-5 w-5 transition-transform group-hover:scale-110" />
                      {dt?.lineReceiveBtn ?? "รับรูปผ่าน LINE"}
                    </a>
                  )}
                  <button
                    type="button"
                    onClick={startCamera}
                    className="group inline-flex w-full items-center justify-center gap-2.5 rounded-2xl bg-primary px-6 py-4 text-[15px] font-bold text-white shadow-[0_6px_24px_rgba(242,154,45,0.3)] transition-all hover:shadow-[0_8px_28px_rgba(242,154,45,0.4)] hover:brightness-[1.03] active:scale-[0.98]"
                  >
                    <Camera className="h-5 w-5 transition-transform group-hover:scale-110" />
                    {lineMode
                      ? (dt?.noLineCaptureBtn ?? "ถ่ายเซลฟี่")
                      : (dt?.noLineBtn ?? "ถ่ายเซลฟี่ดูรูปเอง")}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* ── CAMERA ───────────────────────────────────────── */}
      {step === "gallery" && (
        <section className="container mx-auto px-4 py-10">
          <div className="mb-4">
            <h2 className="text-xl font-bold text-[#2b1a10]">
              {folderName ? `${folderName} — ` : ""}
              {t?.downloadDetail?.galleryTitle ?? "Browse all photos"}
            </h2>
            <p className="mt-2 text-sm text-[#6f5a4b]">
              {t?.downloadDetail?.galleryDescription ??
                "Face recognition is disabled. Browse all photos and download as needed."}
            </p>
          </div>

          {galleryError ? (
            <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
              <p>{galleryError}</p>
              <button
                type="button"
                onClick={() => loadGalleryPhotos()}
                className="mt-3 inline-flex rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-white transition hover:brightness-95"
              >
                {t?.downloadDetail?.retry ?? "Retry"}
              </button>
            </div>
          ) : galleryLoading ? (
            <div className="flex min-h-[240px] items-center justify-center text-sm text-[#6f5a4b]">
              {t?.downloadDetail?.loadingPhotos ?? "Loading photos..."}
            </div>
          ) : galleryPhotos.length === 0 ? (
            <div className="flex min-h-[240px] items-center justify-center text-sm text-[#6f5a4b]">
              {t?.downloadDetail?.noPhotos ??
                "No photos found in this gallery."}
            </div>
          ) : (
            <div
              className="relative overflow-y-auto"
              style={{ maxHeight: "calc(100vh - 200px)" }}
              onScroll={handleGalleryScroll}
            >
              <div className="grid grid-cols-2 gap-3 pb-24 md:grid-cols-3 xl:grid-cols-4">
                {galleryPhotos.map((photo, photoIdx) => {
                  const selected = gallerySelected.has(photo.name);
                  const downloaded = downloadedPhotos.has(photo.name);
                  return (
                    <div
                      key={photo.name}
                      className={`overflow-hidden rounded-2xl border bg-[#fff7ee] transition ${selected ? "border-primary ring-2 ring-primary/30" : "border-[#efddca]"}`}
                    >
                      <div
                        className="relative aspect-square cursor-pointer"
                        onClick={() => openLightbox(galleryPhotos, photoIdx)}
                      >
                        <Image
                          src={photo.previewUrl}
                          alt={photo.name}
                          fill
                          unoptimized
                          className="object-cover"
                          sizes="(max-width: 640px) 50vw, 33vw"
                        />
                        {/* Checkbox overlay */}
                        <div
                          className="absolute right-2 top-2 z-10"
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleGallerySelect(photo.name);
                          }}
                        >
                          {selected ? (
                            <CheckCircle2
                              size={22}
                              className="rounded-full bg-white text-primary drop-shadow"
                            />
                          ) : (
                            <Circle
                              size={22}
                              className="rounded-full bg-white/80 text-[#aaa] drop-shadow"
                            />
                          )}
                        </div>
                        {/* Downloaded badge */}
                        {downloaded && (
                          <div className="absolute bottom-2 left-2 rounded-full bg-black/50 px-2 py-0.5 text-[10px] font-medium text-white">
                            ✓ ดาวน์โหลดแล้ว
                          </div>
                        )}
                      </div>
                      <div className="p-3">
                        <p
                          className="truncate text-xs text-[#6a5445]"
                          title={photo.name}
                        >
                          {photo.name}
                        </p>
                        <button
                          type="button"
                          onClick={() => handleDownloadPhoto(photo)}
                          disabled={downloadingId === photo.name}
                          className="mt-3 inline-flex w-full items-center justify-center gap-1.5 rounded-xl bg-primary px-3 py-2 text-xs font-semibold text-white transition hover:brightness-95 disabled:opacity-60"
                        >
                          <Download size={13} />
                          {downloadingId === photo.name
                            ? (t?.downloadDetail?.downloading ?? "Downloading...")
                            : (t?.common?.download ?? "Download")}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
              {galleryLoadingMore && (
                <div className="mt-4 text-center text-sm text-[#6f5a4b]">
                  {t?.downloadDetail?.loadingMore ?? "Loading more photos..."}
                </div>
              )}
              {!galleryLoadingMore && galleryHasMore && (
                <div className="mt-4 text-center text-sm text-[#8a6347]">
                  {t?.downloadDetail?.scrollToLoad ??
                    "Scroll down to load more photos."}
                </div>
              )}
            </div>
          )}
        </section>
      )}

      {step === "camera" && cameraStream && (
        <CameraView
          stream={cameraStream}
          onBlob={handleBlob}
          onClose={() => {
            stopCamera(cameraStream);
            setStep("home");
          }}
          instructionText={dt?.noLineScanTitle}
          hintText={dt?.noLineScanDesc}
        />
      )}

      {/* ── SEARCHING ────────────────────────────────────── */}
      {step === "searching" && (
        <section className="flex min-h-[calc(100dvh-64px)] items-center justify-center">
          <div className="flex flex-col items-center gap-5 text-center">
            <div className="relative flex h-20 w-20 items-center justify-center">
              <div className="absolute inset-0 animate-spin rounded-full border-[3px] border-[#f3d6b8] border-t-primary" />
              <ScanFace className="h-8 w-8 text-primary" strokeWidth={1.5} />
            </div>
            <div>
              <p className="text-lg font-bold text-[#2b1a10]">
                {dt?.noLineSearching}
              </p>
              <p className="mt-1 text-sm text-[#8a7263]">กรุณารอสักครู่...</p>
            </div>
          </div>
        </section>
      )}

      {/* ── RESULTS ──────────────────────────────────────── */}
      {step === "results" && (
        <section className="container mx-auto px-4 py-10">
          {/* Header row */}
          <div className="mb-4">
            <h2 className="text-xl font-bold text-[#2b1a10]">
              {folderName && (
                <span className="mr-2 text-sm font-normal text-[#a07858]">
                  {folderName} —
                </span>
              )}
              {dt?.noLineFoundTitle}
            </h2>
          </div>

          {foundPhotos.length === 0 ? (
            <p className="text-center text-sm text-[#6f5a4b]">
              {dt?.noLineNotFound}
            </p>
          ) : (
            <>
              {/* Grid */}
              <div className="grid grid-cols-2 gap-3 pb-24 md:grid-cols-3 xl:grid-cols-4">
                {foundPhotos.map((photo) => {
                  const selected = selectedPhotos.has(photo.name);
                  const isDownloading = downloadingId === photo.name;
                  const downloaded = downloadedPhotos.has(photo.name);
                  return (
                    <div
                      key={photo.name}
                      className={`overflow-hidden rounded-2xl border bg-[#fff7ee] transition ${selected ? "border-primary ring-2 ring-primary/30" : "border-[#efddca]"}`}
                    >
                      <div
                        className="relative aspect-square cursor-pointer"
                        onClick={() => toggleSelect(photo.name)}
                      >
                        <Image
                          src={photo.previewUrl}
                          alt={photo.name}
                          fill
                          unoptimized
                          className="object-cover"
                          sizes="(max-width: 640px) 50vw, 33vw"
                        />
                        {/* Zoom / preview button */}
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            openLightbox(
                              foundPhotos,
                              foundPhotos.indexOf(photo),
                            );
                          }}
                          className="absolute left-2 top-2 z-10 inline-flex h-7 w-7 items-center justify-center rounded-full bg-black/40 text-white hover:bg-black/60"
                        >
                          <ZoomIn size={14} />
                        </button>
                        {/* Circle checkbox overlay */}
                        <div className="absolute right-2 top-2">
                          {selected ? (
                            <CheckCircle2
                              size={22}
                              className="bg-white rounded-full text-primary drop-shadow"
                            />
                          ) : (
                            <Circle
                              size={22}
                              className="bg-white/80 rounded-full text-[#aaa] drop-shadow"
                            />
                          )}
                        </div>
                        {/* Downloaded badge */}
                        {downloaded && (
                          <div className="absolute bottom-2 left-2 rounded-full bg-black/50 px-2 py-0.5 text-[10px] font-medium text-white">
                            ✓ ดาวน์โหลดแล้ว
                          </div>
                        )}
                      </div>
                      <div className="p-3">
                        <button
                          type="button"
                          onClick={() => handleDownloadPhoto(photo)}
                          disabled={isDownloading}
                          className="inline-flex w-full items-center justify-center gap-1.5 rounded-xl bg-primary px-3 py-2 text-xs font-semibold text-white transition hover:brightness-95 disabled:opacity-60"
                        >
                          <Download size={13} />
                          {isDownloading
                            ? "กำลังดาวน์โหลด..."
                            : downloaded
                              ? "ดาวน์โหลดอีกครั้ง"
                              : (t?.common?.download ?? "ดาวน์โหลด")}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </section>
      )}

      {/* ── LINE SENT ────────────────────────────────────── */}
      {step === "line-sent" && (
        <section className="flex min-h-[calc(100dvh-64px)] items-center justify-center px-4">
          <div className="w-full max-w-sm text-center">
            <div className="mx-auto mb-6 flex h-24 w-24 items-center justify-center rounded-full bg-[#06C755]/15">
              <MessageCircle className="h-12 w-12 text-[#06C755]" />
            </div>
            <h2 className="text-2xl font-bold text-[#2b1a10]">
              {dt?.lineSentTitle ?? "ส่งรูปแล้ว!"}
            </h2>
            <p className="mt-3 text-sm leading-relaxed text-[#6f5a4b]">
              {lineSentCount > 0
                ? (
                    dt?.lineSentDesc ??
                    `ส่ง ${lineSentCount} รูปไปยัง LINE ของคุณแล้ว`
                  ).replace("{count}", String(lineSentCount))
                : (dt?.lineSentNotFound ??
                  "ไม่พบรูปที่ตรงกับใบหน้าของคุณในอีเวนต์นี้")}
            </p>
            <button
              type="button"
              onClick={reset}
              className="mt-8 inline-flex items-center gap-2 rounded-2xl border border-[#e3d2bf] bg-white px-6 py-3 text-sm font-medium text-[#4d3a2e] transition hover:bg-[#fff4e8]"
            >
              <RefreshCw size={14} />
              {dt?.noLineTryAgain ?? "ลองใหม่"}
            </button>
          </div>
        </section>
      )}
      {/* Floating bottom bar — portal escapes transform stacking context */}
      {mounted &&
        step === "results" &&
        foundPhotos.length > 0 &&
        createPortal(
          <div className="fixed bottom-0 left-0 right-0 z-9999 px-4 pb-4">
            <div className="mx-auto flex max-w-2xl items-center justify-between gap-3 rounded-2xl border border-[#e3d2bf] bg-white/95 px-4 py-3 shadow-[0_8px_32px_rgba(120,58,12,0.18)] backdrop-blur">
              <button
                type="button"
                onClick={toggleSelectAll}
                className="inline-flex items-center gap-2 text-sm font-medium text-[#4d3a2e] transition hover:text-primary"
              >
                {selectedPhotos.size === foundPhotos.length ? (
                  <CheckCircle2 size={18} className="text-primary" />
                ) : (
                  <Circle size={18} className="text-[#aaa]" />
                )}
                {selectedPhotos.size === foundPhotos.length
                  ? "ยกเลิกทั้งหมด"
                  : `เลือกทั้งหมด (${foundPhotos.length})`}
              </button>
              {lineMode ? (
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={handleSendToLineSelected}
                    disabled={selectedPhotos.size === 0 || downloadingAll}
                    className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:brightness-95 disabled:opacity-40"
                  >
                    <MessageCircle size={14} />
                    {downloadingAll && downloadProgress
                      ? `กำลังส่ง (${downloadProgress.current}/${downloadProgress.total})`
                      : selectedPhotos.size > 0
                        ? `ส่งไปยัง LINE (${selectedPhotos.size})`
                        : "เลือกรูปก่อน"}
                  </button>
                  <button
                    type="button"
                    onClick={handleDownloadSelected}
                    disabled={selectedPhotos.size === 0 || downloadingAll}
                    className="inline-flex items-center gap-1.5 rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:brightness-95 disabled:opacity-40"
                  >
                    <Download size={14} />
                    {downloadingAll && downloadProgress
                      ? `กำลังดาวน์โหลด (${downloadProgress.current}/${downloadProgress.total})`
                      : selectedPhotos.size > 0
                        ? `ดาวน์โหลด (${selectedPhotos.size})`
                        : "เลือกรูปก่อน"}
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={handleDownloadSelected}
                  disabled={selectedPhotos.size === 0 || downloadingAll}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:brightness-95 disabled:opacity-40"
                >
                  <Download size={14} />
                  {downloadingAll && downloadProgress
                    ? `กำลังดาวน์โหลด (${downloadProgress.current}/${downloadProgress.total})`
                    : selectedPhotos.size > 0
                      ? `ดาวน์โหลด (${selectedPhotos.size})`
                      : "เลือกรูปก่อน"}
                </button>
              )}
            </div>
          </div>,
          document.body,
        )}
      {/* Gallery floating bar */}
      {mounted &&
        step === "gallery" &&
        galleryPhotos.length > 0 &&
        createPortal(
          <div className="fixed bottom-0 left-0 right-0 z-9999 px-4 pb-4">
            <div className="mx-auto flex max-w-2xl items-center justify-between gap-3 rounded-2xl border border-[#e3d2bf] bg-white/95 px-4 py-3 shadow-[0_8px_32px_rgba(120,58,12,0.18)] backdrop-blur">
              <button
                type="button"
                onClick={toggleGallerySelectAll}
                className="inline-flex items-center gap-2 text-sm font-medium text-[#4d3a2e] transition hover:text-primary"
              >
                {gallerySelected.size === galleryPhotos.length &&
                galleryPhotos.length > 0 ? (
                  <CheckCircle2 size={18} className="text-primary" />
                ) : (
                  <Circle size={18} className="text-[#aaa]" />
                )}
                {gallerySelected.size === galleryPhotos.length &&
                galleryPhotos.length > 0
                  ? "ยกเลิกทั้งหมด"
                  : `เลือกทั้งหมด (${galleryPhotos.length})`}
              </button>
              {lineMode ? (
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={handleGallerySendToLine}
                    disabled={gallerySelected.size === 0 || downloadingAll}
                    className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:brightness-95 disabled:opacity-40"
                  >
                    <MessageCircle size={14} />
                    {gallerySelected.size > 0
                      ? `ส่งไปยัง LINE (${gallerySelected.size})`
                      : "เลือกรูปก่อน"}
                  </button>
                  <button
                    type="button"
                    onClick={handleGalleryDownloadSelected}
                    disabled={gallerySelected.size === 0 || downloadingAll}
                    className="inline-flex items-center gap-1.5 rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:brightness-95 disabled:opacity-40"
                  >
                    <Download size={14} />
                    {downloadingAll && downloadProgress
                      ? `กำลังดาวน์โหลด (${downloadProgress.current}/${downloadProgress.total})`
                      : gallerySelected.size > 0
                        ? `ดาวน์โหลด (${gallerySelected.size})`
                        : ""}
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={handleGalleryDownloadSelected}
                  disabled={gallerySelected.size === 0 || downloadingAll}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:brightness-95 disabled:opacity-40"
                >
                  <Download size={14} />
                  {downloadingAll && downloadProgress
                    ? `กำลังดาวน์โหลด (${downloadProgress.current}/${downloadProgress.total})`
                    : gallerySelected.size > 0
                      ? `ดาวน์โหลด (${gallerySelected.size})`
                      : "เลือกรูปก่อน"}
                </button>
              )}
            </div>
          </div>,
          document.body,
        )}
      {/* Lightbox portal */}
      {mounted &&
        lightboxOpen &&
        createPortal(
          <Lightbox
            photos={lightboxPhotos}
            idx={lightboxIdx}
            onClose={() => setLightboxOpen(false)}
            onNavigate={setLightboxIdx}
            onDownload={(photo) => {
              setLightboxOpen(false);
              void handleDownloadPhoto(photo);
            }}
          />,
          document.body,
        )}
      {/* Download choice modal portal */}
      {mounted &&
        choiceModal &&
        createPortal(
          <DownloadChoiceModal
            photos={choiceModal}
            folderId={folderId}
            onNoLine={handleChoiceNoLine}
            onClose={() => setChoiceModal(null)}
          />,
          document.body,
        )}
    </Layout>
  );
}
