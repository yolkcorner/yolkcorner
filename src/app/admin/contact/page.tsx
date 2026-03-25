"use client";

import { useEffect, useState } from "react";
import AdminSectionLayout from "@/components/admin/AdminSectionLayout";
import { FloatingLabelInput } from "@/components/FloatingLabelInput";
import { FloatingLabelTextarea } from "@/components/FloatingLabelTextarea";
import { useLang } from "@/lib/i18n";
import {
  ContactEmail,
  ContactPhone,
  SiteContent,
  defaultSiteContent,
} from "@/lib/site-content-types";

const createId = (prefix: string) =>
  `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

const emptyPhone = (): ContactPhone => ({
  id: createId("phone"),
  owner: "",
  number: "",
  enabled: true,
});

const emptyEmail = (): ContactEmail => ({
  id: createId("email"),
  email: "",
  enabled: true,
});

export default function AdminContactPage() {
  const { lang } = useLang();
  const isTh = lang === "th";
  const [content, setContent] = useState<SiteContent>(defaultSiteContent);
  const [draft, setDraft] = useState(defaultSiteContent.contact);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    const initialize = async () => {
      try {
        const res = await fetch("/api/content", { cache: "no-store" });
        if (!res.ok) {
          setMessage(
            isTh
              ? "โหลดข้อมูลติดต่อไม่สำเร็จ"
              : "Failed to load contact settings",
          );
          return;
        }

        const data = await res.json();
        if (data?.content) {
          const loaded = data.content as SiteContent;
          setContent(loaded);
          setDraft(loaded.contact || defaultSiteContent.contact);
        }
      } catch (error) {
        console.error(error);
        setMessage(
          isTh
            ? "โหลดข้อมูลติดต่อไม่สำเร็จ"
            : "Failed to load contact settings",
        );
      } finally {
        setLoading(false);
      }
    };

    initialize();
  }, [isTh]);

  const setPhoneField = (
    id: string,
    field: keyof ContactPhone,
    value: string | boolean,
  ) => {
    setDraft((prev) => ({
      ...prev,
      phones: prev.phones.map((phone) =>
        phone.id === id ? { ...phone, [field]: value } : phone,
      ),
    }));
  };

  const setEmailField = (
    id: string,
    field: keyof ContactEmail,
    value: string | boolean,
  ) => {
    setDraft((prev) => ({
      ...prev,
      emails: prev.emails.map((email) =>
        email.id === id ? { ...email, [field]: value } : email,
      ),
    }));
  };

  const addPhone = () => {
    setDraft((prev) => ({ ...prev, phones: [...prev.phones, emptyPhone()] }));
  };

  const addEmail = () => {
    setDraft((prev) => ({ ...prev, emails: [...prev.emails, emptyEmail()] }));
  };

  const removePhone = (id: string) => {
    setDraft((prev) => ({
      ...prev,
      phones: prev.phones.filter((phone) => phone.id !== id),
    }));
  };

  const removeEmail = (id: string) => {
    setDraft((prev) => ({
      ...prev,
      emails: prev.emails.filter((email) => email.id !== id),
    }));
  };

  const saveContactSettings = async () => {
    setSaving(true);
    setMessage(
      isTh ? "กำลังบันทึกข้อมูลติดต่อ..." : "Saving contact settings...",
    );

    try {
      const cleanPhones = draft.phones
        .map((item) => ({
          ...item,
          owner: item.owner.trim(),
          number: item.number.trim(),
        }))
        .filter((item) => item.owner || item.number);

      const cleanEmails = draft.emails
        .map((item) => ({ ...item, email: item.email.trim() }))
        .filter((item) => item.email);

      const fallbackTarget =
        cleanEmails.find((item) => item.enabled)?.email ||
        cleanEmails[0]?.email ||
        "";
      const target = draft.formTargetEmail.trim() || fallbackTarget;

      const nextContent: SiteContent = {
        ...content,
        contact: {
          ...draft,
          phones: cleanPhones,
          emails: cleanEmails,
          address: draft.address.trim(),
          addressEn: (draft.addressEn || "").trim(),
          formTargetEmail: target,
          socials: {
            facebook: {
              enabled: draft.socials.facebook.enabled,
              url: draft.socials.facebook.url.trim(),
            },
            instagram: {
              enabled: draft.socials.instagram.enabled,
              url: draft.socials.instagram.url.trim(),
            },
            tiktok: {
              enabled: draft.socials.tiktok.enabled,
              url: draft.socials.tiktok.url.trim(),
            },
            line: {
              enabled: draft.socials.line.enabled,
              url: draft.socials.line.url.trim(),
            },
          },
        },
      };

      const saveRes = await fetch("/api/content", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: nextContent }),
      });

      const saveData = await saveRes.json();
      if (!saveRes.ok || !saveData?.content) {
        throw new Error(saveData?.error || "Failed to save contact settings");
      }

      const saved = saveData.content as SiteContent;
      setContent(saved);
      setDraft(saved.contact || defaultSiteContent.contact);
      setMessage(
        isTh
          ? "บันทึกข้อมูลติดต่อเรียบร้อยแล้ว"
          : "Contact settings saved successfully",
      );
    } catch (error) {
      console.error(error);
      const detail = error instanceof Error ? error.message : "";
      setMessage(
        isTh
          ? detail
            ? `บันทึกข้อมูลติดต่อไม่สำเร็จ: ${detail}`
            : "บันทึกข้อมูลติดต่อไม่สำเร็จ"
          : detail
            ? `Failed to save contact settings: ${detail}`
            : "Failed to save contact settings",
      );
    } finally {
      setSaving(false);
    }
  };

  const resetContactSettings = () => {
    setDraft(content.contact || defaultSiteContent.contact);
    setMessage(
      isTh ? "ยกเลิกการแก้ไขข้อมูลติดต่อแล้ว" : "Contact changes discarded",
    );
  };

  if (loading) {
    return (
      <AdminSectionLayout
        title={isTh ? "ติดต่อเรา" : "Contact"}
        description={
          isTh
            ? "กำหนดช่องทางติดต่อและอีเมลปลายทางของฟอร์ม"
            : "Configure contact channels and the contact-form target email"
        }
      >
        <p className="text-sm text-muted-foreground">
          {isTh ? "กำลังโหลดข้อมูล..." : "Loading contact settings..."}
        </p>
      </AdminSectionLayout>
    );
  }

  return (
    <AdminSectionLayout
      title={isTh ? "ติดต่อเรา" : "Contact"}
      description={
        isTh
          ? "กำหนดเบอร์โทร อีเมล ที่อยู่ โซเชียล และเลือกอีเมลปลายทางของฟอร์มติดต่อ"
          : "Manage phones, emails, address, social links, and target email for contact form"
      }
    >
      <section className="rounded-lg border border-border bg-card p-6 space-y-6">
        <div className="space-y-3 rounded-md border border-border p-4">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-base font-semibold">
              {isTh ? "เบอร์โทร" : "Phone Numbers"}
            </h2>
            <button
              type="button"
              onClick={addPhone}
              disabled={saving}
              className="rounded-md border border-[#FF5B00] bg-[#FF5B00] px-3 py-1.5 text-xs text-white disabled:opacity-60"
            >
              {isTh ? "เพิ่มเบอร์โทร" : "Add Phone"}
            </button>
          </div>

          {draft.phones.length === 0 && (
            <p className="text-sm text-muted-foreground">
              {isTh ? "ยังไม่มีเบอร์โทร" : "No phone numbers yet"}
            </p>
          )}

          {draft.phones.map((phone) => (
            <div
              key={phone.id}
              className="grid grid-cols-1 gap-2 rounded-md border border-border p-3 md:grid-cols-[1fr_1fr_auto_auto]"
            >
              <FloatingLabelInput
                value={phone.owner}
                onChange={(event) =>
                  setPhoneField(phone.id, "owner", event.target.value)
                }
                label={isTh ? "ชื่อเจ้าของเบอร์" : "Owner name"}
                disabled={saving}
                id={`phone-owner-${phone.id}`}
              />
              <FloatingLabelInput
                value={phone.number}
                onChange={(event) =>
                  setPhoneField(phone.id, "number", event.target.value)
                }
                label={isTh ? "เบอร์โทร" : "Phone number"}
                disabled={saving}
                id={`phone-number-${phone.id}`}
              />
              <label className="inline-flex items-center gap-2 text-sm text-muted-foreground">
                <input
                  type="checkbox"
                  checked={phone.enabled}
                  onChange={(event) =>
                    setPhoneField(phone.id, "enabled", event.target.checked)
                  }
                  disabled={saving}
                />
                {isTh ? "แสดงผล" : "Visible"}
              </label>
              <button
                type="button"
                onClick={() => removePhone(phone.id)}
                className="rounded-md border border-border px-3 py-2 text-xs"
                disabled={saving}
              >
                {isTh ? "ลบ" : "Delete"}
              </button>
            </div>
          ))}
        </div>

        <div className="space-y-3 rounded-md border border-border p-4">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-base font-semibold">
              {isTh ? "อีเมล" : "Emails"}
            </h2>
            <button
              type="button"
              onClick={addEmail}
              disabled={saving}
              className="rounded-md border border-[#FF5B00] bg-[#FF5B00] px-3 py-1.5 text-xs text-white disabled:opacity-60"
            >
              {isTh ? "เพิ่มอีเมล" : "Add Email"}
            </button>
          </div>

          {draft.emails.length === 0 && (
            <p className="text-sm text-muted-foreground">
              {isTh ? "ยังไม่มีอีเมล" : "No emails yet"}
            </p>
          )}

          {draft.emails.map((email) => (
            <div
              key={email.id}
              className="grid grid-cols-1 gap-2 rounded-md border border-border p-3 md:grid-cols-[1fr_auto_auto]"
            >
              <FloatingLabelInput
                type="email"
                value={email.email}
                onChange={(event) =>
                  setEmailField(email.id, "email", event.target.value)
                }
                label={isTh ? "อีเมลติดต่อ" : "Contact email"}
                disabled={saving}
                id={`email-${email.id}`}
              />
              <label className="inline-flex items-center gap-2 text-sm text-muted-foreground">
                <input
                  type="checkbox"
                  checked={email.enabled}
                  onChange={(event) =>
                    setEmailField(email.id, "enabled", event.target.checked)
                  }
                  disabled={saving}
                />
                {isTh ? "แสดงผล" : "Visible"}
              </label>
              <button
                type="button"
                onClick={() => removeEmail(email.id)}
                className="rounded-md border border-border px-3 py-2 text-xs"
                disabled={saving}
              >
                {isTh ? "ลบ" : "Delete"}
              </button>
            </div>
          ))}

          <div className="space-y-2 rounded-md border border-border bg-background p-3">
            <label className="text-sm font-medium">
              {isTh
                ? "อีเมลปลายทางของฟอร์มติดต่อ"
                : "Contact form target email"}
            </label>
            <select
              value={draft.formTargetEmail}
              onChange={(event) =>
                setDraft((prev) => ({
                  ...prev,
                  formTargetEmail: event.target.value,
                }))
              }
              className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
              disabled={saving}
            >
              <option value="">
                {isTh
                  ? "เลือกอีเมลปลายทางอัตโนมัติ (ตัวแรกที่เปิดใช้งาน)"
                  : "Auto-select target email (first enabled email)"}
              </option>
              {draft.emails
                .filter((item) => item.email.trim())
                .map((item) => (
                  <option key={item.id} value={item.email.trim()}>
                    {item.email.trim()}
                  </option>
                ))}
            </select>
            <p className="text-xs text-muted-foreground">
              {isTh
                ? "หากไม่เลือก ระบบจะใช้อีเมลตัวแรกที่เปิดใช้งาน"
                : "If not selected, the first enabled email will be used"}
            </p>
          </div>
        </div>

        <div className="space-y-2 rounded-md border border-border p-4">
          <h2 className="text-base font-semibold">
            {isTh ? "ที่อยู่" : "Address"}
          </h2>
          <FloatingLabelTextarea
            value={draft.address}
            onChange={(event) =>
              setDraft((prev) => ({ ...prev, address: event.target.value }))
            }
            rows={3}
            label={
              isTh
                ? "ที่อยู่บริษัท/สตูดิโอ (TH)"
                : "Company/Studio address (TH)"
            }
            disabled={saving}
            id="contact-address-th"
          />
          <FloatingLabelTextarea
            value={draft.addressEn || ""}
            onChange={(event) =>
              setDraft((prev) => ({ ...prev, addressEn: event.target.value }))
            }
            rows={3}
            label={
              isTh
                ? "ที่อยู่บริษัท/สตูดิโอ (EN)"
                : "Company/Studio address (EN)"
            }
            disabled={saving}
            id="contact-address-en"
          />
        </div>

        <div className="space-y-3 rounded-md border border-border p-4">
          <h2 className="text-base font-semibold">
            {isTh ? "โซเชียลมีเดีย" : "Social Media"}
          </h2>

          {(
            [
              ["facebook", "Facebook"],
              ["instagram", "Instagram"],
              ["tiktok", "TikTok"],
              ["line", "Line"],
            ] as const
          ).map(([key, label]) => (
            <div
              key={key}
              className="grid grid-cols-1 gap-2 rounded-md border border-border p-3 md:grid-cols-[auto_1fr]"
            >
              <label className="inline-flex items-center gap-2 text-sm text-muted-foreground">
                <input
                  type="checkbox"
                  checked={draft.socials[key].enabled}
                  onChange={(event) =>
                    setDraft((prev) => ({
                      ...prev,
                      socials: {
                        ...prev.socials,
                        [key]: {
                          ...prev.socials[key],
                          enabled: event.target.checked,
                        },
                      },
                    }))
                  }
                  disabled={saving}
                />
                {isTh ? `แสดง ${label}` : `Show ${label}`}
              </label>

              <FloatingLabelInput
                type="url"
                value={draft.socials[key].url}
                onChange={(event) =>
                  setDraft((prev) => ({
                    ...prev,
                    socials: {
                      ...prev.socials,
                      [key]: {
                        ...prev.socials[key],
                        url: event.target.value,
                      },
                    },
                  }))
                }
                label={`${label} URL`}
                disabled={saving}
                id={`social-${key}`}
              />
            </div>
          ))}
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={resetContactSettings}
            disabled={saving}
            className="rounded-md border border-border px-4 py-2 text-sm"
          >
            {isTh ? "ยกเลิก" : "Cancel"}
          </button>
          <button
            type="button"
            onClick={saveContactSettings}
            disabled={saving}
            className="rounded-md border border-[#FF5B00] bg-[#FF5B00] px-4 py-2 text-sm text-white disabled:opacity-60"
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

        {message && (
          <p className="text-sm text-muted-foreground" role="status">
            {message}
          </p>
        )}
      </section>
    </AdminSectionLayout>
  );
}
