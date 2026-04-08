"use client";

import { ReactNode, useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import Navbar from "./Navbar";
import Footer from "./Footer";
import FloatingChat from "./FloatingChat";
import OpeningModalGate from "./OpeningModalGate";
import LoadingScreen from "./LoadingScreen";
import { LoadingProvider, useLoading } from "@/context/LoadingContext";

function LayoutContent({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const { hideLoading } = useLoading();
  const prevPathname = useRef(pathname);

  // When the pathname actually changes, the new page has mounted —
  // hide the loading screen after a short delay so the exit animation
  // has time to play.
  useEffect(() => {
    if (prevPathname.current === pathname) return; // skip initial mount
    prevPathname.current = pathname;

    const timer = setTimeout(() => hideLoading(), 300);
    return () => clearTimeout(timer);
  }, [pathname, hideLoading]);

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <LoadingScreen />
      <Navbar />
      <main className="flex-1 pt-14 md:pt-16 page-reveal">{children}</main>
      <Footer />
      <FloatingChat />
      <OpeningModalGate />
    </div>
  );
}

const Layout = ({ children }: { children: ReactNode }) => {
  return (
    <LoadingProvider>
      <LayoutContent>{children}</LayoutContent>
    </LoadingProvider>
  );
};

export default Layout;
