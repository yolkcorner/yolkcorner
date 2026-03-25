"use client";

import Image from "next/image";
import { ChangeEvent, useEffect, useState } from "react";
import AdminSectionLayout from "@/components/admin/AdminSectionLayout";
import { FloatingLabelInput } from "@/components/FloatingLabelInput";
import { FloatingLabelTextarea } from "@/components/FloatingLabelTextarea";
import { useLang } from "@/lib/i18n";
import {
  AboutMember,
  SiteContent,
  defaultSiteContent,
} from "@/lib/site-content-types";

interface UploadAssetOptions {
  folder?: string;
  publicId?: string;
  overwrite?: boolean;
  deletePublicId?: string;
}

const PORTRAIT_WIDTH = 1200;
const PORTRAIT_HEIGHT = 1600;

const createId = (prefix: string) =>
  `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

const buildEmptyMember = (): AboutMember => ({
  id: createId("member"),
  name: "",
  nameEn: "",
  positionTitle: "",
  positionTitleEn: "",
  positionDescription: "",
  positionDescriptionEn: "",
  contactPhone: "",
  portfolioLink: "",
  socials: {
    instagram: { enabled: false, url: "" },
    facebook: { enabled: false, url: "" },
    tiktok: { enabled: false, url: "" },
  },
  imageUrl: "",
  roleTitle: "",
  details: "",
});

const getMemberDisplayName = (member: AboutMember, isTh: boolean) => {
  if (isTh) {
    return member.name?.trim() || member.nameEn?.trim() || "-";
  }

  return member.nameEn?.trim() || member.name?.trim() || "-";
};

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

const normalizeMember = (member: AboutMember): AboutMember => ({
  id: member.id,
  name: member.name || member.roleTitle || "",
  nameEn: member.nameEn || "",
  positionTitle: member.positionTitle || member.roleTitle || "",
  positionTitleEn: member.positionTitleEn || "",
  positionDescription: member.positionDescription || member.details || "",
  positionDescriptionEn: member.positionDescriptionEn || "",
  contactPhone: member.contactPhone || "",
  portfolioLink: member.portfolioLink || "",
  socials: {
    instagram: {
      enabled: member.socials?.instagram?.enabled ?? false,
      url: member.socials?.instagram?.url || "",
    },
    facebook: {
      enabled: member.socials?.facebook?.enabled ?? false,
      url: member.socials?.facebook?.url || "",
    },
    tiktok: {
      enabled: member.socials?.tiktok?.enabled ?? false,
      url: member.socials?.tiktok?.url || "",
    },
  },
  imageUrl: member.imageUrl || "",
  roleTitle: member.positionTitle || member.roleTitle || "",
  details: member.positionDescription || member.details || "",
});

export default function AdminAboutPage() {
  const { lang } = useLang();
  const isTh = lang === "th";
  const [content, setContent] = useState<SiteContent>(defaultSiteContent);
  const [aboutTitleDraft, setAboutTitleDraft] = useState("");
  const [aboutTitleDraftEn, setAboutTitleDraftEn] = useState("");
  const [aboutSubtitleDraft, setAboutSubtitleDraft] = useState("");
  const [aboutSubtitleDraftEn, setAboutSubtitleDraftEn] = useState("");
  const [draftMembers, setDraftMembers] = useState<AboutMember[]>([]);
  const [draftPortraitFiles, setDraftPortraitFiles] = useState<
    Record<string, File>
  >({});
  const [draftPortraitPreviews, setDraftPortraitPreviews] = useState<
    Record<string, string>
  >({});
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [memberModalOpen, setMemberModalOpen] = useState(false);
  const [memberModalMode, setMemberModalMode] = useState<"add" | "edit">("add");
  const [memberModal, setMemberModal] = useState<AboutMember | null>(null);
  const [memberModalFile, setMemberModalFile] = useState<File | null>(null);
  const [memberModalPreview, setMemberModalPreview] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<AboutMember | null>(null);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    const initialize = async () => {
      try {
        const contentRes = await fetch("/api/content", { cache: "no-store" });
        if (!contentRes.ok) {
          setMessage(
            isTh
              ? "โหลดข้อมูลเกี่ยวกับเราไม่สำเร็จ"
              : "Failed to load about content",
          );
          return;
        }

        const contentData = await contentRes.json();
        if (contentData?.content) {
          const loaded = contentData.content as SiteContent;
          const normalizedMembers = (loaded.about.members || []).map(
            normalizeMember,
          );
          setContent(loaded);
          setAboutTitleDraft(loaded.about.title || "");
          setAboutTitleDraftEn(loaded.about.titleEn || "");
          setAboutSubtitleDraft(loaded.about.subtitle || "");
          setAboutSubtitleDraftEn(loaded.about.subtitleEn || "");
          setDraftMembers(normalizedMembers);
        }
      } catch (error) {
        console.error(error);
        setMessage(
          isTh
            ? "โหลดข้อมูลเกี่ยวกับเราไม่สำเร็จ"
            : "Failed to load about content",
        );
      }
    };
    initialize();
  }, [isTh]);

  useEffect(() => {
    return () => {
      Object.values(draftPortraitPreviews).forEach((url) =>
        URL.revokeObjectURL(url),
      );
    };
  }, [draftPortraitPreviews]);

  useEffect(() => {
    return () => {
      if (memberModalPreview) URL.revokeObjectURL(memberModalPreview);
    };
  }, [memberModalPreview]);

  const clearPortraitDrafts = () => {
    Object.values(draftPortraitPreviews).forEach((url) =>
      URL.revokeObjectURL(url),
    );
    setDraftPortraitFiles({});
    setDraftPortraitPreviews({});
  };

  const hasInvalidMemberDraft = (members: AboutMember[]) =>
    members.some(
      (member) =>
        !member.name?.trim() ||
        !member.nameEn?.trim() ||
        !member.positionTitle?.trim() ||
        !member.positionTitleEn?.trim(),
    );

  const hasInvalidSocialDraft = (members: AboutMember[]) =>
    members.some((member) => {
      const socials = member.socials;
      if (!socials) return false;

      const instagramInvalid =
        socials.instagram?.enabled && !socials.instagram.url?.trim();
      const facebookInvalid =
        socials.facebook?.enabled && !socials.facebook.url?.trim();
      const tiktokInvalid =
        socials.tiktok?.enabled && !socials.tiktok.url?.trim();

      return Boolean(instagramInvalid || facebookInvalid || tiktokInvalid);
    });

  const persistAboutContent = async (
    nextMembers: AboutMember[],
    nextPortraitFiles: Record<string, File>,
    options?: {
      validateMembers?: boolean;
      savingText?: string;
      successText?: string;
      failedText?: string;
    },
  ) => {
    const shouldValidate = options?.validateMembers ?? true;

    if (shouldValidate && hasInvalidMemberDraft(nextMembers)) {
      setMessage(
        isTh
          ? "กรุณากรอกชื่อและตำแหน่งงานของสมาชิกทั้งภาษาไทยและอังกฤษให้ครบก่อนบันทึก"
          : "Please fill member name and position in both Thai and English",
      );
      return false;
    }

    if (shouldValidate && hasInvalidSocialDraft(nextMembers)) {
      setMessage(
        isTh
          ? "กรุณากรอกลิงก์ของโซเชียลที่เปิดใช้งานให้ครบก่อนบันทึก"
          : "Please fill URL for every enabled social account",
      );
      return false;
    }

    setSaving(true);
    setMessage(
      options?.savingText ||
        (isTh ? "กำลังบันทึกข้อมูลเกี่ยวกับเรา..." : "Saving about content..."),
    );

    try {
      let membersWithPortraits = [...nextMembers];

      for (const member of nextMembers) {
        const draftFile = nextPortraitFiles[member.id];
        if (!draftFile) continue;

        const previousImageUrl = content.about.members.find(
          (item) => item.id === member.id,
        )?.imageUrl;

        const uploadedImageUrl = await uploadAsset(draftFile, {
          folder: "Yolk Corner/about/members",
          publicId: `Yolk Corner/about/members/${member.id}`,
          overwrite: true,
          deletePublicId: previousImageUrl || undefined,
        });

        membersWithPortraits = membersWithPortraits.map((item) =>
          item.id === member.id
            ? { ...item, imageUrl: uploadedImageUrl }
            : item,
        );
      }

      const normalizedMembers = membersWithPortraits.map(normalizeMember);
      const nextContent: SiteContent = {
        ...content,
        about: {
          ...content.about,
          title: aboutTitleDraft,
          titleEn: aboutTitleDraftEn,
          subtitle: aboutSubtitleDraft,
          subtitleEn: aboutSubtitleDraftEn,
          members: normalizedMembers,
        },
      };

      const saveRes = await fetch("/api/content", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: nextContent }),
      });

      const saveData = await saveRes.json();
      if (!saveRes.ok || !saveData?.content) {
        throw new Error(saveData?.error || "Failed to save data");
      }

      const saved = saveData.content as SiteContent;
      const savedMembers = (saved.about.members || []).map(normalizeMember);
      setContent(saved);
      setAboutTitleDraft(saved.about.title || "");
      setAboutTitleDraftEn(saved.about.titleEn || "");
      setAboutSubtitleDraft(saved.about.subtitle || "");
      setAboutSubtitleDraftEn(saved.about.subtitleEn || "");
      setDraftMembers(savedMembers);
      clearPortraitDrafts();
      setOpenMenuId(null);
      setMessage(
        options?.successText ||
          (isTh
            ? "บันทึกข้อมูลเกี่ยวกับเราเรียบร้อยแล้ว"
            : "About content saved successfully"),
      );
      return true;
    } catch (error) {
      console.error(error);
      const detail = error instanceof Error ? error.message : "";
      setMessage(
        options?.failedText
          ? detail
            ? `${options.failedText}: ${detail}`
            : options.failedText
          : isTh
            ? detail
              ? `บันทึกข้อมูลเกี่ยวกับเราไม่สำเร็จ: ${detail}`
              : "บันทึกข้อมูลเกี่ยวกับเราไม่สำเร็จ"
            : detail
              ? `Failed to save about content: ${detail}`
              : "Failed to save about content",
      );
      return false;
    } finally {
      setSaving(false);
    }
  };

  const closeMemberModal = () => {
    setMemberModalOpen(false);
    setMemberModal(null);
    setMemberModalFile(null);
    if (memberModalPreview) URL.revokeObjectURL(memberModalPreview);
    setMemberModalPreview("");
  };

  const openAddMemberModal = () => {
    setMemberModalMode("add");
    setMemberModal(normalizeMember(buildEmptyMember()));
    setMemberModalFile(null);
    if (memberModalPreview) URL.revokeObjectURL(memberModalPreview);
    setMemberModalPreview("");
    setMemberModalOpen(true);
    setOpenMenuId(null);
    setMessage("");
  };

  const openEditMemberModal = (member: AboutMember) => {
    setMemberModalMode("edit");
    setMemberModal(normalizeMember({ ...member }));
    setMemberModalFile(null);
    if (memberModalPreview) URL.revokeObjectURL(memberModalPreview);
    setMemberModalPreview("");
    setMemberModalOpen(true);
    setOpenMenuId(null);
    setMessage("");
  };

  const requestDeleteMember = (member: AboutMember) => {
    setDeleteTarget(member);
    setOpenMenuId(null);
  };

  const confirmDeleteMember = async () => {
    if (!deleteTarget) return;

    const nextMembers = draftMembers.filter(
      (member) => member.id !== deleteTarget.id,
    );
    const nextPortraitFiles = { ...draftPortraitFiles };
    delete nextPortraitFiles[deleteTarget.id];

    const ok = await persistAboutContent(nextMembers, nextPortraitFiles, {
      validateMembers: true,
      savingText: isTh ? "กำลังลบสมาชิก..." : "Removing member...",
      successText: isTh
        ? "ลบสมาชิกเรียบร้อยแล้ว"
        : "Member removed successfully",
      failedText: isTh ? "ลบสมาชิกไม่สำเร็จ" : "Failed to remove member",
    });

    if (ok) {
      const previewToDelete = draftPortraitPreviews[deleteTarget.id];
      if (previewToDelete) URL.revokeObjectURL(previewToDelete);
      setDraftPortraitPreviews((prev) => {
        const next = { ...prev };
        delete next[deleteTarget.id];
        return next;
      });
      setDraftPortraitFiles((prev) => {
        const next = { ...prev };
        delete next[deleteTarget.id];
        return next;
      });
    }

    setDeleteTarget(null);
  };

  const onModalPortraitChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0] || null;
    if (!file) return;

    if (memberModalPreview) URL.revokeObjectURL(memberModalPreview);
    setMemberModalFile(file);
    setMemberModalPreview(URL.createObjectURL(file));
  };

  const saveMemberModal = async () => {
    if (!memberModal) return;

    const nextMember = normalizeMember({
      ...memberModal,
      roleTitle: memberModal.positionTitle || "",
      details: memberModal.positionDescription || "",
    });

    const missingBasicFields =
      !nextMember.name?.trim() ||
      !nextMember.nameEn?.trim() ||
      !nextMember.positionTitle?.trim() ||
      !nextMember.positionTitleEn?.trim();

    if (missingBasicFields) {
      setMessage(
        isTh
          ? "กรุณากรอกชื่อและตำแหน่งงานของสมาชิกทั้งภาษาไทยและอังกฤษให้ครบ"
          : "Please fill member name and position in both Thai and English",
      );
      return;
    }

    const hasInvalidSocialLink =
      (nextMember.socials?.instagram?.enabled &&
        !nextMember.socials.instagram.url?.trim()) ||
      (nextMember.socials?.facebook?.enabled &&
        !nextMember.socials.facebook.url?.trim()) ||
      (nextMember.socials?.tiktok?.enabled &&
        !nextMember.socials.tiktok.url?.trim());

    if (hasInvalidSocialLink) {
      setMessage(
        isTh
          ? "กรุณากรอกลิงก์ของโซเชียลที่เปิดใช้งานให้ครบก่อนบันทึก"
          : "Please fill URL for every enabled social account",
      );
      return;
    }

    const nextMembers =
      memberModalMode === "add"
        ? [...draftMembers, nextMember]
        : draftMembers.map((member) =>
            member.id === nextMember.id ? nextMember : member,
          );

    const nextPortraitFiles = { ...draftPortraitFiles };
    if (memberModalFile) {
      nextPortraitFiles[nextMember.id] = memberModalFile;
    }

    const ok = await persistAboutContent(nextMembers, nextPortraitFiles, {
      validateMembers: true,
      savingText: isTh ? "กำลังบันทึกสมาชิก..." : "Saving member...",
      successText:
        memberModalMode === "add"
          ? isTh
            ? "เพิ่มสมาชิกเรียบร้อยแล้ว"
            : "Member added successfully"
          : isTh
            ? "อัปเดตสมาชิกเรียบร้อยแล้ว"
            : "Member updated successfully",
      failedText: isTh ? "บันทึกสมาชิกไม่สำเร็จ" : "Failed to save member",
    });

    if (ok) {
      closeMemberModal();
    }
  };

  const handleCancel = () => {
    setAboutTitleDraft(content.about.title || "");
    setAboutTitleDraftEn(content.about.titleEn || "");
    setAboutSubtitleDraft(content.about.subtitle || "");
    setAboutSubtitleDraftEn(content.about.subtitleEn || "");
    setDraftMembers((content.about.members || []).map(normalizeMember));
    clearPortraitDrafts();
    setOpenMenuId(null);
    setDeleteTarget(null);
    closeMemberModal();
    setMessage(
      isTh ? "ยกเลิกการเปลี่ยนแปลงเกี่ยวกับเราแล้ว" : "About changes discarded",
    );
  };

  const handleSaveHeader = async () => {
    await persistAboutContent(draftMembers, draftPortraitFiles, {
      validateMembers: false,
      savingText: isTh ? "กำลังบันทึกหัวข้อ..." : "Saving header...",
      successText: isTh
        ? "บันทึกหัวข้อเรียบร้อยแล้ว"
        : "Header saved successfully",
      failedText: isTh ? "บันทึกหัวข้อไม่สำเร็จ" : "Failed to save header",
    });
  };

  return (
    <AdminSectionLayout
      title={isTh ? "เกี่ยวกับเรา" : "About"}
      description={
        isTh
          ? "จัดการสมาชิกทีมงาน พร้อมรูป ชื่อ ตำแหน่ง เบอร์ติดต่อ และลิงก์ผลงานส่วนตัว"
          : "Manage team members with image, names, positions, contacts, and portfolio links"
      }
    >
      <section className="rounded-lg border border-border bg-card p-6 space-y-6">
        <div className="rounded-md border border-border p-4 space-y-3">
          <h2 className="text-base font-semibold">
            {isTh ? "หัวข้อส่วนเกี่ยวกับเรา" : "About Section Header"}
          </h2>
          <FloatingLabelInput
            value={aboutTitleDraft}
            onChange={(event) => setAboutTitleDraft(event.target.value)}
            label={isTh ? "หัวข้อ (TH)" : "Title (TH)"}
            disabled={saving}
            id="about-title-th"
          />
          <FloatingLabelInput
            value={aboutTitleDraftEn}
            onChange={(event) => setAboutTitleDraftEn(event.target.value)}
            label={isTh ? "หัวข้อ (EN)" : "Title (EN)"}
            disabled={saving}
            id="about-title-en"
          />
          <FloatingLabelTextarea
            value={aboutSubtitleDraft}
            onChange={(event) => setAboutSubtitleDraft(event.target.value)}
            label={
              isTh ? "คำอธิบายส่วนเกี่ยวกับเรา (TH)" : "About subtitle (TH)"
            }
            rows={3}
            disabled={saving}
            id="about-subtitle-th"
          />
          <FloatingLabelTextarea
            value={aboutSubtitleDraftEn}
            onChange={(event) => setAboutSubtitleDraftEn(event.target.value)}
            label={
              isTh ? "คำอธิบายส่วนเกี่ยวกับเรา (EN)" : "About subtitle (EN)"
            }
            rows={3}
            disabled={saving}
            id="about-subtitle-en"
          />
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={handleCancel}
              disabled={saving}
              className="rounded-md border border-border px-4 py-2 text-sm text-foreground disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isTh ? "ยกเลิก" : "Cancel"}
            </button>
            <button
              type="button"
              onClick={handleSaveHeader}
              disabled={saving}
              className="rounded-md border border-[#FF5B00] bg-[#FF5B00] px-4 py-2 text-sm text-white transition-colors hover:bg-[#e65200] disabled:cursor-not-allowed disabled:opacity-50"
            >
              {saving
                ? isTh
                  ? "กำลังบันทึก..."
                  : "Saving..."
                : isTh
                  ? "บันทึกหัวข้อ"
                  : "Save Header"}
            </button>
          </div>
        </div>

        <div className="rounded-md border border-border bg-background p-4">
          <p className="text-sm text-muted-foreground">
            {isTh
              ? `แนะนำรูปโปรไฟล์แนวตั้ง (portrait) อย่างน้อย ${PORTRAIT_WIDTH} × ${PORTRAIT_HEIGHT} px เพื่อความคมชัดในการแสดงผล`
              : `Recommended portrait image size is at least ${PORTRAIT_WIDTH} × ${PORTRAIT_HEIGHT} px for better quality.`}
          </p>
        </div>

        <div className="space-y-3">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-base font-semibold">
              {isTh ? "สมาชิกทีมงาน" : "Team Members"}
            </h2>
            <button
              type="button"
              onClick={openAddMemberModal}
              disabled={saving}
              className="rounded-md border border-[#FF5B00] bg-[#FF5B00] px-4 py-2 text-sm text-white transition-colors hover:bg-[#e65200] disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isTh ? "เพิ่มสมาชิก" : "Add Member"}
            </button>
          </div>

          {draftMembers.length === 0 ? (
            <p className="rounded-md border border-border p-4 text-sm text-muted-foreground">
              {isTh ? "ยังไม่มีสมาชิกทีมงาน" : "No team members yet"}
            </p>
          ) : (
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
              {draftMembers.map((member) => {
                const previewSrc =
                  draftPortraitPreviews[member.id] || member.imageUrl || "";
                const enabledSocials = [
                  member.socials?.instagram?.enabled ? "Instagram" : null,
                  member.socials?.facebook?.enabled ? "Facebook" : null,
                  member.socials?.tiktok?.enabled ? "TikTok" : null,
                ].filter(Boolean);

                return (
                  <article
                    key={member.id}
                    className="relative overflow-hidden rounded-lg border border-border bg-background"
                  >
                    <div className="absolute right-3 top-3 z-20">
                      <button
                        type="button"
                        onClick={() =>
                          setOpenMenuId((prev) =>
                            prev === member.id ? null : member.id,
                          )
                        }
                        className="rounded-md border border-border bg-card px-2 py-1 text-sm"
                        aria-label={
                          isTh ? "เปิดเมนูสมาชิก" : "Open member menu"
                        }
                      >
                        ...
                      </button>
                      {openMenuId === member.id && (
                        <div className="absolute right-0 mt-1 w-36 rounded-md border border-border bg-card shadow-md">
                          <button
                            type="button"
                            onClick={() => openEditMemberModal(member)}
                            className="block w-full px-3 py-2 text-left text-sm hover:bg-secondary"
                          >
                            {isTh ? "แก้ไขสมาชิก" : "Edit Member"}
                          </button>
                          <button
                            type="button"
                            onClick={() => requestDeleteMember(member)}
                            className="block w-full px-3 py-2 text-left text-sm hover:bg-secondary"
                          >
                            {isTh ? "ลบสมาชิก" : "Delete Member"}
                          </button>
                        </div>
                      )}
                    </div>

                    <div
                      className="overflow-hidden border-b border-border bg-card"
                      style={{ aspectRatio: "4 / 5" }}
                    >
                      {previewSrc ? (
                        <Image
                          src={previewSrc}
                          alt={getMemberDisplayName(member, isTh)}
                          width={400}
                          height={500}
                          loading={
                            draftMembers.indexOf(member) === 0
                              ? "eager"
                              : "lazy"
                          }
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
                          {isTh ? "ยังไม่มีรูป" : "No image"}
                        </div>
                      )}
                    </div>

                    <div className="space-y-3 p-4">
                      <div>
                        <h3 className="text-lg font-semibold leading-tight">
                          {getMemberDisplayName(member, isTh)}
                        </h3>
                        <p className="text-sm text-muted-foreground">
                          {isTh
                            ? member.positionTitle || "-"
                            : member.positionTitleEn ||
                              member.positionTitle ||
                              "-"}
                        </p>
                      </div>

                      {(member.positionDescription ||
                        member.positionDescriptionEn) && (
                        <p className="line-clamp-3 text-sm text-muted-foreground">
                          {isTh
                            ? member.positionDescription || "-"
                            : member.positionDescriptionEn ||
                              member.positionDescription ||
                              "-"}
                        </p>
                      )}

                      <div className="space-y-1 text-sm text-muted-foreground">
                        <p>
                          {isTh ? "เบอร์ติดต่อ" : "Phone"}:{" "}
                          {member.contactPhone || "-"}
                        </p>
                        <p>
                          {isTh ? "ลิงก์ผลงาน" : "Portfolio"}:{" "}
                          {member.portfolioLink || "-"}
                        </p>
                      </div>

                      <div className="flex flex-wrap gap-2">
                        {enabledSocials.length > 0 ? (
                          enabledSocials.map((item) => (
                            <span
                              key={`${member.id}-${item}`}
                              className="rounded-full border border-border px-2.5 py-1 text-xs text-muted-foreground"
                            >
                              {item}
                            </span>
                          ))
                        ) : (
                          <span className="rounded-full border border-border px-2.5 py-1 text-xs text-muted-foreground">
                            {isTh
                              ? "ไม่มีโซเชียลที่เปิดใช้งาน"
                              : "No social enabled"}
                          </span>
                        )}
                      </div>
                    </div>
                  </article>
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

      {memberModalOpen && memberModal && (
        <div className="fixed inset-0 z-60 flex items-center justify-center bg-black/45 p-4">
          <div className="relative w-full max-w-3xl">
            <button
              type="button"
              onClick={closeMemberModal}
              className="absolute top-0 -right-10 sm:-right-11 inline-flex h-8 w-8 items-center justify-center rounded-md border border-border bg-background text-sm font-semibold transition-all duration-200 hover:scale-105 hover:bg-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF5B00]"
              aria-label={isTh ? "ปิด" : "Close"}
            >
              X
            </button>
            <div
              className="max-h-[90vh] w-full overflow-y-auto rounded-lg border border-border bg-card p-5"
              onClick={(event) => event.stopPropagation()}
            >
              <div className="flex items-center justify-between gap-3">
                <h3 className="text-lg font-semibold">
                  {memberModalMode === "add"
                    ? isTh
                      ? "เพิ่มสมาชิกทีมงาน"
                      : "Add Team Member"
                    : isTh
                      ? "แก้ไขข้อมูลสมาชิก"
                      : "Edit Team Member"}
                </h3>
                <button
                  type="button"
                  onClick={closeMemberModal}
                  disabled={saving}
                  className="rounded-md border border-border px-3 py-1 text-sm disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {isTh ? "ปิด" : "Close"}
                </button>
              </div>

              {message && (
                <div className="mt-3 rounded-md bg-secondary border border-border p-3 text-sm text-foreground">
                  {message}
                </div>
              )}

              <div className="mt-4 grid grid-cols-1 gap-5 lg:grid-cols-[240px_1fr]">
                <div className="space-y-3">
                  <div className="overflow-hidden rounded-md border border-border bg-background">
                    {memberModalPreview || memberModal.imageUrl ? (
                      <Image
                        src={memberModalPreview || memberModal.imageUrl || ""}
                        alt={getMemberDisplayName(memberModal, isTh)}
                        width={240}
                        height={320}
                        loading="eager"
                        className="h-auto w-full object-cover"
                      />
                    ) : (
                      <div className="flex h-80 items-center justify-center text-sm text-muted-foreground">
                        {isTh ? "ยังไม่มีรูป" : "No image"}
                      </div>
                    )}
                  </div>
                  <input
                    type="file"
                    accept="image/png,image/jpeg,image/webp,image/avif"
                    onChange={onModalPortraitChange}
                    className="block w-full cursor-pointer rounded-md border border-border bg-background px-3 py-2 text-sm file:mr-3 file:rounded-md file:border-0 file:bg-[#FF5B00] file:px-3 file:py-2 file:text-white"
                    disabled={saving}
                  />
                </div>

                <div className="space-y-3">
                  <FloatingLabelInput
                    value={memberModal.name || ""}
                    onChange={(event) =>
                      setMemberModal((prev) =>
                        prev ? { ...prev, name: event.target.value } : prev,
                      )
                    }
                    label={isTh ? "ชื่อ (TH)" : "Name (TH)"}
                    disabled={saving}
                    id="member-name-th"
                  />
                  <FloatingLabelInput
                    value={memberModal.nameEn || ""}
                    onChange={(event) =>
                      setMemberModal((prev) =>
                        prev ? { ...prev, nameEn: event.target.value } : prev,
                      )
                    }
                    label="Name (EN)"
                    disabled={saving}
                    id="member-name-en"
                  />
                  <FloatingLabelInput
                    value={memberModal.positionTitle || ""}
                    onChange={(event) =>
                      setMemberModal((prev) =>
                        prev
                          ? { ...prev, positionTitle: event.target.value }
                          : prev,
                      )
                    }
                    label={isTh ? "ตำแหน่งงาน (TH)" : "Position (TH)"}
                    disabled={saving}
                    id="member-position-th"
                  />
                  <FloatingLabelInput
                    value={memberModal.positionTitleEn || ""}
                    onChange={(event) =>
                      setMemberModal((prev) =>
                        prev
                          ? { ...prev, positionTitleEn: event.target.value }
                          : prev,
                      )
                    }
                    label="Position (EN)"
                    disabled={saving}
                    id="member-position-en"
                  />
                  <FloatingLabelTextarea
                    value={memberModal.positionDescription || ""}
                    onChange={(event) =>
                      setMemberModal((prev) =>
                        prev
                          ? {
                              ...prev,
                              positionDescription: event.target.value,
                            }
                          : prev,
                      )
                    }
                    label={
                      isTh
                        ? "คำอธิบายตำแหน่งงาน (TH)"
                        : "Position description (TH)"
                    }
                    rows={3}
                    disabled={saving}
                    id="member-position-desc-th"
                  />
                  <FloatingLabelTextarea
                    value={memberModal.positionDescriptionEn || ""}
                    onChange={(event) =>
                      setMemberModal((prev) =>
                        prev
                          ? {
                              ...prev,
                              positionDescriptionEn: event.target.value,
                            }
                          : prev,
                      )
                    }
                    label="Position description (EN)"
                    rows={3}
                    disabled={saving}
                    id="member-position-desc-en"
                  />
                  <FloatingLabelInput
                    value={memberModal.contactPhone || ""}
                    onChange={(event) =>
                      setMemberModal((prev) =>
                        prev
                          ? { ...prev, contactPhone: event.target.value }
                          : prev,
                      )
                    }
                    label={isTh ? "เบอร์ติดต่อ" : "Phone number"}
                    disabled={saving}
                    id="member-phone"
                  />
                  <FloatingLabelInput
                    value={memberModal.portfolioLink || ""}
                    onChange={(event) =>
                      setMemberModal((prev) =>
                        prev
                          ? { ...prev, portfolioLink: event.target.value }
                          : prev,
                      )
                    }
                    label={isTh ? "ลิงก์ผลงานส่วนตัว" : "Portfolio URL"}
                    disabled={saving}
                    id="member-portfolio"
                  />

                  <div className="rounded-md border border-border p-3 space-y-3">
                    <p className="text-sm font-medium">
                      {isTh ? "โซเชียลมีเดีย" : "Social Media"}
                    </p>

                    <div className="space-y-2">
                      <label className="flex items-center gap-2 text-sm">
                        <input
                          type="checkbox"
                          checked={
                            memberModal.socials?.instagram?.enabled ?? false
                          }
                          onChange={(event) =>
                            setMemberModal((prev) =>
                              prev
                                ? {
                                    ...prev,
                                    socials: {
                                      ...prev.socials,
                                      instagram: {
                                        enabled: event.target.checked,
                                        url: prev.socials?.instagram?.url || "",
                                      },
                                    },
                                  }
                                : prev,
                            )
                          }
                          disabled={saving}
                        />
                        Instagram
                      </label>
                      <FloatingLabelInput
                        value={memberModal.socials?.instagram?.url || ""}
                        onChange={(event) =>
                          setMemberModal((prev) =>
                            prev
                              ? {
                                  ...prev,
                                  socials: {
                                    ...prev.socials,
                                    instagram: {
                                      enabled:
                                        prev.socials?.instagram?.enabled ??
                                        false,
                                      url: event.target.value,
                                    },
                                  },
                                }
                              : prev,
                          )
                        }
                        label={isTh ? "ลิงก์ Instagram" : "Instagram URL"}
                        disabled={
                          saving ||
                          !(memberModal.socials?.instagram?.enabled ?? false)
                        }
                        id="member-instagram"
                      />
                    </div>

                    <div className="space-y-2">
                      <label className="flex items-center gap-2 text-sm">
                        <input
                          type="checkbox"
                          checked={
                            memberModal.socials?.facebook?.enabled ?? false
                          }
                          onChange={(event) =>
                            setMemberModal((prev) =>
                              prev
                                ? {
                                    ...prev,
                                    socials: {
                                      ...prev.socials,
                                      facebook: {
                                        enabled: event.target.checked,
                                        url: prev.socials?.facebook?.url || "",
                                      },
                                    },
                                  }
                                : prev,
                            )
                          }
                          disabled={saving}
                        />
                        Facebook
                      </label>
                      <FloatingLabelInput
                        value={memberModal.socials?.facebook?.url || ""}
                        onChange={(event) =>
                          setMemberModal((prev) =>
                            prev
                              ? {
                                  ...prev,
                                  socials: {
                                    ...prev.socials,
                                    facebook: {
                                      enabled:
                                        prev.socials?.facebook?.enabled ??
                                        false,
                                      url: event.target.value,
                                    },
                                  },
                                }
                              : prev,
                          )
                        }
                        label={isTh ? "ลิงก์ Facebook" : "Facebook URL"}
                        disabled={
                          saving ||
                          !(memberModal.socials?.facebook?.enabled ?? false)
                        }
                        id="member-facebook"
                      />
                    </div>

                    <div className="space-y-2">
                      <label className="flex items-center gap-2 text-sm">
                        <input
                          type="checkbox"
                          checked={
                            memberModal.socials?.tiktok?.enabled ?? false
                          }
                          onChange={(event) =>
                            setMemberModal((prev) =>
                              prev
                                ? {
                                    ...prev,
                                    socials: {
                                      ...prev.socials,
                                      tiktok: {
                                        enabled: event.target.checked,
                                        url: prev.socials?.tiktok?.url || "",
                                      },
                                    },
                                  }
                                : prev,
                            )
                          }
                          disabled={saving}
                        />
                        TikTok
                      </label>
                      <FloatingLabelInput
                        value={memberModal.socials?.tiktok?.url || ""}
                        onChange={(event) =>
                          setMemberModal((prev) =>
                            prev
                              ? {
                                  ...prev,
                                  socials: {
                                    ...prev.socials,
                                    tiktok: {
                                      enabled:
                                        prev.socials?.tiktok?.enabled ?? false,
                                      url: event.target.value,
                                    },
                                  },
                                }
                              : prev,
                          )
                        }
                        label={isTh ? "ลิงก์ TikTok" : "TikTok URL"}
                        disabled={
                          saving ||
                          !(memberModal.socials?.tiktok?.enabled ?? false)
                        }
                        id="member-tiktok"
                      />
                    </div>
                  </div>
                </div>
              </div>

              <div className="mt-5 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={closeMemberModal}
                  disabled={saving}
                  className="rounded-md border border-border px-4 py-2 text-sm transition-all duration-200 hover:-translate-y-0.5 hover:bg-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF5B00] disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {isTh ? "ยกเลิก" : "Cancel"}
                </button>
                <button
                  type="button"
                  onClick={saveMemberModal}
                  disabled={saving}
                  className="rounded-md border border-[#FF5B00] bg-[#FF5B00] px-4 py-2 text-sm text-white transition-all duration-200 hover:-translate-y-0.5 hover:bg-[#e65200] hover:shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF5B00] disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {saving
                    ? isTh
                      ? "กำลังบันทึก..."
                      : "Saving..."
                    : isTh
                      ? "บันทึกสมาชิก"
                      : "Save Member"}
                </button>
              </div>
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
              className="absolute top-0 -right-10 sm:-right-11 inline-flex h-8 w-8 items-center justify-center rounded-md border border-border bg-background text-sm font-semibold transition-all duration-200 hover:scale-105 hover:bg-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF5B00]"
              aria-label={isTh ? "ปิด" : "Close"}
            >
              X
            </button>
            <p className="text-sm text-foreground">
              {isTh
                ? `ต้องการลบ ${getMemberDisplayName(deleteTarget, true)} ออกจากการเป็นสมาชิกใช่หรือไม่`
                : `Do you want to remove ${getMemberDisplayName(deleteTarget, false)} from the team?`}
            </p>
            <div className="mt-4 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setDeleteTarget(null)}
                className="rounded-md border border-border px-4 py-2 text-sm transition-all duration-200 hover:-translate-y-0.5 hover:bg-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF5B00]"
              >
                {isTh ? "ยกเลิก" : "Cancel"}
              </button>
              <button
                type="button"
                onClick={confirmDeleteMember}
                className="rounded-md border border-[#FF5B00] bg-[#FF5B00] px-4 py-2 text-sm text-white transition-all duration-200 hover:-translate-y-0.5 hover:bg-[#e65200] hover:shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF5B00]"
              >
                {isTh ? "ลบสมาชิก" : "Delete Member"}
              </button>
            </div>
          </div>
        </div>
      )}
    </AdminSectionLayout>
  );
}
