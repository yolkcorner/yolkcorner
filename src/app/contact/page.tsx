"use client";

import { FormEvent, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Mail, MapPin, Phone } from "lucide-react";
import Layout from "@/components/Layout";
import { FloatingLabelInput } from "@/components/FloatingLabelInput";
import { FloatingLabelTextarea } from "@/components/FloatingLabelTextarea";
import { useLang } from "@/lib/i18n";
import { useSiteContent } from "@/hooks/use-site-content";
import { pickLangText } from "@/lib/content-text";
import Image from "next/image";

const normalizeSocialLink = (url: string) => {
  const trimmed = url.trim();
  if (!trimmed) return "";
  if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) {
    return trimmed;
  }
  return `https://${trimmed}`;
};

export default function ContactPage() {
  const { t, lang } = useLang();
  const { content } = useSiteContent();
  const [form, setForm] = useState({ name: "", email: "", message: "" });
  const [sending, setSending] = useState(false);
  const [submitStatus, setSubmitStatus] = useState<{
    kind: "success" | "error" | "info";
    text: string;
  } | null>(null);

  const enabledPhones = useMemo(
    () =>
      content.contact.phones.filter(
        (item) => item.enabled && item.number.trim().length > 0,
      ),
    [content.contact.phones],
  );

  const enabledEmails = useMemo(
    () =>
      content.contact.emails.filter(
        (item) => item.enabled && item.email.trim().length > 0,
      ),
    [content.contact.emails],
  );

  const targetEmail =
    content.contact.formTargetEmail.trim() || enabledEmails[0]?.email || "";

  const mailtoHref = useMemo(() => {
    if (!targetEmail) return "";
    const subject = encodeURIComponent(
      `${t.contact.emailSubjectPrefix} ${form.name || t.contact.anonymousContactName}`,
    );
    const body = encodeURIComponent(
      `${t.contact.emailBodyNameLabel}: ${form.name}\n${t.contact.emailBodyEmailLabel}: ${form.email}\n\n${t.contact.emailBodyMessageLabel}:\n${form.message}`,
    );
    return `mailto:${targetEmail}?subject=${subject}&body=${body}`;
  }, [
    form.email,
    form.message,
    form.name,
    t.contact.anonymousContactName,
    t.contact.emailBodyEmailLabel,
    t.contact.emailBodyMessageLabel,
    t.contact.emailBodyNameLabel,
    t.contact.emailSubjectPrefix,
    targetEmail,
  ]);

  const socialLinks = [
    {
      key: "facebook",
      enabled: content.contact.socials.facebook.enabled,
      url: normalizeSocialLink(content.contact.socials.facebook.url),
      iconSrc: "/social/facebook.svg",
      label: t.social.facebook,
    },
    {
      key: "instagram",
      enabled: content.contact.socials.instagram.enabled,
      url: normalizeSocialLink(content.contact.socials.instagram.url),
      iconSrc: "/social/instagram.svg",
      label: t.social.instagram,
    },
    {
      key: "tiktok",
      enabled: content.contact.socials.tiktok.enabled,
      url: normalizeSocialLink(content.contact.socials.tiktok.url),
      iconSrc: "/social/tiktok.svg",
      label: t.social.tiktok,
    },
    {
      key: "line",
      enabled: content.contact.socials.line.enabled,
      url: normalizeSocialLink(content.contact.socials.line.url),
      iconSrc: "/social/line.svg",
      label: t.social.line,
    },
  ].filter((item) => item.enabled && item.url.trim());

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();

    if (!targetEmail) {
      setSubmitStatus({
        kind: "error",
        text: t.contact.noTargetEmail,
      });
      return;
    }

    setSending(true);
    setSubmitStatus({ kind: "info", text: t.contact.sendingMessage });

    try {
      const response = await fetch("/api/contact/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name.trim(),
          email: form.email.trim(),
          message: form.message.trim(),
          targetEmail,
        }),
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(
          typeof data?.error === "string" ? data.error : t.contact.sendFailed,
        );
      }

      setForm({ name: "", email: "", message: "" });
      setSubmitStatus({ kind: "success", text: t.common.messageSent });
    } catch (error) {
      console.error(error);
      setSubmitStatus({
        kind: "error",
        text: t.contact.systemSendFailed,
      });
    } finally {
      setSending(false);
    }
  };

  return (
    <Layout>
      <section className="py-14 md:py-20">
        <div className="container mx-auto px-4">
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="font-heading text-xl  mb-10 md:mb-16"
          >
            {t.contact.title}
          </motion.h1>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 max-w-5xl mx-auto">
            <motion.div
              initial={{ opacity: 0, x: -18 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.2 }}
              className="space-y-8"
            >
              <div className="flex items-start gap-4">
                <Phone className="w-6 h-6 text-primary mt-1" />
                <div>
                  <h3 className="font-heading text-lg tracking-wider">
                    {t.contact.phone}
                  </h3>
                  {enabledPhones.length === 0 ? (
                    <p className="text-muted-foreground">-</p>
                  ) : (
                    enabledPhones.map((phone) => (
                      <p key={phone.id} className="text-muted-foreground">
                        {phone.owner ? `${phone.owner}: ` : ""}
                        {phone.number}
                      </p>
                    ))
                  )}
                </div>
              </div>

              <div className="flex items-start gap-4">
                <Mail className="w-6 h-6 text-primary mt-1" />
                <div>
                  <h3 className="font-heading text-lg tracking-wider">
                    {t.contact.email}
                  </h3>
                  {enabledEmails.length === 0 ? (
                    <p className="text-muted-foreground">-</p>
                  ) : (
                    enabledEmails.map((item) => (
                      <a
                        key={item.id}
                        href={`mailto:${item.email}`}
                        className="block text-muted-foreground hover:text-primary"
                      >
                        {item.email}
                      </a>
                    ))
                  )}
                </div>
              </div>

              {pickLangText(
                content.contact.address,
                content.contact.addressEn,
                lang,
              ) && (
                <div className="flex items-start gap-4">
                  <MapPin className="w-6 h-6 text-primary mt-1" />
                  <div>
                    <h3 className="font-heading text-lg tracking-wider">
                      {t.contact.address}
                    </h3>
                    <p className="text-muted-foreground">
                      {pickLangText(
                        content.contact.address,
                        content.contact.addressEn,
                        lang,
                      )}
                    </p>
                  </div>
                </div>
              )}

              {socialLinks.length > 0 && (
                <div className="pt-4 ">
                  <h3 className="font-heading text-lg tracking-wider mb-4">
                    {t.common.socialMedia}
                  </h3>
                  <div className="flex flex-wrap gap-3 sm:gap-4">
                    {socialLinks.map((item) => (
                      <a
                        key={item.key}
                        href={item.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="w-11 h-11 sm:w-12 sm:h-12 drop-shadow-[-2px_2px_4px_rgba(0,0,0,0.25)] rounded-md  flex items-center justify-center hover:scale-120  transition-all"
                        aria-label={item.label}
                      >
                        <Image
                          src={item.iconSrc}
                          alt={item.label}
                          width={22}
                          height={22}
                          className="h-5 w-5"
                        />
                      </a>
                    ))}
                  </div>
                </div>
              )}
            </motion.div>

            <motion.form
              onSubmit={handleSubmit}
              initial={{ opacity: 0, x: 18 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.3 }}
              className="space-y-6 drop-shadow-[-2px_2px_4px_rgba(0,0,0,0.25)] rounded-md p-6 bg-ิbackground"
            >
              <FloatingLabelInput
                type="text"
                label={t.contact.name}
                value={form.name}
                onChange={(event) =>
                  setForm({ ...form, name: event.target.value })
                }
                required
              />
              <FloatingLabelInput
                type="email"
                label={t.contact.email}
                value={form.email}
                onChange={(event) =>
                  setForm({ ...form, email: event.target.value })
                }
                required
              />
              <FloatingLabelTextarea
                label={t.contact.message}
                rows={5}
                value={form.message}
                onChange={(event) =>
                  setForm({ ...form, message: event.target.value })
                }
                required
              />
              <button
                type="submit"
                disabled={sending}
                className="w-full py-3 bg-primary text-primary-foreground font-heading text-lg tracking-wider uppercase hover:bg-primary/90 transition-colors glow-red rounded-md"
              >
                {sending ? t.contact.sendingButton : t.contact.send}
              </button>

              <a
                href={mailtoHref || undefined}
                className="w-full inline-flex items-center justify-center py-3 border border-border bg-card text-foreground font-heading text-lg tracking-wider uppercase hover:border-primary hover:text-primary transition-colors rounded-md"
                aria-disabled={!mailtoHref}
                onClick={(event) => {
                  if (!mailtoHref) {
                    event.preventDefault();
                    setSubmitStatus({
                      kind: "error",
                      text: t.contact.mailtoUnavailable,
                    });
                  }
                }}
              >
                {t.contact.sendViaMailto}
              </a>

              {submitStatus && (
                <p
                  className={`text-sm ${
                    submitStatus.kind === "success"
                      ? "text-green-600"
                      : submitStatus.kind === "error"
                        ? "text-red-500"
                        : "text-muted-foreground"
                  }`}
                  role="status"
                >
                  {submitStatus.text}
                </p>
              )}

              {targetEmail && (
                <p className="text-xs text-muted-foreground">
                  {t.contact.targetEmailLabel}: {targetEmail}
                </p>
              )}
            </motion.form>
          </div>
        </div>
      </section>
    </Layout>
  );
}
