"use client";

import Image from "next/image";
import { ChangeEvent, useEffect, useMemo, useState } from "react";
import AdminSectionLayout from "@/components/admin/AdminSectionLayout";
import { useLang } from "@/lib/i18n";
import {
  OpeningModalItem,
  OpeningModalTargetPage,
  OpeningModalTriggerMode,
  SiteContent,
  defaultSiteContent,
} from "@/lib/site-content-types";

interface UploadAssetOptions {
  folder?: string;
  publicId?: string;
  overwrite?: boolean;
  deletePublicId?: string;
}

interface OpeningModalDraft {
  id: string;
  imageUrl: string;
  linkUrl: string;
  isActive: boolean;
  mode: "welcome" | "promotion";
  targetPages: OpeningModalTargetPage[];
  triggerMode: OpeningModalTriggerMode;
  priority: number;
  startAt: string;
  endAt: string;
  minIntervalHours: number;
}

const MODAL_RECOMMENDED_SIZE = 960;
const TARGET_PAGE_OPTIONS: Array<{
  value: OpeningModalTargetPage;
  labelTh: string;
  labelEn: string;
}> = [
  { value: "home", labelTh: "หน้า Home", labelEn: "Home" },
  { value: "blog", labelTh: "หน้า Blog", labelEn: "Blog" },
  { value: "news", labelTh: "หน้า News", labelEn: "News" },
  { value: "download", labelTh: "หน้า Download", labelEn: "Download" },
];

const DEFAULT_TARGET_PAGES: OpeningModalTargetPage[] = TARGET_PAGE_OPTIONS.map(
  (item) => item.value,
);

