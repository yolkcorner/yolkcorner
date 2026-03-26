import { ReactNode } from "react";
import AdminDashboardNav from "@/components/admin/AdminDashboardNav";

interface AdminSectionLayoutProps {
  title: string;
  description: string;
  children?: ReactNode;
}

export default function AdminSectionLayout({
  title,
  description,
  children,
}: AdminSectionLayoutProps) {
  return (
    <div className="admin-theme relative min-h-dvh overflow-hidden bg-[radial-gradient(circle_at_12%_18%,rgba(255,166,77,0.45),transparent_38%),radial-gradient(circle_at_88%_14%,rgba(255,91,0,0.28),transparent_30%),linear-gradient(140deg,#f6efe6_0%,#f5f5f2_45%,#eee9e2_100%)] p-3 md:p-6">
      <div className="pointer-events-none absolute -left-24 top-20 h-56 w-56 rounded-full bg-[#ff8a3d]/30 blur-3xl" />
      <div className="pointer-events-none absolute -right-20 bottom-12 h-64 w-64 rounded-full bg-[#ffd18f]/35 blur-3xl" />

      <div className="relative mx-auto max-w-7xl md:flex md:gap-6">
        <AdminDashboardNav />

        <main className="mt-4 flex-1 space-y-6 md:mt-0">
          <section className="rounded-3xl border border-white/50 bg-white/80 p-6 shadow-[0_16px_50px_rgba(120,58,12,0.14)] backdrop-blur-xl md:p-7">
            <p className="mb-2 inline-flex rounded-full border border-[#ff9f59]/40 bg-[#fff1df] px-3 py-1 text-xs font-semibold tracking-[0.18em] text-[#9f5624] uppercase">
              Admin Section
            </p>
            <h1 className="text-2xl font-bold text-[#2b1a10] md:text-3xl">
              {title}
            </h1>
            <p className="mt-2 text-sm text-[#6f5a4b]">{description}</p>
          </section>

          {children}
        </main>
      </div>
    </div>
  );
}
