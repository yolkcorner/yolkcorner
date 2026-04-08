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
 * FormData: { selfie: File }
 * Cookie: photobooth_session (set by /api/line/callback)
 *
 * Searches the event's Rekognition Collection for faces matching the selfie,
 * then pushes the matching photos to the user's LINE account.
 * Returns { found: number, message: string }.
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

  try {
    const formData = await req.formData();
    const sessionFromBody = formData.get("session") as string | null;
    const sessionToken = sessionFromBody ?? sessionCookie ?? null;

    if (!sessionToken) {
      return NextResponse.json(
        { error: "LINE session not found. Please log in with LINE first." },
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
        { error: "Invalid or expired session. Please log in with LINE again." },
        { status: 401 },
      );
    }

    const selfie = formData.get("selfie") as File | null;
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
      { error: "Face recognition is not configured" },
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
        {
          error:
            "This event has not been indexed yet. Please ask the organizer.",
        },
        { status: 404 },
      );
    }
    console.error("[face/search] Rekognition error:", err);
    return NextResponse.json(
      { error: "Face recognition failed. Please try again." },
      { status: 500 },
    );
  }

  if (!matches.length) {
    return NextResponse.json({
      found: 0,
      message: "ไม่พบรูปของคุณในงานนี้ หรือภาพ selfie ไม่ชัดพอ กรุณาลองใหม่",
    });
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

  // Push photos via LINE Messaging API
  if (isLineConfigured() && photoUrls.length > 0) {
    try {
      await pushPhotosToLine(
        process.env.LINE_MESSAGING_CHANNEL_ACCESS_TOKEN!,
        lineUserId,
        photoUrls,
        displayName,
      );
    } catch (err) {
      console.error("[face/search] LINE push error:", err);
      return NextResponse.json(
        {
          error:
            "พบรูปของคุณแล้ว แต่ไม่สามารถส่งทาง LINE ได้ กรุณาตรวจสอบว่าคุณได้ add LINE OA แล้ว",
        },
        { status: 502 },
      );
    }
  }

  return NextResponse.json({
    found: photoUrls.length,
    message: `ส่ง ${photoUrls.length} รูปทาง LINE ให้คุณแล้ว! 🎉`,
  });
}
