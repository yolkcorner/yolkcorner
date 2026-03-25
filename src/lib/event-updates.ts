const folderVersions = new Map<string, number>();
const folderListeners = new Map<string, Set<(version: number) => void>>();

export function getEventVersion(folderId: string): number {
  return folderVersions.get(folderId) || 0;
}

export function publishEventUpdate(folderId: string): number {
  const nextVersion = getEventVersion(folderId) + 1;
  folderVersions.set(folderId, nextVersion);

  const listeners = folderListeners.get(folderId);
  if (!listeners) return nextVersion;

  for (const listener of listeners) {
    try {
      listener(nextVersion);
    } catch {
      // Ignore listener errors to keep broadcast healthy.
    }
  }

  return nextVersion;
}

export function subscribeEventUpdates(
  folderId: string,
  listener: (version: number) => void,
): () => void {
  const listeners = folderListeners.get(folderId) || new Set<(version: number) => void>();
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
