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
    <div className="min-h-screen bg-background p-3 md:p-6">
      <div className="mx-auto max-w-7xl md:flex md:gap-6">
        <AdminDashboardNav />

        <main className="mt-4 flex-1 space-y-6 md:mt-0">
          <section className="rounded-lg border border-border bg-card p-6">
            <h1 className="text-2xl font-bold">{title}</h1>
            <p className="mt-2 text-sm text-muted-foreground">{description}</p>
          </section>

          {children}
        </main>
      </div>
    </div>
  );
}
