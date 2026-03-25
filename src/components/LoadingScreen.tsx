"use client";

import { motion, AnimatePresence } from "framer-motion";
import Image from "next/image";
import { useLoading } from "@/context/LoadingContext";
import { getCachebustedUrl } from "@/lib/utils";
import { useSiteContent } from "@/hooks/use-site-content";

export default function LoadingScreen() {
  const { isLoading } = useLoading();
  const { content } = useSiteContent();

  return (
    <AnimatePresence>
      {isLoading && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
          className="fixed inset-0 bg-primary z-[9999] flex items-center justify-center"
        >
          <motion.div
            animate={{ scale: [0.8, 1.1, 0.8] }}
            transition={{
              duration: 2,
              repeat: Infinity,
              ease: "easeInOut",
            }}
          >
            <Image
              src={getCachebustedUrl(content?.branding?.logoUrl || "/logo.png")}
              alt="Loading"
              width={120}
              height={120}
              unoptimized
              className="h-auto w-auto max-w-32"
              priority
            />
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
