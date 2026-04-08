const LINE_BASE = "https://api.line.me";
const LINE_AUTH_BASE = "https://access.line.me/oauth2/v2.1";

export interface LineProfile {
  userId: string;
  displayName: string;
  pictureUrl?: string;
}

/** Build the LINE OAuth authorization URL */
export function buildLineAuthUrl(
  channelId: string,
  redirectUri: string,
  state: string,
): string {
  const params = new URLSearchParams({
    response_type: "code",
    client_id: channelId,
    redirect_uri: redirectUri,
    state,
    scope: "profile",
  });
  return `${LINE_AUTH_BASE}/authorize?${params.toString()}`;
}

/** Exchange an authorization code for an access token */
export async function exchangeCodeForToken(
  code: string,
  channelId: string,
  channelSecret: string,
  redirectUri: string,
): Promise<string> {
  const res = await fetch(`${LINE_BASE}/oauth2/v2.1/token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "authorization_code",
      code,
      redirect_uri: redirectUri,
      client_id: channelId,
      client_secret: channelSecret,
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`LINE token exchange failed (${res.status}): ${body}`);
  }

  const data = (await res.json()) as { access_token: string };
  return data.access_token;
}

/** Fetch the LINE user's profile using their access token */
export async function getLineProfile(
  accessToken: string,
): Promise<LineProfile> {
  const res = await fetch(`${LINE_BASE}/v2/profile`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!res.ok) {
    throw new Error(`Failed to get LINE profile (${res.status})`);
  }

  return res.json() as Promise<LineProfile>;
}

/**
 * Push photo images to a LINE user via the Messaging API.
 * Sends a summary text first, then up to 30 images in batches of 5.
 * The user must have previously added the LINE Official Account as a friend.
 */
export async function pushPhotosToLine(
  channelAccessToken: string,
  userId: string,
  photoUrls: string[],
  displayName?: string,
): Promise<void> {
  if (!photoUrls.length) return;

  const greeting = displayName
    ? `สวัสดี ${displayName}! 🎉 เจอรูปของคุณ ${photoUrls.length} รูปในงาน มาแล้ว!`
    : `🎉 เจอรูปของคุณ ${photoUrls.length} รูปในงาน!`;

  await pushLineMessages(channelAccessToken, userId, [
    { type: "text", text: greeting },
  ]);

  // Batch in groups of 5 (LINE max per push call)
  for (let i = 0; i < photoUrls.length; i += 5) {
    const batch = photoUrls.slice(i, i + 5).map((url) => ({
      type: "image",
      originalContentUrl: url,
      previewImageUrl: url,
    }));
    await pushLineMessages(channelAccessToken, userId, batch);
  }
}

async function pushLineMessages(
  channelAccessToken: string,
  userId: string,
  messages: unknown[],
): Promise<void> {
  const res = await fetch(`${LINE_BASE}/v2/bot/message/push`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${channelAccessToken}`,
    },
    body: JSON.stringify({ to: userId, messages }),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`LINE push failed (${res.status}): ${body}`);
  }
}

/** True if LINE Login (OAuth) credentials are set */
export function isLoginConfigured(): boolean {
  return Boolean(
    process.env.LINE_LOGIN_CHANNEL_ID &&
      process.env.LINE_LOGIN_CHANNEL_SECRET,
  );
}

/** True if LINE Messaging API (push) credentials are set */
export function isLineConfigured(): boolean {
  return Boolean(
    process.env.LINE_LOGIN_CHANNEL_ID &&
      process.env.LINE_LOGIN_CHANNEL_SECRET &&
      process.env.LINE_MESSAGING_CHANNEL_ACCESS_TOKEN,
  );
}
