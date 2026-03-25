"use client";

import AdminSectionLayout from "@/components/admin/AdminSectionLayout";
import Link from "next/link";
import { useLang } from "@/lib/i18n";

export default function AdminDashboardPage() {
  const { lang } = useLang();
  const isTh = lang === "th";

  return (
    <AdminSectionLayout
      title="Admin Dashboard"
      description={
        isTh
          ? "นี่คือแดชบอร์ดสำหรับจัดการเนื้อหาเว็บไซต์ของคุณ Sections แบ่งตามหัวข้อ เลือกเมนูที่ต้องการแก้ไขจากแถบด้านซ้าย"
          : "This is the dashboard for managing your website content. Sections are categorized by topic. Select the menu you want to edit from the left sidebar."
      }
    >
      <section className="relative min-h-80 overflow-hidden rounded-lg border border-border">
        <div className="absolute inset-0 bg-[url('/hero-bg.png')] bg-cover bg-center" />
        <div className="absolute inset-0 bg-linear-to-r from-black/75 via-black/55 to-black/35" />

        <div className="relative flex min-h-80 items-center px-6 py-10 md:px-10 ">
          <div className="max-w-2xl space-y-5 text-white ">
            <h2 className="font-heading whitespace-pre-line text-3xl font-bold leading-tight md:text-5xl">
              {isTh
                ? "จัดการเว็บไซต์จากแดชบอร์ด"
                : "Manage the website from one dashboard"}
            </h2>
            <p className="text-sm text-white/90 md:text-base ">
              {isTh
                ? "แก้ไข Hero, เนื้อหา, ข่าวสาร, บล็อก และ SEO ได้อย่างรวดเร็วด้วยเมนูด้านซ้าย"
                : "Quickly edit Hero, content, news, blog, and SEO from the left-side menu."}
            </p>

            <div className="flex flex-wrap gap-3 ">
              <Link
                href="/admin/hero"
                className="inline-flex items-center rounded-md   bg-primary px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-[#e8871a]"
              >
                {isTh ? "จัดการ Hero" : "Manage Hero"}
              </Link>
              <Link
                href="/"
                className="inline-flex items-center rounded-md border border-white/60 bg-white/10 px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-white/20"
              >
                {isTh ? "ดูหน้าเว็บไซต์" : "View Website"}
              </Link>
            </div>
          </div>
        </div>
      </section>

      <section className="grid grid-cols-1 gap-4">
        {/* {sections.map((section) => (
          <Link
            key={section.href}
            href={section.href}
            className="rounded-lg border border-border bg-card p-4 text-sm transition-colors hover:bg-primary/50"
          >
            {isTh ? section.titleTh : section.titleEn}
          </Link>
        ))} */}
        <div>
          <p className="text-sm text-black md:text-base ">
            {isTh
              ? "แก้ไข Hero, เนื้อหา, ข่าวสาร, บล็อก และ SEO ได้อย่างรวดเร็วด้วยเมนูด้านซ้าย"
              : "Quickly edit Hero, content, news, blog, and SEO from the left-side menu."}
          </p>
        </div>
      </section>
    </AdminSectionLayout>
  );
}
