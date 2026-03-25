"use client";

import { ReactNode, useEffect } from "react";
import { useTransition } from "react";
import { usePathname } from "next/navigation";
import Navbar from "./Navbar";
import Footer from "./Footer";
import FloatingChat from "./FloatingChat";
import OpeningModalGate from "./OpeningModalGate";
import LoadingScreen from "./LoadingScreen";
import { LoadingProvider, useLoading } from "@/context/LoadingContext";

function LayoutContent({ children }: { children: ReactNode }) {
  const [isPending] = useTransition();
  const pathname = usePathname();
  const { showLoading, hideLoading } = useLoading();

  // Route change detection via route transitions
  useEffect(() => {
    if (isPending) {
      showLoading();
    } else {
      setTimeout(() => hideLoading(), 300);
    }
  }, [isPending, showLoading, hideLoading]);

  // Global router change detection via pathname monitoring
  useEffect(() => {
    const handleRouteChange = () => {
      showLoading();
      // Simulate route change time
      const timer = setTimeout(() => hideLoading(), 1500);
      return () => clearTimeout(timer);
    };

    // Only trigger if route actually changes (not on initial mount)
    if (pathname) {
      handleRouteChange();
    }
  }, [pathname, showLoading, hideLoading]);

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
