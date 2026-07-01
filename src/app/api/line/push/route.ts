import { NextRequest, NextResponse } from "next/server";
import { jwtVerify } from "jose";
import { pushPhotosToLine, isLineConfigured } from "@/lib/line";

export const runtime = "nodejs";

const encoder = new TextEncoder();

/**
 * POST /api/line/push
 * Body: { session?: string, photos: string[] }
 * Verifies the session JWT to obtain the LINE user id, then pushes photos.
 */
export async function POST(req: NextRequest) {
  if (!isLineConfigured()) {
    return NextResponse.json({ error: "LINE ยังไม่ได้ตั้งค่า" }, { status: 503 });
  }

  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid request body" }, { status: 400 });
  }

  const sessionCookie = req.cookies.get("photobooth_session")?.value;
  const sessionFromBody = body?.session as string | undefined;
  const sessionToken = sessionFromBody ?? sessionCookie ?? null;

  if (!sessionToken) {
    return NextResponse.json({ error: "ไม่พบ session LINE" }, { status: 401 });
  }

  try {
    const { payload } = await jwtVerify(sessionToken, encoder.encode(process.env.JWT_SECRET!));
    const lineUserId = payload.lineUserId as string | undefined;
    if (!lineUserId) throw new Error("invalid session payload");

    const photos = Array.isArray(body.photos) ? (body.photos as string[]) : [];
    if (!photos.length) {
      return NextResponse.json({ error: "no photos provided" }, { status: 400 });
    }

    await pushPhotosToLine(process.env.LINE_MESSAGING_CHANNEL_ACCESS_TOKEN!, lineUserId, photos, payload.displayName as string);

    return NextResponse.json({ sent: photos.length });
  } catch (err: unknown) {
    console.error("[line/push] error:", err);
    return NextResponse.json({ error: "ไม่สามารถส่งไปยัง LINE ได้" }, { status: 500 });
  }
}
