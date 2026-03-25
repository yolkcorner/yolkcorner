"use client";

import { MotionConfig } from "framer-motion";
import { ReactNode } from "react";

export default function MotionProvider({ children }: { children: ReactNode }) {
  return (
    <MotionConfig
      transition={{
        type: "tween",
        ease: [0.12, 0.98, 0.18, 1],
        duration: 1.18,
      }}
      reducedMotion="user"
    >
      {children}
    </MotionConfig>
  );
}
