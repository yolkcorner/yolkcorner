"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import AdminSectionLayout from "@/components/admin/AdminSectionLayout";
import { useLang } from "@/lib/i18n";
import {
  EllipsisVertical,
  Images,
  RefreshCw,
  ScanFace,
  Search,
  Trash2,
  X,
} from "lucide-react";

type DownloadAlbum = {
  id: string;
  name: string;
  type: "folder";
  coverUrl?: string | null;
};

type DownloadPhoto = {
  id: string;
  name: string;
  type: "image";
  previewUrl?: string | null;
  downloadUrl?: string | null;
};

type ConfirmState =
  | { type: "delete-album"; album: DownloadAlbum }
  | { type: "delete-photo"; album: DownloadAlbum; photo: DownloadPhoto }
  | null;

export default function AdminPasswordPage() {
  const { lang } = useLang();
  const isTh = lang === "th";

  const [albums, setAlbums] = useState<DownloadAlbum[]>([]);
  const [managingAlbum, setManagingAlbum] = useState<DownloadAlbum | null>(null);
  const [openMenuAlbumId, setOpenMenuAlbumId] = useState<string | null>(null);
  const [confirmState, setConfirmState] = useState<ConfirmState>(null);
  const [photos, setPhotos] = useState<DownloadPhoto[]>([]);
  const [failedPhotoIds, setFailedPhotoIds] = useState<string[]>([]);
  const [photoSearch, setPhotoSearch] = useState("");
  const [photosLoading, setPhotosLoading] = useState(false);
  const [deletingPhotoId, setDeletingPhotoId] = useState<string | null>(null);
  const [renamingAlbum, setRenamingAlbum] = useState(false);
  const [renameAlbumName, setRenameAlbumName] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [reindexingAlbumId, setReindexingAlbumId] = useState<string | null>(null);

  const loadAlbumPhotos = async (albumId: string) => {
    setPhotosLoading(true);
    try {
      const res = await fetch(`/api/photos/${albumId}?pageSize=100`, { cache: "no-store" });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Failed to load photos");
      const files = Array.isArray(data?.files)
        ? (data.files.filter((item: DownloadPhoto) => item.type === "image") as DownloadPhoto[])
        : [];
      setPhotos(files);
    } catch (error) {
      console.error("Failed to load album photos:", error);
      setPhotos([]);
      setMessage(isTh ? "โหลดรูปภาพในอัลบัมไม่สำเร็จ" : "Failed to load album photos");
    } finally {
      setPhotosLoading(false);
    }
  };

  const refreshData = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/photos", { cache: "no-store" });
      const data = await res.json();
      const folders = Array.isArray(data?.files)
        ? data.files.filter((item: DownloadAlbum) => item.type === "folder")
        : [];
      setAlbums(folders);
    } catch (error) {
      console.error("Failed to load albums:", error);
      setMessage(isTh ? "โหลดข้อมูลไม่สำเร็จ" : "Failed to load data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refreshData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filteredPhotos = photos.filter((photo) => {
    const query = photoSearch.trim().toLowerCase();
    if (!query) return true;
    return photo.name.toLowerCase().includes(query);
  });

  const handleOpenManagePhotos = async (album: DownloadAlbum) => {
    setOpenMenuAlbumId(null);
    setManagingAlbum(album);
    setRenameAlbumName(album.name);
    setPhotoSearch("");
    setFailedPhotoIds([]);
    setMessage("");
    await loadAlbumPhotos(album.id);
  };

  const handleRenameAlbum = async () => {
    if (!managingAlbum || renamingAlbum) return;
    const nextName = renameAlbumName.trim();
    if (!nextName) {
      setMessage(isTh ? "กรุณาระบุชื่ออัลบัมใหม่" : "Please enter a new album name");
      return;
    }
    setRenamingAlbum(true);
    setMessage("");
    try {
      const res = await fetch(`/api/photos/${managingAlbum.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "rename-album", targetAlbumName: nextName }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Failed to rename album");
      const newAlbumId = String(data?.newAlbumId || "").trim();
      if (!newAlbumId) throw new Error("Missing new album id");
      await refreshData();
      setManagingAlbum({ ...managingAlbum, id: newAlbumId, name: nextName });
      await loadAlbumPhotos(newAlbumId);
      setMessage(isTh ? "เปลี่ยนชื่ออัลบัมเรียบร้อยแล้ว" : "Album renamed successfully");
    } catch (error) {
      console.error("Failed to rename album:", error);
      setMessage(isTh ? "เปลี่ยนชื่ออัลบัมไม่สำเร็จ" : "Failed to rename album");
    } finally {
      setRenamingAlbum(false);
    }
  };

  const handleDeleteAlbum = async (album: DownloadAlbum) => {
    setMessage("");
    try {
      const res = await fetch(`/api/photos/${album.id}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Failed to delete album");
      setAlbums((prev) => prev.filter((item) => item.id !== album.id));
      if (managingAlbum?.id === album.id) {
        setManagingAlbum(null);
        setPhotos([]);
      }
      setMessage(isTh ? "ลบอัลบัมเรียบร้อยแล้ว" : "Album deleted successfully");
    } catch (error) {
      console.error("Failed to delete album:", error);
      setMessage(isTh ? "ลบอัลบัมไม่สำเร็จ" : "Failed to delete album");
    }
  };

  const handleReindex = async (album: DownloadAlbum) => {
    setOpenMenuAlbumId(null);
    setReindexingAlbumId(album.id);
    setMessage("");
    try {
      const res = await fetch("/api/face/index", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ eventId: album.id, reset: true }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Failed to index");
      setMessage(
        isTh
          ? `Re-index สำเร็จ: ${data.indexed ?? 0} รูป (ล้มเหลว ${data.failed ?? 0} รูป)`
          : `Re-index complete: ${data.indexed ?? 0} photos indexed (${data.failed ?? 0} failed)`,
      );
    } catch (error) {
      console.error("Re-index failed:", error);
      setMessage(isTh ? "Re-index ไม่สำเร็จ" : "Re-index failed");
    } finally {
      setReindexingAlbumId(null);
    }
  };

  const handleDeletePhoto = async (photoId: string) => {
    if (!managingAlbum) return;
    setDeletingPhotoId(photoId);
    setMessage("");
    try {
      const encoded = encodeURIComponent(photoId);
      const res = await fetch(`/api/photos/${managingAlbum.id}?fileId=${encoded}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Failed to delete photo");
      setPhotos((prev) => prev.filter((photo) => photo.id !== photoId));
      setMessage(isTh ? "ลบรูปเรียบร้อยแล้ว" : "Photo deleted successfully");
    } catch (error) {
      console.error("Failed to delete photo:", error);
      setMessage(isTh ? "ลบรูปไม่สำเร็จ" : "Failed to delete photo");
    } finally {
      setDeletingPhotoId(null);
    }
  };

  return (
    <AdminSectionLayout
      title={isTh ? "การจัดการโฟโต้บูธ" : "Photo Booth Management"}
      description={
        isTh
          ? "จัดการอัลบัม เปลี่ยนชื่อ และลบรูปภาพรายรูปได้จากหน้านี้"
          : "Manage albums, rename, and delete individual photos from this page."
      }
    >
      <div className="mt-2 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-white/60 bg-white/70 px-4 py-3 shadow-[0_10px_30px_rgba(120,58,12,0.1)] backdrop-blur">
        <p className="text-sm text-[#6f5a4b]">
          {isTh
            ? "จัดการอัลบัม ลบอัลบัม และลบรูปภาพรายรูปได้จากหน้านี้"
            : "Manage albums, delete albums, and delete individual photos from this page."}
        </p>
        <button
          type="button"
          onClick={refreshData}
          disabled={loading}
          className="inline-flex items-center gap-2 rounded-xl border border-[#e3d2bf] bg-[#fff4e8] px-3 py-2 text-sm font-medium text-[#4d3a2e] transition hover:bg-[#ffe6cf] disabled:opacity-60"
        >
          <RefreshCw className="h-4 w-4" />
          {isTh ? "รีเฟรชข้อมูล" : "Refresh data"}
        </button>
      </div>

      {message && (
        <div className="mt-4 rounded-xl border border-[#ecd5b9] bg-[#fff7ec] px-4 py-3 text-sm text-[#6a4a35]">
          {message}
        </div>
      )}

      <div className="mt-6 grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
        {loading ? (
          <div className="col-span-3 py-10 text-center">
            {isTh ? "กำลังโหลด..." : "Loading albums..."}
          </div>
        ) : albums.length === 0 ? (
          <div className="col-span-3 py-10 text-center">
            {isTh ? "ยังไม่มีอัลบัม" : "No albums found."}
          </div>
        ) : (
          albums.map((album) => (
            <div
              key={album.id}
              className="relative cursor-pointer overflow-hidden rounded-2xl border border-white/70 bg-white/80 p-4 shadow-[0_12px_30px_rgba(120,58,12,0.12)] backdrop-blur transition hover:bg-white/90"
              role="button"
              tabIndex={0}
              onClick={() => { void handleOpenManagePhotos(album); }}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  void handleOpenManagePhotos(album);
                }
              }}
            >
              <div className="absolute right-3 top-3 z-20">
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setOpenMenuAlbumId((prev) => prev === album.id ? null : album.id);
                  }}
                  className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-[#e5d3be] bg-[#fff4e8] text-[#5b3f2c] transition hover:bg-[#ffe6cf]"
                  aria-label={isTh ? "เปิดเมนู" : "Open menu"}
                >
                  <EllipsisVertical className="h-4 w-4" />
                </button>
                {openMenuAlbumId === album.id && (
                  <div className="absolute right-0 mt-2 w-44 overflow-hidden rounded-xl border border-[#ead6bf] bg-white shadow-[0_16px_34px_rgba(120,58,12,0.18)]">
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); void handleOpenManagePhotos(album); }}
                      className="flex w-full items-center gap-2 px-3 py-2.5 text-left text-sm text-[#5b3f2c] transition hover:bg-[#fff3e5]"
                    >
                      <Images className="h-4 w-4" />
                      {isTh ? "จัดการรูปภาพ" : "Manage Photos"}
                    </button>
                    <button
                      type="button"
                      disabled={reindexingAlbumId === album.id}
                      onClick={(e) => { e.stopPropagation(); void handleReindex(album); }}
                      className="flex w-full items-center gap-2 border-t border-[#f1e4d5] px-3 py-2.5 text-left text-sm text-[#5b3f2c] transition hover:bg-[#fff3e5] disabled:opacity-60"
                    >
                      <ScanFace className="h-4 w-4" />
                      {reindexingAlbumId === album.id
                        ? (isTh ? "กำลัง Re-index..." : "Re-indexing...")
                        : (isTh ? "Re-index ใบหน้า" : "Re-index Faces")}
                    </button>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setOpenMenuAlbumId(null);
                        setConfirmState({ type: "delete-album", album });
                      }}
                      className="flex w-full items-center gap-2 border-t border-[#f1e4d5] px-3 py-2.5 text-left text-sm text-red-700 transition hover:bg-red-50"
                    >
                      <Trash2 className="h-4 w-4" />
                      {isTh ? "ลบอัลบัม" : "Delete Album"}
                    </button>
                  </div>
                )}
              </div>

              <Image
                src={album.coverUrl || "/logo.png"}
                alt={album.name}
                width={160}
                height={128}
                className="mb-3 h-44 w-full rounded-xl object-cover"
                unoptimized
              />
              <div className="text-center text-lg font-semibold text-[#2b1a10]">
                {album.name}
              </div>
            </div>
          ))
        )}
      </div>

      {managingAlbum && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/55 px-4 backdrop-blur-sm">
          <div className="relative w-full max-w-6xl overflow-hidden rounded-3xl border border-[#f3e1cc] bg-white/95 p-5 shadow-[0_20px_70px_rgba(120,58,12,0.24)] backdrop-blur-xl md:p-6">
            <button
              type="button"
              onClick={() => { setManagingAlbum(null); setPhotos([]); }}
              className="absolute right-4 top-4 inline-flex h-9 w-9 items-center justify-center rounded-full border border-[#e3d2bf] bg-[#fff4e8] text-[#5b3f2c] transition hover:bg-[#ffe6cf]"
              aria-label={isTh ? "ปิด" : "Close"}
            >
              <X className="h-4 w-4" />
            </button>

            <div className="mb-5 pr-12">
              <h3 className="text-xl font-bold text-[#2b1a10] md:text-2xl">
                {isTh ? "จัดการรูปในอัลบัม" : "Manage Album Photos"}: {managingAlbum.name}
              </h3>
              <p className="mt-1 text-sm text-[#6f5a4b]">
                {isTh
                  ? `${photos.length} รูป | พบ ${filteredPhotos.length} รูป`
                  : `${photos.length} photos | ${filteredPhotos.length} matched`}
              </p>
            </div>

            <div className="mb-4 rounded-2xl border border-[#ead7c2] bg-[#fff7ee] p-3">
              <p className="mb-2 text-xs font-semibold tracking-[0.08em] text-[#8a6347] uppercase">
                {isTh ? "เปลี่ยนชื่ออัลบัม" : "Rename album"}
              </p>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={renameAlbumName}
                  onChange={(e) => setRenameAlbumName(e.target.value)}
                  placeholder={isTh ? "ชื่ออัลบัมใหม่" : "New album name"}
                  className="h-10 w-full rounded-xl border border-[#e3d2bf] bg-white px-3 text-sm text-[#3f2b1d] outline-none focus:border-[#ff7a2e] focus:ring-2 focus:ring-[#ff7a2e]/20"
                />
                <button
                  type="button"
                  onClick={handleRenameAlbum}
                  disabled={renamingAlbum || !renameAlbumName.trim()}
                  className="h-10 shrink-0 rounded-xl bg-primary px-4 text-sm font-semibold text-white disabled:opacity-60"
                >
                  {renamingAlbum
                    ? (isTh ? "กำลังบันทึก..." : "Saving...")
                    : (isTh ? "บันทึก" : "Save")}
                </button>
              </div>
            </div>

            <div className="mb-4 rounded-2xl border border-[#ead7c2] bg-[#fff7ee] p-3">
              <label className="mb-2 block text-xs font-semibold tracking-[0.08em] text-[#8a6347] uppercase">
                {isTh ? "ค้นหารูปเพื่อลบ" : "Search photos to delete"}
              </label>
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#a27e63]" />
                <input
                  type="text"
                  value={photoSearch}
                  onChange={(e) => setPhotoSearch(e.target.value)}
                  placeholder={isTh ? "พิมพ์ชื่อไฟล์" : "Type filename"}
                  className="h-10 w-full rounded-xl border border-[#e3d2bf] bg-white px-10 text-sm text-[#3f2b1d] outline-none focus:border-[#ff7a2e] focus:ring-2 focus:ring-[#ff7a2e]/20"
                />
              </div>
            </div>

            {photosLoading ? (
              <div className="py-10 text-center text-sm text-[#6f5a4b]">
                {isTh ? "กำลังโหลดรูปภาพ..." : "Loading photos..."}
              </div>
            ) : filteredPhotos.length === 0 ? (
              <div className="py-10 text-center text-sm text-[#6f5a4b]">
                {photoSearch
                  ? (isTh ? "ไม่พบรูปที่ตรงกับคำค้นหา" : "No photos match")
                  : (isTh ? "ยังไม่มีรูปในอัลบัมนี้" : "No photos in this album")}
              </div>
            ) : (
              <div className="max-h-[68vh] overflow-y-auto pr-1">
                <div className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-4">
                  {filteredPhotos.map((photo) => (
                    <div
                      key={photo.id}
                      className="overflow-hidden rounded-xl border border-[#efddca] bg-[#fff7ee]"
                    >
                      <Image
                        src={
                          failedPhotoIds.includes(photo.id)
                            ? "/logo.png"
                            : photo.previewUrl || photo.downloadUrl || "/logo.png"
                        }
                        alt={photo.name}
                        width={320}
                        height={320}
                        className="aspect-square w-full object-cover"
                        unoptimized
                        onError={(e) => {
                          const target = e.currentTarget as HTMLImageElement;
                          if (target.src.includes("/logo.png")) return;
                          setFailedPhotoIds((prev) =>
                            prev.includes(photo.id) ? prev : [...prev, photo.id]
                          );
                        }}
                      />
                      <div className="space-y-2 p-3">
                        <p className="truncate text-xs text-[#6a5445]" title={photo.name}>
                          {photo.name}
                        </p>
                        <button
                          type="button"
                          onClick={() =>
                            setConfirmState({ type: "delete-photo", album: managingAlbum, photo })
                          }
                          disabled={deletingPhotoId === photo.id}
                          className="inline-flex w-full items-center justify-center gap-1.5 rounded-lg border border-red-200 bg-red-50 px-2 py-1.5 text-xs font-medium text-red-700 transition hover:bg-red-100 disabled:opacity-60"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                          {deletingPhotoId === photo.id
                            ? (isTh ? "กำลังลบ..." : "Deleting...")
                            : (isTh ? "ลบรูปนี้" : "Delete Photo")}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {confirmState && (
        <div className="fixed inset-0 z-60 flex items-center justify-center bg-black/55 px-4 backdrop-blur-sm">
          <div className="w-full max-w-md overflow-hidden rounded-3xl border border-[#f3e1cc] bg-white/95 p-6 shadow-[0_20px_70px_rgba(120,58,12,0.24)] backdrop-blur-xl sm:p-8">
            <h4 className="text-xl font-bold text-[#2b1a10]">
              {isTh ? "ยืนยันการลบ" : "Confirm Delete"}
            </h4>
            <p className="mt-3 text-sm text-[#6f5a4b]">
              {confirmState.type === "delete-photo"
                ? isTh
                  ? `ต้องการลบรูป ${confirmState.photo.name} จริงหรือไม่?`
                  : `Delete photo ${confirmState.photo.name}?`
                : isTh
                  ? `ต้องการลบอัลบัม ${confirmState.album.name} และรูปทั้งหมดจริงหรือไม่?`
                  : `Delete album ${confirmState.album.name} and all photos?`}
            </p>
            <div className="mt-6 grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setConfirmState(null)}
                className="h-11 rounded-xl border border-[#e1d1be] bg-white px-4 font-semibold text-[#4d3a2e] transition hover:bg-[#fff3e5]"
              >
                {isTh ? "ยกเลิก" : "Cancel"}
              </button>
              <button
                type="button"
                onClick={async () => {
                  const next = confirmState;
                  setConfirmState(null);
                  if (next.type === "delete-photo") {
                    await handleDeletePhoto(next.photo.id);
                    return;
                  }
                  await handleDeleteAlbum(next.album);
                }}
                className="h-11 rounded-xl bg-linear-to-r from-[#ff8b3d] to-[#ff5b00] px-4 font-semibold text-white shadow-[0_10px_28px_rgba(255,91,0,0.35)] transition hover:brightness-105"
              >
                {isTh ? "ยืนยันการลบ" : "Delete"}
              </button>
            </div>
          </div>
        </div>
      )}
    </AdminSectionLayout>
  );
}