import { NextResponse } from "next/server";

export const runtime = "nodejs";

/**
 * GET /api/line/debug
 * Shows the LINE OAuth configuration (no secrets exposed).
 * Use this to verify the callback URL that must be registered
 * in LINE Developers Console → LINE Login channel → Callback URL.
 */
export async function GET() {
  const siteUrl =
    process.env.NEXT_PUBLIC_SITE_URL?.trim() || "http://localhost:3000";

  const callbackUrl = `${siteUrl}/api/line/callback`;

  return NextResponse.json({
    callbackUrl,
    channelId: process.env.LINE_LOGIN_CHANNEL_ID || "(not set)",
    channelSecretSet: Boolean(process.env.LINE_LOGIN_CHANNEL_SECRET),
    messagingTokenSet: Boolean(
      process.env.LINE_MESSAGING_CHANNEL_ACCESS_TOKEN,
    ),
    jwtSecretSet: Boolean(process.env.JWT_SECRET),
    note: "Register 'callbackUrl' exactly in LINE Developers Console → your LINE Login channel → Callback URL",
  });
}
