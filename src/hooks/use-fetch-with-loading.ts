import { useCallback } from "react";
import { useLoading } from "@/context/LoadingContext";

/**
 * Hook สำหรับ wrap fetch requests โดยอัตโนมัติแสดง loading
 * @example
 * const { fetchWithLoading } = useFetchWithLoading();
 * 
 * const data = await fetchWithLoading('/api/endpoint');
 */
export function useFetchWithLoading() {
  const { showLoading, hideLoading } = useLoading();

  const fetchWithLoading = useCallback(
    async (
      url: string,
      options?: RequestInit
    ): Promise<Response> => {
      showLoading();
      try {
        const response = await fetch(url, options);
        return response;
      } finally {
        // เล็กน้อยหน่วง เพื่อแสดงการส่งข้อมูล
        setTimeout(() => hideLoading(), 300);
      }
    },
    [showLoading, hideLoading]
  );

  return { fetchWithLoading };
}
