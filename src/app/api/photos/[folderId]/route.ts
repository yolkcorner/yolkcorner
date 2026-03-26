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
} from '@/lib/r2';
import { verifyToken } from '@/lib/auth';
import path from 'node:path';

const hasAdminAccess = (req: NextRequest) => {
  const token = req.cookies.get('token')?.value || '';
  const user = token ? verifyToken(token) : null;
  return user?.role === 'admin';
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
    const pageSizeParam = Number(url.searchParams.get('pageSize') || '50');
    const pageSize = Number.isFinite(pageSizeParam)
      ? Math.min(Math.max(pageSizeParam, 1), 100)
      : 50;

    /* ================= DOWNLOAD FILE ================= */
    if ((download || preview) && fileId) {
      const decodedFileId = decodeURIComponent(fileId);
      const redirectUrl = resolveR2FileUrl(decodedFileId);

      if (download) {
        const upstream = await fetch(redirectUrl, { cache: 'no-store' });
        if (!upstream.ok || !upstream.body) {
          return NextResponse.json(
            { error: 'Failed to fetch file for download' },
            { status: 502 },
          );
        }

        const fileName = path.posix.basename(decodedFileId) || 'photo.jpg';
        const contentType =
          upstream.headers.get('content-type') || 'application/octet-stream';

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

      const response = NextResponse.redirect(redirectUrl);
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

    return NextResponse.json({
      folderName: folderResult.folderName,
      files,
      nextPageToken: folderResult.nextPageToken,
    });
  } catch (error) {
    console.error('R2 API error:', error);
    return NextResponse.json(
      {
        error: 'Failed to fetch data',
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        details: (error as any)?.message || String(error),
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
        details: (error as Error)?.message || String(error),
      },
      { status: 500 }
    );
  }
}
