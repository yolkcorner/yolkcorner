import path from "node:path";
import { listR2ObjectsPaginated, listR2Prefixes, r2PublicUrl } from "@/lib/r2";

export type DownloadFolder = {
  id: string;
  name: string;
  coverUrl: string | null;
};

export type DownloadPhoto = {
  key: string;
  name: string;
  createdTime: string | null;
  previewUrl: string;
  downloadUrl: string;
};

const buildPreviewApiUrl = (folderId: string, fileKey: string) =>
  `/api/photos/${folderId}?preview=1&fileId=${encodeURIComponent(fileKey)}`;

const buildDownloadApiUrl = (folderId: string, fileKey: string) =>
  `/api/photos/${folderId}?download=1&fileId=${encodeURIComponent(fileKey)}`;

const IMAGE_EXTENSIONS = new Set([".jpg", ".jpeg", ".png", ".webp", ".avif"]);
const LIST_CACHE_TTL_MS = 0;

type CachedFolderList = {
  timestamp: number;
  objects: { key: string; lastModified: Date | null }[];
};

const folderListCache = new Map<string, CachedFolderList>();

const normalizePrefix = (value: string) => value.replace(/\\/g, "/").replace(/^\/+|\/+$/g, "");

const sanitizeEventSegment = (value: string) =>
  value
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9\-_/]/g, "")
    .replace(/-+/g, "-")
    .replace(/^[-_/]+|[-_/]+$/g, "") || "event-unknown";

export const DOWNLOAD_EVENTS_PREFIX = normalizePrefix(
  process.env.DOWNLOAD_R2_PREFIX || "photobooth-events",
);

export const getEventPrefix = (eventId: string) => {
  const safeEventId = sanitizeEventSegment(eventId);
  return `${DOWNLOAD_EVENTS_PREFIX}/${safeEventId}/`;
};

const toEventName = (eventId: string) =>
  eventId
    .split("-")
    .filter(Boolean)
    .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1))
    .join(" ") || eventId;

const isImageKey = (key: string) => {
  const ext = path.posix.extname(key).toLowerCase();
  return IMAGE_EXTENSIONS.has(ext);
};

const listFolderObjectsCached = async (prefix: string) => {
  const now = Date.now();
  const cached = folderListCache.get(prefix);
  if (cached && now - cached.timestamp < LIST_CACHE_TTL_MS) {
    return cached.objects;
  }

  const objects: { key: string; lastModified: Date | null }[] = [];
  let token: string | undefined;

  do {
    const result = await listR2ObjectsPaginated(prefix, 1000, token);
    objects.push(...result.objects.filter((obj) => isImageKey(obj.key)));
    token = result.nextContinuationToken || undefined;
  } while (token);

  folderListCache.set(prefix, { timestamp: now, objects });
  return objects;
};

export async function listDownloadFolders(): Promise<DownloadFolder[]> {
  const folders: DownloadFolder[] = [];
  let token: string | undefined;

  do {
    const result = await listR2Prefixes(`${DOWNLOAD_EVENTS_PREFIX}/`, 1000, token);

    for (const prefix of result.prefixes) {
      const trimmed = prefix.replace(/\/+$/, "");
      const eventId = trimmed.split("/").pop() || "";
      if (!eventId) continue;

      const coverResult = await listR2ObjectsPaginated(prefix, 20);
      const coverKey = coverResult.keys.find(isImageKey) || null;

      folders.push({
        id: eventId,
        name: toEventName(eventId),
        coverUrl: coverKey ? buildPreviewApiUrl(eventId, coverKey) : null,
      });
    }

    token = result.nextContinuationToken || undefined;
  } while (token);

  return folders.sort((a, b) => b.id.localeCompare(a.id));
}

export async function getDownloadFolderName(folderId: string): Promise<string | null> {
  const folders = await listDownloadFolders();
  const folder = folders.find((item) => item.id === sanitizeEventSegment(folderId));
  return folder?.name || null;
}

export async function listDownloadPhotos(
  folderId: string,
  pageSize: number,
  pageToken?: string,
): Promise<{ folderName: string; files: DownloadPhoto[]; nextPageToken: string | null; totalCount: number }> {
  const safeFolderId = sanitizeEventSegment(folderId);
  const prefix = getEventPrefix(safeFolderId);
  const allObjects = await listFolderObjectsCached(prefix);
  allObjects.sort((a, b) => {
    if (!a.lastModified && !b.lastModified) return 0;
    if (!a.lastModified) return 1;
    if (!b.lastModified) return -1;
    return b.lastModified.getTime() - a.lastModified.getTime();
  });

  const offset = Math.max(0, Number.parseInt(pageToken || "0", 10) || 0);
  const pageObjects = allObjects.slice(offset, offset + pageSize);

  const files = pageObjects
    .map((obj) => {
      const name = path.posix.basename(obj.key);
      return {
        key: obj.key,
        name,
        createdTime: obj.lastModified ? obj.lastModified.toISOString() : null,
        previewUrl: buildPreviewApiUrl(safeFolderId, obj.key),
        downloadUrl: buildDownloadApiUrl(safeFolderId, obj.key),
      };
    });

  const nextOffset = offset + pageSize;
  const nextPageToken = nextOffset < allObjects.length ? String(nextOffset) : null;

  return {
    folderName: toEventName(safeFolderId),
    files,
    nextPageToken,
    totalCount: allObjects.length,
  };
}

export function resolveR2FileUrl(fileId: string): string {
  return r2PublicUrl(fileId);
}

export function normalizeEventId(eventId: string): string {
  return sanitizeEventSegment(eventId);
}
