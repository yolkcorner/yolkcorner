import { NextRequest, NextResponse } from "next/server";
import {
  searchFacesByImage,
  getCollectionId,
  isRekognitionConfigured,
} from "@/lib/rekognition";
import { r2PublicUrl } from "@/lib/r2";
import { normalizeEventId } from "@/lib/download-r2";

export const runtime = "nodejs";

/**
 * POST /api/face/browse
 * FormData: { selfie: File, eventId: string }
 *
 * No LINE session required. Searches Rekognition and returns matching photo
 * preview URLs so the customer can download them directly.
 * Returns { found: number, photos: Array<{ previewUrl: string; downloadUrl: string; name: string }> }
 */
export async function POST(req: NextRequest) {
  if (!isRekognitionConfigured()) {
    return NextResponse.json(
      { error: "Face recognition is not configured" },
      { status: 503 },
    );
  }

  let selfieBytes: Uint8Array;
  let eventId: string;

  try {
    const formData = await req.formData();
    const selfie = formData.get("selfie") as File | null;
    const rawEventId = formData.get("eventId") as string | null;

    if (!selfie) {
      return NextResponse.json(
        { error: "selfie file is required" },
        { status: 400 },
      );
    }
    if (!rawEventId) {
      return NextResponse.json(
        { error: "eventId is required" },
        { status: 400 },
      );
    }

    selfieBytes = new Uint8Array(await selfie.arrayBuffer());
    eventId = rawEventId;
  } catch {
    return NextResponse.json(
      { error: "Failed to read request" },
      { status: 400 },
    );
  }

  const safeEventId = normalizeEventId(eventId);
  const collectionId = getCollectionId(safeEventId);

  let matches;
  try {
    matches = await searchFacesByImage(collectionId, selfieBytes);
  } catch (err: unknown) {
    if (err instanceof Error && err.name === "ResourceNotFoundException") {
      return NextResponse.json(
        { error: "This event has not been indexed yet." },
        { status: 404 },
      );
    }
    console.error("[face/browse] Rekognition error:", err);
    return NextResponse.json(
      { error: "Face recognition failed. Please try again." },
      { status: 500 },
    );
  }

  if (!matches.length) {
    return NextResponse.json({ found: 0, photos: [] });
  }

  const uniqueImageIds = [...new Set(matches.map((m) => m.externalImageId))];

  const photos = uniqueImageIds
    .map((id) => {
      try {
        const r2Key = Buffer.from(id, "base64url").toString();
        const url = r2PublicUrl(r2Key);
        const name = r2Key.split("/").pop() || "photo.jpg";
        return { previewUrl: url, downloadUrl: url, name };
      } catch {
        return null;
      }
    })
    .filter((p): p is { previewUrl: string; downloadUrl: string; name: string } =>
      Boolean(p),
    )
    .slice(0, 50);

  return NextResponse.json({ found: photos.length, photos });
}
