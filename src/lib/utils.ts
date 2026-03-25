import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

// utility helpers
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Return a safe image URL fallback when source is missing.
 */
export function getCachebustedUrl(url: string | null | undefined): string {
  if (!url) return "/logo.png";
  return url;
}
