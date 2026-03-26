"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { FloatingLabelInput } from "@/components/FloatingLabelInput";
import { useLang } from "@/lib/i18n";

type LoginErrorResponse = {
  code?: string;
  error?: string;
};

export default function AdminLoginPage() {
  const router = useRouter();
  const { t } = useLang();
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [statusHint, setStatusHint] = useState("");

  const cancel = () => {
    if (window.history.length > 1) {
      router.back();
      return;
    }
    router.push("/");
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setStatusHint("");
    setIsSubmitting(true);

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ identifier, password }),
      });

      if (res.ok) {
        router.push("/admin");
        return;
      }

      let data: LoginErrorResponse = {};
      try {
        data = (await res.json()) as LoginErrorResponse;
      } catch {
        // keep fallback text when response is not json
      }

      if (res.status === 400 || data.code === "missing_credentials") {
        setError("กรุณากรอก Username/Email และ Password ให้ครบ");
      } else if (res.status === 401 || data.code === "invalid_credentials") {
        setError("Username/Email หรือ Password ไม่ถูกต้อง");
      } else if (res.status >= 500 || data.code === "internal_error") {
        setError("ระบบมีปัญหาชั่วคราว กรุณาลองใหม่อีกครั้ง");
      } else {
        setError(data.error || t.adminLogin.loginFailed);
      }

      setStatusHint(`Login failed (HTTP ${res.status})`);
    } catch {
      setError(
        "เชื่อมต่อเซิร์ฟเวอร์ไม่ได้ กรุณาตรวจสอบอินเทอร์เน็ตแล้วลองใหม่",
      );
      setStatusHint("Network error");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="relative flex min-h-dvh items-center justify-center overflow-hidden bg-[radial-gradient(circle_at_12%_18%,rgba(255,166,77,0.45),transparent_38%),radial-gradient(circle_at_88%_14%,rgba(255,91,0,0.28),transparent_30%),linear-gradient(140deg,#f6efe6_0%,#f5f5f2_45%,#eee9e2_100%)] px-4 py-6 sm:px-6">
      <div className="pointer-events-none absolute -left-20 top-24 h-52 w-52 rounded-full bg-[#ff8a3d]/35 blur-3xl" />
      <div className="pointer-events-none absolute -right-16 bottom-20 h-56 w-56 rounded-full bg-[#ffd18f]/40 blur-3xl" />

      <div className="relative mx-auto w-full max-w-md">
        <div className="overflow-hidden rounded-3xl border border-white/50 bg-white/80 p-6 shadow-[0_20px_70px_rgba(120,58,12,0.18)] backdrop-blur-xl sm:p-8">
          <div className="mb-6 sm:mb-7">
            <p className="mb-2 inline-flex rounded-full border border-[#ff9f59]/40 bg-[#fff1df] px-3 py-1 text-xs font-semibold tracking-[0.18em] text-[#9f5624] uppercase">
              Admin Console
            </p>
            <h2 className="text-3xl font-bold leading-tight text-[#2b1a10] sm:text-[2rem]">
              {t.adminLogin.title}
            </h2>
            <p className="mt-2 text-sm text-[#6f5a4b]">
              ลงชื่อเข้าใช้เพื่อจัดการเนื้อหา ข่าว และผลงานของเว็บไซต์
            </p>
          </div>

          <form onSubmit={submit} className="space-y-4">
            {error && (
              <div className="rounded-xl border border-red-300/80 bg-red-50/90 px-4 py-3 text-sm text-red-700 shadow-sm">
                <p className="font-medium">{error}</p>
                {statusHint && (
                  <p className="mt-1 text-xs text-red-600/90">{statusHint}</p>
                )}
              </div>
            )}

            <FloatingLabelInput
              type="text"
              label={`${t.adminLogin.email} / Username`}
              value={identifier}
              onChange={(e) => setIdentifier(e.target.value)}
              className="rounded-xl border-[#e3d2bf] bg-[#f3ede5] text-[#2b1a10] focus:border-[#ff7a2e]"
              required
            />

            <div className="relative">
              <FloatingLabelInput
                type="password"
                label={t.adminLogin.password}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="rounded-xl border-[#e3d2bf] bg-[#f3ede5] text-transparent caret-transparent focus:border-[#ff7a2e] [&::-ms-reveal]:hidden [&::-ms-clear]:hidden"
                required
                autoComplete="current-password"
              />

              {password.length > 0 && (
                <div className="pointer-events-none absolute inset-x-4 top-1/2 flex -translate-y-1/2 items-center gap-2 overflow-hidden">
                  {Array.from({ length: password.length }).map((_, idx) => (
                    <Image
                      key={`mask-dot-${idx}`}
                      src="/dotForPassword.svg"
                      alt=""
                      width={20}
                      height={20}
                      className="h-5 w-5 shrink-0 opacity-100 saturate-150 contrast-125 drop-shadow-[0_1px_2px_rgba(0,0,0,0.25)]"
                      aria-hidden="true"
                    />
                  ))}
                </div>
              )}
            </div>

            <div className="grid grid-cols-1 gap-3 pt-2 sm:grid-cols-2">
              <button
                type="submit"
                disabled={isSubmitting}
                className="h-11 rounded-xl bg-linear-to-r from-[#ff8b3d] to-[#ff5b00] px-4 font-semibold text-white shadow-[0_10px_28px_rgba(255,91,0,0.35)] transition hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-70"
              >
                {isSubmitting ? "กำลังตรวจสอบ..." : t.adminLogin.login}
              </button>
              <button
                type="button"
                onClick={cancel}
                disabled={isSubmitting}
                className="h-11 rounded-xl border border-[#e1d1be] bg-white/80 px-4 font-semibold text-[#4d3a2e] transition hover:bg-[#fff3e5] disabled:cursor-not-allowed disabled:opacity-70"
              >
                {t.common.cancel}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
