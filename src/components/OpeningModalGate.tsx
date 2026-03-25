"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import { X } from "lucide-react";
import { useLang } from "@/lib/i18n";
import { useSiteContent } from "@/hooks/use-site-content";
import { OpeningModalItem } from "@/lib/site-content-types";
import { usePathname } from "next/navigation";

const OPENING_MODAL_STATE_KEY = "Yolk Corner-opening-modal-state-v2";
const OPENING_MODAL_SESSION_EXPIRES_KEY =
  "Yolk Corner-opening-modal-session-expires-v1";
const SESSION_TTL_MS = 30 * 60 * 1000;

interface ModalBehaviorState {
  welcomeSeen?: boolean;
  lastShownAt?: number;
  snoozedUntil?: number;
  mutedUntil?: number;
}

type ModalStateMap = Record<string, ModalBehaviorState>;
type PageKey = "home" | "blog" | "news" | "download";

const DEFAULT_TARGET_PAGES: PageKey[] = ["home", "blog", "news", "download"];

const getNow = () => Date.now();

const readStateMap = (): ModalStateMap => {
  try {
    const raw = window.localStorage.getItem(OPENING_MODAL_STATE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
};

const writeStateMap = (next: ModalStateMap) => {
  window.localStorage.setItem(OPENING_MODAL_STATE_KEY, JSON.stringify(next));
};

const hasActiveSessionWindow = () => {
  const raw = window.localStorage.getItem(OPENING_MODAL_SESSION_EXPIRES_KEY);
  const expiresAt = Number(raw || 0);
  return Number.isFinite(expiresAt) && expiresAt > getNow();
};

const startSessionWindow = () => {
  window.localStorage.setItem(
    OPENING_MODAL_SESSION_EXPIRES_KEY,
    String(getNow() + SESSION_TTL_MS),
  );
};

const parseDateOrZero = (value: string | undefined) => {
  if (!value) return 0;
  const time = new Date(value).getTime();
  return Number.isFinite(time) ? time : 0;
};

const isExternalUrl = (url: string) => /^https?:\/\//i.test(url);

const isPathAllowed = (pathname: string) => {
  if (!pathname) return false;
  if (pathname.startsWith("/admin")) return false;
  return true;
};

const resolvePageKey = (pathname: string): PageKey | null => {
  if (pathname === "/") return "home";
  if (pathname.startsWith("/blog")) return "blog";
  if (pathname.startsWith("/news")) return "news";
  if (pathname.startsWith("/download")) return "download";
  return null;
};

const getScrollProgress = () => {
  const scrollTop =
    window.scrollY ||
    document.documentElement.scrollTop ||
    document.body.scrollTop ||
    0;
  const scrollHeight = document.documentElement.scrollHeight;
  const viewportHeight = window.innerHeight;
  const maxScrollable = Math.max(0, scrollHeight - viewportHeight);
  if (maxScrollable === 0) return 0;
  return scrollTop / maxScrollable;
};

const resolveCandidateModal = (
  items: OpeningModalItem[] | undefined,
  stateMap: ModalStateMap,
  currentPage: PageKey,
) => {
  if (!Array.isArray(items) || items.length === 0) return null;

  const now = getNow();
  if (hasActiveSessionWindow()) return null;

  const eligible = items
    .filter((item) => item.isActive && item.imageUrl?.trim())
    .filter((item) => {
      const targets =
        Array.isArray(item.targetPages) && item.targetPages.length > 0
          ? item.targetPages
          : DEFAULT_TARGET_PAGES;
      if (!targets.includes(currentPage)) return false;

      const startAt = parseDateOrZero(item.startAt);
      const endAt = parseDateOrZero(item.endAt);
      if (startAt > 0 && now < startAt) return false;
      if (endAt > 0 && now > endAt) return false;

      const state = stateMap[item.id] || {};
      if ((state.mutedUntil || 0) > now) return false;
      if ((state.snoozedUntil || 0) > now) return false;

      if (item.mode === "welcome") {
        return !state.welcomeSeen;
      }

      const minIntervalHours = Math.max(0, item.minIntervalHours ?? 24);
      const minIntervalMs = minIntervalHours * 60 * 60 * 1000;
      if (minIntervalMs > 0 && (state.lastShownAt || 0) + minIntervalMs > now) {
        return false;
      }

      return true;
    })
    .sort((a, b) => {
      const priorityA = Number(a.priority || 0);
      const priorityB = Number(b.priority || 0);
      if (priorityA !== priorityB) return priorityB - priorityA;
      return b.updatedAt.localeCompare(a.updatedAt);
    });

  return eligible[0] || null;
};

export default function OpeningModalGate() {
  const { lang } = useLang();
  const { content, loading } = useSiteContent();
  const pathname = usePathname();

  const [open, setOpen] = useState(false);
  const [activeModal, setActiveModal] = useState<OpeningModalItem | null>(null);

  useEffect(() => {
    if (loading || open) return;
    if (!isPathAllowed(pathname)) return;

    const currentPage = resolvePageKey(pathname);
    if (!currentPage) return;

    const stateMap = readStateMap();
    const candidate = resolveCandidateModal(
      content.openingModals,
      stateMap,
      currentPage,
    );
    if (!candidate) return;

    const openCandidate = () => {
      setActiveModal(candidate);
      setOpen(true);
    };

    if (candidate.triggerMode === "scroll-30") {
      const onScroll = () => {
        if (getScrollProgress() >= 0.3) {
          window.removeEventListener("scroll", onScroll);
          window.clearTimeout(fallbackTimer);
          openCandidate();
        }
      };

      const fallbackTimer = window.setTimeout(() => {
        window.removeEventListener("scroll", onScroll);
        openCandidate();
      }, 15000);

      window.addEventListener("scroll", onScroll, { passive: true });
      onScroll();

      return () => {
        window.removeEventListener("scroll", onScroll);
        window.clearTimeout(fallbackTimer);
      };
    }

    const delay = pathname === "/" ? 4500 : 8500;
    const timer = window.setTimeout(() => {
      openCandidate();
    }, delay);

    return () => {
      window.clearTimeout(timer);
    };
  }, [content.openingModals, loading, open, pathname]);

  useEffect(() => {
    if (!open) return;

    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = originalOverflow;
    };
  }, [open]);

  if (!open || !activeModal) return null;

  const updateModalState = (
    item: OpeningModalItem,
    updater: (prev: ModalBehaviorState) => ModalBehaviorState,
  ) => {
    const map = readStateMap();
    const prev = map[item.id] || {};
    map[item.id] = updater(prev);
    writeStateMap(map);
  };

  const markShownForSessionAndInterval = (item: OpeningModalItem) => {
    const now = getNow();
    updateModalState(item, (prev) => ({
      ...prev,
      lastShownAt: now,
      welcomeSeen: item.mode === "welcome" ? true : prev.welcomeSeen,
    }));
    startSessionWindow();
  };

  const close = () => {
    const now = getNow();
    if (activeModal.mode !== "welcome") {
      const snoozeHours = Math.max(0, activeModal.snoozeHours ?? 24);
      updateModalState(activeModal, (prev) => ({
        ...prev,
        lastShownAt: now,
        snoozedUntil: now + snoozeHours * 60 * 60 * 1000,
      }));
      startSessionWindow();
    } else {
      markShownForSessionAndInterval(activeModal);
    }

    setOpen(false);
  };

  const onModalClick = () => {
    const nextLink = activeModal.linkUrl.trim();
    const now = getNow();

    if (activeModal.mode !== "welcome") {
      const muteDays = Math.max(0, activeModal.muteDaysAfterClick ?? 7);
      updateModalState(activeModal, (prev) => ({
        ...prev,
        lastShownAt: now,
        mutedUntil: now + muteDays * 24 * 60 * 60 * 1000,
      }));
      startSessionWindow();
    } else {
      markShownForSessionAndInterval(activeModal);
    }

    if (!nextLink) {
      setOpen(false);
      return;
    }

    setOpen(false);
    if (isExternalUrl(nextLink)) {
      window.location.href = nextLink;
      return;
    }

    window.location.assign(nextLink);
  };

  return (
    <div className="fixed inset-0 z-100 flex items-center justify-center bg-white/72 p-4 backdrop-blur-[1px]">
      <div className="relative w-full max-w-[min(90vw,520px)]">
        <button
          type="button"
          onClick={close}
          className="absolute -right-2 -top-2 z-20 inline-flex h-9 w-9 items-center justify-center rounded-full border border-black/15 bg-white/95 text-black transition hover:bg-white"
          aria-label={
            lang === "th" ? "ปิด Opening Modal" : "Close opening modal"
          }
        >
          <X className="h-4 w-4" />
        </button>

        <button
          type="button"
          onClick={onModalClick}
          className="group relative block aspect-square w-full overflow-hidden rounded-md bg-black text-left drop-shadow-[-2px_2px_4px_rgba(0,0,0,0.25)]"
          aria-label={
            lang === "th"
              ? "คลิกเพื่อไปยังลิงก์ที่กำหนด"
              : "Click to navigate to the configured link"
          }
        >
          <Image
            src={activeModal.imageUrl}
            alt={lang === "th" ? "กล่องป๊อปอัพ" : "Pop-up Modal"}
            fill
            sizes="(max-width: 768px) 90vw, 520px"
            className="object-cover transition-transform duration-800 group-hover:scale-[1.02]"
            priority
          />
        </button>
      </div>
    </div>
  );
}
