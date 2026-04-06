import { NextResponse } from "next/server";
import { getR2PublicUrlError, isR2Configured } from "@/lib/r2";
import { listDownloadFolders } from "@/lib/download-r2";

export async function GET() {
  try {
    if (!isR2Configured()) {
      return NextResponse.json(
        { error: "R2 storage is not configured", files: [] },
        { status: 503 },
      );
    }

    const publicUrlError = getR2PublicUrlError();
    if (publicUrlError) {
      return NextResponse.json(
        { error: publicUrlError, files: [] },
        { status: 503 },
      );
    }

    const folders = await listDownloadFolders();
    const files = folders.map((folder) => ({
      id: folder.id,
      name: folder.name,
      type: "folder" as const,
      createdTime: null,
      coverUrl: folder.coverUrl,
      previewUrl: null,
      downloadUrl: null,
    }));

    return NextResponse.json({
      folderName: "Export",
      files,
    });
  } catch (error) {
    console.error("R2 root API error:", error);
    return NextResponse.json(
      {
        error: "Failed to fetch export folder",
      },
      { status: 500 },
    );
  }
}
