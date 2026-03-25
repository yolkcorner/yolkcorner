import { NextRequest, NextResponse } from "next/server";
import { readSiteContent, writeSiteContent } from "@/lib/site-content-server";
import { SiteContent } from "@/lib/site-content-types";
import { extractR2Key, deleteMultipleFromR2, listR2Folder } from "@/lib/r2";

export const runtime = "nodejs";

const collectR2Keys = (content: SiteContent) => {
  const keys = new Set<string>();

  const pushUrl = (url: string | null | undefined) => {
    const key = extractR2Key(url ?? null);
    if (key) keys.add(key);
  };

  pushUrl(content.branding.logoUrl);
  pushUrl(content.hero.backgroundUrl);
  for (const slide of content.hero.slides || []) {
    pushUrl(slide.backgroundUrl);
  }

  for (const member of content.about.members) {
    pushUrl(member.imageUrl);
  }

  for (const category of content.services.categories) {
    pushUrl(category.coverUrl);
  }

  for (const category of content.portfolio.categories) {
    pushUrl(category.coverUrl);
  }

  for (const album of content.portfolio.albums) {
    pushUrl(album.coverUrl);
    for (const imageUrl of album.images) {
      pushUrl(imageUrl);
    }
  }

  for (const item of content.news.items) {
    pushUrl(item.imageUrl);
  }

  for (const item of content.story.items) {
    pushUrl(item.imageUrl);
    for (const imageUrl of item.images || []) {
      pushUrl(imageUrl);
    }
  }

  for (const item of content.openingModals || []) {
    pushUrl(item.imageUrl);
  }

  return keys;
};

const collectAlbumIds = (content: SiteContent) =>
  new Set(content.portfolio.albums.map((album) => album.id));

const getErrorDetails = (error: unknown) => {
  if (error instanceof Error) {
    return error.message;
  }

  return String(error);
};

const cleanupRemovedR2Assets = async (
  previousContent: SiteContent,
  nextContent: SiteContent,
) => {
  const oldKeys = collectR2Keys(previousContent);
  const newKeys = collectR2Keys(nextContent);
  const removedKeys = Array.from(oldKeys).filter((key) => !newKeys.has(key));

  if (removedKeys.length > 0) {
    await deleteMultipleFromR2(removedKeys);
  }

  const oldAlbumIds = collectAlbumIds(previousContent);
  const newAlbumIds = collectAlbumIds(nextContent);
  const removedAlbumIds = Array.from(oldAlbumIds).filter((albumId) => !newAlbumIds.has(albumId));

  for (const albumId of removedAlbumIds) {
    const prefix = `portfolio/${albumId}/`;
    const keys = await listR2Folder(prefix);
    if (keys.length > 0) {
      await deleteMultipleFromR2(keys);
    }
  }
};

export async function GET() {
  try {
    const content = await readSiteContent();
    const response = NextResponse.json({ content });
    // Prevent caching of content to ensure logo updates are visible immediately
    response.headers.set("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
    response.headers.set("Pragma", "no-cache");
    response.headers.set("Expires", "0");
    return response;
  } catch (error) {
    console.error("Read content error:", error);
    return NextResponse.json(
      {
        code: "content_read_failed",
        error: "Failed to load content",
        details: getErrorDetails(error),
      },
      { status: 500 },
    );
  }
}

export async function PUT(req: NextRequest) {
  try {
    const { content } = (await req.json()) as { content?: SiteContent };
    if (!content) {
      return NextResponse.json({ error: "Missing content" }, { status: 400 });
    }

    const previousContent = await readSiteContent();

    await writeSiteContent(content);
    const saved = await readSiteContent();

    try {
      await cleanupRemovedR2Assets(previousContent, saved);
    } catch (cleanupError) {
      console.error("R2 cleanup warning:", cleanupError);
    }

    const response = NextResponse.json({ ok: true, content: saved });
    // Prevent caching of content updates
    response.headers.set("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
    response.headers.set("Pragma", "no-cache");
    response.headers.set("Expires", "0");
    return response;
  } catch (error) {
    console.error("Write content error:", error);
    return NextResponse.json(
      {
        code: "content_write_failed",
        error: "Failed to save content",
        details: getErrorDetails(error),
      },
      { status: 500 },
    );
  }
}
