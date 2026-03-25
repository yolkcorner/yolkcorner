"use client";

import Image from "next/image";
import { ChangeEvent, useEffect, useState } from "react";
import AdminSectionLayout from "@/components/admin/AdminSectionLayout";
import { useLang } from "@/lib/i18n";
import { SiteContent, defaultSiteContent } from "@/lib/site-content-types";
// ...existing code...

interface UploadAssetOptions {
  folder?: string;
  publicId?: string;
  overwrite?: boolean;
  deletePublicId?: string;
}

const NAVBAR_LOGO_WIDTH = 160;
const NAVBAR_LOGO_HEIGHT = 160;

// Legacy media cleanup references removed.

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

export default function AdminLogoPage() {
  const { lang, t } = useLang();
  const [content, setContent] = useState<SiteContent>(defaultSiteContent);
  const [saving, setSaving] = useState(false);
  const [logoDraftFile, setLogoDraftFile] = useState<File | null>(null);
  const [logoPreviewUrl, setLogoPreviewUrl] = useState<string | null>(null);
  const [siteNameDraft, setSiteNameDraft] = useState(
    defaultSiteContent.branding.siteName,
  );
  const [message, setMessage] = useState("");

  useEffect(() => {
    const initialize = async () => {
      try {
        const contentRes = await fetch("/api/content", { cache: "no-store" });
        if (!contentRes.ok) {
          setMessage(t.adminLogo.loadFailed);
          return;
        }

        const contentData = await contentRes.json();
        if (contentData?.content) {
          const nextContent = contentData.content as SiteContent;
          setContent(nextContent);
          setSiteNameDraft(
            nextContent.branding.siteName ||
              defaultSiteContent.branding.siteName,
          );
        }
      } catch (error) {
        console.error(error);
        setMessage(t.adminLogo.loadFailed);
      }
    };

    initialize();
  }, [lang, t]);

  useEffect(() => {
    return () => {
      if (logoPreviewUrl) URL.revokeObjectURL(logoPreviewUrl);
    };
  }, [logoPreviewUrl]);

  const onLogoFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0] || null;
    if (!file) return;

    if (logoPreviewUrl) URL.revokeObjectURL(logoPreviewUrl);
    setLogoDraftFile(file);
    setLogoPreviewUrl(URL.createObjectURL(file));
    setMessage("");
  };

  const cancelLogoDraft = () => {
    if (logoPreviewUrl) URL.revokeObjectURL(logoPreviewUrl);
    setLogoPreviewUrl(null);
    setLogoDraftFile(null);
    setSiteNameDraft(
      content.branding.siteName || defaultSiteContent.branding.siteName,
    );
    setMessage(t.adminLogo.cancelled);
  };

  const saveLogo = async () => {
    const normalizedSiteName =
      siteNameDraft.trim() || defaultSiteContent.branding.siteName;
    const siteNameChanged =
      normalizedSiteName !==
      (content.branding.siteName || defaultSiteContent.branding.siteName);

    if (!logoDraftFile && !siteNameChanged) {
      setMessage(t.adminLogo.noChanges);
      return;
    }

    setSaving(true);
    setMessage(t.adminLogo.saving);

    try {
      let logoUrl = content.branding.logoUrl;

      if (logoDraftFile) {
        logoUrl = await uploadAsset(logoDraftFile, {
          folder: "Yolk Corner/branding/logo",
          publicId: "Yolk Corner/branding/logo/current",
          overwrite: true,
          // deletePublicId intentionally omitted.
        });
      }

      const nextContent: SiteContent = {
        ...content,
        branding: {
          ...content.branding,
          siteName: normalizedSiteName,
          logoUrl,
        },
      };

      const saveRes = await fetch("/api/content", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: nextContent }),
      });

      const saveData = await saveRes.json();
      if (!saveRes.ok) {
        throw new Error(saveData?.error || "Failed to save data");
      }

      setContent(saveData.content as SiteContent);
      setSiteNameDraft(
        (saveData.content as SiteContent).branding.siteName ||
          defaultSiteContent.branding.siteName,
      );
      setLogoDraftFile(null);
      if (logoPreviewUrl) URL.revokeObjectURL(logoPreviewUrl);
      setLogoPreviewUrl(null);
      setMessage(t.adminLogo.saved);
    } catch (error) {
      console.error(error);
      setMessage(t.adminLogo.saveFailed);
    } finally {
      setSaving(false);
    }
  };

  const previewSrc = (() => {
    const baseUrl = logoPreviewUrl || content.branding.logoUrl;
    if (!baseUrl) return "/logo.png";
    return baseUrl;
  })();

  return (
    <AdminSectionLayout
      title={t.adminLogo.title}
      description={t.adminLogo.description
        .replace("{width}", NAVBAR_LOGO_WIDTH.toString())
        .replace("{height}", NAVBAR_LOGO_HEIGHT.toString())
        .replace("{width2x}", (NAVBAR_LOGO_WIDTH * 2).toString())
        .replace("{height2x}", (NAVBAR_LOGO_HEIGHT * 2).toString())}
    >
      <section className="rounded-lg border border-border bg-card p-6 space-y-5">
        <div className="rounded-md border border-border bg-background p-4">
          <p className="text-sm text-muted-foreground">
            {t.adminLogo.sizeHint
              .replace("{width}", NAVBAR_LOGO_WIDTH.toString())
              .replace("{height}", NAVBAR_LOGO_HEIGHT.toString())
              .replace("{width2x}", (NAVBAR_LOGO_WIDTH * 2).toString())
              .replace("{height2x}", (NAVBAR_LOGO_HEIGHT * 2).toString())}
          </p>
        </div>

        <div className="space-y-3">
          <span className="text-sm font-medium">{t.adminLogo.preview}</span>
          <div className="flex min-h-44 items-center justify-center rounded-md border border-border bg-background p-6">
            <Image
              key={previewSrc}
              src={previewSrc}
              alt={t.adminLogo.previewAlt}
              width={NAVBAR_LOGO_WIDTH * 2}
              height={NAVBAR_LOGO_HEIGHT * 2}
              unoptimized
              loading="eager"
              fetchPriority="high"
              priority
              className="h-32 w-32 object-contain bg-white rounded"
            />
          </div>
        </div>

        <div className="space-y-2">
          <label htmlFor="site-name" className="text-sm font-medium">
            {t.adminLogo.siteNameLabel}
          </label>
          <input
            id="site-name"
            type="text"
            value={siteNameDraft}
            onChange={(event) => setSiteNameDraft(event.target.value)}
            className="block w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
            disabled={saving}
            placeholder={t.adminLogo.siteNamePlaceholder}
            maxLength={60}
          />
        </div>

        <div className="space-y-2">
          <label htmlFor="logo-upload" className="text-sm font-medium">
            {t.adminLogo.uploadLabel}
          </label>
          <input
            id="logo-upload"
            type="file"
            accept="image/png,image/jpeg,image/webp,image/avif"
            onChange={onLogoFileChange}
            className="block w-full cursor-pointer rounded-md border border-border bg-background px-3 py-2 text-sm file:mr-3 file:rounded-md file:border-0 file:bg-[#FF5B00] file:px-3 file:py-2 file:text-white"
            disabled={saving}
          />
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={cancelLogoDraft}
            disabled={!logoDraftFile || saving}
            className="rounded-md border border-border px-4 py-2 text-sm text-foreground disabled:cursor-not-allowed disabled:opacity-50"
          >
            {t.common.cancel}
          </button>
          <button
            type="button"
            onClick={saveLogo}
            disabled={
              saving ||
              (!logoDraftFile &&
                siteNameDraft.trim() ===
                  (content.branding.siteName ||
                    defaultSiteContent.branding.siteName))
            }
            className="rounded-md border border-[#FF5B00] bg-[#FF5B00] px-4 py-2 text-sm text-white transition-colors hover:bg-[#e65200] disabled:cursor-not-allowed disabled:opacity-50"
          >
            {saving ? t.adminLogo.savingButton : t.adminLogo.saveButton}
          </button>
        </div>

        {message && (
          <p className="text-sm text-muted-foreground" role="status">
            {message}
          </p>
        )}

        <p className="text-xs text-muted-foreground">
          {t.adminLogo.supportedFiles}
        </p>
      </section>
    </AdminSectionLayout>
  );
}
