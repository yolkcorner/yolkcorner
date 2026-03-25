import { NextRequest, NextResponse } from 'next/server';
import { readSiteContent, writeSiteContent } from '@/lib/site-content-server';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ albumId: string }> }
) {
  const { albumId } = await params;
  const content = await readSiteContent();
  const album = content.portfolio.albums.find((item) => item.id === albumId);
  if (!album) {
    return NextResponse.json({ error: 'Album not found' }, { status: 404 });
  }
  return NextResponse.json({ album });
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ albumId: string }> }
) {
  const { albumId } = await params;
  const content = await readSiteContent();
  const before = content.portfolio.albums.length;
  content.portfolio.albums = content.portfolio.albums.filter(
    (item) => item.id !== albumId,
  );

  if (before === content.portfolio.albums.length) {
    return NextResponse.json({ error: 'Album not found' }, { status: 404 });
  }

  await writeSiteContent(content);
  return NextResponse.json({ ok: true });
}
