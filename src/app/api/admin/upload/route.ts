import { NextRequest, NextResponse } from "next/server";
import { verifyToken } from "@/lib/auth";
import {
  deleteFromR2,
  extractR2Key,
  getR2PublicUrlError,
  isR2Configured,
  isR2UrlReachable,
  uploadToR2,
} from "@/lib/r2";
import path from "node:path";

export const runtime = "nodejs";

const allowedMime = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/avif",
]);

const extFromMime: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/avif": "avif",
};

export async function POST(req: NextRequest) {
  const token = req.cookies.get("token")?.value || "";
  const user = verifyToken(token);
  if (!user || user.role !== "admin") {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  if (!isR2Configured()) {
    return NextResponse.json(
      { error: "R2 storage is not configured" },
      { status: 503 },
    );
  }

  const publicUrlError = getR2PublicUrlError();
  if (publicUrlError) {
    return NextResponse.json(
      { error: publicUrlError },
      { status: 503 },
    );
  }

  try {
    const formData = await req.formData();
    const file = formData.get("file");
    const folder = String(
      formData.get("folder") || "yolk-corner/content-manager",
    );
    const publicIdRaw = formData.get("publicId");
    const deletePublicIdRaw = formData.get("deletePublicId");

    const publicId =
      typeof publicIdRaw === "string" && publicIdRaw.trim().length > 0
        ? publicIdRaw.trim()
        : undefined;
    const deletePublicId =
      typeof deletePublicIdRaw === "string" &&
      deletePublicIdRaw.trim().length > 0
        ? deletePublicIdRaw.trim()
        : undefined;

    if (!(file instanceof File)) {
      return NextResponse.json({ error: "Missing file" }, { status: 400 });
    }

    if (!allowedMime.has(file.type)) {
      return NextResponse.json(
        { error: "Unsupported file type" },
        { status: 400 },
      );
    }

    const maxMb = 12;
    if (file.size > maxMb * 1024 * 1024) {
      return NextResponse.json(
        { error: `File too large (max ${maxMb}MB)` },
        { status: 400 },
      );
    }

    const ext = extFromMime[file.type] || "jpg";
    const timestamp = Date.now();

    // Build R2 key from publicId or auto-generate
    let key: string;
    if (publicId) {
      const sanitized = publicId.replace(/\s+/g, "-").toLowerCase();
      key = path.extname(sanitized) ? sanitized : `${sanitized}.${ext}`;
    } else {
      const sanitizedFolder = folder.replace(/\s+/g, "-").toLowerCase();
      key = `${sanitizedFolder}/${timestamp}.${ext}`;
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const url = await uploadToR2(buffer, key, file.type);

    const isPublicUrlReachable = await isR2UrlReachable(url);
    if (!isPublicUrlReachable) {
      return NextResponse.json(
        {
          error:
            "Upload succeeded, but the R2 public URL is not reachable. Enable bucket public access and set R2_PUBLIC_URL to an r2.dev URL or custom domain.",
        },
        { status: 503 },
      );
    }

    // Delete old file when replacing (deletePublicId can be an R2 URL or key)
    if (deletePublicId) {
      try {
        const oldKey = extractR2Key(deletePublicId) || deletePublicId;
        if (oldKey !== key) {
          await deleteFromR2(oldKey);
        }
      } catch (error) {
        console.error("Delete old R2 file failed:", error);
      }
    }

    return NextResponse.json({ url, publicId: key });
  } catch (error) {
    console.error("Upload error:", error);
    return NextResponse.json({ error: "Upload failed" }, { status: 500 });
  }
}
