import { NextRequest, NextResponse } from 'next/server';
import {
  getEventPrefix,
  listDownloadPhotos,
  normalizeEventId,
  resolveR2FileUrl,
} from '@/lib/download-r2';
import {
  deleteFromR2,
  deleteMultipleFromR2,
  getR2PublicUrlError,
  isR2Configured,
  listR2Folder,
  uploadToR2,
} from '@/lib/r2';
import { verifyToken } from '@/lib/auth';
import path from 'node:path';

const hasAdminAccess = (req: NextRequest) => {
  const token = req.cookies.get('token')?.value || '';
  const user = token ? verifyToken(token) : null;
  return user?.role === 'admin';
};

const buildUniqueDestinationKey = (
  destinationPrefix: string,
  fileName: string,
  existingKeys: Set<string>,
) => {
  const normalizedPrefix = destinationPrefix.endsWith('/')
    ? destinationPrefix
    : `${destinationPrefix}/`;

  let candidate = `${normalizedPrefix}${fileName}`;
  if (!existingKeys.has(candidate)) {
    existingKeys.add(candidate);
    return candidate;
  }

  const ext = path.posix.extname(fileName);
  const base = ext ? fileName.slice(0, -ext.length) : fileName;
  let suffix = 1;

  while (true) {
    candidate = `${normalizedPrefix}${base}-${suffix}${ext}`;
    if (!existingKeys.has(candidate)) {
      existingKeys.add(candidate);
      return candidate;
    }
    suffix += 1;
  }
};

