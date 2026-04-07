import { NextRequest, NextResponse } from "next/server";
import { verifyToken } from "@/lib/auth";
import {
  ensureCollection,
  deleteCollection,
  getCollectionId,
  indexFacesInImage,
  isRekognitionConfigured,
} from "@/lib/rekognition";
import { listR2ObjectsPaginated, r2PublicUrl } from "@/lib/r2";
import { DOWNLOAD_EVENTS_PREFIX, normalizeEventId } from "@/lib/download-r2";
import path from "node:path";

export const runtime = "nodejs";
// Allow up to 5 minutes for large events
export const maxDuration = 300;

const IMAGE_EXTENSIONS = new Set([".jpg", ".jpeg", ".png", ".webp"]);
const FETCH_BATCH = 5;

const isImage = (key: string) =>
  IMAGE_EXTENSIONS.has(path.posix.extname(key).toLowerCase());

/**
 * POST /api/face/index
 * Body: { eventId: string, reset?: boolean }
 *
 * Admin-only. Indexes all photos in an event folder into an AWS Rekognition
 * Collection. Each photo's R2 key is stored as a base64url ExternalImageId
 * so it can be recovered from search results without a database lookup.
 *
 * Pass reset=true to delete & recreate the collection before indexing.
 */
export async function POST(req: NextRequest) {
  const authToken = req.cookies.get("token")?.value ?? "";
  const user = authToken ? verifyToken(authToken) : null;
  if (!user || user.role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!isRekognitionConfigured()) {
    return NextResponse.json(
      { error: "AWS Rekognition is not configured" },
      { status: 503 },
    );
  }

  const body = (await req.json()) as { eventId?: string; reset?: boolean };
  const { eventId, reset = false } = body;

  if (!eventId) {
    return NextResponse.json({ error: "eventId is required" }, { status: 400 });
  }

  const safeEventId = normalizeEventId(eventId);
  const collectionId = getCollectionId(safeEventId);
  const prefix = `${DOWNLOAD_EVENTS_PREFIX}/${safeEventId}/`;

  if (reset) {
    try {
      await deleteCollection(collectionId);
    } catch {
      // Collection may not exist yet; ignore the error
    }
  }

  await ensureCollection(collectionId);

  // Collect all image keys in the event folder
  const imageKeys: string[] = [];
  let continuationToken: string | undefined;
  do {
    const result = await listR2ObjectsPaginated(
      prefix,
      200,
      continuationToken,
    );
    imageKeys.push(
      ...result.objects.filter((o) => isImage(o.key)).map((o) => o.key),
    );
    continuationToken = result.nextContinuationToken ?? undefined;
  } while (continuationToken);

  if (!imageKeys.length) {
    return NextResponse.json({
      message: "No images found in the event folder",
      indexed: 0,
      failed: 0,
      total: 0,
    });
  }

  let indexed = 0;
  let failed = 0;
  const noFace: string[] = [];

  // Process in small batches to avoid overwhelming the API
  for (let i = 0; i < imageKeys.length; i += FETCH_BATCH) {
    const batch = imageKeys.slice(i, i + FETCH_BATCH);

    await Promise.all(
      batch.map(async (r2Key) => {
        try {
          const url = r2PublicUrl(r2Key);
          const fetchRes = await fetch(url);
          if (!fetchRes.ok) {
            failed++;
            return;
          }
          const bytes = new Uint8Array(await fetchRes.arrayBuffer());

          // Encode the R2 key as base64url (max 255 chars, only safe chars)
          const externalImageId = Buffer.from(r2Key)
            .toString("base64url")
            .slice(0, 255);

          const faceIds = await indexFacesInImage(
            collectionId,
            bytes,
            externalImageId,
          );

          if (faceIds.length === 0) {
            noFace.push(r2Key);
          }
          indexed++;
        } catch {
          failed++;
        }
      }),
    );
  }

  return NextResponse.json({
    message: "Indexing complete",
    collectionId,
    total: imageKeys.length,
    indexed,
    failed,
    noFaceDetected: noFace.length,
  });
}
