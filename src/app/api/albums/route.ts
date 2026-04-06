import { NextRequest, NextResponse } from 'next/server';
import { readSiteContent, writeSiteContent } from '@/lib/site-content-server';
import { verifyToken } from '@/lib/auth';

const requireAdmin = (req: NextRequest) => {
  const token = req.cookies.get('token')?.value || '';
  const user = token ? verifyToken(token) : null;
  return user?.role === 'admin';
};

export async function GET(req: NextRequest) {
  const content = await readSiteContent();
  return NextResponse.json({ albums: content.portfolio.albums });
}

export async function POST(req: NextRequest) {
  if (!requireAdmin(req)) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  try {
    const { name, coverUrl, categoryId, topText } = await req.json();

    if (!name || !coverUrl || !categoryId) {
      return NextResponse.json(
        { error: 'Missing name, coverUrl, or categoryId' },
        { status: 400 }
      );
    }

    const content = await readSiteContent();
    const album = {
      id: `album-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      categoryId,
      name,
      coverUrl,
      topText: topText || '',
      images: [],
    };

    content.portfolio.albums.push(album);
    await writeSiteContent(content);

    return NextResponse.json({ album }, { status: 201 });
  } catch {
    return NextResponse.json(
      { error: 'Failed to create album' },
      { status: 500 }
    );
  }
}
