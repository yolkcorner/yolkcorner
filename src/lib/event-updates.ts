export type PhotoPayload = {
  id: string;
  name: string;
  previewUrl: string | null;
  downloadUrl: string | null;
  createdTime: string | null;
};

type Listener = (version: number, photo?: PhotoPayload) => void;

const folderVersions = new Map<string, number>();
const folderListeners = new Map<string, Set<Listener>>();

export function getEventVersion(folderId: string): number {
  return folderVersions.get(folderId) || 0;
}

export function publishEventUpdate(folderId: string, photo?: PhotoPayload): number {
  const nextVersion = getEventVersion(folderId) + 1;
  folderVersions.set(folderId, nextVersion);

  const listeners = folderListeners.get(folderId);
  if (!listeners) return nextVersion;

  for (const listener of listeners) {
    try {
      listener(nextVersion, photo);
    } catch {
      // Ignore listener errors to keep broadcast healthy.
    }
  }

  return nextVersion;
}

export function subscribeEventUpdates(
  folderId: string,
  listener: Listener,
): () => void {
  const listeners = folderListeners.get(folderId) || new Set<Listener>();
  listeners.add(listener);
  folderListeners.set(folderId, listeners);

  return () => {
    const current = folderListeners.get(folderId);
    if (!current) return;

    current.delete(listener);
    if (current.size === 0) {
      folderListeners.delete(folderId);
    }
  };
}
