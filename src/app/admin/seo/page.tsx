"use client";

import { useEffect, useState } from "react";
import AdminSectionLayout from "@/components/admin/AdminSectionLayout";
import { useLang } from "@/lib/i18n";
import { SiteContent, defaultSiteContent } from "@/lib/site-content-types";

export default function AdminSeoPage() {
  const { lang } = useLang();
  const isTh = lang === "th";
  const [content, setContent] = useState<SiteContent>(defaultSiteContent);

  const [descriptionTh, setDescriptionTh] = useState("");
  const [descriptionEn, setDescriptionEn] = useState("");
  const [keywordsTh, setKeywordsTh] = useState<string[]>([]);
  const [keywordsEn, setKeywordsEn] = useState<string[]>([]);
  const [keywordInputTh, setKeywordInputTh] = useState("");
  const [keywordInputEn, setKeywordInputEn] = useState("");
  const [googleSiteVerification, setGoogleSiteVerification] = useState("");
  const [allowIndexing, setAllowIndexing] = useState(true);
  const [allowFollowing, setAllowFollowing] = useState(true);

  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    const initialize = async () => {
      try {
        const contentRes = await fetch("/api/content", { cache: "no-store" });
        if (!contentRes.ok) {
          setMessage(isTh ? "โหลดข้อมูล SEO ไม่สำเร็จ" : "Failed to load SEO settings");
          return;
        }

        const contentData = await contentRes.json();
        if (contentData?.content) {
          const loaded = contentData.content as SiteContent;
          setContent(loaded);
          setDescriptionTh(loaded.seo.descriptionTh || "");
          setDescriptionEn(loaded.seo.descriptionEn || "");
          setKeywordsTh(loaded.seo.keywordsTh || []);
          setKeywordsEn(loaded.seo.keywordsEn || []);
          setKeywordInputTh("");
          setKeywordInputEn("");
          setGoogleSiteVerification(loaded.seo.googleSiteVerification || "");
          setAllowIndexing(loaded.seo.allowIndexing !== false);
          setAllowFollowing(loaded.seo.allowFollowing !== false);
        }
      } catch (error) {
        console.error(error);
        setMessage(isTh ? "โหลดข้อมูล SEO ไม่สำเร็จ" : "Failed to load SEO settings");
      }
    };

    initialize();
  }, [isTh]);

  const cancelChanges = () => {
    setDescriptionTh(content.seo.descriptionTh || "");
    setDescriptionEn(content.seo.descriptionEn || "");
    setKeywordsTh(content.seo.keywordsTh || []);
    setKeywordsEn(content.seo.keywordsEn || []);
    setKeywordInputTh("");
    setKeywordInputEn("");
    setGoogleSiteVerification(content.seo.googleSiteVerification || "");
    setAllowIndexing(content.seo.allowIndexing !== false);
    setAllowFollowing(content.seo.allowFollowing !== false);
    setMessage(isTh ? "ยกเลิกการแก้ไข SEO แล้ว" : "SEO changes discarded");
  };

  const addKeyword = (lang: "th" | "en") => {
    const value = (lang === "th" ? keywordInputTh : keywordInputEn).trim();
    if (!value) return;

    if (lang === "th") {
      setKeywordsTh((prev) => (prev.includes(value) ? prev : [...prev, value]));
      setKeywordInputTh("");
      return;
    }

    setKeywordsEn((prev) => (prev.includes(value) ? prev : [...prev, value]));
    setKeywordInputEn("");
  };

  const removeKeyword = (lang: "th" | "en", value: string) => {
    if (lang === "th") {
      setKeywordsTh((prev) => prev.filter((item) => item !== value));
      return;
    }

    setKeywordsEn((prev) => prev.filter((item) => item !== value));
  };

  const saveSeo = async () => {
    setSaving(true);
    setMessage(isTh ? "กำลังบันทึก SEO..." : "Saving SEO...");

    try {
      const nextContent: SiteContent = {
        ...content,
        seo: {
          descriptionTh: descriptionTh.trim(),
          descriptionEn: descriptionEn.trim(),
          keywordsTh,
          keywordsEn,
          googleSiteVerification: googleSiteVerification.trim(),
          allowIndexing,
          allowFollowing,
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
      setContent(saved);
      setDescriptionTh(saved.seo.descriptionTh || "");
      setDescriptionEn(saved.seo.descriptionEn || "");
      setKeywordsTh(saved.seo.keywordsTh || []);
      setKeywordsEn(saved.seo.keywordsEn || []);
      setKeywordInputTh("");
      setKeywordInputEn("");
      setGoogleSiteVerification(saved.seo.googleSiteVerification || "");
      setAllowIndexing(saved.seo.allowIndexing !== false);
      setAllowFollowing(saved.seo.allowFollowing !== false);
      setMessage(isTh ? "บันทึก SEO เรียบร้อยแล้ว" : "SEO saved successfully");
    } catch (error) {
      console.error(error);
      setMessage(isTh ? "บันทึก SEO ไม่สำเร็จ" : "Failed to save SEO");
    } finally {
      setSaving(false);
    }
  };

  return (
    <AdminSectionLayout
      title="SEO"
      description={
        isTh
          ? "ตั้งค่า SEO ทั้งเว็บไซต์ รองรับภาษาไทยและอังกฤษ"
          : "Configure site-wide SEO for Thai and English"
      }
    >
      <section className="rounded-lg border border-border bg-card p-6 space-y-6">
        <div className="space-y-2">
          <label className="text-sm text-foreground">Description (TH)</label>
          <textarea
            rows={3}
            value={descriptionTh}
            onChange={(event) => setDescriptionTh(event.target.value)}
            className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
            placeholder="คำอธิบายเว็บไซต์ภาษาไทย"
            disabled={saving}
          />
        </div>

        <div className="space-y-2">
          <label className="text-sm text-foreground">Description (EN)</label>
          <textarea
            rows={3}
            value={descriptionEn}
            onChange={(event) => setDescriptionEn(event.target.value)}
            className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
            placeholder="Website description in English"
            disabled={saving}
          />
        </div>

        <div className="space-y-2">
          <label className="text-sm text-foreground">
            Keywords / Tags (TH)
          </label>
          <div className="flex gap-2">
            <input
              type="text"
              value={keywordInputTh}
              onChange={(event) => setKeywordInputTh(event.target.value)}
              className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
              placeholder="พิมพ์แท็กภาษาไทย"
              disabled={saving}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault();
                  addKeyword("th");
                }
              }}
            />
            <button
              type="button"
              onClick={() => addKeyword("th")}
              className="rounded-md border border-border px-3 py-2 text-sm"
              disabled={saving}
            >
              {isTh ? "เพิ่ม" : "Add"}
            </button>
          </div>
          {keywordsTh.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {keywordsTh.map((tag) => (
                <button
                  key={`seo-th-${tag}`}
                  type="button"
                  onClick={() => removeKeyword("th", tag)}
                  className="rounded-full border border-border bg-background px-3 py-1 text-xs text-muted-foreground"
                  disabled={saving}
                  title={isTh ? "ลบแท็ก" : "Remove tag"}
                >
                  #{tag} x
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="space-y-2">
          <label className="text-sm text-foreground">
            Keywords / Tags (EN)
          </label>
          <div className="flex gap-2">
            <input
              type="text"
              value={keywordInputEn}
              onChange={(event) => setKeywordInputEn(event.target.value)}
              className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
              placeholder={isTh ? "พิมพ์แท็กภาษาอังกฤษ" : "Type English tag"}
              disabled={saving}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault();
                  addKeyword("en");
                }
              }}
            />
            <button
              type="button"
              onClick={() => addKeyword("en")}
              className="rounded-md border border-border px-3 py-2 text-sm"
              disabled={saving}
            >
              {isTh ? "เพิ่ม" : "Add"}
            </button>
          </div>
          {keywordsEn.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {keywordsEn.map((tag) => (
                <button
                  key={`seo-en-${tag}`}
                  type="button"
                  onClick={() => removeKeyword("en", tag)}
                  className="rounded-full border border-border bg-background px-3 py-1 text-xs text-muted-foreground"
                  disabled={saving}
                  title="Remove tag"
                >
                  #{tag} x
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="space-y-2">
          <label className="text-sm text-foreground">
            Google Site Verification (optional)
          </label>
          <input
            type="text"
            value={googleSiteVerification}
            onChange={(event) => setGoogleSiteVerification(event.target.value)}
            className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
            placeholder="verification code"
            disabled={saving}
          />
        </div>

        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          <label className="flex items-center gap-2 text-sm text-foreground">
            <input
              type="checkbox"
              checked={allowIndexing}
              onChange={(event) => setAllowIndexing(event.target.checked)}
              disabled={saving}
            />
            {isTh
              ? "อนุญาตให้ Search Engine index หน้าเว็บ"
              : "Allow search engines to index pages"}
          </label>

          <label className="flex items-center gap-2 text-sm text-foreground">
            <input
              type="checkbox"
              checked={allowFollowing}
              onChange={(event) => setAllowFollowing(event.target.checked)}
              disabled={saving}
            />
            {isTh
              ? "อนุญาตให้ Search Engine ติดตามลิงก์"
              : "Allow search engines to follow links"}
          </label>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={cancelChanges}
            disabled={saving}
            className="rounded-md border border-border px-4 py-2 text-sm"
          >
            {isTh ? "ยกเลิก" : "Cancel"}
          </button>
          <button
            type="button"
            onClick={saveSeo}
            disabled={saving}
            className="rounded-md border border-[#FF5B00] bg-[#FF5B00] px-4 py-2 text-sm text-white disabled:opacity-60"
          >
            {saving ? (isTh ? "กำลังบันทึก..." : "Saving...") : isTh ? "บันทึก" : "Save"}
          </button>
        </div>

        {message && (
          <p className="text-sm text-muted-foreground" role="status">
            {message}
          </p>
        )}
      </section>
    </AdminSectionLayout>
  );
}
