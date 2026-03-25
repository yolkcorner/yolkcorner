"use client";

import Image from "next/image";
import { ChangeEvent, useEffect, useState } from "react";
import AdminSectionLayout from "@/components/admin/AdminSectionLayout";
import { FloatingLabelInput } from "@/components/FloatingLabelInput";
import { useLang } from "@/lib/i18n";
import {
  PortfolioAlbum,
  SiteContent,
  defaultSiteContent,
} from "@/lib/site-content-types";

interface UploadAssetOptions {
  folder?: string;
  publicId?: string;
  overwrite?: boolean;
  deletePublicId?: string;
}

interface LocalImageDraft {
  id: string;
  file: File;
  previewUrl: string;
}

interface NewAlbumDraft {
  categoryId: string;
  name: string;
  nameEn: string;
  topText: string;
  topTextEn: string;
  coverFile: File | null;
}

const MAX_IMAGES_PER_ALBUM = 50;

const createId = (prefix: string) =>
  `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

// ...existing code...

async function uploadAsset(
  file: File,
  options?: UploadAssetOptions,
): Promise<string> {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("folder", options?.folder || "Yolk Corner/content-manager");
  if (options?.publicId) formData.append("publicId", options.publicId);
  if (typeof options?.overwrite === "boolean") {
    formData.append("overwrite", options.overwrite ? "1" : "0");
  }
  if (options?.deletePublicId) {
    formData.append("deletePublicId", options.deletePublicId);
  }

  const res = await fetch("/api/admin/upload", {
    method: "POST",
    body: formData,
  });
  const data = await res.json();
  if (!res.ok || !data?.url) {
    throw new Error(data?.error || "Upload failed");
  }

  return data.url as string;
}

export default function AdminPortfolioPage() {
  const { lang } = useLang();
  const isTh = lang === "th";
  const [content, setContent] = useState<SiteContent>(defaultSiteContent);
  const [draftAlbums, setDraftAlbums] = useState<PortfolioAlbum[]>([]);

  const [albumCoverFiles, setAlbumCoverFiles] = useState<Record<string, File>>(
    {},
  );
  const [albumCoverPreviews, setAlbumCoverPreviews] = useState<
    Record<string, string>
  >({});
  const [albumImageDrafts, setAlbumImageDrafts] = useState<
    Record<string, LocalImageDraft[]>
  >({});

  const [newAlbum, setNewAlbum] = useState<NewAlbumDraft>({
    categoryId: "",
    name: "",
    nameEn: "",
    topText: "",
    topTextEn: "",
    coverFile: null,
  });
  const [newAlbumCoverPreview, setNewAlbumCoverPreview] = useState<
    string | null
  >(null);
  const [newAlbumImageDrafts, setNewAlbumImageDrafts] = useState<
    LocalImageDraft[]
  >([]);
  const [newAlbumSelectionCount, setNewAlbumSelectionCount] = useState(0);
  const [existingAlbumSelectionCount, setExistingAlbumSelectionCount] =
    useState<Record<string, number>>({});

  const [newAlbumCategoryError, setNewAlbumCategoryError] = useState("");
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<PortfolioAlbum | null>(null);
  const [editingAlbumId, setEditingAlbumId] = useState<string | null>(null);
  const [imageLimitModalOpen, setImageLimitModalOpen] = useState(false);

  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    const initialize = async () => {
      try {
        const contentRes = await fetch("/api/content", { cache: "no-store" });
        if (!contentRes.ok) {
          setMessage(
            isTh ? "โหลดข้อมูลผลงานไม่สำเร็จ" : "Failed to load portfolio data",
          );
          return;
        }

        const contentData = await contentRes.json();
        if (contentData?.content) {
          const loaded = contentData.content as SiteContent;
          setContent(loaded);
          setDraftAlbums(loaded.portfolio.albums || []);
        }
      } catch (error) {
        console.error(error);
        setMessage(
          isTh ? "โหลดข้อมูลผลงานไม่สำเร็จ" : "Failed to load portfolio data",
        );
      }
    };

    initialize();
  }, [isTh]);

  useEffect(() => {
    return () => {
      Object.values(albumCoverPreviews).forEach((url) =>
        URL.revokeObjectURL(url),
      );
      Object.values(albumImageDrafts)
        .flat()
        .forEach((item) => URL.revokeObjectURL(item.previewUrl));
      if (newAlbumCoverPreview) URL.revokeObjectURL(newAlbumCoverPreview);
      newAlbumImageDrafts.forEach((item) =>
        URL.revokeObjectURL(item.previewUrl),
      );
    };
  }, [
    albumCoverPreviews,
    albumImageDrafts,
    newAlbumCoverPreview,
    newAlbumImageDrafts,
  ]);

  const toLocalDraftImages = (files: FileList | null, prefix: string) => {
    if (!files || files.length === 0) return [] as LocalImageDraft[];
    return Array.from(files).map((file) => ({
      id: createId(prefix),
      file,
      previewUrl: URL.createObjectURL(file),
    }));
  };

  const applyImageSelectionLimit = (
    currentCount: number,
    added: LocalImageDraft[],
  ) => {
    const availableSlots = MAX_IMAGES_PER_ALBUM - currentCount;
    if (availableSlots <= 0) {
      added.forEach((item) => URL.revokeObjectURL(item.previewUrl));
      setImageLimitModalOpen(true);
      return [] as LocalImageDraft[];
    }

    const accepted = added.slice(0, availableSlots);
    const dropped = added.slice(availableSlots);
    dropped.forEach((item) => URL.revokeObjectURL(item.previewUrl));
    if (dropped.length > 0) setImageLimitModalOpen(true);

    return accepted;
  };

  const setAlbumField = (
    albumId: string,
    field: keyof Pick<
      PortfolioAlbum,
      "categoryId" | "name" | "nameEn" | "topText" | "topTextEn"
    >,
    value: string,
  ) => {
    setDraftAlbums((prev) =>
      prev.map((album) =>
        album.id === albumId ? { ...album, [field]: value } : album,
      ),
    );
  };

  const onExistingAlbumCoverChange = (
    albumId: string,
    event: ChangeEvent<HTMLInputElement>,
  ) => {
    const file = event.target.files?.[0] || null;
    if (!file) return;

    const previousPreview = albumCoverPreviews[albumId];
    if (previousPreview) URL.revokeObjectURL(previousPreview);

    setAlbumCoverFiles((prev) => ({ ...prev, [albumId]: file }));
    setAlbumCoverPreviews((prev) => ({
      ...prev,
      [albumId]: URL.createObjectURL(file),
    }));
  };

  const onExistingAlbumImagesAdd = (
    albumId: string,
    files: FileList | null,
  ) => {
    const pickedCount = files?.length || 0;
    const added = toLocalDraftImages(files, "existing-image");
    if (added.length === 0) return;

    const album = draftAlbums.find((item) => item.id === albumId);
    if (!album) return;

    const currentCount =
      album.images.length + (albumImageDrafts[albumId]?.length || 0);
    const attemptedTotal = currentCount + pickedCount;
    setExistingAlbumSelectionCount((prev) => ({
      ...prev,
      [albumId]: attemptedTotal,
    }));

    const accepted = applyImageSelectionLimit(currentCount, added);
    if (accepted.length === 0) return;

    setAlbumImageDrafts((prev) => ({
      ...prev,
      [albumId]: [...(prev[albumId] || []), ...accepted],
    }));
  };

  const removeExistingAlbumImage = (albumId: string, imageUrl: string) => {
    setDraftAlbums((prev) =>
      prev.map((album) =>
        album.id === albumId
          ? { ...album, images: album.images.filter((img) => img !== imageUrl) }
          : album,
      ),
    );

    const album = draftAlbums.find((item) => item.id === albumId);
    if (!album) return;

    const draftCount = albumImageDrafts[albumId]?.length || 0;
    const nextTotal = Math.max(album.images.length - 1, 0) + draftCount;
    setExistingAlbumSelectionCount((prev) => ({
      ...prev,
      [albumId]: nextTotal,
    }));
  };

  const removeExistingAlbumImageDraft = (albumId: string, draftId: string) => {
    const album = draftAlbums.find((item) => item.id === albumId);

    setAlbumImageDrafts((prev) => {
      const current = prev[albumId] || [];
      const target = current.find((item) => item.id === draftId);
      if (target) URL.revokeObjectURL(target.previewUrl);

      const nextDraftCount = Math.max(current.length - 1, 0);
      const existingCount = album?.images.length || 0;
      setExistingAlbumSelectionCount((counts) => ({
        ...counts,
        [albumId]: existingCount + nextDraftCount,
      }));

      return {
        ...prev,
        [albumId]: current.filter((item) => item.id !== draftId),
      };
    });
  };

  const onNewAlbumCoverChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0] || null;
    if (!file) return;

    if (newAlbumCoverPreview) URL.revokeObjectURL(newAlbumCoverPreview);
    setNewAlbum((prev) => ({ ...prev, coverFile: file }));
    setNewAlbumCoverPreview(URL.createObjectURL(file));
  };

  const onNewAlbumImagesChange = (files: FileList | null) => {
    const pickedCount = files?.length || 0;
    const added = toLocalDraftImages(files, "new-image");
    if (added.length === 0) return;

    setNewAlbumSelectionCount(newAlbumImageDrafts.length + pickedCount);

    const accepted = applyImageSelectionLimit(
      newAlbumImageDrafts.length,
      added,
    );
    if (accepted.length === 0) return;

    setNewAlbumImageDrafts((prev) => [...prev, ...accepted]);
  };

  const removeNewAlbumImageDraft = (draftId: string) => {
    setNewAlbumImageDrafts((prev) => {
      const target = prev.find((item) => item.id === draftId);
      if (target) URL.revokeObjectURL(target.previewUrl);
      const next = prev.filter((item) => item.id !== draftId);
      setNewAlbumSelectionCount(next.length);
      return next;
    });
  };

  const saveCreateAlbum = async () => {
    if (!newAlbum.categoryId) {
      setNewAlbumCategoryError(
        isTh ? "กรุณาเลือกหมวดงาน" : "Please select a category",
      );
      return;
    }

    if (
      !newAlbum.name.trim() ||
      !newAlbum.nameEn.trim() ||
      !newAlbum.coverFile
    ) {
      setNewAlbumCategoryError("");
      setMessage(
        isTh
          ? "กรุณาใส่ชื่ออัลบั้มทั้งไทยและอังกฤษ และเลือกรูปปกก่อนบันทึกการสร้างอัลบัม"
          : "Please provide Thai/English album names and select a cover image before saving.",
      );
      return;
    }

    setNewAlbumCategoryError("");
    setSaving(true);
    setMessage(isTh ? "กำลังสร้างอัลบัม..." : "Creating album...");

    try {
      const albumId = createId("album");
      const coverUrl = await uploadAsset(newAlbum.coverFile, {
        folder: `Yolk Corner/portfolio/${newAlbum.categoryId || "uncategorized"}/covers`,
        publicId: `Yolk Corner/portfolio/${albumId}/cover/current`,
        overwrite: true,
      });

      const uploadedImages: string[] = [];
      for (const imageDraft of newAlbumImageDrafts) {
        const uploadedUrl = await uploadAsset(imageDraft.file, {
          folder: `Yolk Corner/portfolio/${albumId}/samples`,
        });
        uploadedImages.push(uploadedUrl);
      }

      const album: PortfolioAlbum = {
        id: albumId,
        categoryId: newAlbum.categoryId,
        name: newAlbum.name.trim(),
        nameEn: newAlbum.nameEn.trim(),
        topText: newAlbum.topText.trim(),
        topTextEn: newAlbum.topTextEn.trim(),
        coverUrl,
        images: uploadedImages,
      };

      const nextContent: SiteContent = {
        ...content,
        portfolio: {
          ...content.portfolio,
          albums: [...content.portfolio.albums, album],
        },
      };

      const saveRes = await fetch("/api/content", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: nextContent }),
      });

      const saveData = await saveRes.json();
      if (!saveRes.ok || !saveData?.content) {
        throw new Error(
          saveData?.error ||
            (isTh ? "บันทึกการสร้างอัลบัมไม่สำเร็จ" : "Failed to create album"),
        );
      }

      const saved = saveData.content as SiteContent;
      setContent(saved);
      setDraftAlbums(saved.portfolio.albums || []);

      if (newAlbumCoverPreview) URL.revokeObjectURL(newAlbumCoverPreview);
      newAlbumImageDrafts.forEach((item) =>
        URL.revokeObjectURL(item.previewUrl),
      );
      setNewAlbumCoverPreview(null);
      setNewAlbumImageDrafts([]);
      setNewAlbumSelectionCount(0);
      setNewAlbum({
        categoryId: "",
        name: "",
        nameEn: "",
        topText: "",
        topTextEn: "",
        coverFile: null,
      });
      setMessage(
        isTh
          ? "บันทึกการสร้างอัลบัมเรียบร้อยแล้ว"
          : "Album created successfully",
      );
    } catch (error) {
      console.error(error);
      setMessage(
        isTh ? "บันทึกการสร้างอัลบัมไม่สำเร็จ" : "Failed to create album",
      );
    } finally {
      setSaving(false);
    }
  };

  const saveDeleteAlbum = async (albumIdToDelete: string) => {
    setSaving(true);
    setMessage(isTh ? "กำลังลบอัลบัม..." : "Deleting album...");

    try {
      const nextContent: SiteContent = {
        ...content,
        portfolio: {
          ...content.portfolio,
          albums: content.portfolio.albums.filter(
            (album) => album.id !== albumIdToDelete,
          ),
        },
      };

      const saveRes = await fetch("/api/content", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: nextContent }),
      });

      const saveData = await saveRes.json();
      if (!saveRes.ok || !saveData?.content) {
        throw new Error(
          saveData?.error ||
            (isTh ? "บันทึกการลบอัลบัมไม่สำเร็จ" : "Failed to delete album"),
        );
      }

      const saved = saveData.content as SiteContent;
      setContent(saved);
      setDraftAlbums(saved.portfolio.albums || []);

      setAlbumCoverFiles({});
      Object.values(albumCoverPreviews).forEach((url) =>
        URL.revokeObjectURL(url),
      );
      setAlbumCoverPreviews({});
      Object.values(albumImageDrafts)
        .flat()
        .forEach((item) => URL.revokeObjectURL(item.previewUrl));
      setAlbumImageDrafts({});

      setMessage(
        isTh ? "บันทึกการลบอัลบัมเรียบร้อยแล้ว" : "Album deleted successfully",
      );
    } catch (error) {
      console.error(error);
      setMessage(
        isTh ? "บันทึกการลบอัลบัมไม่สำเร็จ" : "Failed to delete album",
      );
    } finally {
      setSaving(false);
    }
  };

  const requestDeleteAlbum = (album: PortfolioAlbum) => {
    setOpenMenuId(null);
    setDeleteTarget(album);
  };

  const confirmDeleteAlbum = async () => {
    if (!deleteTarget) return;
    await saveDeleteAlbum(deleteTarget.id);
    setDeleteTarget(null);
  };

  const openEditAlbumModal = (albumId: string) => {
    setOpenMenuId(null);
    setEditingAlbumId(albumId);
  };

  const closeEditAlbumModal = () => {
    setEditingAlbumId(null);
  };

  const saveEditAlbumModal = async () => {
    if (!editingAlbumId) return;

    const draftAlbum = draftAlbums.find((album) => album.id === editingAlbumId);
    if (!draftAlbum) return;

    if (
      !draftAlbum.categoryId ||
      !draftAlbum.name.trim() ||
      !(draftAlbum.nameEn || "").trim()
    ) {
      setMessage(
        isTh
          ? "กรุณากรอกชื่ออัลบั้มทั้งไทยและอังกฤษ และเลือกหมวดงานให้ครบก่อนบันทึก"
          : "Please fill Thai/English album names and category before saving.",
      );
      return;
    }

    const totalCount =
      draftAlbum.images.length + (albumImageDrafts[draftAlbum.id]?.length || 0);
    if (totalCount > MAX_IMAGES_PER_ALBUM) {
      setMessage(
        isTh
          ? `แต่ละอัลบั้มมีรูปได้ไม่เกิน ${MAX_IMAGES_PER_ALBUM} รูป`
          : `Each album supports up to ${MAX_IMAGES_PER_ALBUM} images.`,
      );
      return;
    }

    setSaving(true);
    setMessage(
      isTh ? "กำลังบันทึกการแก้ไขอัลบัม..." : "Saving album changes...",
    );

    try {
      let coverUrl = draftAlbum.coverUrl;
      const coverFile = albumCoverFiles[draftAlbum.id];
      if (coverFile) {
        coverUrl = await uploadAsset(coverFile, {
          folder: `Yolk Corner/portfolio/${draftAlbum.categoryId || "uncategorized"}/covers`,
          publicId: `Yolk Corner/portfolio/${draftAlbum.id}/cover/current`,
          overwrite: true,
          deletePublicId: undefined,
        });
      }

      const uploadedImages = [...draftAlbum.images];
      const imageDrafts = albumImageDrafts[draftAlbum.id] || [];
      for (const imageDraft of imageDrafts) {
        const uploadedUrl = await uploadAsset(imageDraft.file, {
          folder: `Yolk Corner/portfolio/${draftAlbum.id}/samples`,
        });
        uploadedImages.push(uploadedUrl);
      }

      const updatedAlbum: PortfolioAlbum = {
        ...draftAlbum,
        name: draftAlbum.name.trim(),
        nameEn: (draftAlbum.nameEn || "").trim(),
        topText: draftAlbum.topText.trim(),
        topTextEn: (draftAlbum.topTextEn || "").trim(),
        coverUrl,
        images: uploadedImages,
      };

      const nextAlbums = draftAlbums.map((album) =>
        album.id === updatedAlbum.id ? updatedAlbum : album,
      );

      const nextContent: SiteContent = {
        ...content,
        portfolio: {
          ...content.portfolio,
          albums: nextAlbums,
        },
      };

      const saveRes = await fetch("/api/content", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: nextContent }),
      });

      const saveData = await saveRes.json();
      if (!saveRes.ok || !saveData?.content) {
        throw new Error(
          saveData?.error ||
            (isTh
              ? "บันทึกข้อมูลผลงานไม่สำเร็จ"
              : "Failed to save portfolio data"),
        );
      }

      const saved = saveData.content as SiteContent;
      setContent(saved);
      setDraftAlbums(saved.portfolio.albums || []);

      const coverPreview = albumCoverPreviews[draftAlbum.id];
      if (coverPreview) URL.revokeObjectURL(coverPreview);
      setAlbumCoverFiles((prev) => {
        const next = { ...prev };
        delete next[draftAlbum.id];
        return next;
      });
      setAlbumCoverPreviews((prev) => {
        const next = { ...prev };
        delete next[draftAlbum.id];
        return next;
      });
      setAlbumImageDrafts((prev) => {
        const next = { ...prev };
        (next[draftAlbum.id] || []).forEach((item) =>
          URL.revokeObjectURL(item.previewUrl),
        );
        delete next[draftAlbum.id];
        return next;
      });
      setExistingAlbumSelectionCount((prev) => {
        const next = { ...prev };
        delete next[draftAlbum.id];
        return next;
      });

      closeEditAlbumModal();
      setMessage(
        isTh
          ? "บันทึกการแก้ไขอัลบัมเรียบร้อยแล้ว"
          : "Album updated successfully",
      );
    } catch (error) {
      console.error(error);
      setMessage(
        isTh ? "บันทึกการแก้ไขอัลบัมไม่สำเร็จ" : "Failed to update album",
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <AdminSectionLayout
      title={isTh ? "ผลงาน" : "Portfolio"}
      description={
        isTh
          ? "จัดการอัลบัมโดยแยกโซนเพิ่ม ลบ และแก้ไขให้ชัดเจน"
          : "Manage albums with clear sections for adding, editing, and deleting."
      }
    >
      <section className="rounded-lg border border-border bg-card p-6 space-y-6">
        <div className="rounded-md border border-border bg-background p-4">
          <p className="text-sm text-muted-foreground">
            {isTh
              ? "แนะนำรูปปกอัลบั้ม 1600 × 900 px (16:9) และภาพในอัลบัมไม่เกิน 50 รูป"
              : "Recommended album cover size is 1600 x 900 px (16:9), with up to 50 images per album."}
          </p>
        </div>

        <div className="rounded-md border border-border p-4 space-y-3">
          <h2 className="text-base font-semibold">
            {isTh ? "โซนเพิ่มอัลบัม" : "Create Album"}
          </h2>

          <select
            value={newAlbum.categoryId}
            onChange={(event) => {
              const categoryId = event.target.value;
              setNewAlbum((prev) => ({ ...prev, categoryId }));
              if (categoryId) setNewAlbumCategoryError("");
            }}
            className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
            disabled={saving}
          >
            <option value="">
              {isTh ? "เลือกหมวดงาน" : "Select category"}
            </option>
            {content.portfolio.categories.map((category) => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          </select>
          {newAlbumCategoryError && (
            <p className="text-sm text-red-500">{newAlbumCategoryError}</p>
          )}

          <FloatingLabelInput
            value={newAlbum.name}
            onChange={(event) =>
              setNewAlbum((prev) => ({ ...prev, name: event.target.value }))
            }
            label="ชื่ออัลบั้ม (TH)"
            disabled={saving}
            id="new-album-name-th"
          />

          <FloatingLabelInput
            value={newAlbum.nameEn}
            onChange={(event) =>
              setNewAlbum((prev) => ({ ...prev, nameEn: event.target.value }))
            }
            label="Album name (EN)"
            disabled={saving}
            id="new-album-name-en"
          />

          <FloatingLabelInput
            value={newAlbum.topText}
            onChange={(event) =>
              setNewAlbum((prev) => ({ ...prev, topText: event.target.value }))
            }
            label="ข้อความด้านบนภาพปกอัลบั้ม (TH) (ไม่ใส่ได้)"
            disabled={saving}
            id="new-album-toptext-th"
          />

          <FloatingLabelInput
            value={newAlbum.topTextEn}
            onChange={(event) =>
              setNewAlbum((prev) => ({
                ...prev,
                topTextEn: event.target.value,
              }))
            }
            label="Top text on cover (EN) (optional)"
            disabled={saving}
            id="new-album-toptext-en"
          />

          <p className="text-sm font-medium">
            {isTh ? "อัพโหลดปกอัลบัม" : "Upload album cover"}
          </p>
          <input
            type="file"
            accept="image/png,image/jpeg,image/webp,image/avif"
            onChange={onNewAlbumCoverChange}
            className="block w-full cursor-pointer rounded-md border border-border bg-background px-3 py-2 text-sm file:mr-3 file:rounded-md file:border-0 file:bg-[#FF5B00] file:px-3 file:py-2 file:text-white"
            disabled={saving}
          />

          {newAlbumCoverPreview && (
            <div className="overflow-hidden rounded-md border border-border bg-background">
              <Image
                src={newAlbumCoverPreview}
                alt="New album cover preview"
                width={640}
                height={360}
                className="h-auto w-full object-cover"
              />
            </div>
          )}

          <p className="text-sm font-medium">
            {isTh
              ? "อัพโหลดรูปในอัลบัม (สูงสุด 50 รูป)"
              : "Upload album images (max 50)"}
          </p>
          <input
            type="file"
            accept="image/png,image/jpeg,image/webp,image/avif"
            multiple
            onChange={(event) => onNewAlbumImagesChange(event.target.files)}
            className="block w-full cursor-pointer rounded-md border border-border bg-background px-3 py-2 text-sm file:mr-3 file:rounded-md file:border-0 file:bg-[#FF5B00] file:px-3 file:py-2 file:text-white"
            disabled={saving}
          />

          <p
            className={`text-xs ${
              newAlbumSelectionCount > MAX_IMAGES_PER_ALBUM
                ? "text-red-500"
                : "text-green-600"
            }`}
          >
            {isTh ? "เลือก" : "Selected"}: {newAlbumSelectionCount}/
            {MAX_IMAGES_PER_ALBUM}
          </p>

          {newAlbumImageDrafts.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs text-muted-foreground">
                {isTh ? "รูปที่เตรียมไว้" : "Prepared images"}:{" "}
                {newAlbumImageDrafts.length}/{MAX_IMAGES_PER_ALBUM}
              </p>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-5">
                {newAlbumImageDrafts.map((imageDraft) => (
                  <div key={imageDraft.id} className="relative">
                    <Image
                      src={imageDraft.previewUrl}
                      alt="new album image"
                      width={160}
                      height={120}
                      className="h-24 w-full rounded border border-border object-cover"
                    />
                    <button
                      type="button"
                      onClick={() => removeNewAlbumImageDraft(imageDraft.id)}
                      className="absolute -right-2 -top-2 h-6 w-6 rounded-full border border-border bg-card text-xs"
                      disabled={saving}
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          <button
            type="button"
            onClick={saveCreateAlbum}
            disabled={saving}
            className="rounded-md border border-[#FF5B00] bg-[#FF5B00] px-4 py-2 text-sm text-white transition-colors hover:bg-[#e65200] disabled:cursor-not-allowed disabled:opacity-50"
          >
            {saving
              ? isTh
                ? "กำลังบันทึก..."
                : "Saving..."
              : isTh
                ? "บันทึกการสร้างอัลบัม"
                : "Save New Album"}
          </button>
        </div>

        <div className="space-y-3">
          <h2 className="text-base font-semibold">
            {isTh ? "อัลบัมที่บันทึกแล้ว" : "Saved Albums"}
          </h2>

          {draftAlbums.length === 0 ? (
            <p className="rounded-md border border-border p-4 text-sm text-muted-foreground">
              {isTh ? "ยังไม่มีอัลบั้ม" : "No albums yet"}
            </p>
          ) : (
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
              {draftAlbums.map((album) => {
                const preview =
                  albumCoverPreviews[album.id] ||
                  album.coverUrl ||
                  "/hero-bg.png";
                return (
                  <div
                    key={`saved-album-${album.id}`}
                    className="relative rounded-md border border-border bg-background p-3"
                  >
                    <div className="absolute right-2 top-2 z-20">
                      <button
                        type="button"
                        onClick={() =>
                          setOpenMenuId((prev) =>
                            prev === album.id ? null : album.id,
                          )
                        }
                        className="rounded-md border border-border bg-background px-2 py-1 text-xs"
                        aria-label={isTh ? "เมนู" : "Menu"}
                      >
                        ...
                      </button>
                      {openMenuId === album.id && (
                        <div className="absolute right-0 mt-1 w-28 rounded-md border border-border bg-background shadow-md">
                          <button
                            type="button"
                            onClick={() => openEditAlbumModal(album.id)}
                            className="block w-full px-3 py-2 text-left text-xs hover:bg-secondary"
                          >
                            {isTh ? "แก้ไข" : "Edit"}
                          </button>
                          <button
                            type="button"
                            onClick={() => requestDeleteAlbum(album)}
                            className="block w-full px-3 py-2 text-left text-xs hover:bg-secondary"
                          >
                            {isTh ? "ลบ" : "Delete"}
                          </button>
                        </div>
                      )}
                    </div>

                    <div className="overflow-hidden rounded-md border border-border bg-background">
                      <Image
                        src={preview}
                        alt={album.name}
                        width={640}
                        height={360}
                        className="h-auto w-full object-cover"
                      />
                    </div>
                    <p className="mt-3 line-clamp-2 text-sm font-medium">
                      {album.name}
                    </p>
                    <p className="line-clamp-1 text-xs text-muted-foreground">
                      {album.nameEn || "-"}
                    </p>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="hidden space-y-3">
          <h2 className="text-base font-semibold">โซนแก้ไขอัลบัม</h2>

          {draftAlbums.length === 0 ? (
            <p className="rounded-md border border-border p-4 text-sm text-muted-foreground">
              ยังไม่มีอัลบั้ม
            </p>
          ) : (
            draftAlbums.map((album) => {
              const coverPreview =
                albumCoverPreviews[album.id] ||
                album.coverUrl ||
                "/hero-bg.png";
              const existingCount = album.images.length;
              const draftCount = albumImageDrafts[album.id]?.length || 0;
              const totalCount = existingCount + draftCount;

              return (
                <div
                  key={album.id}
                  id={`album-editor-${album.id}`}
                  className="rounded-md border border-border p-4 space-y-4"
                >
                  <div className="grid grid-cols-1 gap-4 lg:grid-cols-[240px_1fr]">
                    <div className="space-y-2">
                      <div className="overflow-hidden rounded-md border border-border bg-background">
                        <Image
                          src={coverPreview}
                          alt={album.name}
                          width={480}
                          height={270}
                          className="h-auto w-full object-cover"
                        />
                      </div>
                      <p className="text-sm font-medium">อัพโหลดปกอัลบัม</p>
                      <input
                        type="file"
                        accept="image/png,image/jpeg,image/webp,image/avif"
                        onChange={(event) =>
                          onExistingAlbumCoverChange(album.id, event)
                        }
                        className="block w-full cursor-pointer rounded-md border border-border bg-background px-3 py-2 text-sm file:mr-3 file:rounded-md file:border-0 file:bg-[#FF5B00] file:px-3 file:py-2 file:text-white"
                        disabled={saving}
                      />
                    </div>

                    <div className="space-y-3">
                      <select
                        value={album.categoryId}
                        onChange={(event) =>
                          setAlbumField(
                            album.id,
                            "categoryId",
                            event.target.value,
                          )
                        }
                        className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
                        disabled={saving}
                      >
                        <option value="">เลือกหมวดงาน</option>
                        {content.portfolio.categories.map((category) => (
                          <option key={category.id} value={category.id}>
                            {category.name}
                          </option>
                        ))}
                      </select>

                      <FloatingLabelInput
                        value={album.name}
                        onChange={(event) =>
                          setAlbumField(album.id, "name", event.target.value)
                        }
                        label="ชื่ออัลบั้ม (TH)"
                        disabled={saving}
                        id={`hidden-album-name-th-${album.id}`}
                      />

                      <FloatingLabelInput
                        value={album.nameEn || ""}
                        onChange={(event) =>
                          setAlbumField(album.id, "nameEn", event.target.value)
                        }
                        label="Album name (EN)"
                        disabled={saving}
                        id={`hidden-album-name-en-${album.id}`}
                      />

                      <FloatingLabelInput
                        type="text"
                        value={album.topText}
                        onChange={(event) =>
                          setAlbumField(album.id, "topText", event.target.value)
                        }
                        label="ข้อความด้านบนภาพปก (TH) (ไม่ใส่ได้)"
                        disabled={saving}
                        id={`hidden-album-toptext-th-${album.id}`}
                      />

                      <FloatingLabelInput
                        type="text"
                        value={album.topTextEn || ""}
                        onChange={(event) =>
                          setAlbumField(
                            album.id,
                            "topTextEn",
                            event.target.value,
                          )
                        }
                        label="Top text on cover (EN) (optional)"
                        disabled={saving}
                        id={`hidden-album-toptext-en-${album.id}`}
                      />

                      <p className="text-sm font-medium">
                        อัพโหลดรูปในอัลบัม (สูงสุด 50 รูป)
                      </p>
                      <input
                        type="file"
                        accept="image/png,image/jpeg,image/webp,image/avif"
                        multiple
                        onChange={(event) =>
                          onExistingAlbumImagesAdd(album.id, event.target.files)
                        }
                        className="block w-full cursor-pointer rounded-md border border-border bg-background px-3 py-2 text-sm file:mr-3 file:rounded-md file:border-0 file:bg-[#FF5B00] file:px-3 file:py-2 file:text-white"
                        disabled={saving || totalCount >= MAX_IMAGES_PER_ALBUM}
                      />

                      <p
                        className={`text-xs ${
                          (existingAlbumSelectionCount[album.id] ??
                            totalCount) > MAX_IMAGES_PER_ALBUM
                            ? "text-red-500"
                            : "text-green-600"
                        }`}
                      >
                        เลือก:{" "}
                        {existingAlbumSelectionCount[album.id] ?? totalCount}/
                        {MAX_IMAGES_PER_ALBUM}
                      </p>

                      <p className="text-xs text-muted-foreground">
                        จำนวนรูป: {totalCount}/{MAX_IMAGES_PER_ALBUM}
                      </p>
                    </div>
                  </div>

                  {(album.images.length > 0 ||
                    (albumImageDrafts[album.id] || []).length > 0) && (
                    <div className="space-y-2">
                      <p className="text-sm text-muted-foreground">
                        ภาพในอัลบั้ม
                      </p>
                      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-5">
                        {album.images.map((imageUrl) => (
                          <div key={imageUrl} className="relative">
                            <Image
                              src={imageUrl}
                              alt="album image"
                              width={160}
                              height={120}
                              className="h-24 w-full rounded border border-border object-cover"
                            />
                            <button
                              type="button"
                              onClick={() =>
                                removeExistingAlbumImage(album.id, imageUrl)
                              }
                              className="absolute -right-2 -top-2 h-6 w-6 rounded-full border border-border bg-card text-xs"
                              disabled={saving}
                            >
                              ×
                            </button>
                          </div>
                        ))}

                        {(albumImageDrafts[album.id] || []).map(
                          (imageDraft) => (
                            <div key={imageDraft.id} className="relative">
                              <Image
                                src={imageDraft.previewUrl}
                                alt="new album image"
                                width={160}
                                height={120}
                                className="h-24 w-full rounded border border-border object-cover"
                              />
                              <button
                                type="button"
                                onClick={() =>
                                  removeExistingAlbumImageDraft(
                                    album.id,
                                    imageDraft.id,
                                  )
                                }
                                className="absolute -right-2 -top-2 h-6 w-6 rounded-full border border-border bg-card text-xs"
                                disabled={saving}
                              >
                                ×
                              </button>
                            </div>
                          ),
                        )}
                      </div>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>

        {message && (
          <p className="text-sm text-muted-foreground" role="status">
            {message}
          </p>
        )}

        {imageLimitModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
            <div className="relative w-full max-w-md rounded-lg border border-border bg-card p-6">
              <button
                type="button"
                onClick={() => setImageLimitModalOpen(false)}
                className="absolute top-0 -right-10 sm:-right-11 inline-flex h-8 w-8 items-center justify-center rounded-md border border-border bg-background text-sm font-semibold transition-all duration-200 hover:scale-105 hover:bg-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF5B00]"
                aria-label={isTh ? "ปิด" : "Close"}
              >
                X
              </button>
              <p className="text-sm text-foreground">
                คุณสามารถอัพโหลดรูปภาพในอัลบัมได้สูงสุด 50 รูปเท่านั้น
              </p>
              <div className="mt-4 flex justify-end">
                <button
                  type="button"
                  onClick={() => setImageLimitModalOpen(false)}
                  className="rounded-md border border-[#FF5B00] bg-[#FF5B00] px-4 py-2 text-sm text-white transition-all duration-200 hover:-translate-y-0.5 hover:bg-[#e65200] hover:shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF5B00]"
                >
                  ok
                </button>
              </div>
            </div>
          </div>
        )}
      </section>

      {editingAlbumId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="relative w-full max-w-4xl">
            <button
              type="button"
              onClick={closeEditAlbumModal}
              className="absolute top-0 -right-10 sm:-right-11 inline-flex h-8 w-8 items-center justify-center rounded-md border border-border bg-background text-sm font-semibold transition-all duration-200 hover:scale-105 hover:bg-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF5B00]"
              aria-label={isTh ? "ปิด" : "Close"}
            >
              X
            </button>
            <div
              className="max-h-[90vh] w-full overflow-y-auto rounded-lg border border-border bg-card p-5"
              onClick={(event) => event.stopPropagation()}
            >
              {(() => {
                const album = draftAlbums.find(
                  (item) => item.id === editingAlbumId,
                );
                if (!album) return null;

                const coverPreview =
                  albumCoverPreviews[album.id] ||
                  album.coverUrl ||
                  "/hero-bg.png";
                const existingCount = album.images.length;
                const draftCount = albumImageDrafts[album.id]?.length || 0;
                const totalCount = existingCount + draftCount;

                return (
                  <>
                    <h3 className="text-lg font-semibold">
                      {isTh ? "แก้ไขอัลบัม" : "Edit Album"}
                    </h3>

                    <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-[240px_1fr]">
                      <div className="space-y-2">
                        <div className="overflow-hidden rounded-md border border-border bg-background">
                          <Image
                            src={coverPreview}
                            alt={album.name}
                            width={480}
                            height={270}
                            className="h-auto w-full object-cover"
                          />
                        </div>
                        <p className="text-sm font-medium">
                          {isTh ? "อัพโหลดปกอัลบัม" : "Upload Album Cover"}
                        </p>
                        <input
                          type="file"
                          accept="image/png,image/jpeg,image/webp,image/avif"
                          onChange={(event) =>
                            onExistingAlbumCoverChange(album.id, event)
                          }
                          className="block w-full cursor-pointer rounded-md border border-border bg-background px-3 py-2 text-sm file:mr-3 file:rounded-md file:border-0 file:bg-[#FF5B00] file:px-3 file:py-2 file:text-white"
                          disabled={saving}
                        />
                      </div>

                      <div className="space-y-3">
                        <select
                          value={album.categoryId}
                          onChange={(event) =>
                            setAlbumField(
                              album.id,
                              "categoryId",
                              event.target.value,
                            )
                          }
                          className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
                          disabled={saving}
                        >
                          <option value="">
                            {isTh ? "เลือกหมวดงาน" : "Select Category"}
                          </option>
                          {content.portfolio.categories.map((category) => (
                            <option key={category.id} value={category.id}>
                              {isTh
                                ? category.name
                                : category.nameEn || category.name}
                            </option>
                          ))}
                        </select>

                        <FloatingLabelInput
                          value={album.name}
                          onChange={(event) =>
                            setAlbumField(album.id, "name", event.target.value)
                          }
                          label="ชื่ออัลบั้ม (TH)"
                          disabled={saving}
                          id={`edit-album-name-th-${album.id}`}
                        />

                        <FloatingLabelInput
                          value={album.nameEn || ""}
                          onChange={(event) =>
                            setAlbumField(
                              album.id,
                              "nameEn",
                              event.target.value,
                            )
                          }
                          label="Album name (EN)"
                          disabled={saving}
                          id={`edit-album-name-en-${album.id}`}
                        />

                        <FloatingLabelInput
                          value={album.topText}
                          onChange={(event) =>
                            setAlbumField(
                              album.id,
                              "topText",
                              event.target.value,
                            )
                          }
                          label="ข้อความด้านบนภาพปก (TH)"
                          disabled={saving}
                          id={`edit-album-toptext-th-${album.id}`}
                        />

                        <FloatingLabelInput
                          value={album.topTextEn || ""}
                          onChange={(event) =>
                            setAlbumField(
                              album.id,
                              "topTextEn",
                              event.target.value,
                            )
                          }
                          label="Top text on cover (EN)"
                          disabled={saving}
                          id={`edit-album-toptext-en-${album.id}`}
                        />

                        <p className="text-sm font-medium">
                          {isTh
                            ? "อัพโหลดรูปในอัลบัม (สูงสุด 50 รูป)"
                            : "Upload Album Images (max 50)"}
                        </p>
                        <input
                          type="file"
                          accept="image/png,image/jpeg,image/webp,image/avif"
                          multiple
                          onChange={(event) =>
                            onExistingAlbumImagesAdd(
                              album.id,
                              event.target.files,
                            )
                          }
                          className="block w-full cursor-pointer rounded-md border border-border bg-background px-3 py-2 text-sm file:mr-3 file:rounded-md file:border-0 file:bg-[#FF5B00] file:px-3 file:py-2 file:text-white"
                          disabled={
                            saving || totalCount >= MAX_IMAGES_PER_ALBUM
                          }
                        />

                        <p className="text-xs text-muted-foreground">
                          {isTh ? "จำนวนรูป" : "Images"}: {totalCount}/
                          {MAX_IMAGES_PER_ALBUM}
                        </p>
                      </div>
                    </div>

                    {(album.images.length > 0 ||
                      (albumImageDrafts[album.id] || []).length > 0) && (
                      <div className="mt-4 space-y-2">
                        <p className="text-sm text-muted-foreground">
                          {isTh ? "ภาพในอัลบั้ม" : "Album Images"}
                        </p>
                        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-5">
                          {album.images.map((imageUrl) => (
                            <div key={imageUrl} className="relative">
                              <Image
                                src={imageUrl}
                                alt="album image"
                                width={160}
                                height={120}
                                className="h-24 w-full rounded border border-border object-cover"
                              />
                              <button
                                type="button"
                                onClick={() =>
                                  removeExistingAlbumImage(album.id, imageUrl)
                                }
                                className="absolute -right-2 -top-2 h-6 w-6 rounded-full border border-border bg-card text-xs"
                                disabled={saving}
                              >
                                ×
                              </button>
                            </div>
                          ))}

                          {(albumImageDrafts[album.id] || []).map(
                            (imageDraft) => (
                              <div key={imageDraft.id} className="relative">
                                <Image
                                  src={imageDraft.previewUrl}
                                  alt="new album image"
                                  width={160}
                                  height={120}
                                  className="h-24 w-full rounded border border-border object-cover"
                                />
                                <button
                                  type="button"
                                  onClick={() =>
                                    removeExistingAlbumImageDraft(
                                      album.id,
                                      imageDraft.id,
                                    )
                                  }
                                  className="absolute -right-2 -top-2 h-6 w-6 rounded-full border border-border bg-card text-xs"
                                  disabled={saving}
                                >
                                  ×
                                </button>
                              </div>
                            ),
                          )}
                        </div>
                      </div>
                    )}

                    <div className="mt-5 flex justify-end gap-2">
                      <button
                        type="button"
                        onClick={closeEditAlbumModal}
                        disabled={saving}
                        className="rounded-md border border-border px-4 py-2 text-sm transition-all duration-200 hover:-translate-y-0.5 hover:bg-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF5B00]"
                      >
                        {isTh ? "ยกเลิก" : "Cancel"}
                      </button>
                      <button
                        type="button"
                        onClick={saveEditAlbumModal}
                        disabled={saving}
                        className="rounded-md border border-[#FF5B00] bg-[#FF5B00] px-4 py-2 text-sm text-white transition-all duration-200 hover:-translate-y-0.5 hover:bg-[#e65200] hover:shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF5B00]"
                      >
                        {saving
                          ? isTh
                            ? "กำลังบันทึก..."
                            : "Saving..."
                          : isTh
                            ? "บันทึก"
                            : "Save"}
                      </button>
                    </div>
                  </>
                );
              })()}
            </div>
          </div>
        </div>
      )}

      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="relative w-full max-w-md rounded-lg border border-border bg-card p-6">
            <button
              type="button"
              onClick={() => setDeleteTarget(null)}
              disabled={saving}
              className="absolute top-0 -right-10 sm:-right-11 inline-flex h-8 w-8 items-center justify-center rounded-md border border-border bg-background text-sm font-semibold transition-all duration-200 hover:scale-105 hover:bg-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF5B00]"
              aria-label={isTh ? "ปิด" : "Close"}
            >
              X
            </button>
            <p className="text-sm text-foreground">
              {isTh
                ? `ต้องการลบอัลบัม ${deleteTarget.name} จริงหรือไม่?`
                : `Are you sure you want to delete album ${deleteTarget.nameEn || deleteTarget.name}?`}
            </p>
            <div className="mt-4 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setDeleteTarget(null)}
                disabled={saving}
                className="rounded-md border border-border px-4 py-2 text-sm transition-all duration-200 hover:-translate-y-0.5 hover:bg-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF5B00]"
              >
                {isTh ? "ยกเลิก" : "Cancel"}
              </button>
              <button
                type="button"
                onClick={confirmDeleteAlbum}
                disabled={saving}
                className="rounded-md border border-[#FF5B00] bg-[#FF5B00] px-4 py-2 text-sm text-white transition-all duration-200 hover:-translate-y-0.5 hover:bg-[#e65200] hover:shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF5B00]"
              >
                {saving
                  ? isTh
                    ? "กำลังลบ..."
                    : "Deleting..."
                  : isTh
                    ? "ใช่, ลบ"
                    : "Yes, Delete"}
              </button>
            </div>
          </div>
        </div>
      )}
    </AdminSectionLayout>
  );
}