const createId = (prefix: string) =>
  `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

const createEmptyDraft = (): OpeningModalDraft => ({
  id: createId("opening-modal"),
  imageUrl: "",
  linkUrl: "",
  isActive: true,
  mode: "promotion",
  targetPages: DEFAULT_TARGET_PAGES,
  triggerMode: "delay",
  priority: 100,
  startAt: "",
  endAt: "",
  minIntervalHours: 24,
});

const normalizeOpeningModals = (content: SiteContent): OpeningModalItem[] => {
  const source = Array.isArray(content.openingModals)
    ? content.openingModals
    : [];

  return source.map((item, index) => ({
    ...item,
    id: item.id || createId(`opening-modal-${index + 1}`),
    imageUrl: item.imageUrl || "",
    linkUrl: item.linkUrl || "",
    isActive: item.isActive !== false,
    mode: item.mode || "promotion",
    targetPages:
      Array.isArray(item.targetPages) && item.targetPages.length > 0
        ? item.targetPages
        : DEFAULT_TARGET_PAGES,
    triggerMode: item.triggerMode || "delay",
    priority: Number.isFinite(item.priority) ? Number(item.priority) : 100,
    startAt: item.startAt || "",
    endAt: item.endAt || "",
    minIntervalHours: Number.isFinite(item.minIntervalHours)
      ? Number(item.minIntervalHours)
      : 24,
    createdAt: item.createdAt || new Date().toISOString(),
    updatedAt: item.updatedAt || new Date().toISOString(),
  }));
};

async function uploadAsset(
  file: File,
  options?: UploadAssetOptions,
): Promise<string> {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("folder", options?.folder || "Yolk Corner/opening-modal");
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

  const data = await res.json().catch(() => null);
  if (!res.ok || !data?.url) {
    throw new Error(data?.error || "Upload failed");
  }

  return data.url as string;
}

export default function AdminOpeningModalPage() {
  const { lang } = useLang();
  const isTh = lang === "th";

  const [content, setContent] = useState<SiteContent>(defaultSiteContent);
  const [draftItems, setDraftItems] = useState<OpeningModalItem[]>([]);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formDraft, setFormDraft] =
    useState<OpeningModalDraft>(createEmptyDraft);
  const [formFile, setFormFile] = useState<File | null>(null);
  const [formPreviewUrl, setFormPreviewUrl] = useState("");

  const [deleteTarget, setDeleteTarget] = useState<OpeningModalItem | null>(
    null,
  );

  const sortedItems = useMemo(
    () =>
      [...draftItems].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)),
    [draftItems],
  );

  useEffect(() => {
    const initialize = async () => {
      try {
        const contentRes = await fetch("/api/content", { cache: "no-store" });
        if (!contentRes.ok) {
          setMessage(
            isTh
              ? "โหลดข้อมูล Opening Modal ไม่สำเร็จ"
              : "Failed to load Opening Modal data",
          );
          return;
        }

        const contentData = await contentRes.json();
        if (contentData?.content) {
          const loaded = contentData.content as SiteContent;
          setContent(loaded);
          setDraftItems(normalizeOpeningModals(loaded));
        }
      } catch (error) {
        console.error(error);
        setMessage(
          isTh
            ? "โหลดข้อมูล Opening Modal ไม่สำเร็จ"
            : "Failed to load Opening Modal data",
        );
      }
    };

    initialize();
  }, [isTh]);

  useEffect(() => {
    return () => {
      if (formPreviewUrl) URL.revokeObjectURL(formPreviewUrl);
    };
  }, [formPreviewUrl]);

  const closeForm = () => {
    if (formPreviewUrl) URL.revokeObjectURL(formPreviewUrl);
    setFormOpen(false);
    setEditingId(null);
    setFormFile(null);
    setFormPreviewUrl("");
    setFormDraft(createEmptyDraft());
    setOpenMenuId(null);
  };

  const openAddForm = () => {
    if (formPreviewUrl) URL.revokeObjectURL(formPreviewUrl);
    setFormOpen(true);
    setEditingId(null);
    setFormFile(null);
    setFormPreviewUrl("");
    setFormDraft(createEmptyDraft());
    setMessage("");
  };

  const openEditForm = (item: OpeningModalItem) => {
    if (formPreviewUrl) URL.revokeObjectURL(formPreviewUrl);
    setFormOpen(true);
    setEditingId(item.id);
    setFormFile(null);
    setFormPreviewUrl("");
    setFormDraft({
      id: item.id,
      imageUrl: item.imageUrl,
      linkUrl: item.linkUrl,
      isActive: item.isActive,
      mode: item.mode || "promotion",
      targetPages:
        Array.isArray(item.targetPages) && item.targetPages.length > 0
          ? item.targetPages
          : DEFAULT_TARGET_PAGES,
      triggerMode: item.triggerMode || "delay",
      priority: Number.isFinite(item.priority) ? Number(item.priority) : 100,
      startAt: item.startAt || "",
      endAt: item.endAt || "",
      minIntervalHours: Number.isFinite(item.minIntervalHours)
        ? Number(item.minIntervalHours)
        : 24,
    });
    setOpenMenuId(null);
    setMessage("");
  };

  const onFormFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0] || null;
    if (!file) return;

    if (formPreviewUrl) URL.revokeObjectURL(formPreviewUrl);
    setFormFile(file);
    setFormPreviewUrl(URL.createObjectURL(file));
  };

  const saveAll = async (nextItems: OpeningModalItem[]) => {
    const nextContent: SiteContent = {
      ...content,
      openingModals: nextItems,
    };

    const saveRes = await fetch("/api/content", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content: nextContent }),
    });

    const saveData = await saveRes.json().catch(() => null);
    if (!saveRes.ok || !saveData?.content) {
      throw new Error(saveData?.error || "Failed to save data");
    }

    const savedContent = saveData.content as SiteContent;
    setContent(savedContent);
    setDraftItems(normalizeOpeningModals(savedContent));
  };

  const saveForm = async () => {
    const normalizedLink = formDraft.linkUrl.trim();
    const normalizedStartAt = formDraft.startAt.trim();
    const normalizedEndAt = formDraft.endAt.trim();
    const normalizedTargetPages = formDraft.targetPages;
    const minIntervalHours = Math.max(
      0,
      Number(formDraft.minIntervalHours) || 0,
    );
    // snoozeHours and muteDaysAfterClick removed
    const priority = Number(formDraft.priority) || 0;

    if (!formDraft.imageUrl && !formFile) {
      setMessage(
        isTh
          ? "กรุณาอัปโหลดรูป Opening Modal"
          : "Please upload an Opening Modal image",
      );
      return;
    }

    if (!normalizedLink) {
      setMessage(
        isTh ? "กรุณากรอกลิงก์ปลายทาง" : "Please provide a destination link",
      );
      return;
    }

    if (normalizedTargetPages.length === 0) {
      setMessage(
        isTh
          ? "กรุณาเลือกหน้าเป้าหมายอย่างน้อย 1 หน้า"
          : "Please select at least one target page",
      );
      return;
    }

    if (normalizedStartAt && normalizedEndAt) {
      const startTime = new Date(normalizedStartAt).getTime();
      const endTime = new Date(normalizedEndAt).getTime();
      if (
        Number.isFinite(startTime) &&
        Number.isFinite(endTime) &&
        endTime <= startTime
      ) {
        setMessage(
          isTh
            ? "เวลาสิ้นสุดต้องมากกว่าเวลาเริ่มต้น"
            : "End time must be later than start time",
        );
        return;
      }
    }

    setSaving(true);
    setMessage(isTh ? "กำลังบันทึก..." : "Saving...");

    try {
      let imageUrl = formDraft.imageUrl;

      if (formFile) {
        imageUrl = await uploadAsset(formFile, {
          folder: "Yolk Corner/opening-modal",
          publicId: `Yolk Corner/opening-modal/${formDraft.id}`,
          overwrite: true,
        });
      }

      const now = new Date().toISOString();
      const existing = draftItems.find((item) => item.id === formDraft.id);

      const nextItem: OpeningModalItem = {
        id: formDraft.id,
        imageUrl,
        linkUrl: normalizedLink,
        isActive: formDraft.isActive,
        mode: formDraft.mode,
        targetPages: normalizedTargetPages,
        triggerMode: formDraft.triggerMode,
        priority,
        startAt: normalizedStartAt,
        endAt: normalizedEndAt,
        minIntervalHours,
        // snoozeHours and muteDaysAfterClick removed
        createdAt: existing?.createdAt || now,
        updatedAt: now,
      };

      const nextItems = existing
        ? draftItems.map((item) => (item.id === nextItem.id ? nextItem : item))
        : [nextItem, ...draftItems];

      await saveAll(nextItems);
      closeForm();
      setMessage(
        isTh
          ? "บันทึก กล่องป๊อปอัพ เรียบร้อยแล้ว"
          : "Pop-up Modal saved successfully",
      );
    } catch (error) {
      console.error(error);
      setMessage(
        isTh
          ? "บันทึก Opening Modal ไม่สำเร็จ"
          : "Failed to save Opening Modal",
      );
    } finally {
      setSaving(false);
    }
  };

  const requestDelete = (item: OpeningModalItem) => {
    setDeleteTarget(item);
    setOpenMenuId(null);
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;

    setSaving(true);
    setMessage(isTh ? "กำลังลบ..." : "Deleting...");

    try {
      const nextItems = draftItems.filter(
        (item) => item.id !== deleteTarget.id,
      );
      await saveAll(nextItems);
      setDeleteTarget(null);
      setMessage(
        isTh
          ? "ลบ กล่องป๊อปอัพ เรียบร้อยแล้ว"
          : "Pop-up Modal deleted successfully",
      );
    } catch (error) {
      console.error(error);
      setMessage(
        isTh ? "ลบ กล่องป๊อปอัพ ไม่สำเร็จ" : "Failed to delete Pop-up Modal",
      );
    } finally {
      setSaving(false);
    }
  };

  const previewSrc = formPreviewUrl || formDraft.imageUrl || "/hero-bg.png";

  return (
    <AdminSectionLayout
      title={isTh ? "กล่องป๊อปอัพ" : "Pop-up Modals"}
      description={
        isTh
          ? "จัดการ Welcome/Promotion Modal พร้อมช่วงเวลาและความถี่ในการแสดง"
          : "Manage Welcome/Promotion modals with schedule and frequency controls."
      }
    >
      <section className="space-y-4 rounded-lg border border-border bg-card p-6">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-base font-semibold">
            {isTh ? "รายการ กล่องป๊อปอัพ" : "Pop-up Modal List"}
          </h2>
          <button
            type="button"
            onClick={openAddForm}
            className="rounded-md border border-[#FF5B00] bg-[#FF5B00] px-4 py-2 text-sm text-white transition-colors hover:bg-[#e65200]"
          >
            {isTh ? "เพิ่มกล่องป๊อปอัพ" : "Add Pop-up Modal"}
          </button>
        </div>

        {sortedItems.length === 0 ? (
          <div className="rounded-md border border-dashed border-border bg-background p-6 text-sm text-muted-foreground">
            {isTh
              ? "ยังไม่มี กล่องป๊อปอัพ ที่บันทึกไว้"
              : "No saved Pop-up Modals yet."}
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
            {sortedItems.map((item) => (
              <div
                key={item.id}
                className="relative overflow-hidden rounded-md border border-border bg-background"
              >
                <div className="absolute right-2 top-2 z-20">
                  <button
                    type="button"
                    onClick={() =>
                      setOpenMenuId((prev) =>
                        prev === item.id ? null : item.id,
                      )
                    }
                    className="rounded-md border border-border bg-background px-2 py-1 text-xs"
                    aria-label={isTh ? "เมนู" : "Menu"}
                  >
                    ...
                  </button>
                  {openMenuId === item.id && (
                    <div className="absolute right-0 mt-1 w-28 rounded-md border border-border bg-background shadow-md">
                      <button
                        type="button"
                        onClick={() => openEditForm(item)}
                        className="block w-full px-3 py-2 text-left text-xs hover:bg-secondary"
                      >
                        {isTh ? "แก้ไข" : "Edit"}
                      </button>
                      <button
                        type="button"
                        onClick={() => requestDelete(item)}
                        className="block w-full px-3 py-2 text-left text-xs hover:bg-secondary"
                      >
                        {isTh ? "ลบ" : "Delete"}
                      </button>
                    </div>
                  )}
                </div>

                <div className="relative aspect-square w-full overflow-hidden border-b border-border">
                  <Image
                    src={item.imageUrl || "/hero-bg.png"}
                    alt="Opening modal"
                    fill
                    sizes="(max-width: 1024px) 100vw, 320px"
                    className="object-cover"
                  />
                </div>

                <div className="space-y-2 p-3 text-xs">
                  <p className="line-clamp-1 text-muted-foreground">
                    {item.linkUrl || "-"}
                  </p>
                  <p className="text-muted-foreground">
                    {isTh ? "โหมด:" : "Mode:"}{" "}
                    {item.mode === "welcome"
                      ? isTh
                        ? "ต้อนรับ"
                        : "Welcome"
                      : isTh
                        ? "โปรโมชั่น"
                        : "Promotion"}
                  </p>
                  {item.mode !== "welcome" && (
                    <p className="text-muted-foreground">
                      {isTh ? "ความถี่:" : "Frequency:"}{" "}
                      {item.minIntervalHours || 24}h
                    </p>
                  )}
                  <p className="text-muted-foreground">
                    {isTh ? "หน้าเป้าหมาย:" : "Targets:"}{" "}
                    {(item.targetPages || DEFAULT_TARGET_PAGES).join(", ")}
                  </p>
                  <p className="text-muted-foreground">
                    {isTh ? "Trigger:" : "Trigger:"}{" "}
                    {item.triggerMode === "scroll-30"
                      ? isTh
                        ? "เลื่อน 30%"
                        : "Scroll 30%"
                      : isTh
                        ? "หน่วงเวลา"
                        : "Delay"}
                  </p>
                  <span
                    className={`inline-flex rounded-full px-2 py-1 text-[11px] ${
                      item.isActive
                        ? "bg-[#FF5B00]/15 text-[#FF5B00]"
                        : "bg-secondary text-muted-foreground"
                    }`}
                  >
                    {item.isActive
                      ? isTh
                        ? "Active"
                        : "Active"
                      : isTh
                        ? "Inactive"
                        : "Inactive"}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}

        {message && (
          <p className="text-sm text-muted-foreground" role="status">
            {message}
          </p>
        )}
      </section>

      {formOpen && (
        <div className="fixed inset-0 z-60 flex items-center justify-center bg-black/55 p-4">
          <div
            className="relative w-full max-w-3xl rounded-lg border border-border bg-card p-5"
            onClick={(event) => event.stopPropagation()}
          >
            <button
              type="button"
              onClick={closeForm}
              className="absolute top-0 -right-10 sm:-right-11 inline-flex h-8 w-8 items-center justify-center rounded-md border border-border bg-background text-sm font-semibold transition-all duration-200 hover:scale-105 hover:bg-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF5B00]"
              aria-label={isTh ? "ปิด" : "Close"}
            >
              X
            </button>
            <h3 className="text-lg font-semibold">
              {editingId
                ? isTh
                  ? "แก้ไขกล่องป๊อปอัพ"
                  : "Edit Pop-up Modal"
                : isTh
                  ? "เพิ่มกล่องป๊อปอัพ"
                  : "Add Pop-up Modal"}
            </h3>

            <div className="mt-4 grid grid-cols-1 gap-5 lg:grid-cols-2">
              <div className="space-y-2">
                <p className="text-sm font-medium">
                  {isTh ? "ตัวอย่างกล่องป๊อปอัพ" : "Pop-up Modal Preview"}
                </p>
                <div className="relative aspect-square overflow-hidden rounded-md border border-border bg-background">
                  <Image
                    src={previewSrc}
                    alt="Pop-up modal preview"
                    fill
                    sizes="(max-width: 1024px) 100vw, 420px"
                    className="object-cover"
                  />
                  <button
                    type="button"
                    className="absolute right-2 top-2 inline-flex h-7 w-7 items-center justify-center rounded-full bg-black/70 text-xs font-bold text-white"
                    aria-label={isTh ? "ปิด" : "Close"}
                  >
                    x
                  </button>
                </div>
              </div>

              <div className="space-y-3">
                <div className="space-y-2">
                  <label
                    htmlFor="opening-modal-image"
                    className="text-sm font-medium"
                  >
                    {isTh ? "รูปภาพสำหรับ Modal" : "Modal Image"}
                  </label>
                  <input
                    id="opening-modal-image"
                    type="file"
                    accept="image/png,image/jpeg,image/webp,image/avif"
                    onChange={onFormFileChange}
                    className="block w-full cursor-pointer rounded-md border border-border bg-background px-3 py-2 text-sm file:mr-3 file:rounded-md file:border-0 file:bg-[#FF5B00] file:px-3 file:py-2 file:text-white"
                    disabled={saving}
                  />
                  <p className="text-xs text-muted-foreground">
                    {isTh
                      ? `ขนาดแนะนำ ${MODAL_RECOMMENDED_SIZE} x ${MODAL_RECOMMENDED_SIZE} px (อัตราส่วน 1:1)`
                      : `Recommended size: ${MODAL_RECOMMENDED_SIZE} x ${MODAL_RECOMMENDED_SIZE} px (1:1 ratio)`}
                  </p>
                </div>

                <div className="space-y-2">
                  <label
                    htmlFor="opening-modal-link"
                    className="text-sm font-medium"
                  >
                    {isTh
                      ? "ลิงก์ปลายทางเมื่อคลิก Modal"
                      : "Destination Link On Modal Click"}
                  </label>
                  <input
                    id="opening-modal-link"
                    type="text"
                    value={formDraft.linkUrl}
                    onChange={(event) =>
                      setFormDraft((prev) => ({
                        ...prev,
                        linkUrl: event.target.value,
                      }))
                    }
                    placeholder={
                      isTh
                        ? "เช่น /portfolio หรือ https://example.com"
                        : "e.g. /portfolio or https://example.com"
                    }
                    className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
                    disabled={saving}
                  />
                </div>

                <label className="inline-flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={formDraft.isActive}
                    onChange={(event) =>
                      setFormDraft((prev) => ({
                        ...prev,
                        isActive: event.target.checked,
                      }))
                    }
                    disabled={saving}
                  />
                  {isTh ? "Active (ติ๊กเพื่อแสดงผล)" : "Active (tick to show)"}
                </label>

                <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                  <div className="space-y-2">
                    <label
                      htmlFor="opening-modal-mode"
                      className="text-sm font-medium"
                    >
                      {isTh ? "โหมด" : "Mode"}
                    </label>
                    <select
                      id="opening-modal-mode"
                      value={formDraft.mode}
                      onChange={(event) =>
                        setFormDraft((prev) => ({
                          ...prev,
                          mode: event.target.value as "welcome" | "promotion",
                        }))
                      }
                      className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
                      disabled={saving}
                    >
                      <option value="promotion">
                        {isTh ? "Promotion" : "Promotion"}
                      </option>
                      <option value="welcome">
                        {isTh ? "Welcome" : "Welcome"}
                      </option>
                    </select>
                  </div>

                  <div className="space-y-2">
                    <label
                      htmlFor="opening-modal-priority"
                      className="text-sm font-medium"
                    >
                      {isTh
                        ? "Priority (เลขมาก่อน)"
                        : "Priority (higher first)"}
                    </label>
                    <input
                      id="opening-modal-priority"
                      type="number"
                      value={formDraft.priority}
                      onChange={(event) =>
                        setFormDraft((prev) => ({
                          ...prev,
                          priority: Number(event.target.value) || 0,
                        }))
                      }
                      className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
                      disabled={saving}
                    />
                  </div>

                  <div className="space-y-2 md:col-span-2">
                    <label className="text-sm font-medium">
                      {isTh ? "หน้าเป้าหมาย" : "Target Pages"}
                    </label>
                    <div className="grid grid-cols-2 gap-2 rounded-md border border-border bg-background p-3 text-sm">
                      {TARGET_PAGE_OPTIONS.map((option) => (
                        <label
                          key={option.value}
                          className="inline-flex items-center gap-2"
                        >
                          <input
                            type="checkbox"
                            checked={formDraft.targetPages.includes(
                              option.value,
                            )}
                            onChange={(event) =>
                              setFormDraft((prev) => ({
                                ...prev,
                                targetPages: event.target.checked
                                  ? [...prev.targetPages, option.value]
                                  : prev.targetPages.filter(
                                      (item) => item !== option.value,
                                    ),
                              }))
                            }
                            disabled={saving}
                          />
                          <span>{isTh ? option.labelTh : option.labelEn}</span>
                        </label>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-2 md:col-span-2">
                    <label
                      htmlFor="opening-modal-trigger-mode"
                      className="text-sm font-medium"
                    >
                      {isTh ? "Trigger การแสดง" : "Display Trigger"}
                    </label>
                    <select
                      id="opening-modal-trigger-mode"
                      value={formDraft.triggerMode}
                      onChange={(event) =>
                        setFormDraft((prev) => ({
                          ...prev,
                          triggerMode: event.target
                            .value as OpeningModalTriggerMode,
                        }))
                      }
                      className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
                      disabled={saving}
                    >
                      <option value="delay">
                        {isTh ? "หน่วงเวลาแล้วแสดง" : "Show after delay"}
                      </option>
                      <option value="scroll-30">
                        {isTh
                          ? "เลื่อนจอ 30% ก่อนแสดง"
                          : "Show after 30% scroll"}
                      </option>
                    </select>
                  </div>

                  <div className="space-y-2">
                    <label
                      htmlFor="opening-modal-start-at"
                      className="text-sm font-medium"
                    >
                      {isTh ? "เริ่มแสดง (ไม่บังคับ)" : "Start At (optional)"}
                    </label>
                    <input
                      id="opening-modal-start-at"
                      type="datetime-local"
                      value={formDraft.startAt}
                      onChange={(event) =>
                        setFormDraft((prev) => ({
                          ...prev,
                          startAt: event.target.value,
                        }))
                      }
                      className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
                      disabled={saving}
                    />
                  </div>

                  <div className="space-y-2">
                    <label
                      htmlFor="opening-modal-end-at"
                      className="text-sm font-medium"
                    >
                      {isTh ? "สิ้นสุดแสดง (ไม่บังคับ)" : "End At (optional)"}
                    </label>
                    <input
                      id="opening-modal-end-at"
                      type="datetime-local"
                      value={formDraft.endAt}
                      onChange={(event) =>
                        setFormDraft((prev) => ({
                          ...prev,
                          endAt: event.target.value,
                        }))
                      }
                      className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
                      disabled={saving}
                    />
                  </div>

                  <div className="space-y-2">
                    <label
                      htmlFor="opening-modal-frequency"
                      className="text-sm font-medium"
                    >
                      {isTh ? "แสดงซ้ำทุก (ชั่วโมง)" : "Repeat every (hours)"}
                    </label>
                    <input
                      id="opening-modal-frequency"
                      type="number"
                      min={0}
                      value={formDraft.minIntervalHours}
                      onChange={(event) =>
                        setFormDraft((prev) => ({
                          ...prev,
                          minIntervalHours: Number(event.target.value) || 0,
                        }))
                      }
                      className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
                      disabled={saving || formDraft.mode === "welcome"}
                    />
                  </div>

                  {/* snoozeHours and muteDaysAfterClick fields removed */}
                </div>
              </div>
            </div>

            <div className="mt-6 flex justify-end gap-2">
              <button
                type="button"
                onClick={closeForm}
                disabled={saving}
                className="rounded-md border border-border px-4 py-2 text-sm transition-all duration-200 hover:-translate-y-0.5 hover:bg-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF5B00] disabled:opacity-60"
              >
                {isTh ? "ยกเลิก" : "Cancel"}
              </button>
              <button
                type="button"
                onClick={saveForm}
                disabled={saving}
                className="rounded-md border border-[#FF5B00] bg-[#FF5B00] px-4 py-2 text-sm text-white transition-all duration-200 hover:-translate-y-0.5 hover:bg-[#e65200] hover:shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF5B00] disabled:opacity-60"
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

      {deleteTarget && (
        <div className="fixed inset-0 z-60 flex items-center justify-center bg-black/60 p-4">
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
            <h3 className="text-lg font-semibold">
              {isTh
                ? "ยืนยันการลบ Opening Modal"
                : "Confirm Opening Modal Deletion"}
            </h3>
            <p className="mt-2 text-sm text-muted-foreground">
              {isTh
                ? "คุณต้องการลบรายการนี้ใช่หรือไม่"
                : "Do you want to delete this item?"}
            </p>

            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setDeleteTarget(null)}
                disabled={saving}
                className="rounded-md border border-border px-4 py-2 text-sm transition-all duration-200 hover:-translate-y-0.5 hover:bg-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF5B00] disabled:opacity-60"
              >
                {isTh ? "ยกเลิก" : "Cancel"}
              </button>
              <button
                type="button"
                onClick={confirmDelete}
                disabled={saving}
                className="rounded-md border border-[#FF5B00] bg-[#FF5B00] px-4 py-2 text-sm text-white transition-all duration-200 hover:-translate-y-0.5 hover:bg-[#e65200] hover:shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF5B00] disabled:opacity-60"
              >
                {saving
                  ? isTh
                    ? "กำลังลบ..."
                    : "Deleting..."
                  : isTh
                    ? "ยืนยันลบ"
                    : "Delete"}
              </button>
            </div>
          </div>
        </div>
      )}
    </AdminSectionLayout>
  );
}
