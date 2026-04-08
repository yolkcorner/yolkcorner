import { NextRequest, NextResponse } from "next/server";
import { GetObjectCommand, S3Client } from "@aws-sdk/client-s3";

export const runtime = "nodejs";

/**
 * GET /api/download-proxy?key=photobooth-events/folder/file.jpg&name=file.jpg
 *
 * Server-side proxy that fetches a file from R2 and returns it with
 * Content-Disposition: attachment so the browser downloads it directly.
 * This bypasses cross-origin restrictions that prevent client-side blob fetch.
 */
export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const key = searchParams.get("key");
  const name = searchParams.get("name") || key?.split("/").pop() || "photo.jpg";

  if (!key) {
    return NextResponse.json({ error: "key is required" }, { status: 400 });
  }

  // Prevent path traversal
  const safeKey = key.replace(/\.\.\//g, "").replace(/^\/+/, "");

  const client = new S3Client({
    region: "auto",
    endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId: process.env.R2_ACCESS_KEY_ID || "",
      secretAccessKey: process.env.R2_SECRET_ACCESS_KEY || "",
    },
  });

  try {
    const command = new GetObjectCommand({
      Bucket: process.env.R2_BUCKET_NAME!,
      Key: safeKey,
    });

    const response = await client.send(command);
    const body = response.Body;

    if (!body) {
      return NextResponse.json({ error: "File not found" }, { status: 404 });
    }

    // Stream the body back with download headers
    const chunks: Uint8Array[] = [];
    for await (const chunk of body as AsyncIterable<Uint8Array>) {
      chunks.push(chunk);
    }
    const buffer = Buffer.concat(chunks);

    const contentType = response.ContentType || "image/jpeg";
    const safeName = encodeURIComponent(name);

    return new NextResponse(buffer, {
      status: 200,
      headers: {
        "Content-Type": contentType,
        "Content-Disposition": `attachment; filename="${name}"; filename*=UTF-8''${safeName}`,
        "Content-Length": buffer.length.toString(),
        "Cache-Control": "private, max-age=3600",
      },
    });
  } catch (err) {
    console.error("[download-proxy] error:", err);
    return NextResponse.json({ error: "Failed to fetch file" }, { status: 500 });
  }
}
