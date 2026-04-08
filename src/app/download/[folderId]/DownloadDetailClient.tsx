"use client";

import * as React from "react";
import { createPortal } from "react-dom";
import {
  ArrowLeft,
  Camera,
  CheckCircle2,
  Circle,
  Download,
  MessageCircle,
  RefreshCw,
  ScanFace,
  X,
} from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import Layout from "@/components/Layout";
import { useLang } from "@/lib/i18n";

type Photo = { previewUrl: string; downloadUrl: string; name: string };
type Step = "home" | "camera" | "searching" | "results" | "line-sent";

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
  // For cross-origin URLs (e.g. R2 CDN), the `download` attribute is ignored
  // and client-side blob fetch fails due to CORS. We proxy through our own
  // API endpoint which sets Content-Disposition: attachment.
  //
  // Parse the R2 key from the public URL: strip the origin, the leading slash
  // gives us the full R2 object key.
  let key: string;
  try {
    const url = new URL(photo.downloadUrl);
    key = url.pathname.replace(/^\//, ""); // e.g. "photobooth-events/folder/file.jpg"
  } catch {
    key = photo.downloadUrl;
  }

  const proxyUrl = `/api/download-proxy?key=${encodeURIComponent(key)}&name=${encodeURIComponent(photo.name)}`;
  const link = document.createElement("a");
  link.href = proxyUrl;
  link.download = photo.name;
  document.body.appendChild(link);
  link.click();
  link.remove();
}

export default function DownloadDetailClient({
  folderId,
  folderName,
  mode,
  lineSession,
  urlError,
}: {
  folderId: string;
  folderName?: string;
  mode?: string;
  lineSession?: string;
  urlError?: string;
}) {
  const lineMode = mode === "line";
  const { t } = useLang();

  const [step, setStep] = React.useState<Step>("home");
  const [errorMsg, setErrorMsg] = React.useState("");
  const [foundPhotos, setFoundPhotos] = React.useState<Photo[]>([]);
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
          // If LINE push succeeded, show the sent confirmation screen.
          // If push failed (lineSent=false), fall back to the download UI.
          if (data.lineSent) {
            setLineSentCount(data.found ?? 0);
            setStep("line-sent");
          } else {
            setFoundPhotos(data.photos ?? []);
            setStep("results");
          }
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
    setStep("home");
    setFoundPhotos([]);
    setErrorMsg("");
    setLineSentCount(0);
    setSelectedPhotos(new Set());
    setDownloadedPhotos(new Set());
    setDownloadProgress(null);
  };

  const handleDownloadPhoto = async (photo: Photo) => {
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
          </div>,
          document.body,
        )}
    </Layout>
  );
}
