import { NextRequest, NextResponse } from "next/server";
import { jwtVerify } from "jose";
import {
  searchFacesByImage,
  getCollectionId,
  isRekognitionConfigured,
} from "@/lib/rekognition";
import { pushPhotosToLine, isLineConfigured } from "@/lib/line";
import { r2PublicUrl } from "@/lib/r2";
import { normalizeEventId } from "@/lib/download-r2";

export const runtime = "nodejs";

const encoder = new TextEncoder();

/**
 * POST /api/face/search
 * FormData: { selfie: File, session: string (JWT), eventId: string }
 *
 * Searches the event's Rekognition Collection for faces matching the selfie,
 * then attempts to push the matching photos to the user's LINE account.
 * Returns { found, photos, lineSent, message }.
 *
 * If the LINE push fails for any reason (user hasn't added OA, invalid token, etc.),
 * the endpoint still returns 200 with lineSent=false and the photo URLs so the
 * client can fall back to showing a download UI instead of a hard error.
 */
export async function POST(req: NextRequest) {
  // Accept session token from FormData body (URL-param flow) or cookie (legacy fallback).
  // The URL-param approach is needed because Set-Cookie on 3xx redirects is
  // unreliable on mobile browsers (iOS Safari / Android Chrome).
  const sessionCookie = req.cookies.get("photobooth_session")?.value;

  // We can't read formData twice, so we defer extraction below.
  // Instead, read formData once and pluck both the session token and the selfie.
  let lineUserId: string;
  let displayName: string;
  let eventId: string;
  let selfieBytes: Uint8Array;
  let previewOnly = false;

  try {
    const formData = await req.formData();
    const sessionFromBody = formData.get("session") as string | null;
    const sessionToken = sessionFromBody ?? sessionCookie ?? null;

    if (!sessionToken) {
      return NextResponse.json(
        { error: "ไม่พบ session LINE กรุณาล็อกอินด้วย LINE ใหม่อีกครั้ง" },
        { status: 401 },
      );
    }

    const jwtSecret = process.env.JWT_SECRET!;
    try {
      const { payload } = await jwtVerify(
        sessionToken,
        encoder.encode(jwtSecret),
      );
      lineUserId = payload.lineUserId as string;
      displayName = payload.displayName as string;
      eventId = payload.eventId as string;
      if (!lineUserId || !eventId) throw new Error("Invalid session payload");
    } catch {
      return NextResponse.json(
        { error: "Session หมดอายุ กรุณาล็อกอินด้วย LINE ใหม่อีกครั้ง" },
        { status: 401 },
      );
    }

    const selfie = formData.get("selfie") as File | null;
    previewOnly = Boolean(formData.get("preview"));
    if (!selfie) {
      return NextResponse.json(
        { error: "selfie file is required" },
        { status: 400 },
      );
    }
    selfieBytes = new Uint8Array(await selfie.arrayBuffer());
  } catch {
    return NextResponse.json(
      { error: "Failed to read request" },
      { status: 400 },
    );
  }

  if (!isRekognitionConfigured()) {
    return NextResponse.json(
      { error: "ระบบจดจำใบหน้ายังไม่ได้ตั้งค่า กรุณาติดต่อผู้จัดงาน" },
      { status: 503 },
    );
  }

  const safeEventId = normalizeEventId(eventId);
  const collectionId = getCollectionId(safeEventId);

  // Search Rekognition for matching faces
  let matches;
  try {
    matches = await searchFacesByImage(collectionId, selfieBytes);
  } catch (err: unknown) {
    if (
      err instanceof Error &&
      err.name === "ResourceNotFoundException"
    ) {
      return NextResponse.json(
        { error: "อีเวนต์นี้ยังไม่ได้ทำการ index ใบหน้า กรุณาติดต่อผู้จัดงาน" },
        { status: 404 },
      );
    }
    console.error("[face/search] Rekognition error:", err);
    return NextResponse.json(
      { error: "ระบบจดจำใบหน้าขัดข้อง กรุณาลองใหม่อีกครั้ง" },
      { status: 500 },
    );
  }

  if (!matches.length) {
    return NextResponse.json({ found: 0, lineSent: false, photos: [] });
  }

  // Deduplicate by photo (externalImageId = base64url R2 key)
  const uniqueImageIds = [...new Set(matches.map((m) => m.externalImageId))];
  const photoUrls = uniqueImageIds
    .map((id) => {
      try {
        return r2PublicUrl(Buffer.from(id, "base64url").toString());
      } catch {
        return null;
      }
    })
    .filter((u): u is string => Boolean(u))
    .slice(0, 30); // safety cap

  // Build the photos array (same shape as /api/face/browse)
  const photos = photoUrls.map((url) => ({
    previewUrl: url,
    downloadUrl: url,
    name: url.split("/").pop() ?? "photo",
  }));

  // Attempt LINE push unless caller asked for preview-only.
  // If it fails for any reason (user hasn't added OA, invalid token, network issue, etc.)
  // we still return 200 with lineSent=false so the client can fall back to the
  // download UI instead of showing an error.
  let lineSent = false;
  if (!previewOnly && isLineConfigured() && photoUrls.length > 0) {
    try {
      await pushPhotosToLine(
        process.env.LINE_MESSAGING_CHANNEL_ACCESS_TOKEN!,
        lineUserId,
        photoUrls,
        displayName,
      );
      lineSent = true;
    } catch (err) {
      console.error("[face/search] LINE push error:", err);
      // lineSent stays false — client will show download UI
    }
  }

  return NextResponse.json({
    found: photoUrls.length,
    photos,
    lineSent,
    message: lineSent
      ? `ส่ง ${photoUrls.length} รูปทาง LINE ให้คุณแล้ว! 🎉`
      : `พบ ${photoUrls.length} รูป — กดดาวน์โหลดด้านล่างได้เลย`,
  });
}
