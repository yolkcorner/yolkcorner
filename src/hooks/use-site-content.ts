"use client";

import { useCallback, useEffect, useState } from "react";
import {
  defaultSiteContent,
  SiteContent,
} from "@/lib/site-content-types";

// Module-level cache so re-mounts (e.g. page transitions) don't flash
// the default/old logo while the fetch is in-flight.
let cachedContent: SiteContent | null = null;

export function useSiteContent() {
  const [content, setContent] = useState<SiteContent>(
    cachedContent ?? defaultSiteContent,
  );
  const [loading, setLoading] = useState(!cachedContent);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/content", { cache: "no-store" });
      if (response.ok) {
        const data = await response.json();
        if (data?.content) {
          cachedContent = data.content as SiteContent;
          setContent(cachedContent);
        }
      }
    } catch (error) {
      console.error("Failed to load site content:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return {
    content,
    setContent,
    loading,
    refresh,
  };
}
