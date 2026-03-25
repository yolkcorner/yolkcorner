import { NewsItem } from "@/lib/site-content-types";

export const isNewsActive = (item: NewsItem, now = new Date()) => {
  if (item.alwaysActive) return true;

  if (!item.startAt && !item.endAt) return false;

  const start = item.startAt ? new Date(item.startAt) : null;
  const end = item.endAt ? new Date(item.endAt) : null;

  if (start && Number.isNaN(start.getTime())) return false;
  if (end && Number.isNaN(end.getTime())) return false;

  if (start && now < start) return false;
  if (end && now > end) return false;

  return true;
};

export const sortNewsNewestFirst = (items: NewsItem[]) =>
  [...items].sort((a, b) => {
    const aTime = new Date(a.updatedAt || a.createdAt || 0).getTime();
    const bTime = new Date(b.updatedAt || b.createdAt || 0).getTime();
    return bTime - aTime;
  });
