"use client";

import { InputHTMLAttributes, forwardRef } from "react";
import { cn } from "@/lib/utils";

interface FloatingLabelInputProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
  error?: string;
}

export const FloatingLabelInput = forwardRef<
  HTMLInputElement,
  FloatingLabelInputProps
>(({ label, className, error, ...props }, ref) => {
  const id = props.id || label.replace(/\s+/g, "-").toLowerCase();

  return (
    <div className="relative">
      <input
        ref={ref}
        id={id}
        placeholder=" "
        className={cn(
          "w-full bg-background border border-border px-4 py-3 text-foreground",
          "focus:outline-none focus:border-gray-900 transition-colors rounded-md peer",
          "[&:-webkit-autofill]:shadow-[inset_0_0_0px_1000px_#f3ede5] [&:-webkit-autofill]:[-webkit-text-fill-color:#2b1a10]",
          error && "border-red-500 focus:border-red-500",
          className,
        )}
        {...props}
      />
      <label
        htmlFor={id}
        className="absolute left-4 top-3 text-muted-foreground text-sm
          transition-all duration-200 
          peer-placeholder-shown:top-3 peer-placeholder-shown:text-base
          peer-focus:top-0 peer-focus:scale-75 peer-focus:-translate-y-2.5 peer-focus:bg-[#f3ede5] peer-focus:px-1
          peer-focus:text-gray-900
          peer-[:not(:placeholder-shown)]:top-0 peer-[:not(:placeholder-shown)]:scale-75 peer-[:not(:placeholder-shown)]:-translate-y-2.5 peer-[:not(:placeholder-shown)]:bg-[#f3ede5] peer-[:not(:placeholder-shown)]:px-1"
      >
        {label}
      </label>
      {error && <p className="text-xs text-red-500 mt-1">{error}</p>}
    </div>
  );
});

FloatingLabelInput.displayName = "FloatingLabelInput";
