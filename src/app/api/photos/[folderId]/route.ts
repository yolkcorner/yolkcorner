import { NextRequest, NextResponse } from 'next/server';
import {
  listDownloadPhotos,
  normalizeEventId,
  resolveR2FileUrl,
} from '@/lib/download-r2';
import { getR2PublicUrlError, isR2Configured } from '@/lib/r2';
import path from 'node:path';

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
