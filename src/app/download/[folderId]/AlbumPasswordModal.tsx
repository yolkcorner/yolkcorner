"use client";
import { useState, useRef, useEffect } from "react";

type AlbumPasswordModalProps = {
  onSubmitAction: (password: string) => void;
  onCloseAction: () => void;
  isTh?: boolean;
  error?: string;
};

export default function AlbumPasswordModal({
  onSubmitAction,
  onCloseAction,
  isTh = false,
  error,
}: AlbumPasswordModalProps) {
  const [values, setValues] = useState(["", "", "", ""]);
  const inputs = useRef<Array<HTMLInputElement | null>>([]);

  useEffect(() => {
    if (inputs.current[0]) inputs.current[0].focus();
  }, []);

  const handleChange = (i: number, v: string) => {
    if (!/^\d?$/.test(v)) return;
    const next = [...values];
    next[i] = v;
    setValues(next);
    if (v && i < 3 && inputs.current[i + 1]) {
      inputs.current[i + 1]?.focus();
    }
  };

  const handleKeyDown = (i: number, e: React.KeyboardEvent) => {
    if (e.key === "Backspace" && !values[i] && i > 0) {
      setValues((prev) => {
        const next = [...prev];
        next[i - 1] = "";
        return next;
      });
      inputs.current[i - 1]?.focus();
    }
    if (e.key === "Enter") {
      handleSubmit();
    }
  };

  const handleSubmit = () => {
    const password = values.join("");
    onSubmitAction(password);
  };

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg p-6 w-full max-w-sm shadow-lg flex flex-col items-center">
        <h2 className="text-base md:text-lg font-semibold mb-4">
          {isTh ? "กรอกรหัสผ่าน 4 หลัก" : "Enter 4-digit password"}
        </h2>
        <div className="flex gap-2 md:gap-3 mb-6">
          {[0, 1, 2, 3].map((i) => (
            <input
              key={i}
              ref={(el) => {
                inputs.current[i] = el;
              }}
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              maxLength={1}
              className="w-12 h-14 md:w-14 md:h-16 text-center border rounded text-2xl font-mono"
              value={values[i]}
              onChange={(e) => handleChange(i, e.target.value)}
              onKeyDown={(e) => handleKeyDown(i, e)}
              aria-label={isTh ? `หลักที่ ${i + 1}` : `Digit ${i + 1}`}
            />
          ))}
        </div>
        {error && <div className="text-red-500 text-sm mb-2">{error}</div>}
        <div className="flex gap-3 mt-2">
          <button
            className="px-4 py-2 rounded bg-primary text-white font-semibold transition-colors duration-150 hover:bg-orange-600 focus:bg-orange-700"
            onClick={handleSubmit}
          >
            {isTh ? "ยืนยัน" : "Confirm"}
          </button>
          <button
            className="px-4 py-2 rounded bg-gray-200 text-gray-700 transition-colors duration-150 hover:bg-gray-300 focus:bg-gray-400"
            onClick={onCloseAction}
          >
            {isTh ? "ยกเลิก" : "Cancel"}
          </button>
        </div>
      </div>
    </div>
  );
}
