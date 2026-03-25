import { StoryItem } from "@/lib/site-content-types";

export const isStoryPublished = (item: StoryItem) => item.published;

export const sortStoryNewestFirst = (items: StoryItem[]) =>
  [...items].sort((a, b) => {
    const aTime = new Date(a.updatedAt || a.createdAt || 0).getTime();
    const bTime = new Date(b.updatedAt || b.createdAt || 0).getTime();
    return bTime - aTime;
  });
