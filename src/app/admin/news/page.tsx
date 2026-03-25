"use client";

import Image from "next/image";
import { ChangeEvent, useEffect, useMemo, useRef, useState } from "react";
import AdminSectionLayout from "@/components/admin/AdminSectionLayout";
import { FloatingLabelInput } from "@/components/FloatingLabelInput";
import { FloatingLabelTextarea } from "@/components/FloatingLabelTextarea";
import { useLang } from "@/lib/i18n";
import {
  NewsFaqItem,
  NewsItem,
  SiteContent,
  defaultSiteContent,
} from "@/lib/site-content-types";
import { isNewsActive } from "@/lib/news";

interface UploadAssetOptions {
  folder?: string;
  publicId?: string;
  overwrite?: boolean;
  deletePublicId?: string;
}

const createId = (prefix: string) =>
  `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

// ...existing code...

const slugify = (value: string) =>
  value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");

const parseListInput = (value: string) =>
  value
    .split(/\r?\n|,/)
    .map((item) => item.trim())
    .filter(Boolean);

const serializeListInput = (items: string[] | undefined) =>
  (items || []).join("\n");

const normalizeFaqItems = (items: NewsFaqItem[] | undefined): NewsFaqItem[] =>
  (items || [])
    .map((item) => ({
      question: item.question?.trim() || "",
      answer: item.answer?.trim() || "",
    }))
    .filter((item) => item.question && item.answer);

const getLengthTone = (
  length: number,
  recommendedMin: number,
  recommendedMax: number,
  hardMax: number,
) => {
  if (length === 0) return "muted" as const;
  if (length >= recommendedMin && length <= recommendedMax)
    return "good" as const;
  if (length <= hardMax) return "warn" as const;
  return "bad" as const;
};

const getLengthToneClass = (tone: "muted" | "good" | "warn" | "bad") => {
  if (tone === "good") return "text-green-600";
  if (tone === "warn") return "text-amber-600";
  if (tone === "bad") return "text-red-600";
  return "text-muted-foreground";
};

const getQualityBadgeClass = (score: number) => {
  if (score >= 85) return "bg-green-100 text-green-700 border-green-200";
  if (score >= 70) return "bg-amber-100 text-amber-700 border-amber-200";
  return "bg-red-100 text-red-700 border-red-200";
};

const getUniqueSlug = (
  baseSlug: string,
  items: NewsItem[],
  currentId: string,
) => {
  const fallbackBase = baseSlug || "news";
  const existing = new Set(
    items
      .filter((item) => item.id !== currentId)
      .map((item) => (item.slug || "").trim().toLowerCase())
      .filter(Boolean),
  );

  if (!existing.has(fallbackBase.toLowerCase())) {
    return fallbackBase;
  }

  let counter = 2;
  let candidate = `${fallbackBase}-${counter}`;
  while (existing.has(candidate.toLowerCase())) {
    counter += 1;
    candidate = `${fallbackBase}-${counter}`;
  }
  return candidate;
};

const getNewsQualityChecks = (item: NewsItem, isTh: boolean) => {
  const checks = [
    {
      label: isTh ? "หัวข้อ TH/EN ครบ" : "TH/EN titles are complete",
      pass: Boolean(item.title?.trim() && item.titleEn?.trim()),
    },
    {
      label: isTh ? "เนื้อหา TH/EN ครบ" : "TH/EN bodies are complete",
      pass: Boolean(item.body?.trim() && item.bodyEn?.trim()),
    },
    {
      label: isTh ? "มี slug" : "Has slug",
      pass: Boolean(item.slug?.trim()),
    },
    {
      label: isTh ? "มี SEO title TH/EN" : "Has SEO title TH/EN",
      pass: Boolean(item.seoTitleTh?.trim() && item.seoTitleEn?.trim()),
    },
    {
      label: isTh ? "มี SEO description TH/EN" : "Has SEO description TH/EN",
      pass: Boolean(
        item.seoDescriptionTh?.trim() && item.seoDescriptionEn?.trim(),
      ),
    },
    {
      label: isTh ? "มี Summary TH/EN" : "Has Summary TH/EN",
      pass: Boolean(item.summaryTh?.trim() && item.summaryEn?.trim()),
    },
    {
      label: isTh ? "มีแท็ก SEO TH/EN" : "Has SEO tags TH/EN",
      pass:
        (item.seoTagsTh?.length || 0) > 0 && (item.seoTagsEn?.length || 0) > 0,
    },
    {
      label: isTh ? "มี FAQ TH/EN" : "Has FAQ TH/EN",
      pass:
        normalizeFaqItems(item.faqTh).length >= 2 &&
        normalizeFaqItems(item.faqEn).length >= 2,
    },
    {
      label: isTh ? "มีรูปปก + alt TH/EN" : "Has cover + alt TH/EN",
      pass: Boolean(
        item.imageUrl?.trim() &&
        item.coverAltTh?.trim() &&
        item.coverAltEn?.trim(),
      ),
    },
    {
      label: isTh ? "มีผู้เขียน" : "Has author",
      pass: Boolean(item.authorName?.trim()),
    },
  ];

  const passed = checks.filter((check) => check.pass).length;
  const score = Math.round((passed / checks.length) * 100);

  return { checks, score };
};

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

const createEmptyNews = (): NewsItem => {
  const now = new Date().toISOString();
  return {
    id: createId("news"),
    slug: "",
    title: "",
    titleEn: "",
    seoTitleTh: "",
    seoTitleEn: "",
    seoDescriptionTh: "",
    seoDescriptionEn: "",
    canonicalUrl: "",
    noIndex: false,
    summaryTh: "",
    summaryEn: "",
    keyTakeawaysTh: [],
    keyTakeawaysEn: [],
    faqTh: [],
    faqEn: [],
    authorName: "",
    authorRole: "",
    reviewedAt: "",
    sourceLinks: [],
    coverAltTh: "",
    coverAltEn: "",
    body: "",
    bodyEn: "",
    imageUrl: "",
    seoTagsTh: [],
    seoTagsEn: [],
    showOnHome: false,
    alwaysActive: true,
    startAt: "",
    endAt: "",
    createdAt: now,
    updatedAt: now,
  };
};

const normalizeNewsItem = (item: NewsItem): NewsItem => ({
  ...item,
  slug: item.slug || "",
  seoTitleTh: item.seoTitleTh || "",
  seoTitleEn: item.seoTitleEn || "",
  seoDescriptionTh: item.seoDescriptionTh || "",
  seoDescriptionEn: item.seoDescriptionEn || "",
  canonicalUrl: item.canonicalUrl || "",
  noIndex: Boolean(item.noIndex),
  summaryTh: item.summaryTh || "",
  summaryEn: item.summaryEn || "",
  keyTakeawaysTh: Array.isArray(item.keyTakeawaysTh) ? item.keyTakeawaysTh : [],
  keyTakeawaysEn: Array.isArray(item.keyTakeawaysEn) ? item.keyTakeawaysEn : [],
  faqTh: normalizeFaqItems(item.faqTh),
  faqEn: normalizeFaqItems(item.faqEn),
  authorName: item.authorName || "",
  authorRole: item.authorRole || "",
  reviewedAt: item.reviewedAt || "",
  sourceLinks: Array.isArray(item.sourceLinks) ? item.sourceLinks : [],
  coverAltTh: item.coverAltTh || "",
  coverAltEn: item.coverAltEn || "",
  seoTagsTh: Array.isArray(item.seoTagsTh) ? item.seoTagsTh : [],
  seoTagsEn: Array.isArray(item.seoTagsEn) ? item.seoTagsEn : [],
  imageUrl: item.imageUrl || "",
  alwaysActive: Boolean(item.alwaysActive),
  startAt: item.startAt || "",
  endAt: item.endAt || "",
});

const toDateTimeLocalValue = (value?: string) => {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";

  const pad = (n: number) => `${n}`.padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
};

const fromDateTimeLocalValue = (value: string) => {
  if (!value) return "";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "";
  return parsed.toISOString();
};

export default function AdminNewsPage() {
  const { lang } = useLang();
  const isTh = lang === "th";
  const [content, setContent] = useState<SiteContent>(defaultSiteContent);
  const [newsTitle, setNewsTitle] = useState(defaultSiteContent.news.title);
  const [newsTitleEn, setNewsTitleEn] = useState(
    defaultSiteContent.news.titleEn || "",
  );
  const [draftItems, setDraftItems] = useState<NewsItem[]>([]);

  const [imagePreviews, setImagePreviews] = useState<Record<string, string>>(
    {},
  );
  const imagePreviewsRef = useRef<Record<string, string>>({});

  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<"add" | "edit">("add");
  const [modalItem, setModalItem] = useState<NewsItem | null>(null);
  const [modalFile, setModalFile] = useState<File | null>(null);
  const [modalPreview, setModalPreview] = useState("");
  const [tagInputTh, setTagInputTh] = useState("");
  const [tagInputEn, setTagInputEn] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<NewsItem | null>(null);

  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [guideOpen, setGuideOpen] = useState(false);
  const [sourceLinkInput, setSourceLinkInput] = useState("");

  useEffect(() => {
    const initialize = async () => {
      try {
        const contentRes = await fetch("/api/content", { cache: "no-store" });
        if (!contentRes.ok) {
          setMessage(
            isTh ? "โหลดข้อมูลข่าวสารไม่สำเร็จ" : "Failed to load news",
          );
          return;
        }

        const contentData = await contentRes.json();
        if (contentData?.content) {
          const loaded = contentData.content as SiteContent;
          setContent(loaded);
          setNewsTitle(loaded.news.title || defaultSiteContent.news.title);
          setNewsTitleEn(
            loaded.news.titleEn || defaultSiteContent.news.titleEn || "",
          );
          setDraftItems((loaded.news.items || []).map(normalizeNewsItem));
        }
      } catch (error) {
        console.error(error);
        setMessage(isTh ? "โหลดข้อมูลข่าวสารไม่สำเร็จ" : "Failed to load news");
      }
    };

    initialize();
  }, [isTh]);

  useEffect(() => {
    imagePreviewsRef.current = imagePreviews;
  }, [imagePreviews]);

  useEffect(() => {
    return () => {
      Object.values(imagePreviewsRef.current).forEach((url) =>
        URL.revokeObjectURL(url),
      );
    };
  }, []);

  useEffect(() => {
    return () => {
      if (modalPreview) URL.revokeObjectURL(modalPreview);
    };
  }, [modalPreview]);

  const clearImageDrafts = () => {
    Object.values(imagePreviews).forEach((url) => URL.revokeObjectURL(url));
    setImagePreviews({});
  };

  const sortedItems = useMemo(
    () =>
      [...draftItems].sort(
        (a, b) =>
          new Date(b.updatedAt || b.createdAt).getTime() -
          new Date(a.updatedAt || a.createdAt).getTime(),
      ),
    [draftItems],
  );

  const savedIdSet = useMemo(
    () => new Set((content.news.items || []).map((item) => item.id)),
    [content.news.items],
  );

  const savedItems = useMemo(
    () => sortedItems.filter((item) => savedIdSet.has(item.id)),
    [savedIdSet, sortedItems],
  );

  const newItems = useMemo(
    () => sortedItems.filter((item) => !savedIdSet.has(item.id)),
    [savedIdSet, sortedItems],
  );

  const addItem = () => {
    setModalMode("add");
    setModalItem(createEmptyNews());
    setModalFile(null);
    if (modalPreview) URL.revokeObjectURL(modalPreview);
    setModalPreview("");
    setTagInputTh("");
    setTagInputEn("");
    setSourceLinkInput("");
    setModalOpen(true);
    setMessage("");
  };

  const requestDeleteItem = (item: NewsItem) => {
    setOpenMenuId(null);
    setDeleteTarget(item);
  };

  const openEditModal = (item: NewsItem) => {
    setModalMode("edit");
    setModalItem({ ...item });
    setModalFile(null);
    if (modalPreview) URL.revokeObjectURL(modalPreview);
    setModalPreview("");
    setTagInputTh("");
    setTagInputEn("");
    setSourceLinkInput("");
    setModalOpen(true);
    setOpenMenuId(null);
    setMessage("");
  };

  const closeModal = () => {
    setModalOpen(false);
    setModalItem(null);
    setModalFile(null);
    if (modalPreview) URL.revokeObjectURL(modalPreview);
    setModalPreview("");
    setTagInputTh("");
    setTagInputEn("");
    setSourceLinkInput("");
  };

  const onModalImageChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0] || null;
    if (!file) return;

    if (modalPreview) URL.revokeObjectURL(modalPreview);

    setModalFile(file);
    setModalPreview(URL.createObjectURL(file));
  };

  const addFaqItem = (key: "faqTh" | "faqEn") => {
    setModalItem((prev) => {
      if (!prev) return prev;
      const next = [...(prev[key] || []), { question: "", answer: "" }];
      return { ...prev, [key]: next };
    });
  };

  const updateFaqItem = (
    key: "faqTh" | "faqEn",
    index: number,
    field: "question" | "answer",
    value: string,
  ) => {
    setModalItem((prev) => {
      if (!prev) return prev;
      const next = [...(prev[key] || [])];
      const target = next[index];
      if (!target) return prev;
      next[index] = { ...target, [field]: value };
      return { ...prev, [key]: next };
    });
  };

  const removeFaqItem = (key: "faqTh" | "faqEn", index: number) => {
    setModalItem((prev) => {
      if (!prev) return prev;
      const next = [...(prev[key] || [])];
      next.splice(index, 1);
      return { ...prev, [key]: next };
    });
  };

  const addTag = (key: "seoTagsTh" | "seoTagsEn", rawValue: string) => {
    const value = rawValue.trim();
    if (!value) return;
    setModalItem((prev) => {
      if (!prev) return prev;
      const existing =
        key === "seoTagsTh" ? prev.seoTagsTh || [] : prev.seoTagsEn || [];
      if (existing.some((item) => item.toLowerCase() === value.toLowerCase())) {
        return prev;
      }
      const next = [...existing, value];
      return key === "seoTagsTh"
        ? { ...prev, seoTagsTh: next }
        : { ...prev, seoTagsEn: next };
    });
    if (key === "seoTagsTh") setTagInputTh("");
    else setTagInputEn("");
  };

  const removeTag = (key: "seoTagsTh" | "seoTagsEn", tag: string) => {
    setModalItem((prev) => {
      if (!prev) return prev;
      const existing =
        key === "seoTagsTh" ? prev.seoTagsTh || [] : prev.seoTagsEn || [];
      const next = existing.filter((item) => item !== tag);
      return key === "seoTagsTh"
        ? { ...prev, seoTagsTh: next }
        : { ...prev, seoTagsEn: next };
    });
  };

  const addSourceLink = (value: string) => {
    const trimmed = value.trim();
    if (!trimmed) return;
    setModalItem((prev) => {
      if (!prev) return prev;
      const existing = prev.sourceLinks || [];
      if (existing.includes(trimmed)) return prev;
      return { ...prev, sourceLinks: [...existing, trimmed] };
    });
    setSourceLinkInput("");
  };

  const removeSourceLink = (link: string) => {
    setModalItem((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        sourceLinks: (prev.sourceLinks || []).filter((l) => l !== link),
      };
    });
  };

  const persistNews = async (
    nextItems: NewsItem[],
    options?: {
      imageFileById?: Record<string, File>;
      savingText?: string;
      successText?: string;
      failedText?: string;
      validateItems?: boolean;
      overrideTitle?: string;
      overrideTitleEn?: string;
    },
  ) => {
    const shouldValidate = options?.validateItems ?? true;

    if (shouldValidate) {
      const hasInvalid = nextItems.some(
        (item) =>
          !item.title.trim() ||
          !(item.titleEn || "").trim() ||
          !item.body.trim() ||
          !(item.bodyEn || "").trim(),
      );

      if (hasInvalid) {
        setMessage(
          isTh
            ? "กรุณากรอกหัวข้อและข้อความทั้งภาษาไทยและอังกฤษให้ครบ"
            : "Please fill title and content in both Thai and English",
        );
        return false;
      }
    }

    const imageFileById = options?.imageFileById || {};

    setSaving(true);
    setMessage(
      options?.savingText ||
        (isTh ? "กำลังบันทึกข่าวสาร..." : "Saving news..."),
    );

    try {
      let itemsWithImages = [...nextItems];

      for (const item of nextItems) {
        const draftFile = imageFileById[item.id];
        if (!draftFile) continue;
        const imageUrl = await uploadAsset(draftFile, {
          folder: "Yolk Corner/news/images",
          publicId: `Yolk Corner/news/images/${item.id}`,
          overwrite: true,
          deletePublicId: undefined,
        });

        itemsWithImages = itemsWithImages.map((news) =>
          news.id === item.id
            ? { ...news, imageUrl, updatedAt: new Date().toISOString() }
            : news,
        );
      }

      const normalizedItems = itemsWithImages.map((item) => ({
        ...item,
        slug: (item.slug || slugify(item.titleEn || item.title)).trim(),
        seoTitleTh: (item.seoTitleTh || "").trim(),
        seoTitleEn: (item.seoTitleEn || "").trim(),
        seoDescriptionTh: (item.seoDescriptionTh || "").trim(),
        seoDescriptionEn: (item.seoDescriptionEn || "").trim(),
        canonicalUrl: (item.canonicalUrl || "").trim(),
        noIndex: Boolean(item.noIndex),
        summaryTh: (item.summaryTh || "").trim(),
        summaryEn: (item.summaryEn || "").trim(),
        keyTakeawaysTh: [...(item.keyTakeawaysTh || [])]
          .map((value) => value.trim())
          .filter(Boolean),
        keyTakeawaysEn: [...(item.keyTakeawaysEn || [])]
          .map((value) => value.trim())
          .filter(Boolean),
        faqTh: normalizeFaqItems(item.faqTh),
        faqEn: normalizeFaqItems(item.faqEn),
        authorName: (item.authorName || "").trim(),
        authorRole: (item.authorRole || "").trim(),
        reviewedAt: (item.reviewedAt || "").trim(),
        sourceLinks: [...(item.sourceLinks || [])]
          .map((value) => value.trim())
          .filter(Boolean),
        coverAltTh: (item.coverAltTh || "").trim(),
        coverAltEn: (item.coverAltEn || "").trim(),
        title: item.title.trim(),
        titleEn: (item.titleEn || "").trim(),
        body: item.body.trim(),
        bodyEn: (item.bodyEn || "").trim(),
        seoTagsTh: [...(item.seoTagsTh || [])]
          .map((value) => value.trim())
          .filter(Boolean),
        seoTagsEn: [...(item.seoTagsEn || [])]
          .map((value) => value.trim())
          .filter(Boolean),
        startAt: item.alwaysActive ? "" : item.startAt || "",
        endAt: item.alwaysActive ? "" : item.endAt || "",
        imageUrl: item.imageUrl || "/hero-bg.png",
      }));

      const nextContent: SiteContent = {
        ...content,
        news: {
          title:
            (options?.overrideTitle ?? newsTitle).trim() ||
            defaultSiteContent.news.title,
          titleEn:
            (options?.overrideTitleEn ?? newsTitleEn).trim() ||
            defaultSiteContent.news.titleEn ||
            "",
          items: normalizedItems,
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
      setNewsTitle(saved.news.title || defaultSiteContent.news.title);
      setNewsTitleEn(
        saved.news.titleEn || defaultSiteContent.news.titleEn || "",
      );
      setDraftItems((saved.news.items || []).map(normalizeNewsItem));
      clearImageDrafts();
      setMessage(
        options?.successText ||
          (isTh ? "บันทึกข่าวสารเรียบร้อยแล้ว" : "News saved successfully"),
      );
      return true;
    } catch (error) {
      console.error(error);
      setMessage(
        options?.failedText ||
          (isTh ? "บันทึกข่าวสารไม่สำเร็จ" : "Failed to save news"),
      );
      return false;
    } finally {
      setSaving(false);
    }
  };

  const saveModalItem = async () => {
    if (!modalItem) return;

    const fallbackSlug = slugify(modalItem.titleEn || modalItem.title);
    const requestedSlug = (modalItem.slug || fallbackSlug).trim();
    const resolvedSlug = getUniqueSlug(requestedSlug, draftItems, modalItem.id);
    const slugWasAdjusted =
      requestedSlug.toLowerCase() !== resolvedSlug.toLowerCase();

    const normalized: NewsItem = {
      ...modalItem,
      slug: resolvedSlug,
      title: modalItem.title.trim(),
      titleEn: (modalItem.titleEn || "").trim(),
      seoTitleTh: (modalItem.seoTitleTh || "").trim(),
      seoTitleEn: (modalItem.seoTitleEn || "").trim(),
      seoDescriptionTh: (modalItem.seoDescriptionTh || "").trim(),
      seoDescriptionEn: (modalItem.seoDescriptionEn || "").trim(),
      canonicalUrl: (modalItem.canonicalUrl || "").trim(),
      noIndex: Boolean(modalItem.noIndex),
      summaryTh: (modalItem.summaryTh || "").trim(),
      summaryEn: (modalItem.summaryEn || "").trim(),
      keyTakeawaysTh: (modalItem.keyTakeawaysTh || [])
        .map((item) => item.trim())
        .filter(Boolean),
      keyTakeawaysEn: (modalItem.keyTakeawaysEn || [])
        .map((item) => item.trim())
        .filter(Boolean),
      faqTh: normalizeFaqItems(modalItem.faqTh),
      faqEn: normalizeFaqItems(modalItem.faqEn),
      authorName: (modalItem.authorName || "").trim(),
      authorRole: (modalItem.authorRole || "").trim(),
      reviewedAt: (modalItem.reviewedAt || "").trim(),
      sourceLinks: (modalItem.sourceLinks || [])
        .map((item) => item.trim())
        .filter(Boolean),
      coverAltTh: (modalItem.coverAltTh || "").trim(),
      coverAltEn: (modalItem.coverAltEn || "").trim(),
      body: modalItem.body.trim(),
      bodyEn: (modalItem.bodyEn || "").trim(),
      seoTagsTh: Array.isArray(modalItem.seoTagsTh) ? modalItem.seoTagsTh : [],
      seoTagsEn: Array.isArray(modalItem.seoTagsEn) ? modalItem.seoTagsEn : [],
      showOnHome: Boolean(modalItem.showOnHome),
      alwaysActive: Boolean(modalItem.alwaysActive),
      startAt: modalItem.alwaysActive ? "" : modalItem.startAt || "",
      endAt: modalItem.alwaysActive ? "" : modalItem.endAt || "",
      updatedAt: new Date().toISOString(),
    };

    if (
      !normalized.title ||
      !normalized.titleEn ||
      !normalized.body ||
      !normalized.bodyEn
    ) {
      setMessage(
        isTh
          ? "กรุณากรอกหัวข้อและข้อความทั้งภาษาไทยและอังกฤษให้ครบ"
          : "Please fill title and content in both Thai and English",
      );
      return;
    }

    if (slugWasAdjusted) {
      setModalItem((prev) => (prev ? { ...prev, slug: resolvedSlug } : prev));
    }

    const { score } = getNewsQualityChecks(normalized, isTh);
    if (!normalized.noIndex && score < 70) {
      setMessage(
        isTh
          ? `คะแนนคุณภาพ SEO/AIO ต่ำเกินไป (${score}/100) ต้องอย่างน้อย 70 ก่อนเผยแพร่`
          : `SEO/AIO quality score is too low (${score}/100). Minimum 70 is required before publishing.`,
      );
      return;
    }

    const nextItems =
      modalMode === "add"
        ? [normalized, ...draftItems]
        : draftItems.map((item) =>
            item.id === normalized.id ? normalized : item,
          );

    const imageFileById =
      modalFile && normalized.id ? { [normalized.id]: modalFile } : undefined;

    const ok = await persistNews(nextItems, {
      imageFileById,
      savingText:
        modalMode === "add"
          ? isTh
            ? "กำลังเพิ่มข่าวสาร..."
            : "Adding news..."
          : isTh
            ? "กำลังบันทึกข่าวสาร..."
            : "Saving news...",
      successText:
        modalMode === "add"
          ? isTh
            ? "เพิ่มข่าวสารเรียบร้อยแล้ว"
            : "News added successfully"
          : isTh
            ? "บันทึกข่าวสารเรียบร้อยแล้ว"
            : "News saved successfully",
      failedText:
        modalMode === "add"
          ? isTh
            ? "เพิ่มข่าวสารไม่สำเร็จ"
            : "Failed to add news"
          : isTh
            ? "บันทึกข่าวสารไม่สำเร็จ"
            : "Failed to save news",
    });

    if (ok) {
      closeModal();
    }
  };

  const saveTitleOnBlur = async () => {
    const nextTitle = newsTitle.trim() || defaultSiteContent.news.title;
    const nextTitleEn =
      newsTitleEn.trim() || defaultSiteContent.news.titleEn || "";

    if (
      nextTitle === (content.news.title || defaultSiteContent.news.title) &&
      nextTitleEn ===
        (content.news.titleEn || defaultSiteContent.news.titleEn || "")
    ) {
      return;
    }

    await persistNews(draftItems, {
      validateItems: false,
      overrideTitle: nextTitle,
      overrideTitleEn: nextTitleEn,
      savingText: isTh ? "กำลังบันทึกหัวข้อข่าว..." : "Saving news title...",
      successText: isTh ? "บันทึกหัวข้อข่าวเรียบร้อยแล้ว" : "News title saved",
      failedText: isTh
        ? "บันทึกหัวข้อข่าวไม่สำเร็จ"
        : "Failed to save news title",
    });
  };

  const confirmDeleteItem = async () => {
    if (!deleteTarget) return;

    const nextItems = draftItems.filter((item) => item.id !== deleteTarget.id);
    const ok = await persistNews(nextItems, {
      savingText: isTh ? "กำลังลบข่าวสาร..." : "Deleting news...",
      successText: isTh
        ? "ลบข่าวสารเรียบร้อยแล้ว"
        : "News deleted successfully",
      failedText: isTh ? "ลบข่าวสารไม่สำเร็จ" : "Failed to delete news",
    });

    if (ok) {
      setDeleteTarget(null);
    }
  };

  const modalQuality = modalItem ? getNewsQualityChecks(modalItem, isTh) : null;

  return (
    <AdminSectionLayout
      title={isTh ? "ข่าวสารและโปรโมชั่น" : "News & Promotions"}
      description={
        isTh
          ? "จัดการข่าวสาร/โปรโมชั่น พร้อมตั้งเวลาการแสดงผลและเลือกแสดงบนหน้าแรก"
          : "Manage news/promotions with schedule and homepage visibility"
      }
    >
      <section className="rounded-lg border border-border bg-card p-6 space-y-6">
        <div className="rounded-md border border-border p-4 space-y-3">
          <h2 className="text-base font-semibold">
            {isTh ? "หัวข้อหน้า News" : "News Page Title"}
          </h2>
          <FloatingLabelInput
            value={newsTitle}
            onChange={(event) => setNewsTitle(event.target.value)}
            onBlur={saveTitleOnBlur}
            label={isTh ? "หัวข้อหน้า (TH)" : "Page title (TH)"}
            id="news-page-title-th"
            disabled={saving}
          />
          <FloatingLabelInput
            value={newsTitleEn}
            onChange={(event) => setNewsTitleEn(event.target.value)}
            onBlur={saveTitleOnBlur}
            label={isTh ? "หัวข้อหน้า (EN)" : "Page title (EN)"}
            id="news-page-title-en"
            disabled={saving}
          />
        </div>

        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold">
            {isTh ? "เพิ่มข่าวสาร/โปรโมชั่นใหม่" : "Add News / Promotion"}
          </h2>
          <button
            type="button"
            onClick={addItem}
            disabled={saving}
            className="rounded-md border border-[#FF5B00] bg-[#FF5B00] px-4 py-2 text-sm text-white transition-colors hover:bg-[#e65200] disabled:opacity-60"
          >
            {isTh ? "เพิ่มข่าวสาร" : "Add News"}
          </button>
        </div>

        {/* Collapsible input guide */}
        <div className="overflow-hidden rounded-md border border-border">
          <button
            type="button"
            onClick={() => setGuideOpen((o) => !o)}
            className="flex w-full items-center justify-between px-4 py-3 text-left text-sm font-medium hover:bg-secondary"
          >
            <span>
              {isTh ? "📖 คู่มือการกรอกข้อมูล" : "📖 Field Input Guide"}
            </span>
            <span className="text-xs text-muted-foreground">
              {guideOpen
                ? isTh
                  ? "▲ ซ่อน"
                  : "▲ Hide"
                : isTh
                  ? "▼ ดู"
                  : "▼ Show"}
            </span>
          </button>
          {guideOpen && (
            <div className="space-y-5 border-t border-border p-4 text-xs leading-relaxed">
              {/* Main Content */}
              <div className="space-y-2">
                <p className="font-semibold text-foreground">
                  {isTh ? "ข้อมูลหลัก" : "Main Content"}
                </p>
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                  <div className="space-y-1 rounded border border-border bg-background p-2">
                    <p className="font-medium">
                      {isTh ? "หัวข้อ (TH)" : "Title (TH)"}
                    </p>
                    <p className="text-muted-foreground">
                      {isTh
                        ? "ชื่อข่าว/โปรโมชั่นภาษาไทย กระชับ ดึงดูด มีคีย์เวิร์ดหลัก"
                        : "Thai news/promo title — concise, catchy, keyword-rich"}
                    </p>
                    <p className="italic text-[#FF5B00]">
                      {isTh
                        ? "เช่น: โปรโมชั่นเดือนพฤษภา ลด 20% ทุกแพคเกจ"
                        : "e.g. May Promotion – 20% Off All Packages"}
                    </p>
                  </div>
                  <div className="space-y-1 rounded border border-border bg-background p-2">
                    <p className="font-medium">
                      {isTh ? "หัวข้อ (EN)" : "Title (EN)"}
                    </p>
                    <p className="text-muted-foreground">
                      {isTh
                        ? "ชื่อภาษาอังกฤษ แปลหรือดัดแปลงให้แอบมาชั่นเป็นคนอ่านชาวต่างชาติ"
                        : "English title — translate or adapt for international readers"}
                    </p>
                    <p className="italic text-[#FF5B00]">
                      {isTh
                        ? "เช่น: May Promotion – 20% Off All Packages"
                        : "e.g. May Promotion – 20% Off All Packages"}
                    </p>
                  </div>
                  <div className="space-y-1 rounded border border-border bg-background p-2 sm:col-span-2">
                    <p className="font-medium">
                      {isTh ? "เนื้อหา (TH / EN)" : "Body Content (TH / EN)"}
                    </p>
                    <p className="text-muted-foreground">
                      {isTh
                        ? "รายละเอียดข่าวสารหรือเงื่อนไขโปรโมชั่น รองรับ Markdown"
                        : "News/promotion details — supports Markdown: **bold**, # heading, - list, [link](url)"}
                    </p>
                  </div>
                </div>
              </div>

              {/* Core SEO */}
              <div className="space-y-2">
                <p className="font-semibold text-foreground">
                  {isTh ? "SEO พื้นฐาน" : "Core SEO"}
                </p>
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                  <div className="space-y-1 rounded border border-border bg-background p-2">
                    <p className="font-medium">Slug</p>
                    <p className="text-muted-foreground">
                      {isTh
                        ? "URL ของหน้านี้ ใช้ตัวพิมพ์เล็กและขีด - เท่านั้น กด 'สร้าง slug' เพื่อสร้างอัตโนมัติจากชื่อ EN"
                        : "Page URL path — lowercase + hyphens only. Click 'Generate slug' to auto-create from EN title"}
                    </p>
                    <p className="italic text-[#FF5B00]">may-promotion-2026</p>
                  </div>
                  <div className="space-y-1 rounded border border-border bg-background p-2">
                    <p className="font-medium">
                      {isTh ? "SEO Title TH/EN" : "SEO Title TH/EN"}
                    </p>
                    <p className="text-muted-foreground">
                      {isTh
                        ? "ชื่อที่ Google แสดงในผลการค้นหา แนะนำ 50-60 ตัวอักษร ใส่คีย์เวิร์ดหลักไว้ต้นประโยค"
                        : "Title shown on Google — recommended 50-60 chars, main keyword near the beginning"}
                    </p>
                    <p className="italic text-[#FF5B00]">
                      {isTh
                        ? "โปรเดือนพฤษภา ลด 20% | Yolk Corner"
                        : "May Promotion 20% Off | Yolk Corner"}
                    </p>
                  </div>
                  <div className="space-y-1 rounded border border-border bg-background p-2 sm:col-span-2">
                    <p className="font-medium">
                      {isTh ? "SEO Description TH/EN" : "SEO Description TH/EN"}
                    </p>
                    <p className="text-muted-foreground">
                      {isTh
                        ? "คำอธิบายใต้ชื่อใน Google แนะนำ 140-160 ตัวอักษร สรุปโปรโมชั่นและดึงดูดให้คลิก"
                        : "Description under title on Google — recommended 140-160 chars, summarize promo and encourage clicks"}
                    </p>
                  </div>
                  <div className="space-y-1 rounded border border-border bg-background p-2">
                    <p className="font-medium">
                      {isTh
                        ? "Canonical URL (ไม่บังคับ)"
                        : "Canonical URL (optional)"}
                    </p>
                    <p className="text-muted-foreground">
                      {isTh
                        ? "ใส่เฉพาะเมื่อเนื้อหาซ้ำกับที่อื่น เพื่อบอก Google ว่าต้นฉบับอยู่ที่ URL ใด"
                        : "Fill only when content is duplicated elsewhere; tells Google where the original is"}
                    </p>
                  </div>
                  <div className="space-y-1 rounded border border-border bg-background p-2">
                    <p className="font-medium">Noindex</p>
                    <p className="text-muted-foreground">
                      {isTh
                        ? "เลือกหากไม่ต้องการให้ Google index หน้านี้ เช่น โปรสิ้นสุดแล้ว หรือเนื้อหาซ้ำ"
                        : "Check to prevent Google indexing — use for expired promos or duplicate content"}
                    </p>
                  </div>
                </div>
              </div>

              {/* AIO Content */}
              <div className="space-y-2">
                <p className="font-semibold text-foreground">
                  {isTh
                    ? "AIO Content (สำหรับ AI Search)"
                    : "AIO Content (for AI Search)"}
                </p>
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                  <div className="space-y-1 rounded border border-border bg-background p-2">
                    <p className="font-medium">
                      {isTh ? "Summary TH/EN" : "Summary TH/EN"}
                    </p>
                    <p className="text-muted-foreground">
                      {isTh
                        ? "สรุป 2-3 ประโยค ตอบคำถามหลักของข่าว/โปรโมชั่นโดยตรง"
                        : "2-3 sentence summary — directly answer the main point of the news/promo"}
                    </p>
                  </div>
                  <div className="space-y-1 rounded border border-border bg-background p-2">
                    <p className="font-medium">
                      {isTh ? "Key Takeaways TH/EN" : "Key Takeaways TH/EN"}
                    </p>
                    <p className="text-muted-foreground">
                      {isTh
                        ? "ประเด็นสำคัญ 3-5 ข้อ ใส่บรรทัดละ 1 ข้อ"
                        : "3-5 key points — one per line"}
                    </p>
                    <p className="whitespace-pre-line italic text-[#FF5B00]">
                      {isTh
                        ? "ลด 20% เฉพาะเดือนพฤษภาเท่านั้น\nสมัครออนไลน์รับส่วนลดทันที"
                        : "20% off in May only\nBook online to receive discount instantly"}
                    </p>
                  </div>
                </div>
              </div>

              {/* SEO Tags */}
              <div className="space-y-2">
                <p className="font-semibold text-foreground">
                  {isTh ? "SEO Tags" : "SEO Tags"}
                </p>
                <div className="space-y-1 rounded border border-border bg-background p-2">
                  <p className="font-medium">
                    {isTh ? "SEO Tags TH/EN" : "SEO Tags TH/EN"}
                  </p>
                  <p className="text-muted-foreground">
                    {isTh
                      ? "คีย์เวิร์ดที่เกี่ยวข้อง พิมพ์แล้วกด Enter หรือปุ่มเพิ่ม แนะนำ 5-10 แท็กต่อภาษา"
                      : "Related keywords — type then press Enter or Add. Recommended 5-10 tags per language"}
                  </p>
                  <p className="italic text-[#FF5B00]">
                    {isTh
                      ? "ตัวอย่าง: โปรถ่ายภาพแต่งงาน · เชียงใหม่ · ลดราคา"
                      : "e.g. wedding photography discount · Chiang Mai special · limited offer"}
                  </p>
                </div>
              </div>

              {/* Images */}
              <div className="space-y-2">
                <p className="font-semibold text-foreground">
                  {isTh ? "รูปภาพ" : "Image"}
                </p>
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                  <div className="space-y-1 rounded border border-border bg-background p-2">
                    <p className="font-medium">
                      {isTh ? "รูปหน้าปก" : "Cover Image"}
                    </p>
                    <p className="text-muted-foreground">
                      {isTh
                        ? "รูปประกอบข่าว/โปรโมชั่น ใช้อัตราส่วน 2:3 (แนวตั้ง) JPEG/WEBP ไม่เกิน 2 MB"
                        : "News/promo cover image — 2:3 portrait ratio, JPEG/WEBP, max 2 MB"}
                    </p>
                  </div>
                  <div className="space-y-1 rounded border border-border bg-background p-2">
                    <p className="font-medium">
                      {isTh ? "Cover Alt TH/EN" : "Cover Alt TH/EN"}
                    </p>
                    <p className="text-muted-foreground">
                      {isTh
                        ? "ข้อความอธิบายรูปปกสำหรับ SEO และ accessibility"
                        : "Description of cover image for SEO and accessibility"}
                    </p>
                    <p className="italic text-[#FF5B00]">
                      {isTh
                        ? "โปสเตอร์โปรโมชั่นลดราคาถ่ายมงคล Yolk Corner เดือนพฤษภา"
                        : "Yolk Corner May wedding photography promotion poster"}
                    </p>
                  </div>
                </div>
              </div>

              {/* Author / E-E-A-T */}
              <div className="space-y-2">
                <p className="font-semibold text-foreground">
                  {isTh
                    ? "ผู้เขียน / ความน่าเชื่อถือ (E-E-A-T)"
                    : "Author / Trust Signals (E-E-A-T)"}
                </p>
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                  <div className="space-y-1 rounded border border-border bg-background p-2">
                    <p className="font-medium">
                      {isTh ? "ชื่อผู้เขียน" : "Author Name"}
                    </p>
                    <p className="text-muted-foreground">
                      {isTh
                        ? "ชื่อเต็มของผู้เขียน/ผู้รับผิดชอบเนื้อหา"
                        : "Full name of the author or content owner"}
                    </p>
                    <p className="italic text-[#FF5B00]">
                      {isTh ? "นภัส วงศ์เจริญ" : "Naphat Wongcharoen"}
                    </p>
                  </div>
                  <div className="space-y-1 rounded border border-border bg-background p-2">
                    <p className="font-medium">
                      {isTh ? "ตำแหน่งผู้เขียน" : "Author Role"}
                    </p>
                    <p className="text-muted-foreground">
                      {isTh
                        ? "ตำแหน่งหรือความเชี่ยวชาญของผู้เขียน"
                        : "Job title or area of expertise"}
                    </p>
                    <p className="italic text-[#FF5B00]">
                      {isTh ? "นักมาร์เก็ตติ้ง" : "Marketing Specialist"}
                    </p>
                  </div>
                  <div className="space-y-1 rounded border border-border bg-background p-2">
                    <p className="font-medium">
                      {isTh ? "วันที่ตรวจสอบ" : "Review Date"}
                    </p>
                    <p className="text-muted-foreground">
                      {isTh
                        ? "วันที่ล่าสุดที่ตรวจสอบข้อมูล ช่วยให้ Google ทราบว่าเนื้อหาได้รับการอัปเดต"
                        : "Latest date content was verified — signals freshness to Google"}
                    </p>
                  </div>
                  <div className="space-y-1 rounded border border-border bg-background p-2">
                    <p className="font-medium">Source Links</p>
                    <p className="text-muted-foreground">
                      {isTh
                        ? "URL แหล่งอ้างอิง วาง URL แล้วกด Enter หรือปุ่มเพิ่ม"
                        : "Reference URLs — paste URL then press Enter or Add"}
                    </p>
                    <p className="italic text-[#FF5B00]">
                      https://example.com/reference
                    </p>
                  </div>
                </div>
              </div>

              {/* Scheduling */}
              <div className="space-y-2">
                <p className="font-semibold text-foreground">
                  {isTh ? "การตั้งเวลา" : "Scheduling"}
                </p>
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                  <div className="space-y-1 rounded border border-border bg-background p-2">
                    <p className="font-medium">
                      {isTh ? "แสดงตลอดไป" : "Always Active"}
                    </p>
                    <p className="text-muted-foreground">
                      {isTh
                        ? "ช็อกหากต้องการให้แสดงตลอด ไม่มีวันหมดอายุ เช่น ข่าวทั่วไป"
                        : "Check for evergreen content with no expiry date, e.g. general news"}
                    </p>
                  </div>
                  <div className="space-y-1 rounded border border-border bg-background p-2">
                    <p className="font-medium">
                      {isTh ? "เริ่ม/สิ้นสุดการแสดง" : "Start / End"}
                    </p>
                    <p className="text-muted-foreground">
                      {isTh
                        ? "ถ้าไม่เลือก Always Active ให้ระบุวันและเวลาเริ่ม-สิ้นสุดการแสดง"
                        : "If not Always Active, set exact start and end date-time for the promotion"}
                    </p>
                  </div>
                </div>
              </div>

              {/* FAQ */}
              <div className="space-y-2">
                <p className="font-semibold text-foreground">
                  {isTh
                    ? "FAQ (ต้องมีอย่างน้อย 2 ข้อ/ภาษา)"
                    : "FAQ (minimum 2 per language)"}
                </p>
                <div className="space-y-1 rounded border border-border bg-background p-2">
                  <p className="font-medium">
                    {isTh ? "คำถาม-คำตอบ (TH/EN)" : "Q&A (TH/EN)"}
                  </p>
                  <p className="text-muted-foreground">
                    {isTh
                      ? "เขียนคำถามที่คนสอบถามเกี่ยวกับโปรโมชั่น/ข่าวสาร คำตอบกระชับ 2-4 ประโยค ต้องมีอย่างน้อย 2 ข้อต่อภาษาเพื่อผ่านเกณฑ์คะแนน"
                      : "Write questions people ask about the promo/news. Answers should be 2-4 concise sentences. Need at least 2 per language to score"}
                  </p>
                  <p className="italic text-[#FF5B00]">
                    {isTh
                      ? "Q: โปรโมชั่นนี้ใช้ได้ถึงวันไหน?"
                      : "Q: When does this promotion expire?"}
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        {newItems.length > 0 && (
          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-muted-foreground">
              {isTh ? "รายการใหม่ (ยังไม่บันทึก)" : "New Items (Unsaved)"}
            </h3>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
              {newItems.map((item) => {
                const preview =
                  imagePreviews[item.id] || item.imageUrl || "/hero-bg.png";
                const qualityScore = getNewsQualityChecks(item, isTh).score;
                return (
                  <div
                    key={item.id}
                    className="rounded-md border border-dashed border-border bg-background p-3"
                  >
                    <div className="relative aspect-2/3 overflow-hidden rounded-md border border-border bg-background">
                      <Image
                        src={preview}
                        alt={item.title || "news image"}
                        fill
                        sizes="(max-width: 1024px) 100vw, 360px"
                        className="object-cover"
                      />
                    </div>
                    <p className="mt-3 line-clamp-2 text-sm font-medium">
                      {item.title || (isTh ? "(ยังไม่ตั้งชื่อ)" : "(Untitled)")}
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {isTh ? "คะแนน SEO/AIO" : "SEO/AIO score"}
                      <span
                        title={
                          isTh
                            ? "85+ ดีมาก, 70-84 พอใช้, ต่ำกว่า 70 ควรปรับ"
                            : "85+ excellent, 70-84 fair, below 70 needs improvement"
                        }
                        className="ml-0.5 cursor-help select-none text-[#FF5B00]/60 hover:text-[#FF5B00]"
                      >
                        ⓘ
                      </span>
                      :
                      <span
                        className={`ml-1 inline-flex rounded-full border px-2 py-0.5 text-[11px] font-medium ${getQualityBadgeClass(qualityScore)}`}
                      >
                        {qualityScore}/100
                      </span>
                    </p>
                    <div className="mt-3 flex gap-2">
                      <button
                        type="button"
                        onClick={() => openEditModal(item)}
                        className="rounded-md border border-border px-3 py-1.5 text-xs"
                      >
                        {isTh ? "แก้ไข" : "Edit"}
                      </button>
                      <button
                        type="button"
                        onClick={() => requestDeleteItem(item)}
                        className="rounded-md border border-border px-3 py-1.5 text-xs"
                      >
                        {isTh ? "ลบ" : "Delete"}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {savedItems.length === 0 ? (
          <p className="rounded-md border border-border p-4 text-sm text-muted-foreground">
            {isTh
              ? "ยังไม่มีรายการที่บันทึกแล้ว"
              : "No saved news/promotions yet"}
          </p>
        ) : (
          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-muted-foreground">
              {isTh
                ? "รายการข่าวสาร/โปรโมชั่นที่บันทึกแล้ว"
                : "Saved News / Promotions"}
            </h3>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
              {savedItems.map((item) => {
                const preview =
                  imagePreviews[item.id] || item.imageUrl || "/hero-bg.png";
                const active = isNewsActive(item);
                const qualityScore = getNewsQualityChecks(item, isTh).score;
                return (
                  <div
                    key={item.id}
                    className="relative rounded-md border border-border bg-background p-3"
                  >
                    <div className="absolute right-2 top-2 z-20">
                      <button
                        type="button"
                        onClick={() =>
                          setOpenMenuId((prev) =>
                            prev === item.id ? null : item.id,
                          )
                        }
                        className="rounded-md border border-border bg-background px-2 py-1 text-xs"
                        aria-label={isTh ? "เมนู" : "Menu"}
                      >
                        ...
                      </button>
                      {openMenuId === item.id && (
                        <div className="absolute right-0 mt-1 w-28 rounded-md border border-border bg-background shadow-md">
                          <button
                            type="button"
                            onClick={() => openEditModal(item)}
                            className="block w-full px-3 py-2 text-left text-xs hover:bg-secondary"
                          >
                            {isTh ? "แก้ไข" : "Edit"}
                          </button>
                          <button
                            type="button"
                            onClick={() => requestDeleteItem(item)}
                            className="block w-full px-3 py-2 text-left text-xs hover:bg-secondary"
                          >
                            {isTh ? "ลบ" : "Delete"}
                          </button>
                        </div>
                      )}
                    </div>

                    <div className="relative aspect-2/3 overflow-hidden rounded-md border border-border bg-background">
                      <Image
                        src={preview}
                        alt={item.title || "news image"}
                        fill
                        sizes="(max-width: 1024px) 100vw, 360px"
                        className="object-cover"
                      />
                    </div>

                    <div className="mt-3 flex items-center justify-between gap-2">
                      <div className="min-w-0">
                        <p className="line-clamp-2 text-sm font-medium">
                          {item.title}
                        </p>
                        <p className="line-clamp-1 text-xs text-muted-foreground">
                          {item.titleEn || "-"}
                        </p>
                        <p className="line-clamp-1 text-xs text-muted-foreground">
                          {isTh ? "คะแนน SEO/AIO" : "SEO/AIO score"}
                          <span
                            title={
                              isTh
                                ? "85+ ดีมาก, 70-84 พอใช้, ต่ำกว่า 70 ควรปรับ"
                                : "85+ excellent, 70-84 fair, below 70 needs improvement"
                            }
                            className="ml-0.5 cursor-help select-none text-[#FF5B00]/60 hover:text-[#FF5B00]"
                          >
                            ⓘ
                          </span>
                          :
                          <span
                            className={`ml-1 inline-flex rounded-full border px-2 py-0.5 text-[11px] font-medium ${getQualityBadgeClass(qualityScore)}`}
                          >
                            {qualityScore}/100
                          </span>
                        </p>
                      </div>
                      <span
                        className={`inline-flex rounded-full px-2.5 py-1 text-xs ${
                          active
                            ? "bg-green-100 text-green-700"
                            : "bg-zinc-200 text-zinc-700"
                        }`}
                      >
                        {active
                          ? isTh
                            ? "ใช้งาน"
                            : "active"
                          : isTh
                            ? "ไม่ใช้งาน"
                            : "inactive"}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {message && (
          <p className="text-sm text-muted-foreground" role="status">
            {message}
          </p>
        )}
      </section>

      {modalOpen && modalItem && (
        <div className="fixed inset-0 z-60 flex items-center justify-center bg-black/45 p-4">
          <div className="relative w-full max-w-2xl">
            <button
              type="button"
              onClick={closeModal}
              className="absolute top-0 -right-10 sm:-right-11 inline-flex h-8 w-8 items-center justify-center rounded-md border border-border bg-background text-sm font-semibold transition-all duration-200 hover:scale-105 hover:bg-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF5B00]"
              aria-label={isTh ? "ปิด" : "Close"}
            >
              X
            </button>
            <div
              className="max-h-[90vh] w-full overflow-y-auto rounded-lg border border-border bg-card p-5"
              onClick={(event) => event.stopPropagation()}
            >
              <h3 className="text-lg font-semibold">
                {modalMode === "add"
                  ? isTh
                    ? "เพิ่มข่าวสาร/โปรโมชั่น"
                    : "Add News / Promotion"
                  : isTh
                    ? "แก้ไขข่าวสาร/โปรโมชั่น"
                    : "Edit News / Promotion"}
              </h3>

              <div className="mt-4 space-y-3">
                <FloatingLabelInput
                  value={modalItem.title}
                  onChange={(event) =>
                    setModalItem((prev) =>
                      prev ? { ...prev, title: event.target.value } : prev,
                    )
                  }
                  label={isTh ? "หัวข้อ (TH)" : "Title (TH)"}
                  id="modal-title-th"
                />
                <FloatingLabelInput
                  value={modalItem.titleEn || ""}
                  onChange={(event) =>
                    setModalItem((prev) =>
                      prev ? { ...prev, titleEn: event.target.value } : prev,
                    )
                  }
                  label={isTh ? "หัวข้อ (EN)" : "Title (EN)"}
                  id="modal-title-en"
                />
                <FloatingLabelTextarea
                  value={modalItem.body}
                  onChange={(event) =>
                    setModalItem((prev) =>
                      prev ? { ...prev, body: event.target.value } : prev,
                    )
                  }
                  label={
                    isTh
                      ? "ข้อความข่าวสาร/โปรโมชั่น (TH)"
                      : "News/Promotion content (TH)"
                  }
                  id="modal-body-th"
                  rows={4}
                />
                <FloatingLabelTextarea
                  value={modalItem.bodyEn || ""}
                  onChange={(event) =>
                    setModalItem((prev) =>
                      prev ? { ...prev, bodyEn: event.target.value } : prev,
                    )
                  }
                  label="News/Promotion content (EN)"
                  id="modal-body-en"
                  rows={4}
                />

                <div className="rounded-md border border-border p-3 space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="text-sm font-semibold">
                      {isTh ? "คะแนนคุณภาพ SEO/AIO" : "SEO/AIO Quality"}
                    </h4>
                    <span
                      className={`inline-flex rounded-full border px-2.5 py-0.5 text-sm font-semibold ${getQualityBadgeClass(modalQuality?.score || 0)}`}
                    >
                      {modalQuality?.score || 0}/100
                    </span>
                  </div>
                  <div className="grid grid-cols-1 gap-1.5 md:grid-cols-2">
                    {(modalQuality?.checks || []).map((check) => (
                      <p
                        key={check.label}
                        className={`text-xs ${check.pass ? "text-green-700" : "text-muted-foreground"}`}
                      >
                        {check.pass ? "[x]" : "[ ]"} {check.label}
                      </p>
                    ))}
                  </div>
                </div>

                <div className="rounded-md border border-border p-3 space-y-3">
                  <h4 className="text-sm font-semibold">
                    {isTh ? "SEO พื้นฐาน" : "Core SEO"}
                  </h4>

                  <div className="grid grid-cols-1 gap-3 md:grid-cols-[1fr_auto]">
                    <FloatingLabelInput
                      value={modalItem.slug || ""}
                      onChange={(event) =>
                        setModalItem((prev) =>
                          prev ? { ...prev, slug: event.target.value } : prev,
                        )
                      }
                      label="Slug"
                      id="modal-slug"
                    />
                    <button
                      type="button"
                      onClick={() =>
                        setModalItem((prev) =>
                          prev
                            ? {
                                ...prev,
                                slug: getUniqueSlug(
                                  slugify(prev.titleEn || prev.title),
                                  draftItems,
                                  prev.id,
                                ),
                              }
                            : prev,
                        )
                      }
                      className="rounded-md border border-border px-3 py-2 text-sm"
                    >
                      {isTh ? "สร้าง slug" : "Generate slug"}
                    </button>
                  </div>

                  <FloatingLabelInput
                    value={modalItem.seoTitleTh || ""}
                    onChange={(event) =>
                      setModalItem((prev) =>
                        prev
                          ? { ...prev, seoTitleTh: event.target.value }
                          : prev,
                      )
                    }
                    label="SEO Title (TH)"
                    id="modal-seo-title-th"
                  />
                  <p
                    className={`text-xs ${getLengthToneClass(
                      getLengthTone(
                        (modalItem.seoTitleTh || "").trim().length,
                        50,
                        60,
                        70,
                      ),
                    )}`}
                  >
                    {isTh
                      ? "ความยาวที่แนะนำ 50-60 ตัวอักษร"
                      : "Recommended length: 50-60 characters"}{" "}
                    ({(modalItem.seoTitleTh || "").trim().length})
                  </p>
                  <FloatingLabelInput
                    value={modalItem.seoTitleEn || ""}
                    onChange={(event) =>
                      setModalItem((prev) =>
                        prev
                          ? { ...prev, seoTitleEn: event.target.value }
                          : prev,
                      )
                    }
                    label="SEO Title (EN)"
                    id="modal-seo-title-en"
                  />
                  <p
                    className={`text-xs ${getLengthToneClass(
                      getLengthTone(
                        (modalItem.seoTitleEn || "").trim().length,
                        50,
                        60,
                        70,
                      ),
                    )}`}
                  >
                    {isTh
                      ? "ความยาวที่แนะนำ 50-60 ตัวอักษร"
                      : "Recommended length: 50-60 characters"}{" "}
                    ({(modalItem.seoTitleEn || "").trim().length})
                  </p>
                  <FloatingLabelTextarea
                    value={modalItem.seoDescriptionTh || ""}
                    onChange={(event) =>
                      setModalItem((prev) =>
                        prev
                          ? { ...prev, seoDescriptionTh: event.target.value }
                          : prev,
                      )
                    }
                    label="SEO Description (TH)"
                    id="modal-seo-desc-th"
                    rows={2}
                  />
                  <p
                    className={`text-xs ${getLengthToneClass(
                      getLengthTone(
                        (modalItem.seoDescriptionTh || "").trim().length,
                        140,
                        160,
                        180,
                      ),
                    )}`}
                  >
                    {isTh
                      ? "ความยาวที่แนะนำ 140-160 ตัวอักษร"
                      : "Recommended length: 140-160 characters"}{" "}
                    ({(modalItem.seoDescriptionTh || "").trim().length})
                  </p>
                  <FloatingLabelTextarea
                    value={modalItem.seoDescriptionEn || ""}
                    onChange={(event) =>
                      setModalItem((prev) =>
                        prev
                          ? { ...prev, seoDescriptionEn: event.target.value }
                          : prev,
                      )
                    }
                    label="SEO Description (EN)"
                    id="modal-seo-desc-en"
                    rows={2}
                  />
                  <p
                    className={`text-xs ${getLengthToneClass(
                      getLengthTone(
                        (modalItem.seoDescriptionEn || "").trim().length,
                        140,
                        160,
                        180,
                      ),
                    )}`}
                  >
                    {isTh
                      ? "ความยาวที่แนะนำ 140-160 ตัวอักษร"
                      : "Recommended length: 140-160 characters"}{" "}
                    ({(modalItem.seoDescriptionEn || "").trim().length})
                  </p>
                  <FloatingLabelInput
                    value={modalItem.canonicalUrl || ""}
                    onChange={(event) =>
                      setModalItem((prev) =>
                        prev
                          ? { ...prev, canonicalUrl: event.target.value }
                          : prev,
                      )
                    }
                    label="Canonical URL"
                    id="modal-canonical-url"
                  />
                  <label className="flex items-center gap-2 text-sm text-foreground">
                    <input
                      type="checkbox"
                      checked={Boolean(modalItem.noIndex)}
                      onChange={(event) =>
                        setModalItem((prev) =>
                          prev
                            ? { ...prev, noIndex: event.target.checked }
                            : prev,
                        )
                      }
                    />
                    {isTh
                      ? "ไม่ให้ index หน้านี้ (noindex)"
                      : "Noindex this page"}
                  </label>
                </div>

                <div className="rounded-md border border-border p-3 space-y-3">
                  <h4 className="text-sm font-semibold">AIO Content</h4>
                  <FloatingLabelTextarea
                    value={modalItem.summaryTh || ""}
                    onChange={(event) =>
                      setModalItem((prev) =>
                        prev
                          ? { ...prev, summaryTh: event.target.value }
                          : prev,
                      )
                    }
                    label="Summary (TH)"
                    id="modal-summary-th"
                    rows={2}
                  />
                  <FloatingLabelTextarea
                    value={modalItem.summaryEn || ""}
                    onChange={(event) =>
                      setModalItem((prev) =>
                        prev
                          ? { ...prev, summaryEn: event.target.value }
                          : prev,
                      )
                    }
                    label="Summary (EN)"
                    id="modal-summary-en"
                    rows={2}
                  />
                  <textarea
                    value={serializeListInput(modalItem.keyTakeawaysTh)}
                    onChange={(event) =>
                      setModalItem((prev) =>
                        prev
                          ? {
                              ...prev,
                              keyTakeawaysTh: parseListInput(
                                event.target.value,
                              ),
                            }
                          : prev,
                      )
                    }
                    placeholder={
                      isTh
                        ? "Key takeaways TH (บรรทัดละ 1 ข้อ)"
                        : "Key takeaways TH (one per line)"
                    }
                    rows={3}
                    className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
                  />
                  <textarea
                    value={serializeListInput(modalItem.keyTakeawaysEn)}
                    onChange={(event) =>
                      setModalItem((prev) =>
                        prev
                          ? {
                              ...prev,
                              keyTakeawaysEn: parseListInput(
                                event.target.value,
                              ),
                            }
                          : prev,
                      )
                    }
                    placeholder={
                      isTh
                        ? "Key takeaways EN (บรรทัดละ 1 ข้อ)"
                        : "Key takeaways EN (one per line)"
                    }
                    rows={3}
                    className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
                  />
                </div>

                <div className="rounded-md border border-border p-3 space-y-3">
                  <h4 className="text-sm font-semibold">SEO Tags</h4>
                  <div className="space-y-2">
                    <label className="text-xs text-muted-foreground">TH</label>
                    <div className="flex gap-2">
                      <FloatingLabelInput
                        value={tagInputTh}
                        onChange={(event) => setTagInputTh(event.target.value)}
                        onKeyDown={(event) => {
                          if (event.key === "Enter") {
                            event.preventDefault();
                            addTag("seoTagsTh", tagInputTh);
                          }
                        }}
                        label="Tag (TH)"
                        id="seo-tag-th"
                      />
                      <button
                        type="button"
                        onClick={() => addTag("seoTagsTh", tagInputTh)}
                        className="rounded-md border border-border px-3 py-2 text-sm"
                      >
                        {isTh ? "เพิ่ม" : "Add"}
                      </button>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {(modalItem.seoTagsTh || []).map((tag) => (
                        <button
                          key={`th-${tag}`}
                          type="button"
                          onClick={() => removeTag("seoTagsTh", tag)}
                          className="inline-flex items-center gap-1 rounded-full border border-border bg-background px-2 py-1 text-xs"
                        >
                          <span>{tag}</span>
                          <span className="text-red-500">x</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs text-muted-foreground">EN</label>
                    <div className="flex gap-2">
                      <FloatingLabelInput
                        value={tagInputEn}
                        onChange={(event) => setTagInputEn(event.target.value)}
                        onKeyDown={(event) => {
                          if (event.key === "Enter") {
                            event.preventDefault();
                            addTag("seoTagsEn", tagInputEn);
                          }
                        }}
                        label="Tag (EN)"
                        id="seo-tag-en"
                      />
                      <button
                        type="button"
                        onClick={() => addTag("seoTagsEn", tagInputEn)}
                        className="rounded-md border border-border px-3 py-2 text-sm"
                      >
                        {isTh ? "เพิ่ม" : "Add"}
                      </button>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {(modalItem.seoTagsEn || []).map((tag) => (
                        <button
                          key={`en-${tag}`}
                          type="button"
                          onClick={() => removeTag("seoTagsEn", tag)}
                          className="inline-flex items-center gap-1 rounded-full border border-border bg-background px-2 py-1 text-xs"
                        >
                          <span>{tag}</span>
                          <span className="text-red-500">x</span>
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="relative aspect-2/3 overflow-hidden rounded-md border border-border bg-background">
                  <Image
                    src={modalPreview || modalItem.imageUrl || "/hero-bg.png"}
                    alt="news preview"
                    fill
                    sizes="(max-width: 1024px) 100vw, 600px"
                    className="object-cover"
                  />
                </div>

                <input
                  type="file"
                  accept="image/png,image/jpeg,image/webp,image/avif"
                  onChange={onModalImageChange}
                  className="block w-full cursor-pointer rounded-md border border-border bg-background px-3 py-2 text-sm file:mr-3 file:rounded-md file:border-0 file:bg-[#FF5B00] file:px-3 file:py-2 file:text-white"
                />
                <p className="text-xs text-muted-foreground">
                  ใช้ภาพอัตราส่วน 3:2 เเนวตั้งเท่านั้น
                </p>

                <FloatingLabelInput
                  value={modalItem.coverAltTh || ""}
                  onChange={(event) =>
                    setModalItem((prev) =>
                      prev ? { ...prev, coverAltTh: event.target.value } : prev,
                    )
                  }
                  label="Cover Alt (TH)"
                  id="modal-cover-alt-th"
                />
                <FloatingLabelInput
                  value={modalItem.coverAltEn || ""}
                  onChange={(event) =>
                    setModalItem((prev) =>
                      prev ? { ...prev, coverAltEn: event.target.value } : prev,
                    )
                  }
                  label="Cover Alt (EN)"
                  id="modal-cover-alt-en"
                />

                <div className="rounded-md border border-border p-3 space-y-3">
                  <h4 className="text-sm font-semibold">
                    {isTh
                      ? "ผู้เขียน / ความน่าเชื่อถือ"
                      : "Author / Trust Signals"}
                  </h4>
                  <FloatingLabelInput
                    value={modalItem.authorName || ""}
                    onChange={(event) =>
                      setModalItem((prev) =>
                        prev
                          ? { ...prev, authorName: event.target.value }
                          : prev,
                      )
                    }
                    label="Author name"
                    id="modal-author-name"
                  />
                  <FloatingLabelInput
                    value={modalItem.authorRole || ""}
                    onChange={(event) =>
                      setModalItem((prev) =>
                        prev
                          ? { ...prev, authorRole: event.target.value }
                          : prev,
                      )
                    }
                    label="Author role"
                    id="modal-author-role"
                  />
                  <input
                    type="date"
                    value={modalItem.reviewedAt || ""}
                    onChange={(event) =>
                      setModalItem((prev) =>
                        prev
                          ? { ...prev, reviewedAt: event.target.value }
                          : prev,
                      )
                    }
                    className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
                  />
                  <div className="space-y-2">
                    <div className="flex gap-2">
                      <FloatingLabelInput
                        value={sourceLinkInput}
                        onChange={(event) =>
                          setSourceLinkInput(event.target.value)
                        }
                        onKeyDown={(event) => {
                          if (event.key === "Enter") {
                            event.preventDefault();
                            addSourceLink(sourceLinkInput);
                          }
                        }}
                        label="URL"
                        id="modal-source-link"
                      />
                      <button
                        type="button"
                        onClick={() => addSourceLink(sourceLinkInput)}
                        className="rounded-md border border-border px-3 py-2 text-sm"
                      >
                        {isTh ? "เพิ่ม" : "Add"}
                      </button>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {(modalItem.sourceLinks || []).map((link, idx) => (
                        <span
                          key={`link-${idx}`}
                          className="inline-flex max-w-full items-center gap-1 rounded-full border border-border bg-background px-2 py-1 text-xs"
                        >
                          <span className="max-w-45 truncate" title={link}>
                            {link}
                          </span>
                          <button
                            type="button"
                            onClick={() => removeSourceLink(link)}
                            className="ml-0.5 shrink-0 text-red-500 hover:text-red-700"
                            aria-label={isTh ? "ลบลิงก์" : "Remove link"}
                          >
                            ×
                          </button>
                        </span>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="rounded-md border border-border p-3 space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="text-sm font-semibold">FAQ (TH)</h4>
                    <button
                      type="button"
                      onClick={() => addFaqItem("faqTh")}
                      className="rounded-md border border-border px-2 py-1 text-xs"
                    >
                      {isTh ? "เพิ่มข้อ" : "Add"}
                    </button>
                  </div>
                  {(modalItem.faqTh || []).map((faq, index) => (
                    <div
                      key={`faq-th-${index}`}
                      className="space-y-2 rounded-md border border-border p-2"
                    >
                      <FloatingLabelInput
                        value={faq.question}
                        onChange={(event) =>
                          updateFaqItem(
                            "faqTh",
                            index,
                            "question",
                            event.target.value,
                          )
                        }
                        label="Question"
                        id={`faq-th-question-${index}`}
                      />
                      <FloatingLabelTextarea
                        value={faq.answer}
                        onChange={(event) =>
                          updateFaqItem(
                            "faqTh",
                            index,
                            "answer",
                            event.target.value,
                          )
                        }
                        label="Answer"
                        id={`faq-th-answer-${index}`}
                        rows={2}
                      />
                      <button
                        type="button"
                        onClick={() => removeFaqItem("faqTh", index)}
                        className="rounded-md border border-border px-2 py-1 text-xs"
                      >
                        {isTh ? "ลบ" : "Remove"}
                      </button>
                    </div>
                  ))}
                </div>

                <div className="rounded-md border border-border p-3 space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="text-sm font-semibold">FAQ (EN)</h4>
                    <button
                      type="button"
                      onClick={() => addFaqItem("faqEn")}
                      className="rounded-md border border-border px-2 py-1 text-xs"
                    >
                      {isTh ? "เพิ่มข้อ" : "Add"}
                    </button>
                  </div>
                  {(modalItem.faqEn || []).map((faq, index) => (
                    <div
                      key={`faq-en-${index}`}
                      className="space-y-2 rounded-md border border-border p-2"
                    >
                      <FloatingLabelInput
                        value={faq.question}
                        onChange={(event) =>
                          updateFaqItem(
                            "faqEn",
                            index,
                            "question",
                            event.target.value,
                          )
                        }
                        label="Question"
                        id={`faq-en-question-${index}`}
                      />
                      <FloatingLabelTextarea
                        value={faq.answer}
                        onChange={(event) =>
                          updateFaqItem(
                            "faqEn",
                            index,
                            "answer",
                            event.target.value,
                          )
                        }
                        label="Answer"
                        id={`faq-en-answer-${index}`}
                        rows={2}
                      />
                      <button
                        type="button"
                        onClick={() => removeFaqItem("faqEn", index)}
                        className="rounded-md border border-border px-2 py-1 text-xs"
                      >
                        {isTh ? "ลบ" : "Remove"}
                      </button>
                    </div>
                  ))}
                </div>

                <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                  <label className="flex items-center gap-2 text-sm text-foreground">
                    <input
                      type="checkbox"
                      checked={modalItem.alwaysActive}
                      onChange={(event) =>
                        setModalItem((prev) =>
                          prev
                            ? {
                                ...prev,
                                alwaysActive: event.target.checked,
                                startAt: event.target.checked
                                  ? ""
                                  : prev.startAt,
                                endAt: event.target.checked ? "" : prev.endAt,
                              }
                            : prev,
                        )
                      }
                    />
                    {isTh ? "แสดงตลอดไป" : "Always active"}
                  </label>

                  <label className="flex items-center gap-2 text-sm text-foreground">
                    <input
                      type="checkbox"
                      checked={modalItem.showOnHome}
                      onChange={(event) =>
                        setModalItem((prev) =>
                          prev
                            ? { ...prev, showOnHome: event.target.checked }
                            : prev,
                        )
                      }
                    />
                    {isTh ? "แสดงบนหน้า Home" : "Show on Home"}
                  </label>
                </div>

                {!modalItem.alwaysActive && (
                  <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                    <div className="space-y-1">
                      <label className="text-xs text-muted-foreground">
                        {isTh ? "เริ่มแสดง" : "Start"}
                      </label>
                      <input
                        type="datetime-local"
                        value={toDateTimeLocalValue(modalItem.startAt)}
                        onChange={(event) =>
                          setModalItem((prev) =>
                            prev
                              ? {
                                  ...prev,
                                  startAt: fromDateTimeLocalValue(
                                    event.target.value,
                                  ),
                                }
                              : prev,
                          )
                        }
                        className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs text-muted-foreground">
                        {isTh ? "สิ้นสุดการแสดง" : "End"}
                      </label>
                      <input
                        type="datetime-local"
                        value={toDateTimeLocalValue(modalItem.endAt)}
                        onChange={(event) =>
                          setModalItem((prev) =>
                            prev
                              ? {
                                  ...prev,
                                  endAt: fromDateTimeLocalValue(
                                    event.target.value,
                                  ),
                                }
                              : prev,
                          )
                        }
                        className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
                      />
                    </div>
                  </div>
                )}
              </div>

              <div className="mt-5 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={closeModal}
                  disabled={saving}
                  className="rounded-md border border-border px-4 py-2 text-sm transition-all duration-200 hover:-translate-y-0.5 hover:bg-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF5B00]"
                >
                  {isTh ? "ยกเลิก" : "Cancel"}
                </button>
                <button
                  type="button"
                  onClick={saveModalItem}
                  disabled={saving}
                  className="rounded-md border border-[#FF5B00] bg-[#FF5B00] px-4 py-2 text-sm text-white transition-all duration-200 hover:-translate-y-0.5 hover:bg-[#e65200] hover:shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF5B00]"
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
            </div>
          </div>
        </div>
      )}

      {deleteTarget && (
        <div className="fixed inset-0 z-60 flex items-center justify-center bg-black/60 p-4">
          <div className="relative w-full max-w-md rounded-lg border border-border bg-card p-6">
            <button
              type="button"
              onClick={() => setDeleteTarget(null)}
              className="absolute top-0 -right-10 sm:-right-11 inline-flex h-8 w-8 items-center justify-center rounded-md border border-border bg-background text-sm font-semibold transition-all duration-200 hover:scale-105 hover:bg-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF5B00]"
              aria-label={isTh ? "ปิด" : "Close"}
            >
              X
            </button>
            <p className="text-sm text-foreground">
              {isTh
                ? `ต้องการลบรายการ ${deleteTarget.title} จริงหรือไม่?`
                : `Are you sure you want to delete ${deleteTarget.titleEn || deleteTarget.title}?`}
            </p>
            <div className="mt-4 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setDeleteTarget(null)}
                disabled={saving}
                className="rounded-md border border-border px-4 py-2 text-sm transition-all duration-200 hover:-translate-y-0.5 hover:bg-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF5B00]"
              >
                {isTh ? "ยกเลิก" : "Cancel"}
              </button>
              <button
                type="button"
                onClick={confirmDeleteItem}
                disabled={saving}
                className="rounded-md border border-[#FF5B00] bg-[#FF5B00] px-4 py-2 text-sm text-white transition-all duration-200 hover:-translate-y-0.5 hover:bg-[#e65200] hover:shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF5B00]"
              >
                {saving
                  ? isTh
                    ? "กำลังลบ..."
                    : "Deleting..."
                  : isTh
                    ? "ใช่, ลบ"
                    : "Yes, Delete"}
              </button>
            </div>
          </div>
        </div>
      )}
    </AdminSectionLayout>
  );
}
