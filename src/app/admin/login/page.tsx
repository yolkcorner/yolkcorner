"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
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
    <div className="min-h-screen flex items-center justify-center bg-background">
      <form
        onSubmit={submit}
        className="bg-card p-8 rounded shadow-md w-full max-w-sm"
      >
        <h2 className="text-2xl font-bold mb-4">{t.adminLogin.title}</h2>
        {error && (
          <div className="mb-3 rounded-md border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-700">
            <p>{error}</p>
            {statusHint && (
              <p className="mt-1 text-xs opacity-80">{statusHint}</p>
            )}
          </div>
        )}
        <FloatingLabelInput
          type="text"
          label={`${t.adminLogin.email} / Username`}
          value={identifier}
          onChange={(e) => setIdentifier(e.target.value)}
          required
        />
        <FloatingLabelInput
          type="password"
          label={t.adminLogin.password}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="mt-4"
          required
        />
        <div className="grid grid-cols-2 gap-3">
          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full bg-[#FF5B00] text-white py-2 rounded-md drop-shadow-[-2px_2px_4px_rgba(0,0,0,0.25)]"
          >
            {isSubmitting ? "กำลังตรวจสอบ..." : t.adminLogin.login}
          </button>
          <button
            type="button"
            onClick={cancel}
            disabled={isSubmitting}
            className="w-full border border-border text-foreground py-2 rounded-md drop-shadow-[-2px_2px_4px_rgba(0,0,0,0.25)] hover:bg-secondary transition-colors"
          >
            {t.common.cancel}
          </button>
        </div>
      </form>
    </div>
  );
}
