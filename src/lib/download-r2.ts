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

const IMAGE_EXTENSIONS = new Set([".jpg", ".jpeg", ".png", ".webp", ".avif"]);

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
        coverUrl: coverKey ? r2PublicUrl(coverKey) : null,
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
): Promise<{ folderName: string; files: DownloadPhoto[]; nextPageToken: string | null }> {
  const safeFolderId = sanitizeEventSegment(folderId);
  const prefix = getEventPrefix(safeFolderId);
  const result = await listR2ObjectsPaginated(prefix, pageSize, pageToken);

  const files = result.objects
    .filter((obj) => isImageKey(obj.key))
    .map((obj) => {
      const encodedKey = encodeURIComponent(obj.key);
      const name = path.posix.basename(obj.key);
      return {
        key: obj.key,
        name,
        createdTime: obj.lastModified ? obj.lastModified.toISOString() : null,
        previewUrl: `/api/photos/${safeFolderId}?preview=1&fileId=${encodedKey}`,
        downloadUrl: `/api/photos/${safeFolderId}?download=1&fileId=${encodedKey}`,
      };
    });

  // Sort by upload time descending so newest photos appear first
  files.sort((a, b) => {
    if (a.createdTime && b.createdTime) {
      return b.createdTime.localeCompare(a.createdTime);
    }
    return 0;
  });

  return {
    folderName: toEventName(safeFolderId),
    files,
    nextPageToken: result.nextContinuationToken,
  };
}

export function resolveR2FileUrl(fileId: string): string {
  return r2PublicUrl(fileId);
}

export function normalizeEventId(eventId: string): string {
  return sanitizeEventSegment(eventId);
}
