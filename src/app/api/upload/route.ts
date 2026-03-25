import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';
import {
  getR2PublicUrlError,
  isR2Configured,
  uploadToR2,
} from '@/lib/r2';
import { DOWNLOAD_EVENTS_PREFIX, normalizeEventId } from '@/lib/download-r2';
import { publishEventUpdate } from '@/lib/event-updates';
import path from 'node:path';

export const runtime = 'nodejs';

const allowedMime = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/avif',
]);

const extFromMime: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/avif': 'avif',
};

const sanitizeFileName = (value: string, fallbackExt: string) => {
  const parsed = path.parse(value);
  const name = parsed.name
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-_]/g, '') || `photo-${Date.now()}`;
  const ext = (parsed.ext || '').toLowerCase();
  const normalizedExt = ext || `.${fallbackExt}`;
  return `${name}${normalizedExt}`;
};

const hasUploadAccess = (req: NextRequest) => {
  const token = req.cookies.get('token')?.value || '';
  const user = token ? verifyToken(token) : null;
  if (user?.role === 'admin') return true;

  const expectedToken = process.env.PHOTOBOOTH_UPLOAD_TOKEN?.trim();
  if (!expectedToken) {
    return process.env.NODE_ENV !== 'production';
  }

  const providedToken = req.headers.get('x-upload-token')?.trim();
  return Boolean(providedToken && providedToken === expectedToken);
};

export async function POST(req: NextRequest) {
  if (!hasUploadAccess(req)) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  if (!isR2Configured()) {
    return NextResponse.json(
      { error: 'R2 storage is not configured' },
      { status: 503 }
    );
  }

  const publicUrlError = getR2PublicUrlError();
  if (publicUrlError) {
    return NextResponse.json(
      { error: publicUrlError },
      { status: 503 }
    );
  }

  try {
    const formData = await req.formData();
    const file = formData.get('file');
    const filenameRaw = formData.get('filename');
    const eventRaw = formData.get('event');

    if (!(file instanceof File)) {
      return NextResponse.json({ error: 'no file provided' }, { status: 400 });
    }

    if (!allowedMime.has(file.type)) {
      return NextResponse.json({ error: 'unsupported file type' }, { status: 400 });
    }

    const maxMb = 20;
    if (file.size > maxMb * 1024 * 1024) {
      return NextResponse.json(
        { error: `file too large (max ${maxMb}MB)` },
        { status: 400 }
      );
    }

    const eventId = normalizeEventId(
      typeof eventRaw === 'string' ? eventRaw : 'event-unknown',
    );

    const extFromType = extFromMime[file.type] || 'jpg';
    const incomingName =
      typeof filenameRaw === 'string' && filenameRaw.trim().length > 0
        ? filenameRaw
        : file.name;
    const safeFileName = sanitizeFileName(incomingName, extFromType);

    const key = `${DOWNLOAD_EVENTS_PREFIX}/${eventId}/${safeFileName}`;
    const buffer = Buffer.from(await file.arrayBuffer());
    const url = await uploadToR2(buffer, key, file.type);
    publishEventUpdate(eventId);

    return NextResponse.json({
      ok: true,
      key,
      url,
      event: eventId,
      fileName: safeFileName,
    });
  } catch (error: unknown) {
    console.error('Upload API error:', error);
    return NextResponse.json({ error: 'upload failed' }, { status: 500 });
  }
}
