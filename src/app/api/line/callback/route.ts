import { NextRequest, NextResponse } from "next/server";
import { exchangeCodeForToken, getLineProfile } from "@/lib/line";
import { SignJWT, jwtVerify } from "jose";

export const runtime = "nodejs";

const encoder = new TextEncoder();

/**
 * GET /api/line/callback?code=xxx&state=xxx
 * Handles the LINE OAuth redirect. Verifies the state, exchanges the code
 * for a user profile, creates a signed session cookie, then redirects to
 * the photobooth selfie step.
 */
export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const code = searchParams.get("code");
  const state = searchParams.get("state");
  const lineError = searchParams.get("error");

  const siteUrl =
    process.env.NEXT_PUBLIC_SITE_URL?.trim() || "http://localhost:3000";
  const jwtSecret = process.env.JWT_SECRET!;

  if (lineError) {
    return NextResponse.redirect(
      `${siteUrl}/download?error=line_denied`,
    );
  }

  if (!code || !state) {
    return NextResponse.redirect(
      `${siteUrl}/download?error=invalid_callback`,
    );
  }

  // Verify the state JWT to get the original eventId
  let eventId: string;
  try {
    const { payload } = await jwtVerify(state, encoder.encode(jwtSecret));
    eventId = payload.eventId as string;
    if (!eventId) throw new Error("Missing eventId in state");
  } catch {
    return NextResponse.redirect(
      `${siteUrl}/download?error=invalid_state`,
    );
  }

  const channelId = process.env.LINE_LOGIN_CHANNEL_ID!;
  const channelSecret = process.env.LINE_LOGIN_CHANNEL_SECRET!;
  const redirectUri = `${siteUrl}/api/line/callback`;

  let lineUserId: string;
  let displayName: string;
  try {
    const accessToken = await exchangeCodeForToken(
      code,
      channelId,
      channelSecret,
      redirectUri,
    );
    const profile = await getLineProfile(accessToken);
    lineUserId = profile.userId;
    displayName = profile.displayName;
  } catch (err) {
    console.error("[LINE callback] auth error:", err);
    return NextResponse.redirect(
      `${siteUrl}/download/${eventId}?error=line_auth_failed`,
    );
  }

  // Create a 1-hour session JWT stored in an httpOnly cookie
  const sessionToken = await new SignJWT({ lineUserId, displayName, eventId })
    .setProtectedHeader({ alg: "HS256" })
    .setExpirationTime("1h")
    .sign(encoder.encode(jwtSecret));

  // Pass the session token via URL param instead of a cookie.
  // Set-Cookie on a 3xx redirect response is unreliable on mobile browsers
  // (both iOS Safari and Android Chrome may drop it). Using a URL param is
  // universally supported and the token is short-lived + HMAC-signed.
  return NextResponse.redirect(
    `${siteUrl}/download/${eventId}?mode=line&session=${encodeURIComponent(sessionToken)}`,
  );
}
