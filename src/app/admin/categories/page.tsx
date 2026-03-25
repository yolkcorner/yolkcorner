"use client";

import Image from "next/image";
import { ChangeEvent, useEffect, useState } from "react";
import AdminSectionLayout from "@/components/admin/AdminSectionLayout";
import { useLang } from "@/lib/i18n";
import {
  ServiceCategory,
  SiteContent,
  defaultSiteContent,
} from "@/lib/site-content-types";

interface UploadAssetOptions {
  folder?: string;
  publicId?: string;
  overwrite?: boolean;
  deletePublicId?: string;
}

const createId = (prefix: string) =>
  `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

const getSafeCoverUrl = (url: string | null | undefined) => {
  const trimmed = (url || "").trim();
  return trimmed || "/hero-bg.png";
};

const slugify = (value: string) =>
  value
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-]/g, "")
    .replace(/-+/g, "-");

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

export default function AdminCategoriesPage() {
  const { lang } = useLang();
  const isTh = lang === "th";
  const [content, setContent] = useState<SiteContent>(defaultSiteContent);
  const [draftCategories, setDraftCategories] = useState<ServiceCategory[]>([]);
  const [newCategoryName, setNewCategoryName] = useState("");
  const [newCategoryNameEn, setNewCategoryNameEn] = useState("");
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<ServiceCategory | null>(
    null,
  );
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<ServiceCategory | null>(null);
  const [editName, setEditName] = useState("");
  const [editNameEn, setEditNameEn] = useState("");
  const [editCoverFile, setEditCoverFile] = useState<File | null>(null);
  const [editCoverPreview, setEditCoverPreview] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    const initialize = async () => {
      try {
        const contentRes = await fetch("/api/content", { cache: "no-store" });
        if (!contentRes.ok) {
          setMessage(
            isTh ? "โหลดข้อมูลหมวดงานไม่สำเร็จ" : "Failed to load categories",
          );
          return;
        }

        const contentData = await contentRes.json();
        if (contentData?.content) {
          const loaded = contentData.content as SiteContent;
          setContent(loaded);
          setDraftCategories(loaded.services.categories || []);
        }
      } catch (error) {
        console.error(error);
        setMessage(
          isTh ? "โหลดข้อมูลหมวดงานไม่สำเร็จ" : "Failed to load categories",
        );
      }
    };

    initialize();
  }, [isTh]);

  const persistCategories = async (
    nextCategories: ServiceCategory[],
    options?: {
      coverFileById?: Record<string, File>;
      savingText?: string;
      successText?: string;
      failedText?: string;
    },
  ) => {
    const hasEmptyName = nextCategories.some(
      (item) => !item.name.trim() || !(item.nameEn || "").trim(),
    );
    if (hasEmptyName) {
      setMessage(
        isTh
          ? "กรุณากรอกชื่อหมวดงานทั้งภาษาไทยและอังกฤษให้ครบก่อนบันทึก"
          : "Please fill both Thai and English category names before saving",
      );
      return false;
    }

    const coverFileById = options?.coverFileById || {};

    setSaving(true);
    setMessage(
      options?.savingText ||
        (isTh ? "กำลังบันทึกหมวดงาน..." : "Saving categories..."),
    );

    try {
      let categoriesWithCovers = [...nextCategories];

      for (const category of nextCategories) {
        const draftFile = coverFileById[category.id];
        if (!draftFile) continue;

        const uploadedCoverUrl = await uploadAsset(draftFile, {
          folder: "Yolk Corner/categories/covers",
          publicId: `Yolk Corner/categories/covers/${category.id}`,
          overwrite: true,
          deletePublicId: undefined,
        });

        categoriesWithCovers = categoriesWithCovers.map((item) =>
          item.id === category.id
            ? { ...item, coverUrl: uploadedCoverUrl }
            : item,
        );
      }

      const validCategoryIds = new Set(
        categoriesWithCovers.map((item) => item.id),
      );

      const nextContent: SiteContent = {
        ...content,
        services: {
          ...content.services,
          categories: categoriesWithCovers,
        },
        portfolio: {
          ...content.portfolio,
          categories: categoriesWithCovers,
          albums: content.portfolio.albums.filter((album) =>
            validCategoryIds.has(album.categoryId),
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
            (isTh ? "บันทึกหมวดงานไม่สำเร็จ" : "Failed to save categories"),
        );
      }

      const saved = saveData.content as SiteContent;
      setContent(saved);
      setDraftCategories(saved.services.categories || []);
      setMessage(
        options?.successText ||
          (isTh
            ? "บันทึกหมวดงานเรียบร้อยแล้ว (อัปเดตหน้า /portfolio แล้ว)"
            : "Categories saved successfully (updated /portfolio)."),
      );
      return true;
    } catch (error) {
      console.error(error);
      setMessage(
        options?.failedText ||
          (isTh ? "บันทึกหมวดงานไม่สำเร็จ" : "Failed to save categories"),
      );
      return false;
    } finally {
      setSaving(false);
    }
  };

  const addCategory = async () => {
    const name = newCategoryName.trim();
    const nameEn = newCategoryNameEn.trim();
    if (!name || !nameEn) {
      setMessage(
        isTh
          ? "กรุณากรอกชื่อหมวดงานทั้งภาษาไทยและอังกฤษ"
          : "Please fill both Thai and English category names",
      );
      return;
    }

    const id = slugify(name) || createId("category");
    if (draftCategories.some((item) => item.id === id)) {
      setMessage(isTh ? "มีหมวดงานนี้แล้ว" : "This category already exists");
      return;
    }

    const nextCategory: ServiceCategory = {
      id,
      name,
      nameEn,
      coverUrl: "/hero-bg.png",
    };

    const ok = await persistCategories([...draftCategories, nextCategory], {
      savingText: isTh ? "กำลังเพิ่มหมวดงาน..." : "Adding category...",
      successText: isTh ? "เพิ่มหมวดงานเรียบร้อยแล้ว" : "Category added",
      failedText: isTh ? "เพิ่มหมวดงานไม่สำเร็จ" : "Failed to add category",
    });

    if (ok) {
      setNewCategoryName("");
      setNewCategoryNameEn("");
    }
  };

  const openEditModal = (category: ServiceCategory) => {
    setOpenMenuId(null);
    setEditTarget(category);
    setEditName(category.name || "");
    setEditNameEn(category.nameEn || "");
    setEditCoverFile(null);
    if (editCoverPreview) {
      URL.revokeObjectURL(editCoverPreview);
    }
    setEditCoverPreview(null);
    setEditModalOpen(true);
  };

  const closeEditModal = () => {
    setEditModalOpen(false);
    setEditTarget(null);
    setEditName("");
    setEditNameEn("");
    setEditCoverFile(null);
    if (editCoverPreview) {
      URL.revokeObjectURL(editCoverPreview);
    }
    setEditCoverPreview(null);
  };

  const onEditCoverChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0] || null;
    if (!file) return;
    if (editCoverPreview) {
      URL.revokeObjectURL(editCoverPreview);
    }
    setEditCoverFile(file);
    setEditCoverPreview(URL.createObjectURL(file));
  };

  const saveEditModal = async () => {
    if (!editTarget) return;

    const name = editName.trim();
    const nameEn = editNameEn.trim();
    if (!name || !nameEn) {
      setMessage(
        isTh
          ? "กรุณากรอกชื่อหมวดงานทั้งภาษาไทยและอังกฤษ"
          : "Please fill both Thai and English category names",
      );
      return;
    }

    const nextCategories = draftCategories.map((item) =>
      item.id === editTarget.id ? { ...item, name, nameEn } : item,
    );

    const coverFileById =
      editCoverFile && editTarget
        ? { [editTarget.id]: editCoverFile }
        : undefined;

    const ok = await persistCategories(nextCategories, {
      coverFileById,
      savingText: isTh ? "กำลังบันทึกหมวดงาน..." : "Saving category...",
      successText: isTh ? "บันทึกหมวดงานเรียบร้อยแล้ว" : "Category saved",
      failedText: isTh ? "บันทึกหมวดงานไม่สำเร็จ" : "Failed to save category",
    });

    if (ok) {
      closeEditModal();
    }
  };

  const requestDeleteCategory = (category: ServiceCategory) => {
    setOpenMenuId(null);
    setDeleteTarget(category);
  };

  const confirmDeleteCategory = async () => {
    if (!deleteTarget) return;

    const nextCategories = draftCategories.filter(
      (item) => item.id !== deleteTarget.id,
    );

    const ok = await persistCategories(nextCategories, {
      savingText: isTh ? "กำลังลบหมวดงาน..." : "Removing category...",
      successText: isTh ? "ลบหมวดงานเรียบร้อยแล้ว" : "Category removed",
      failedText: isTh ? "ลบหมวดงานไม่สำเร็จ" : "Failed to remove category",
    });

    if (ok) {
      setDeleteTarget(null);
    }
  };

  return (
    <AdminSectionLayout
      title={isTh ? "บริการของเรา" : "Services"}
      description={
        isTh
          ? "เพิ่ม/แก้ไข/ลบหมวดงาน พร้อมกำหนดรูปปกสำหรับแสดงในหน้า Portfolio"
          : "Add, edit, and delete service categories with cover images for the Portfolio page."
      }
    >
      <section className="rounded-lg border border-border bg-card p-6 space-y-6">
        <div className="rounded-md border border-border bg-background p-4">
          <p className="text-sm text-muted-foreground">
            {isTh
              ? "แนะนำรูปปกหมวดงานขนาด 1500 × 1000 px (อัตราส่วน 3:2) เพื่อให้แสดงผลสวยงามที่หน้า Portfolio"
              : "Recommended category cover size: 1500 x 1000 px (3:2 ratio) for better Portfolio display."}
          </p>
        </div>

        <div className="rounded-md border border-border p-4 space-y-3">
          <h2 className="text-base font-semibold">
            {isTh ? "เพิ่มหมวดงานใหม่" : "Add New Category"}
          </h2>
          <div className="flex flex-col gap-2 sm:flex-row">
            <input
              type="text"
              value={newCategoryName}
              onChange={(event) => setNewCategoryName(event.target.value)}
              placeholder="ชื่อหมวดงาน (TH)"
              className="flex-1 rounded-md border border-border bg-background px-3 py-2 text-sm"
              disabled={saving}
            />
            <input
              type="text"
              value={newCategoryNameEn}
              onChange={(event) => setNewCategoryNameEn(event.target.value)}
              placeholder={isTh ? "ชื่อหมวดงาน (EN)" : "Category Name (EN)"}
              className="flex-1 rounded-md border border-border bg-background px-3 py-2 text-sm"
              disabled={saving}
            />
            <button
              type="button"
              onClick={addCategory}
              disabled={saving}
              className="rounded-md border border-[#FF5B00] bg-[#FF5B00] px-4 py-2 text-sm text-white transition-colors hover:bg-[#e65200] disabled:cursor-not-allowed disabled:opacity-50"
            >
              {saving
                ? isTh
                  ? "กำลังบันทึก..."
                  : "Saving..."
                : isTh
                  ? "เพิ่มหมวดงาน"
                  : "Add Category"}
            </button>
          </div>
        </div>

        <div className="space-y-3">
          <h2 className="text-base font-semibold">
            {isTh ? "รายการหมวดงาน" : "Saved Service Categories"}
          </h2>
          {draftCategories.length === 0 ? (
            <p className="rounded-md border border-border bg-background p-4 text-sm text-muted-foreground">
              {isTh ? "ยังไม่มีหมวดงาน" : "No categories yet"}
            </p>
          ) : (
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              {draftCategories.map((category) => {
                const previewUrl = getSafeCoverUrl(category.coverUrl);

                return (
                  <div
                    key={category.id}
                    className="relative rounded-md border border-border p-4 space-y-4"
                  >
                    <div className="absolute right-3 top-3 z-20">
                      <button
                        type="button"
                        onClick={() =>
                          setOpenMenuId((prev) =>
                            prev === category.id ? null : category.id,
                          )
                        }
                        className="rounded-md border border-border bg-background px-2 py-1 text-xs"
                        aria-label={isTh ? "เมนู" : "Menu"}
                      >
                        ...
                      </button>
                      {openMenuId === category.id && (
                        <div className="absolute right-0 mt-1 w-28 rounded-md border border-border bg-background shadow-md">
                          <button
                            type="button"
                            onClick={() => openEditModal(category)}
                            className="block w-full px-3 py-2 text-left text-xs hover:bg-secondary"
                          >
                            {isTh ? "แก้ไข" : "Edit"}
                          </button>
                          <button
                            type="button"
                            onClick={() => requestDeleteCategory(category)}
                            className="block w-full px-3 py-2 text-left text-xs hover:bg-secondary"
                          >
                            {isTh ? "ลบ" : "Delete"}
                          </button>
                        </div>
                      )}
                    </div>

                    <div className="grid grid-cols-1 gap-4 md:grid-cols-[200px_1fr]">
                      <div className="relative aspect-3/2 overflow-hidden rounded-md border border-border bg-background">
                        <Image
                          src={previewUrl}
                          alt={category.name || "Category cover"}
                          fill
                          sizes="(max-width: 768px) 100vw, 200px"
                          className="object-cover"
                        />
                      </div>

                      <div className="space-y-2">
                        <p className="text-xs text-muted-foreground">TH</p>
                        <p className="text-sm font-medium">{category.name}</p>
                        <p className="text-xs text-muted-foreground">EN</p>
                        <p className="text-sm font-medium">
                          {category.nameEn || "-"}
                        </p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {message && (
          <p className="text-sm text-muted-foreground" role="status">
            {message}
          </p>
        )}
      </section>

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
                ? `ต้องการลบหมวดงาน ${deleteTarget.name} จริงหรือไม่?`
                : `Are you sure you want to delete category ${deleteTarget.nameEn || deleteTarget.name}?`}
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
                onClick={confirmDeleteCategory}
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

      {editModalOpen && editTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div
            className="relative w-full max-w-2xl rounded-lg border border-border bg-card p-6"
            onClick={(event) => event.stopPropagation()}
          >
            <button
              type="button"
              onClick={closeEditModal}
              className="absolute top-0 -right-10 sm:-right-11 inline-flex h-8 w-8 items-center justify-center rounded-md border border-border bg-background text-sm font-semibold transition-all duration-200 hover:scale-105 hover:bg-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF5B00]"
              aria-label={isTh ? "ปิด" : "Close"}
            >
              X
            </button>
            <h3 className="text-lg font-semibold">
              {isTh ? "แก้ไขหมวดงาน" : "Edit Category"}
            </h3>
            <div className="mt-4 space-y-3">
              <div className="relative aspect-3/2 overflow-hidden rounded-md border border-border bg-background">
                <Image
                  src={editCoverPreview || getSafeCoverUrl(editTarget.coverUrl)}
                  alt={editTarget.name}
                  fill
                  sizes="(max-width: 1024px) 100vw, 700px"
                  className="object-cover"
                />
              </div>

              <input
                type="text"
                value={editName}
                onChange={(event) => setEditName(event.target.value)}
                placeholder={isTh ? "ชื่อหมวดงาน (TH)" : "Category Name (TH)"}
                className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
                disabled={saving}
              />

              <input
                type="text"
                value={editNameEn}
                onChange={(event) => setEditNameEn(event.target.value)}
                placeholder={isTh ? "ชื่อหมวดงาน (EN)" : "Category Name (EN)"}
                className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
                disabled={saving}
              />

              <input
                type="file"
                accept="image/png,image/jpeg,image/webp,image/avif"
                onChange={onEditCoverChange}
                className="block w-full cursor-pointer rounded-md border border-border bg-background px-3 py-2 text-sm file:mr-3 file:rounded-md file:border-0 file:bg-[#FF5B00] file:px-3 file:py-2 file:text-white"
                disabled={saving}
              />
              <p className="text-xs text-muted-foreground">
                {isTh
                  ? "ใช้ภาพอัตราส่วน 3:2 เเนวนอนเท่านั้น"
                  : "Use landscape 3:2 images only"}
              </p>
            </div>

            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                onClick={closeEditModal}
                disabled={saving}
                className="rounded-md border border-border px-4 py-2 text-sm transition-all duration-200 hover:-translate-y-0.5 hover:bg-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF5B00]"
              >
                {isTh ? "ยกเลิก" : "Cancel"}
              </button>
              <button
                type="button"
                onClick={saveEditModal}
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
          </div>
        </div>
      )}
    </AdminSectionLayout>
  );
}
