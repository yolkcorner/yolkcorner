"use client";

import { useCallback, useEffect, useState } from "react";
import {
  defaultSiteContent,
  SiteContent,
} from "@/lib/site-content-types";

export function useSiteContent() {
  const [content, setContent] = useState<SiteContent>(defaultSiteContent);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/content", { cache: "no-store" });
      if (response.ok) {
        const data = await response.json();
        if (data?.content) {
          setContent(data.content as SiteContent);
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
