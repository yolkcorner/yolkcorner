import { NextRequest, NextResponse } from 'next/server';
import { readSiteContent, writeSiteContent } from '@/lib/site-content-server';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ albumId: string }> }
) {
  try {
    const { albumId } = await params;
    const { imageUrl } = await req.json();

    if (!imageUrl) {
      return NextResponse.json(
        { error: 'Missing imageUrl' },
        { status: 400 }
      );
    }

    const content = await readSiteContent();
    const album = content.portfolio.albums.find((item) => item.id === albumId);

    if (!album) {
      return NextResponse.json(
        { error: 'Album not found' },
        { status: 404 }
      );
    }

    if (album.images.length >= 100) {
      return NextResponse.json(
        { error: 'Album full' },
        { status: 400 }
      );
    }

    album.images.push(imageUrl);
    await writeSiteContent(content);

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json(
      { error: 'Failed to add image' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ albumId: string }> }
) {
  try {
    const { albumId } = await params;
    const { imageUrl } = await req.json();

    if (!imageUrl) {
      return NextResponse.json(
        { error: 'Missing imageUrl' },
        { status: 400 }
      );
    }

    const content = await readSiteContent();
    const album = content.portfolio.albums.find((item) => item.id === albumId);

    if (!album) {
      return NextResponse.json(
        { error: 'Album not found' },
        { status: 404 }
      );
    }

    const before = album.images.length;
    album.images = album.images.filter((item) => item !== imageUrl);

    if (before === album.images.length) {
      return NextResponse.json(
        { error: 'Image not found' },
        { status: 404 }
      );
    }

    await writeSiteContent(content);

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json(
      { error: 'Failed to delete image' },
      { status: 500 }
    );
  }
}
