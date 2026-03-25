import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';
import { listR2Folder, deleteMultipleFromR2 } from '@/lib/r2';

export const runtime = 'nodejs';

export async function GET(req: NextRequest) {
  const token = req.cookies.get('token')?.value || '';
  const user = verifyToken(token);
  if (!user || user.role !== 'admin') {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const folder = req.nextUrl.searchParams.get('folder') || '';
  try {
    const keys = await listR2Folder(folder);
    return NextResponse.json({ ok: true, data: keys });
  } catch (e: unknown) {
    console.error('listR2Folder error', e);
    return NextResponse.json({ error: 'failed' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const token = req.cookies.get('token')?.value || '';
  const user = verifyToken(token);
  if (!user || user.role !== 'admin') {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  try {
    const body = await req.json();
    const keys = Array.isArray(body?.publicIds)
      ? body.publicIds.filter((item: unknown) => typeof item === 'string' && item.trim().length > 0)
      : [];
    const prefixes = Array.isArray(body?.prefixes)
      ? body.prefixes.filter((item: unknown) => typeof item === 'string' && item.trim().length > 0)
      : [];

    if (keys.length === 0 && prefixes.length === 0) {
      return NextResponse.json({ error: 'nothing to delete' }, { status: 400 });
    }

    const results: Array<{ type: 'keys' | 'prefix'; target: string; ok: boolean }> = [];

    if (keys.length > 0) {
      await deleteMultipleFromR2(keys);
      results.push({ type: 'keys', target: `${keys.length} items`, ok: true });
    }

    for (const prefix of prefixes) {
      const prefixKeys = await listR2Folder(prefix);
      if (prefixKeys.length > 0) {
        await deleteMultipleFromR2(prefixKeys);
      }
      results.push({ type: 'prefix', target: prefix, ok: true });
    }

    return NextResponse.json({ ok: true, results });
  } catch (e: unknown) {
    console.error('R2 cleanup error', e);
    return NextResponse.json({ error: 'cleanup failed' }, { status: 500 });
  }
}