const moveKeysBetweenAlbums = async (
  sourceKeys: string[],
  destinationPrefix: string,
) => {
  const destinationExistingKeys = new Set(await listR2Folder(destinationPrefix));
  let moved = 0;

  for (const sourceKey of sourceKeys) {
    const sourceUrl = resolveR2FileUrl(sourceKey);
    const upstream = await fetch(sourceUrl, { cache: 'no-store' });
    if (!upstream.ok) {
      throw new Error(`Failed to fetch source file: ${path.posix.basename(sourceKey)}`);
    }

    const contentType =
      upstream.headers.get('content-type') || 'application/octet-stream';
    const buffer = Buffer.from(await upstream.arrayBuffer());
    const fileName = path.posix.basename(sourceKey);
    const destinationKey = buildUniqueDestinationKey(
      destinationPrefix,
      fileName,
      destinationExistingKeys,
    );

    await uploadToR2(buffer, destinationKey, contentType);
    await deleteFromR2(sourceKey);
    moved += 1;
  }

  return moved;
};

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ folderId: string }> }
) {
  try {
    if (!isR2Configured()) {
      return NextResponse.json(
        { error: 'R2 storage is not configured', files: [] },
        { status: 503 }
      );
    }

    const publicUrlError = getR2PublicUrlError();
    if (publicUrlError) {
      return NextResponse.json(
        { error: publicUrlError, files: [] },
        { status: 503 }
      );
    }

    const { folderId } = await params;
    const safeFolderId = normalizeEventId(folderId);
    const url = req.nextUrl;
    const download = url.searchParams.get('download');
    const preview = url.searchParams.get('preview');
    const fileId = url.searchParams.get('fileId');
    const pageToken = url.searchParams.get('pageToken');
    const debugOrder = url.searchParams.get('debugOrder') === '1';
    const pageSizeParam = Number(url.searchParams.get('pageSize') || '50');
    const pageSize = Number.isFinite(pageSizeParam)
      ? Math.min(Math.max(pageSizeParam, 1), 100)
      : 50;

    /* ================= DOWNLOAD FILE ================= */
    if ((download || preview) && fileId) {
      const decodedFileId = decodeURIComponent(fileId);
      const redirectUrl = resolveR2FileUrl(decodedFileId);
      const upstream = await fetch(redirectUrl, { cache: 'no-store' });

      if (!upstream.ok || !upstream.body) {
        return NextResponse.json(
          { error: 'Failed to fetch preview file' },
          { status: 502 },
        );
      }

      const contentType =
        upstream.headers.get('content-type') || 'application/octet-stream';

      if (download) {
        const fileName = path.posix.basename(decodedFileId) || 'photo.jpg';

        const response = new NextResponse(upstream.body as BodyInit, {
          status: 200,
        });

        response.headers.set('Content-Type', contentType);
        response.headers.set(
          'Content-Disposition',
          `attachment; filename="${fileName}"`,
        );
        response.headers.set('Cache-Control', 'public, max-age=3600');

        const contentLength = upstream.headers.get('content-length');
        if (contentLength) {
          response.headers.set('Content-Length', contentLength);
        }

        return response;
      }

      const response = new NextResponse(upstream.body as BodyInit, {
        status: 200,
      });
      response.headers.set('Content-Type', contentType);
      response.headers.set('Cache-Control', 'public, max-age=3600');
      return response;
    }

    /* ================= FETCH FOLDER ================= */
    if (!safeFolderId) {
      return NextResponse.json({ error: 'Missing folderId' }, { status: 400 });
    }

    const folderResult = await listDownloadPhotos(
      safeFolderId,
      pageSize,
      pageToken || undefined,
    );

    const files = folderResult.files.map((file) => ({
      id: file.key,
      name: file.name,
      type: 'image' as const,
      createdTime: file.createdTime,
      width: null,
      height: null,
      previewUrl: file.previewUrl,
      downloadUrl: file.downloadUrl,
    }));

    const response = NextResponse.json({
      folderName: folderResult.folderName,
      files,
      nextPageToken: folderResult.nextPageToken,
    });
    response.headers.set('Cache-Control', 'no-store, max-age=0');
    return response;
  } catch (error) {
    console.error('R2 API error:', error);
    return NextResponse.json(
      {
        error: 'Failed to fetch data',
      },
      { status: 500 }
    );
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ folderId: string }> }
) {
  try {
    if (!hasAdminAccess(req)) {
      return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
    }

    if (!isR2Configured()) {
      return NextResponse.json(
        { error: 'R2 storage is not configured' },
        { status: 503 }
      );
    }

    const { folderId } = await params;
    const safeFolderId = normalizeEventId(folderId);
    if (!safeFolderId) {
      return NextResponse.json({ error: 'Missing folderId' }, { status: 400 });
    }

    const targetFileId = req.nextUrl.searchParams.get('fileId');
    const folderPrefix = getEventPrefix(safeFolderId);

    if (targetFileId) {
      const decodedFileId = decodeURIComponent(targetFileId);
      if (!decodedFileId.startsWith(folderPrefix)) {
        return NextResponse.json(
          { error: 'Invalid file target' },
          { status: 400 }
        );
      }

      await deleteFromR2(decodedFileId);
      return NextResponse.json({ ok: true, deleted: 1 });
    }

    const keys = await listR2Folder(folderPrefix);
    if (!keys.length) {
      return NextResponse.json({ ok: true, deleted: 0 });
    }

    await deleteMultipleFromR2(keys);
    return NextResponse.json({ ok: true, deleted: keys.length });
  } catch (error) {
    console.error('R2 delete API error:', error);
    return NextResponse.json(
      {
        error: 'Failed to delete data',
      },
      { status: 500 }
    );
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ folderId: string }> }
) {
  try {
    if (!hasAdminAccess(req)) {
      return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
    }

    if (!isR2Configured()) {
      return NextResponse.json(
        { error: 'R2 storage is not configured' },
        { status: 503 }
      );
    }

    const { folderId } = await params;
    const sourceAlbumId = normalizeEventId(folderId);
    if (!sourceAlbumId) {
      return NextResponse.json({ error: 'Missing folderId' }, { status: 400 });
    }

    const body = await req.json().catch(() => null);
    const action = String(body?.action || '');

    if (action === 'rename-album') {
      const targetAlbumName = String(body?.targetAlbumName || '').trim();
      const targetAlbumId = normalizeEventId(targetAlbumName);

      if (!targetAlbumId) {
        return NextResponse.json(
          { error: 'Invalid target album name' },
          { status: 400 }
        );
      }

      if (targetAlbumId === sourceAlbumId) {
        return NextResponse.json(
          { error: 'Target album is the same as source album' },
          { status: 400 }
        );
      }

      const sourcePrefix = getEventPrefix(sourceAlbumId);
      const destinationPrefix = getEventPrefix(targetAlbumId);
      const sourceKeys = await listR2Folder(sourcePrefix);

      if (!sourceKeys.length) {
        return NextResponse.json(
          { error: 'No files found in source album' },
          { status: 404 }
        );
      }

      const moved = await moveKeysBetweenAlbums(sourceKeys, destinationPrefix);
      return NextResponse.json({
        ok: true,
        action,
        moved,
        newAlbumId: targetAlbumId,
      });
    }

    if (action === 'move-photos') {
      const targetAlbumId = normalizeEventId(String(body?.targetAlbumId || ''));
      const moveAll = Boolean(body?.moveAll);
      const fileIds = Array.isArray(body?.fileIds)
        ? body.fileIds.filter((item: unknown): item is string => typeof item === 'string')
        : [];

      if (!targetAlbumId) {
        return NextResponse.json(
          { error: 'Invalid target album' },
          { status: 400 }
        );
      }

      if (targetAlbumId === sourceAlbumId) {
        return NextResponse.json(
          { error: 'Target album is the same as source album' },
          { status: 400 }
        );
      }

      const sourcePrefix = getEventPrefix(sourceAlbumId);
      const destinationPrefix = getEventPrefix(targetAlbumId);

      const candidateKeys = moveAll ? await listR2Folder(sourcePrefix) : fileIds;
      const sourceKeys = candidateKeys
        .map((item: string) => decodeURIComponent(item))
        .filter((item: string) => item.startsWith(sourcePrefix));

      if (!sourceKeys.length) {
        return NextResponse.json(
          { error: 'No files selected for move' },
          { status: 400 }
        );
      }

      const moved = await moveKeysBetweenAlbums(sourceKeys, destinationPrefix);
      return NextResponse.json({
        ok: true,
        action,
        moved,
        targetAlbumId,
      });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error) {
    console.error('R2 patch API error:', error);
    return NextResponse.json(
      {
        error: 'Failed to update album',
      },
      { status: 500 }
    );
  }
}
