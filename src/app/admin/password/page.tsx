"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import AdminSectionLayout from "@/components/admin/AdminSectionLayout";
import { useLang } from "@/lib/i18n";
import { SiteContent } from "@/lib/site-content-types";
import { defaultSiteContent } from "@/lib/site-content-types";
import AlbumPasswordModal from "./AlbumPasswordModal";

type DownloadAlbum = {
  id: string;
  name: string;
  type: "folder";
  coverUrl?: string | null;
  createdTime?: string;
};

const getActivePasswordMap = (
  current: SiteContent,
  activeAlbums: DownloadAlbum[],
) => {
  const activeIds = new Set(activeAlbums.map((album) => album.id));
  const entries = Object.entries(current.downloadPasswords || {}).filter(
    ([id]) => activeIds.has(id),
  );
  return Object.fromEntries(entries) as Record<string, string | undefined>;
};

export default function AdminPasswordPage() {
  const { lang } = useLang();
  const isTh = lang === "th";

  const [content, setContent] = useState<SiteContent>(defaultSiteContent);
  const [albums, setAlbums] = useState<DownloadAlbum[]>([]);
  const [selectedAlbum, setSelectedAlbum] = useState<DownloadAlbum | null>(
    null,
  );
  const [showModal, setShowModal] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const initialize = async () => {
      try {
        const [contentRes, photosRes] = await Promise.all([
          fetch("/api/content"),
          fetch("/api/photos"),
        ]);

        const contentData = await contentRes.json();
        const photosData = await photosRes.json();

        const loadedContent =
          contentData?.content && typeof contentData.content === "object"
            ? (contentData.content as SiteContent)
            : defaultSiteContent;

        const folders = Array.isArray(photosData?.files)
          ? photosData.files.filter(
              (item: DownloadAlbum) => item.type === "folder",
            )
          : [];

        setAlbums(folders);

        const activeMap = getActivePasswordMap(loadedContent, folders);
        const originalKeys = Object.keys(loadedContent.downloadPasswords || {});
        const activeKeys = Object.keys(activeMap);
        const hasStaleEntries = originalKeys.length !== activeKeys.length;

        if (hasStaleEntries) {
          const cleanedContent = {
            ...loadedContent,
            downloadPasswords: activeMap,
          };
          setContent(cleanedContent);
          await fetch("/api/content", {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ content: cleanedContent }),
          });
          return;
        }

        setContent(loadedContent);
      } catch (error) {
        console.error("Failed to initialize download password admin:", error);
      } finally {
        setLoading(false);
      }
    };

    initialize();
  }, []);

  const handleAlbumClick = (album: DownloadAlbum) => {
    setSelectedAlbum(album);
    setShowModal(true);
  };

  const handleModalClose = () => {
    setShowModal(false);
    setSelectedAlbum(null);
  };

  // Save password for a download album (by albumId)
  const handleSavePassword = async (
    albumId: string,
    newPassword: string | undefined,
  ) => {
    const activePasswordMap = getActivePasswordMap(content, albums);

    // Prevent duplicate password (except for empty)
    if (
      newPassword &&
      Object.entries(activePasswordMap).some(
        ([id, pwd]) => pwd === newPassword && id !== albumId,
      )
    ) {
      alert(
        isTh
          ? "รหัสนี้ถูกใช้กับอัลบัมอื่นแล้ว"
          : "This password is already used by another album.",
      );
      return;
    }
    const nextContent = {
      ...content,
      downloadPasswords: {
        ...activePasswordMap,
        [albumId]: newPassword || undefined,
      },
    };
    setContent(nextContent);
    setShowModal(false);
    setSelectedAlbum(null);
    await fetch("/api/content", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content: nextContent }),
    });
  };

  return (
    <AdminSectionLayout
      title={
        isTh ? "กำหนดรหัสผ่านอัลบัมดาวน์โหลด" : "Set Download Album Passwords"
      }
      description={
        isTh
          ? "ตั้งรหัสผ่าน 4 หลักสำหรับแต่ละอัลบัมดาวน์โหลด รหัสผ่านว่าง = ไม่ต้องล็อก"
          : "Set 4-digit password for each download album. Empty = no password."
      }
    >
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-6">
        {loading ? (
          <div className="col-span-3 text-center py-10">Loading albums...</div>
        ) : albums.length === 0 ? (
          <div className="col-span-3 text-center py-10">No albums found.</div>
        ) : (
          albums.map((album) => {
            const password = content.downloadPasswords?.[album.id];
            return (
              <div
                key={album.id}
                className="rounded-lg bg-card p-4 flex flex-col items-center cursor-pointer hover:bg-card/50 transition-colors drop-shadow-[-2px_2px_4px_rgba(0,0,0,0.25)]"
                onClick={() => handleAlbumClick(album)}
              >
                <Image
                  src={album.coverUrl || "/logo.png"}
                  alt={album.name}
                  width={160}
                  height={128}
                  className="w-60 h-40 object-cover rounded mb-2"
                />
                <div className="font-semibold text-lg mb-1 mb-4">
                  {album.name}
                </div>
                <div className="flex gap-2">
                  {[0, 1, 2, 3].map((i) => (
                    <input
                      key={i}
                      type="text"
                      value={password?.[i] || ""}
                      readOnly
                      className="w-8 h-10 text-center rounded bg-gray-50 text-xl font-mono drop-shadow-[-2px_2px_4px_rgba(0,0,0,0.25)]"
                      maxLength={1}
                      tabIndex={-1}
                    />
                  ))}
                </div>
                <div className="text-xs text-muted-foreground mt-4">
                  {password
                    ? isTh
                      ? "ตั้งรหัสแล้ว"
                      : "Password set"
                    : isTh
                      ? "ยังไม่ตั้งรหัส"
                      : "No password"}
                </div>
              </div>
            );
          })
        )}
      </div>
      {showModal && selectedAlbum && (
        <AlbumPasswordModal
          album={{
            id: selectedAlbum.id,
            categoryId: "",
            name: selectedAlbum.name,
            coverUrl: selectedAlbum.coverUrl || "",
            topText: "",
            images: [],
            password: content.downloadPasswords?.[selectedAlbum.id],
          }}
          onClose={handleModalClose}
          onSave={(newPassword) =>
            handleSavePassword(selectedAlbum.id, newPassword)
          }
        />
      )}
    </AdminSectionLayout>
  );
}
