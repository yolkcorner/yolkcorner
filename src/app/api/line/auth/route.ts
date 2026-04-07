import { NextRequest, NextResponse } from "next/server";
import { buildLineAuthUrl, isLineConfigured } from "@/lib/line";
import { SignJWT } from "jose";

export const runtime = "nodejs";

const encoder = new TextEncoder();

/**
 * GET /api/line/auth?eventId=xxx
 * Redirects the user to LINE OAuth to authorize the photobooth app.
 * The eventId is encoded inside a short-lived signed state token to prevent CSRF.
 */
export async function GET(req: NextRequest) {
  const eventId = req.nextUrl.searchParams.get("eventId");
  if (!eventId) {
    return NextResponse.json(
      { error: "eventId is required" },
      { status: 400 },
    );
  }

  if (!isLineConfigured()) {
    return NextResponse.json(
      { error: "LINE Login is not configured" },
      { status: 503 },
    );
  }

  const channelId = process.env.LINE_LOGIN_CHANNEL_ID!;
  const siteUrl =
    process.env.NEXT_PUBLIC_SITE_URL?.trim() || "http://localhost:3000";
  const jwtSecret = process.env.JWT_SECRET!;
  const redirectUri = `${siteUrl}/api/line/callback`;

  // Sign the eventId into the state parameter so it survives the redirect
  const state = await new SignJWT({ eventId })
    .setProtectedHeader({ alg: "HS256" })
    .setExpirationTime("10m")
    .sign(encoder.encode(jwtSecret));

  const authUrl = buildLineAuthUrl(channelId, redirectUri, state);
  return NextResponse.redirect(authUrl);
}
