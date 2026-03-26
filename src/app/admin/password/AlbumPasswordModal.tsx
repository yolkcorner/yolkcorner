import { useRef, useState, useEffect } from "react";
import { useLang } from "@/lib/i18n";
import { PortfolioAlbum } from "@/lib/site-content-types";
import Image from "next/image";

interface AlbumPasswordModalProps {
  album: PortfolioAlbum;
  onClose: () => void;
  onSave: (password: string | undefined) => void;
}

export default function AlbumPasswordModal({
  album,
  onClose,
  onSave,
}: AlbumPasswordModalProps) {
  const { t } = useLang();
  const [digits, setDigits] = useState<string[]>(
    album.password ? album.password.split("").slice(0, 4) : ["", "", "", ""],
  );
  const [error, setError] = useState("");
  const inputsRef = useRef<Array<HTMLInputElement | null>>([]);

  // Sync digits with album.password only if it changes
  useEffect(() => {
    const pwd = album.password
      ? album.password.split("").slice(0, 4)
      : ["", "", "", ""];
    if (digits.join("") !== pwd.join("")) {
      setDigits(pwd);
      setTimeout(() => inputsRef.current[0]?.focus(), 100);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [album.password]);

  const handleChange = (idx: number, value: string) => {
    if (!/^\d?$/.test(value)) return;
    const next = [...digits];
    next[idx] = value;
    setDigits(next);
    setError("");
    if (value && idx < 3) {
      inputsRef.current[idx + 1]?.focus();
    }
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    const pasted = e.clipboardData
      .getData("text")
      .replace(/\D/g, "")
      .slice(0, 4);
    if (pasted.length === 4) {
      setDigits(pasted.split(""));
      setTimeout(() => inputsRef.current[3]?.focus(), 50);
    }
  };

  const handleSave = () => {
    const password = digits.join("");
    if (password && password.length < 4) {
      setError(
        t.albumPasswordModal?.errorIncomplete ?? "กรุณากรอกให้ครบ 4 หลัก",
      );
      return;
    }
    onSave(password || undefined);
  };

  const isComplete = digits.every((digit) => digit.length === 1);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/55 backdrop-blur-sm px-4">
      <div className="relative w-full max-w-md overflow-hidden rounded-2xl border border-[#f3e1cc] bg-white/95 shadow-[0_20px_70px_rgba(0,0,0,0.3)] backdrop-blur-xl">
        <button
          className="absolute right-4 top-4 inline-flex h-8 w-8 items-center justify-center rounded-full border border-black/10 bg-white text-gray-500 transition hover:scale-105 hover:text-black"
          onClick={onClose}
          aria-label={t.albumPasswordModal?.closeAria ?? "ปิด"}
        >
          ×
        </button>
        <div className="flex flex-col items-center px-6 pb-6 pt-8 sm:px-8">
          <div className="mb-4 rounded-xl border border-black/10 p-1 shadow-sm">
            <Image
              src={album.coverUrl || "/logo.png"}
              alt={album.name}
              width={108}
              height={108}
              className="h-38 w-60 rounded-lg object-cover"
              unoptimized
            />
          </div>

          <p className="text-xs font-semibold tracking-[0.12em] text-orange-600 uppercase">
            {t.albumPasswordModal?.title ?? "Download Password"}
          </p>
          <h3 className="mt-1 text-center text-xl font-semibold text-gray-900">
            {album.name}
          </h3>
          <p className="mt-1 text-center text-sm text-gray-500">
            {t.albumPasswordModal?.subtitle ??
              "ตั้งรหัสผ่าน 4 หลักสำหรับอัลบั้มนี้"}
          </p>

          <div className="mt-5 flex gap-2.5">
            {digits.map((digit, i) => (
              <input
                key={i}
                ref={(el) => {
                  inputsRef.current[i] = el;
                }}
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength={1}
                className={`h-14 w-12 rounded-xl border bg-white text-center text-2xl font-semibold tabular-nums text-gray-900 shadow-sm outline-hidden transition ${
                  error
                    ? "border-red-400 ring-2 ring-red-100"
                    : digit
                      ? "border-orange-300 ring-2 ring-orange-100"
                      : "border-gray-200 focus:border-orange-400 focus:ring-2 focus:ring-orange-100"
                }`}
                value={digit}
                onChange={(e) => handleChange(i, e.target.value)}
                onPaste={handlePaste}
                aria-label={
                  t.albumPasswordModal?.digitAria?.replace(
                    "{n}",
                    String(i + 1),
                  ) ?? `รหัสหลักที่ ${i + 1}`
                }
                onKeyDown={(e) => {
                  if (e.key === "Backspace" && !digits[i] && i > 0) {
                    setDigits((d) => {
                      const next = [...d];
                      next[i - 1] = "";
                      return next;
                    });
                    setTimeout(() => inputsRef.current[i - 1]?.focus(), 0);
                  }
                  if (e.key === "Enter") handleSave();
                }}
              />
            ))}
          </div>

          <div className="mt-3 min-h-5 text-center text-sm">
            {error ? (
              <span className="text-red-500">{error}</span>
            ) : (
              <span className="text-gray-400">
                {t.albumPasswordModal?.hint ?? "กรอกตัวเลข 0-9 เท่านั้น"}
              </span>
            )}
          </div>

          <div className="mt-4 grid w-full grid-cols-2 gap-3">
            <button
              className="inline-flex h-11 items-center justify-center rounded-lg border border-gray-300 bg-white px-4 text-sm font-medium text-gray-700 transition hover:bg-gray-50"
              onClick={onClose}
            >
              {t.common?.cancel ?? "ยกเลิก"}
            </button>
            <button
              className="inline-flex h-11 items-center justify-center rounded-lg bg-linear-to-r from-orange-500 to-amber-500 px-4 text-sm font-semibold text-white shadow-[0_8px_20px_rgba(245,120,31,0.35)] transition hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-50"
              onClick={handleSave}
              disabled={!isComplete && digits.join("").length > 0}
            >
              {t.albumPasswordModal?.save ?? "บันทึก"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
