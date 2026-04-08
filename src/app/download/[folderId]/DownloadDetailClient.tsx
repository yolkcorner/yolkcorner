"use client";

import * as React from "react";
import {
  ArrowLeft,
  Camera,
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
  const link = document.createElement("a");
  link.href = photo.downloadUrl;
  link.rel = "noopener noreferrer";
  document.body.appendChild(link);
  link.click();
  link.remove();
}

export default function DownloadDetailClient({
  folderId,
  folderName,
  mode,
  lineSession,
}: {
  folderId: string;
  folderName?: string;
  mode?: string;
  lineSession?: string;
}) {
  const lineMode = mode === "line";
  const { t } = useLang();

  const [step, setStep] = React.useState<Step>("home");
  const [errorMsg, setErrorMsg] = React.useState("");
  const [foundPhotos, setFoundPhotos] = React.useState<Photo[]>([]);
  const [downloadingId, setDownloadingId] = React.useState<string | null>(null);
  const [lineSentCount, setLineSentCount] = React.useState(0);
  const [cameraStream, setCameraStream] = React.useState<MediaStream | null>(
    null,
  );

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
          setLineSentCount(data.found ?? 0);
          setStep("line-sent");
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
  };

  const handleDownloadPhoto = async (photo: Photo) => {
    setDownloadingId(photo.name);
    try {
      await downloadPhoto(photo);
    } catch {
      /* silent */
    } finally {
      setDownloadingId(null);
    }
  };

  const dt = t?.downloadDetail;

  return (
    <Layout>
      {/* Back link */}
      <div className="container mx-auto px-4 pt-16">
        <Link
          href="/download"
          className="inline-flex items-center gap-2 text-sm text-primary hover:underline"
        >
          <ArrowLeft size={16} />
          {dt?.backToDownload}
        </Link>
      </div>

      {/* ── HOME ─────────────────────────────────────────── */}
      {step === "home" && (
        <section className="flex items-start justify-center px-4 pb-6 pt-3">
          <div className="w-full max-w-sm">
            <div className="overflow-hidden rounded-3xl border border-[#e3d2bf] bg-white shadow-[0_20px_60px_rgba(120,58,12,0.18)]">
              <div className="flex items-center justify-center bg-linear-to-b from-[#fff4e8] to-[#ffe8cc] py-12">
                <div className="relative flex h-36 w-36 items-center justify-center rounded-full bg-white shadow-[0_8px_30px_rgba(255,122,46,0.22)]">
                  <ScanFace
                    className="h-20 w-20 text-primary"
                    strokeWidth={1.2}
                  />
                  <span className="absolute inset-0 animate-ping rounded-full border-2 border-primary/25" />
                </div>
              </div>
              <div className="px-6 pb-8 pt-5 text-center">
                {folderName && (
                  <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-[#a07858]">
                    {folderName}
                  </p>
                )}
                <h2 className="text-2xl font-bold leading-snug text-[#2b1a10]">
                  {lineMode
                    ? (dt?.lineFaceTitle ?? "เซลฟี่เพื่อรับรูปทาง LINE")
                    : (dt?.noLineScanTitle ?? "ถ่ายเซลฟี่เพื่อรับรูป")}
                </h2>
                <p className="mt-3 text-sm leading-relaxed text-[#6f5a4b]">
                  {lineMode
                    ? (dt?.lineFaceDesc ?? "จัดใบหน้าให้อยู่ในกรอบ และเราจะส่งรูปเข้า LINE อัตโนมัติ")
                    : (dt?.noLineScanDesc ?? "จัดใบหน้าให้อยู่ในกรอบ เราจะค้นหารูปของคุณโดยอัตโนมัติ")}
                </p>
                {errorMsg && (
                  <p className="mt-3 text-xs text-red-600">{errorMsg}</p>
                )}
                {!lineMode && (
                  <a
                    href={`/api/line/auth?eventId=${encodeURIComponent(folderId)}`}
                    className="mt-7 inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-[#06C755] px-6 py-4 text-base font-bold text-white shadow-[0_6px_20px_rgba(6,199,85,0.38)] transition hover:brightness-95 active:scale-95"
                  >
                    <MessageCircle className="h-5 w-5" />
                    {dt?.lineReceiveBtn ?? "รับรูปผ่าน LINE"}
                  </a>
                )}
                <button
                  type="button"
                  onClick={startCamera}
                  className={`${lineMode ? "mt-7" : "mt-3"} inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-primary px-6 py-4 text-base font-bold text-white shadow-[0_6px_20px_rgba(255,122,46,0.35)] transition hover:brightness-95 active:scale-95`}
                >
                  <Camera className="h-5 w-5" />
                  {lineMode
                    ? (dt?.noLineCaptureBtn ?? "ถ่ายเซลฟี่")
                    : (dt?.noLineBtn ?? "ถ่ายเซลฟี่ดูรูปเอง")}
                </button>
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
          <div className="flex flex-col items-center gap-4 text-center">
            <div className="h-12 w-12 animate-spin rounded-full border-4 border-[#f3d6b8] border-t-primary" />
            <p className="font-medium text-[#2b1a10]">{dt?.noLineSearching}</p>
          </div>
        </section>
      )}

      {/* ── RESULTS ──────────────────────────────────────── */}
      {step === "results" && (
        <section className="container mx-auto px-4 py-10">
          <div className="mb-6 flex items-center justify-between gap-3">
            <h2 className="text-xl font-bold text-[#2b1a10]">
              {folderName && (
                <span className="mr-2 text-sm font-normal text-[#a07858]">
                  {folderName} —
                </span>
              )}
              {dt?.noLineFoundTitle}
            </h2>
            <button
              type="button"
              onClick={reset}
              className="inline-flex items-center gap-1.5 rounded-xl border border-[#e3d2bf] bg-white px-3 py-2 text-sm font-medium text-[#4d3a2e] transition hover:bg-[#fff4e8]"
            >
              <RefreshCw size={14} />
              {dt?.noLineTryAgain}
            </button>
          </div>

          {foundPhotos.length === 0 ? (
            <p className="text-center text-sm text-[#6f5a4b]">
              {dt?.noLineNotFound}
            </p>
          ) : (
            <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-4">
              {foundPhotos.map((photo) => (
                <div
                  key={photo.name}
                  className="overflow-hidden rounded-2xl border border-[#efddca] bg-[#fff7ee]"
                >
                  <div className="relative aspect-square">
                    <Image
                      src={photo.previewUrl}
                      alt={photo.name}
                      fill
                      unoptimized
                      className="object-cover"
                      sizes="(max-width: 640px) 50vw, 33vw"
                    />
                  </div>
                  <div className="p-3">
                    <p
                      className="mb-2 truncate text-xs text-[#6a5445]"
                      title={photo.name}
                    >
                      {photo.name}
                    </p>
                    <button
                      type="button"
                      onClick={() => handleDownloadPhoto(photo)}
                      disabled={downloadingId === photo.name}
                      className="inline-flex w-full items-center justify-center gap-1.5 rounded-xl bg-primary px-3 py-2 text-xs font-semibold text-white transition hover:brightness-95 disabled:opacity-60"
                    >
                      <Download size={13} />
                      {downloadingId === photo.name
                        ? (dt?.downloading ?? "...")
                        : (t?.common?.download ?? "Download")}
                    </button>
                  </div>
                </div>
              ))}
            </div>
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
    </Layout>
  );
}
