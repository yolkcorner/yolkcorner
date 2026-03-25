"use client";

import Image from "next/image";
import { ChangeEvent, useEffect, useMemo, useRef, useState } from "react";
import AdminSectionLayout from "@/components/admin/AdminSectionLayout";
import { FloatingLabelInput } from "@/components/FloatingLabelInput";
import { FloatingLabelTextarea } from "@/components/FloatingLabelTextarea";
import {
  SiteContent,
  StoryFaqItem,
  StoryItem,
  defaultSiteContent,
} from "@/lib/site-content-types";
import { isStoryPublished } from "@/lib/story";
import { useLang } from "@/lib/i18n";

interface UploadAssetOptions {
  folder?: string;
  publicId?: string;
  overwrite?: boolean;
  deletePublicId?: string;
}

const createId = (prefix: string) =>
  `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

// ...existing code...

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

const parseListInput = (value: string) =>
  value
    .split(/\r?\n|,/)
    .map((item) => item.trim())
    .filter(Boolean);

const serializeListInput = (items: string[] | undefined) =>
  (items || []).join("\n");

const slugify = (value: string) =>
  value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");

const normalizeFaqItems = (items: StoryFaqItem[] | undefined): StoryFaqItem[] =>
  (items || [])
    .map((item) => ({
      question: item.question?.trim() || "",
      answer: item.answer?.trim() || "",
    }))
    .filter((item) => item.question && item.answer);

const getStoryQualityChecks = (item: StoryItem, isTh: boolean) => {
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
  items: StoryItem[],
  currentId: string,
) => {
  const fallbackBase = baseSlug || "story";
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

const createEmptyStory = (): StoryItem => {
  const now = new Date().toISOString();
  return {
    id: createId("story"),
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
    galleryAltTh: [],
    galleryAltEn: [],
    body: "",
    bodyEn: "",
    imageUrl: "",
    images: [],
    seoTagsTh: [],
    seoTagsEn: [],
    showOnHome: false,
    published: false,
    createdAt: now,
    updatedAt: now,
  };
};

const normalizeStoryItem = (item: StoryItem): StoryItem => ({
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
  galleryAltTh: Array.isArray(item.galleryAltTh) ? item.galleryAltTh : [],
  galleryAltEn: Array.isArray(item.galleryAltEn) ? item.galleryAltEn : [],
  published: Boolean(item.published),
  imageUrl: item.imageUrl || "",
  images: Array.isArray(item.images) ? item.images : [],
  seoTagsTh: Array.isArray(item.seoTagsTh) ? item.seoTagsTh : [],
  seoTagsEn: Array.isArray(item.seoTagsEn) ? item.seoTagsEn : [],
});

export default function AdminStoryPage() {
  const { lang } = useLang();
  const isTh = lang === "th";
  const [content, setContent] = useState<SiteContent>(defaultSiteContent);
  const [storyTitle, setStoryTitle] = useState(defaultSiteContent.story.title);
  const [storyTitleEn, setStoryTitleEn] = useState(
    defaultSiteContent.story.titleEn || "",
  );
  const [draftItems, setDraftItems] = useState<StoryItem[]>([]);

  const [coverFiles, setCoverFiles] = useState<Record<string, File>>({});
  const [coverPreviews, setCoverPreviews] = useState<Record<string, string>>(
    {},
  );
  const coverPreviewsRef = useRef<Record<string, string>>({});

  const [galleryFiles, setGalleryFiles] = useState<Record<string, File[]>>({});

  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<"add" | "edit">("add");
  const [modalItem, setModalItem] = useState<StoryItem | null>(null);
  const [modalFile, setModalFile] = useState<File | null>(null);
  const [modalPreview, setModalPreview] = useState("");
  const [modalImageFiles, setModalImageFiles] = useState<File[]>([]);
  const [modalImagePreviews, setModalImagePreviews] = useState<string[]>([]);
  const [tagInputTh, setTagInputTh] = useState("");
  const [tagInputEn, setTagInputEn] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<StoryItem | null>(null);

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
            isTh ? "โหลดข้อมูลบล็อกไม่สำเร็จ" : "Failed to load blog data",
          );
          return;
        }

        const contentData = await contentRes.json();
        if (contentData?.content) {
          const loaded = contentData.content as SiteContent;
          setContent(loaded);
          setStoryTitle(loaded.story.title || defaultSiteContent.story.title);
          setStoryTitleEn(
            loaded.story.titleEn || defaultSiteContent.story.titleEn || "",
          );
          setDraftItems((loaded.story.items || []).map(normalizeStoryItem));
        }
      } catch (error) {
        console.error(error);
        setMessage(
          isTh ? "โหลดข้อมูลบล็อกไม่สำเร็จ" : "Failed to load blog data",
        );
      }
    };

    initialize();
  }, [isTh]);

  useEffect(() => {
    coverPreviewsRef.current = coverPreviews;
  }, [coverPreviews]);

  useEffect(() => {
    return () => {
      Object.values(coverPreviewsRef.current).forEach((url) =>
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
    Object.values(coverPreviewsRef.current).forEach((url) =>
      URL.revokeObjectURL(url),
    );
    setCoverFiles({});
    setCoverPreviews({});
    coverPreviewsRef.current = {};
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
    () => new Set((content.story.items || []).map((item) => item.id)),
    [content.story.items],
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
    setModalItem(createEmptyStory());
    setModalFile(null);
    if (modalPreview) URL.revokeObjectURL(modalPreview);
    setModalPreview("");
    setModalImageFiles([]);
    setModalImagePreviews([]);
    setTagInputTh("");
    setTagInputEn("");
    setSourceLinkInput("");
    setModalOpen(true);
    setMessage("");
  };

  const requestDeleteItem = (item: StoryItem) => {
    setOpenMenuId(null);
    setDeleteTarget(item);
  };

  const confirmDeleteItem = async () => {
    if (!deleteTarget) return;

    const targetId = deleteTarget.id;
    const nextDraftItems = draftItems.filter((item) => item.id !== targetId);

    const nextCoverFiles = { ...coverFiles };
    delete nextCoverFiles[targetId];

    const nextCoverPreviews = { ...coverPreviews };
    const preview = nextCoverPreviews[targetId];
    if (preview) URL.revokeObjectURL(preview);
    delete nextCoverPreviews[targetId];

    const nextGalleryFiles = { ...galleryFiles };
    delete nextGalleryFiles[targetId];

    setDraftItems(nextDraftItems);
    setCoverFiles(nextCoverFiles);
    setCoverPreviews(nextCoverPreviews);
    setGalleryFiles(nextGalleryFiles);
    setOpenMenuId(null);
    setDeleteTarget(null);

    await saveAll({
      nextDraftItems,
      nextCoverFiles,
      nextGalleryFiles,
      successMessage: isTh
        ? "ลบบล็อกเรียบร้อยแล้ว"
        : "Blog deleted successfully",
    });
  };

  const openEditModal = (item: StoryItem) => {
    setModalMode("edit");
    setModalItem({ ...item });
    setModalFile(null);
    if (modalPreview) URL.revokeObjectURL(modalPreview);
    setModalPreview("");
    // Load pending gallery files and create fresh previews
    const pending = galleryFiles[item.id] || [];
    setModalImageFiles(pending);
    setModalImagePreviews(pending.map((f) => URL.createObjectURL(f)));
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
    modalImagePreviews.forEach((url) => URL.revokeObjectURL(url));
    setModalImageFiles([]);
    setModalImagePreviews([]);
    setTagInputTh("");
    setTagInputEn("");
    setSourceLinkInput("");
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

  const onModalGalleryChange = (event: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    if (!files.length || !modalItem) return;
    const totalExisting =
      (modalItem.images?.length || 0) + modalImageFiles.length;
    const remaining = 8 - totalExisting;
    if (remaining <= 0) return;
    const toAdd = files.slice(0, remaining);
    const newPreviews = toAdd.map((f) => URL.createObjectURL(f));
    setModalImageFiles((prev) => [...prev, ...toAdd]);
    setModalImagePreviews((prev) => [...prev, ...newPreviews]);
    event.target.value = "";
  };

  const removeModalExistingImage = (index: number) => {
    setModalItem((prev) => {
      if (!prev) return prev;
      const images = [...(prev.images || [])];
      images.splice(index, 1);
      return { ...prev, images };
    });
  };

  const removeModalNewImage = (index: number) => {
    URL.revokeObjectURL(modalImagePreviews[index]);
    setModalImageFiles((prev) => prev.filter((_, i) => i !== index));
    setModalImagePreviews((prev) => prev.filter((_, i) => i !== index));
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

  const saveModalItem = async () => {
    if (!modalItem) return;

    const fallbackSlug = slugify(modalItem.titleEn || modalItem.title);
    const requestedSlug = (modalItem.slug || fallbackSlug).trim();
    const resolvedSlug = getUniqueSlug(requestedSlug, draftItems, modalItem.id);
    const slugWasAdjusted =
      requestedSlug.toLowerCase() !== resolvedSlug.toLowerCase();

    const normalized: StoryItem = {
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
      galleryAltTh: (modalItem.galleryAltTh || [])
        .map((item) => item.trim())
        .filter(Boolean),
      galleryAltEn: (modalItem.galleryAltEn || [])
        .map((item) => item.trim())
        .filter(Boolean),
      body: modalItem.body.trim(),
      bodyEn: (modalItem.bodyEn || "").trim(),
      seoTagsTh: Array.isArray(modalItem.seoTagsTh) ? modalItem.seoTagsTh : [],
      seoTagsEn: Array.isArray(modalItem.seoTagsEn) ? modalItem.seoTagsEn : [],
      images: Array.isArray(modalItem.images) ? modalItem.images : [],
      published: Boolean(modalItem.published),
      showOnHome: Boolean(modalItem.showOnHome),
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
          ? "กรุณากรอกหัวข้อและเนื้อหาทั้งภาษาไทยและอังกฤษให้ครบ"
          : "Please fill title and content in both Thai and English",
      );
      return;
    }

    if (slugWasAdjusted) {
      setModalItem((prev) => (prev ? { ...prev, slug: resolvedSlug } : prev));
    }

    if (normalized.published) {
      const { score } = getStoryQualityChecks(normalized, isTh);
      if (score < 70) {
        setMessage(
          isTh
            ? `คะแนนคุณภาพ SEO/AIO ต่ำเกินไป (${score}/100) ต้องอย่างน้อย 70 ก่อนเผยแพร่`
            : `SEO/AIO quality score is too low (${score}/100). Minimum 70 is required for publishing.`,
        );
        return;
      }
    }

    const nextDraftItems =
      modalMode === "add"
        ? [normalized, ...draftItems]
        : draftItems.map((item) =>
            item.id === normalized.id ? normalized : item,
          );

    let nextCoverFiles = coverFiles;
    let nextCoverPreviews = coverPreviews;

    if (modalFile) {
      const id = normalized.id;
      const persistentPreviewUrl = URL.createObjectURL(modalFile);
      nextCoverFiles = { ...coverFiles, [id]: modalFile };
      nextCoverPreviews = { ...coverPreviews };
      const oldPreview = nextCoverPreviews[id];
      if (oldPreview) URL.revokeObjectURL(oldPreview);
      nextCoverPreviews[id] = persistentPreviewUrl;
    }

    // Store pending gallery files per item (previews will be recreated on next open)
    let nextGalleryFiles = galleryFiles;
    if (modalImageFiles.length > 0) {
      nextGalleryFiles = {
        ...galleryFiles,
        [normalized.id]: modalImageFiles,
      };
    } else if (modalMode === "edit") {
      // If user removed all pending files in edit mode, clear them
      nextGalleryFiles = { ...galleryFiles };
      delete nextGalleryFiles[normalized.id];
    }

    setDraftItems(nextDraftItems);
    if (modalFile) {
      setCoverFiles(nextCoverFiles);
      setCoverPreviews(nextCoverPreviews);
    }
    setGalleryFiles(nextGalleryFiles);

    const saved = await saveAll({
      nextDraftItems,
      nextCoverFiles,
      nextGalleryFiles,
      successMessage: isTh
        ? "บันทึกบล็อกเรียบร้อยแล้ว"
        : "Blog saved successfully",
    });

    if (!saved) return;

    // Prevent closeModal from revoking previews we just handed off to galleryFiles
    setModalImagePreviews([]);
    setModalImageFiles([]);
    closeModal();
  };

  const saveAll = async (options?: {
    nextDraftItems?: StoryItem[];
    nextCoverFiles?: Record<string, File>;
    nextGalleryFiles?: Record<string, File[]>;
    successMessage?: string;
  }) => {
    const itemsToSave = options?.nextDraftItems || draftItems;
    const coverFilesToSave = options?.nextCoverFiles || coverFiles;
    const galleryFilesToSave = options?.nextGalleryFiles || galleryFiles;

    const hasInvalid = itemsToSave.some(
      (item) =>
        !item.title.trim() ||
        !(item.titleEn || "").trim() ||
        !item.body.trim() ||
        !(item.bodyEn || "").trim(),
    );

    if (hasInvalid) {
      setMessage(
        isTh
          ? "กรุณากรอกหัวข้อและเนื้อหาทั้งภาษาไทยและอังกฤษให้ครบ"
          : "Please fill title and content in both Thai and English",
      );
      return;
    }

    setSaving(true);
    setMessage(isTh ? "กำลังบันทึกบล็อก..." : "Saving blog...");

    try {
      let itemsWithImages = [...itemsToSave];

      for (const item of itemsToSave) {
        const draftCoverFile = coverFilesToSave[item.id];
        if (!draftCoverFile) continue;
        const imageUrl = await uploadAsset(draftCoverFile, {
          folder: "Yolk Corner/story/covers",
          publicId: `Yolk Corner/story/covers/${item.id}`,
          overwrite: true,
          deletePublicId: undefined,
        });

        itemsWithImages = itemsWithImages.map((story) =>
          story.id === item.id
            ? { ...story, imageUrl, updatedAt: new Date().toISOString() }
            : story,
        );
      }

      // Upload pending gallery images
      for (const item of [...itemsWithImages]) {
        const pendingFiles = galleryFilesToSave[item.id] || [];
        if (pendingFiles.length === 0) continue;
        const uploadedUrls: string[] = [];
        for (let i = 0; i < pendingFiles.length; i++) {
          const url = await uploadAsset(pendingFiles[i], {
            folder: "Yolk Corner/story/gallery",
            publicId: `Yolk Corner/story/gallery/${item.id}-${i}-${Date.now()}`,
            overwrite: false,
          });
          uploadedUrls.push(url);
        }
        const currentImages =
          itemsWithImages.find((s) => s.id === item.id)?.images || [];
        itemsWithImages = itemsWithImages.map((s) =>
          s.id === item.id
            ? {
                ...s,
                images: [...currentImages, ...uploadedUrls],
                updatedAt: new Date().toISOString(),
              }
            : s,
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
        galleryAltTh: [...(item.galleryAltTh || [])]
          .map((value) => value.trim())
          .filter(Boolean),
        galleryAltEn: [...(item.galleryAltEn || [])]
          .map((value) => value.trim())
          .filter(Boolean),
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
        imageUrl: item.imageUrl || "/hero-bg.png",
        images: [...(item.images || [])],
        published: Boolean(item.published),
        showOnHome: Boolean(item.showOnHome),
      }));

      const nextContent: SiteContent = {
        ...content,
        story: {
          title: storyTitle.trim() || defaultSiteContent.story.title,
          titleEn:
            storyTitleEn.trim() || defaultSiteContent.story.titleEn || "",
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
        throw new Error(
          saveData?.error ||
            (isTh ? "บันทึกข้อมูลไม่สำเร็จ" : "Failed to save content"),
        );
      }

      const saved = saveData.content as SiteContent;
      setContent(saved);
      setStoryTitle(saved.story.title || defaultSiteContent.story.title);
      setStoryTitleEn(
        saved.story.titleEn || defaultSiteContent.story.titleEn || "",
      );
      setDraftItems((saved.story.items || []).map(normalizeStoryItem));
      clearImageDrafts();
      setGalleryFiles({});
      setMessage(
        options?.successMessage ||
          (isTh ? "บันทึกบล็อกเรียบร้อยแล้ว" : "Blog saved successfully"),
      );
      return true;
    } catch (error) {
      console.error(error);
      setMessage(isTh ? "บันทึกบล็อกไม่สำเร็จ" : "Failed to save blog");
      return false;
    } finally {
      setSaving(false);
    }
  };

  const modalQuality = modalItem
    ? getStoryQualityChecks(modalItem, isTh)
    : null;

  return (
    <AdminSectionLayout
      title={isTh ? "บล็อก" : "Blog"}
      description={
        isTh
          ? "จัดการบทความบล็อก พร้อมกำหนดการแสดงผลบนหน้าแรก"
          : "Manage blog posts and configure homepage visibility."
      }
    >
      <section className="rounded-lg border border-border bg-card p-6 space-y-6">
        <div className="rounded-md border border-border p-4 space-y-3">
          <h2 className="text-base font-semibold">
            {isTh ? "หัวข้อหน้า Blog" : "Blog Page Title"}
          </h2>
          <FloatingLabelInput
            value={storyTitle}
            onChange={(event) => setStoryTitle(event.target.value)}
            label="หัวข้อหน้า (TH)"
            id="story-page-title-th"
            disabled={saving}
          />
          <FloatingLabelInput
            value={storyTitleEn}
            onChange={(event) => setStoryTitleEn(event.target.value)}
            label={isTh ? "หัวข้อหน้า (EN)" : "Page title (EN)"}
            id="story-page-title-en"
            disabled={saving}
          />
        </div>

        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold">
            {isTh ? "เพิ่มบล็อกใหม่" : "Add New Blog"}
          </h2>
          <button
            type="button"
            onClick={addItem}
            disabled={saving}
            className="rounded-md border border-[#FF5B00] bg-[#FF5B00] px-4 py-2 text-sm text-white transition-colors hover:bg-[#e65200] disabled:opacity-60"
          >
            {isTh ? "เพิ่มบล็อก" : "Add Blog"}
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
                        ? "ชื่อบทความภาษาไทย กระชับ ดึงดูด มีคีย์เวิร์ดหลัก"
                        : "Thai article title — concise, catchy, keyword-rich"}
                    </p>
                    <p className="italic text-[#FF5B00]">
                      {isTh
                        ? "เช่น: 10 ไอเดียถ่ายรูปพรีเวดดิ้งสุดโรแมนติก"
                        : "e.g. 10 Romantic Pre-Wedding Photography Ideas"}
                    </p>
                  </div>
                  <div className="space-y-1 rounded border border-border bg-background p-2">
                    <p className="font-medium">
                      {isTh ? "หัวข้อ (EN)" : "Title (EN)"}
                    </p>
                    <p className="text-muted-foreground">
                      {isTh
                        ? "ชื่อบทความภาษาอังกฤษ แปลหรือดัดแปลงให้เหมาะกับผู้อ่านสากล"
                        : "English article title — translate or adapt for international readers"}
                    </p>
                    <p className="italic text-[#FF5B00]">
                      {isTh
                        ? "เช่น: 10 Romantic Pre-Wedding Photography Ideas"
                        : "e.g. 10 Romantic Pre-Wedding Photography Ideas"}
                    </p>
                  </div>
                  <div className="space-y-1 rounded border border-border bg-background p-2 sm:col-span-2">
                    <p className="font-medium">
                      {isTh ? "เนื้อหา (TH / EN)" : "Body Content (TH / EN)"}
                    </p>
                    <p className="text-muted-foreground">
                      {isTh
                        ? "เนื้อหาหลักของบทความ รองรับ Markdown เช่น **ตัวหนา**, # หัวข้อ, - รายการ, [ลิงก์](url)"
                        : "Main article body — supports Markdown: **bold**, # heading, - list, [link](url)"}
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
                        ? "URL ของบทความ ใช้ตัวพิมพ์เล็กและขีด - เท่านั้น กด 'สร้าง slug' เพื่อสร้างอัตโนมัติจากชื่อ EN"
                        : "Article URL path — lowercase + hyphens only. Click 'Generate slug' to auto-create from EN title"}
                    </p>
                    <p className="italic text-[#FF5B00]">
                      pre-wedding-photography-tips
                    </p>
                  </div>
                  <div className="space-y-1 rounded border border-border bg-background p-2">
                    <p className="font-medium">
                      {isTh ? "SEO Title TH/EN" : "SEO Title TH/EN"}
                    </p>
                    <p className="text-muted-foreground">
                      {isTh
                        ? "ชื่อที่ Google แสดงในผลการค้นหา แนะนำ 50-60 ตัวอักษร ใส่คีย์เวิร์ดหลักไว้ต้นประโยค"
                        : "Title shown on Google Search — recommended 50-60 chars, main keyword near the beginning"}
                    </p>
                    <p className="italic text-[#FF5B00]">
                      {isTh
                        ? "10 ไอเดียถ่ายรูปพรีเวดดิ้ง | Yolk Corner"
                        : "10 Pre-Wedding Photo Ideas | Yolk Corner"}
                    </p>
                  </div>
                  <div className="space-y-1 rounded border border-border bg-background p-2 sm:col-span-2">
                    <p className="font-medium">
                      {isTh ? "SEO Description TH/EN" : "SEO Description TH/EN"}
                    </p>
                    <p className="text-muted-foreground">
                      {isTh
                        ? "คำอธิบายที่แสดงใต้ชื่อใน Google แนะนำ 140-160 ตัวอักษร สรุปเนื้อหาและดึงดูดให้คลิก"
                        : "Description shown under title on Google — recommended 140-160 chars, summarize and encourage clicks"}
                    </p>
                    <p className="italic text-[#FF5B00]">
                      {isTh
                        ? "รวม 10 ไอเดียถ่ายรูปพรีเวดดิ้งสุดโรแมนติก พร้อมเทคนิคจากช่างภาพมืออาชีพ เลือก location แสง และ props ได้ครบในบทความเดียว"
                        : "10 romantic pre-wedding photo ideas with tips from professional photographers — locations, lighting, and props all in one guide."}
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
                        ? "ใส่เฉพาะกรณีที่บทความนี้ซ้ำกับที่อื่น เพื่อบอก Google ว่าต้นฉบับอยู่ที่ URL ใด"
                        : "Fill only if this content is duplicated elsewhere, to tell Google where the original is"}
                    </p>
                    <p className="italic text-[#FF5B00]">
                      https://yolkcorner.com/blog/original-post
                    </p>
                  </div>
                  <div className="space-y-1 rounded border border-border bg-background p-2">
                    <p className="font-medium">Noindex</p>
                    <p className="text-muted-foreground">
                      {isTh
                        ? "เลือกหากไม่ต้องการให้ Google index หน้านี้ เช่น บทความทดสอบ หรือเนื้อหาซ้ำ"
                        : "Check to prevent Google from indexing this page — use for test articles or duplicate content"}
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
                        ? "สรุปบทความ 2-3 ประโยคสำหรับ AI Overviews ควรตอบคำถามหลักของบทความโดยตรง"
                        : "2-3 sentence summary for AI Overviews — directly answer the article's main question"}
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
                        ? "เลือกสถานที่ที่มีแสงธรรมชาติดี\nวางแผนล่วงหน้าอย่างน้อย 2 สัปดาห์"
                        : "Choose a location with good natural light\nPlan at least 2 weeks in advance"}
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
                      ? "ตัวอย่าง: ถ่ายรูปแต่งงาน · ช่างภาพเชียงใหม่ · พรีเวดดิ้ง"
                      : "e.g. wedding photography · Chiang Mai photographer · pre-wedding"}
                  </p>
                </div>
              </div>

              {/* Images */}
              <div className="space-y-2">
                <p className="font-semibold text-foreground">
                  {isTh ? "รูปภาพ" : "Images"}
                </p>
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                  <div className="space-y-1 rounded border border-border bg-background p-2">
                    <p className="font-medium">
                      {isTh ? "รูปปก" : "Cover Image"}
                    </p>
                    <p className="text-muted-foreground">
                      {isTh
                        ? "รูปหน้าปกบทความ แนะนำขนาด 1200×630 px รูปแบบ JPEG/WEBP ไม่เกิน 2 MB"
                        : "Article cover image — recommended 1200×630 px, JPEG/WEBP, max 2 MB"}
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
                        ? "คู่รักถ่ายรูปพรีเวดดิ้งในสวนดอกไม้ เชียงใหม่"
                        : "Couple taking pre-wedding photos in garden, Chiang Mai"}
                    </p>
                  </div>
                  <div className="space-y-1 rounded border border-border bg-background p-2">
                    <p className="font-medium">
                      {isTh
                        ? "ภาพแกลเลอรี (ไม่บังคับ)"
                        : "Gallery Images (optional)"}
                    </p>
                    <p className="text-muted-foreground">
                      {isTh
                        ? "ภาพเพิ่มเติมสูงสุด 8 ภาพ รูปแบบ JPEG/WEBP/PNG"
                        : "Up to 8 additional images, JPEG/WEBP/PNG format"}
                    </p>
                  </div>
                  <div className="space-y-1 rounded border border-border bg-background p-2">
                    <p className="font-medium">
                      {isTh
                        ? "Gallery Alt TH/EN (ไม่บังคับ)"
                        : "Gallery Alt TH/EN (optional)"}
                    </p>
                    <p className="text-muted-foreground">
                      {isTh
                        ? "ข้อความ alt ของภาพแกลเลอรี ใส่บรรทัดละ 1 ค่า ตามลำดับรูปที่อัปโหลด"
                        : "Alt text for gallery images — one per line, matching upload order"}
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
                        ? "ชื่อเต็มของผู้เขียน ช่วยสร้างความน่าเชื่อถือ (E-E-A-T)"
                        : "Full author name — builds E-E-A-T credibility"}
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
                      {isTh ? "ช่างภาพมืออาชีพ" : "Professional Photographer"}
                    </p>
                  </div>
                  <div className="space-y-1 rounded border border-border bg-background p-2">
                    <p className="font-medium">
                      {isTh ? "วันที่ตรวจสอบ" : "Review Date"}
                    </p>
                    <p className="text-muted-foreground">
                      {isTh
                        ? "วันที่ล่าสุดที่ตรวจสอบข้อมูลในบทความ ช่วยให้ Google ทราบว่าเนื้อหาอัปเดต"
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
                      https://example.com/reference-article
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
                      ? "เขียนคำถามที่คนมักถามจริงๆ เกี่ยวกับหัวข้อ คำตอบกระชับ 2-4 ประโยค ต้องมีอย่างน้อย 2 ข้อต่อภาษาเพื่อผ่านเกณฑ์คะแนน"
                      : "Write questions people actually ask about the topic. Answers should be 2-4 concise sentences. Need at least 2 per language to score"}
                  </p>
                  <p className="italic text-[#FF5B00]">
                    {isTh
                      ? "Q: ควรถ่ายรูปพรีเวดดิ้งช่วงไหน?"
                      : "Q: When is the best time for pre-wedding photos?"}
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
                  coverPreviews[item.id] || item.imageUrl || "/hero-bg.png";
                const qualityScore = getStoryQualityChecks(item, isTh).score;
                return (
                  <div
                    key={item.id}
                    className="rounded-md border border-dashed border-border bg-background p-3"
                  >
                    <div className="relative aspect-video overflow-hidden rounded-md border border-border bg-background">
                      <Image
                        src={preview}
                        alt={item.title || "blog cover"}
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
            {isTh ? "ยังไม่มีรายการที่บันทึกแล้ว" : "No saved items yet"}
          </p>
        ) : (
          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-muted-foreground">
              {isTh ? "รายการบล็อกที่บันทึกแล้ว" : "Saved Blog Items"}
            </h3>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
              {savedItems.map((item) => {
                const preview =
                  coverPreviews[item.id] || item.imageUrl || "/hero-bg.png";
                const published = isStoryPublished(item);
                const qualityScore = getStoryQualityChecks(item, isTh).score;
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

                    <div className="relative aspect-video overflow-hidden rounded-md border border-border bg-background">
                      <Image
                        src={preview}
                        alt={item.title || "blog cover"}
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
                          published
                            ? "bg-green-100 text-green-700"
                            : "bg-zinc-200 text-zinc-700"
                        }`}
                      >
                        {published
                          ? isTh
                            ? "เผยแพร่แล้ว"
                            : "Published"
                          : isTh
                            ? "ฉบับร่าง"
                            : "Draft"}
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
                    ? "เพิ่มบล็อก"
                    : "Add Blog"
                  : isTh
                    ? "แก้ไขบล็อก"
                    : "Edit Blog"}
              </h3>

              <div className="mt-4 space-y-3">
                <FloatingLabelInput
                  value={modalItem.title}
                  onChange={(event) =>
                    setModalItem((prev) =>
                      prev ? { ...prev, title: event.target.value } : prev,
                    )
                  }
                  label="หัวข้อ (TH)"
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
                  label="เนื้อหาบล็อก (TH)"
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
                  label={isTh ? "เนื้อหาบล็อก (EN)" : "Blog content (EN)"}
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
                  <h4 className="text-sm font-semibold">
                    {isTh ? "AIO Content" : "AIO Content"}
                  </h4>
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
                  <h4 className="text-sm font-semibold">
                    {isTh ? "SEO Tags" : "SEO Tags"}
                  </h4>
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

                <div className="relative aspect-video overflow-hidden rounded-md border border-border bg-background">
                  <Image
                    src={modalPreview || modalItem.imageUrl || "/hero-bg.png"}
                    alt="blog preview"
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

                {/* Gallery images (up to 8) */}
                <div className="space-y-2 rounded-md border border-border p-3">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium">
                      ภาพเพิ่มเติม (สูงสุด 8 ภาพ)
                    </p>
                    <span className="text-xs text-muted-foreground">
                      {(modalItem.images?.length || 0) + modalImageFiles.length}
                      /8
                    </span>
                  </div>

                  {((modalItem.images?.length || 0) > 0 ||
                    modalImagePreviews.length > 0) && (
                    <div className="grid grid-cols-4 gap-2">
                      {(modalItem.images || []).map((url, idx) => (
                        <div
                          key={`existing-${idx}`}
                          className="relative aspect-square overflow-hidden rounded-md border border-border bg-background"
                        >
                          <Image
                            src={url}
                            alt={`gallery ${idx + 1}`}
                            fill
                            sizes="100px"
                            className="object-cover"
                          />
                          <button
                            type="button"
                            onClick={() => removeModalExistingImage(idx)}
                            className="absolute right-0.5 top-0.5 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-white leading-none hover:bg-red-600"
                            aria-label={isTh ? "ลบภาพ" : "Remove image"}
                          >
                            <span className="text-xs">×</span>
                          </button>
                        </div>
                      ))}
                      {modalImagePreviews.map((url, idx) => (
                        <div
                          key={`new-${idx}`}
                          className="relative aspect-square overflow-hidden rounded-md border border-dashed border-[#FF5B00] bg-background"
                        >
                          <Image
                            src={url}
                            alt={`new ${idx + 1}`}
                            fill
                            sizes="100px"
                            className="object-cover"
                          />
                          <button
                            type="button"
                            onClick={() => removeModalNewImage(idx)}
                            className="absolute right-0.5 top-0.5 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-white leading-none hover:bg-red-600"
                            aria-label={isTh ? "ลบภาพ" : "Remove image"}
                          >
                            <span className="text-xs">×</span>
                          </button>
                        </div>
                      ))}
                    </div>
                  )}

                  {(modalItem.images?.length || 0) + modalImageFiles.length <
                  8 ? (
                    <input
                      type="file"
                      accept="image/png,image/jpeg,image/webp,image/avif"
                      multiple
                      onChange={onModalGalleryChange}
                      className="block w-full cursor-pointer rounded-md border border-border bg-background px-3 py-2 text-sm file:mr-3 file:rounded-md file:border-0 file:bg-secondary file:px-3 file:py-1.5 file:text-sm"
                    />
                  ) : (
                    <p className="text-xs text-muted-foreground">
                      {isTh
                        ? "ครบ 8 ภาพเพิ่มเติมแล้ว"
                        : "Maximum 8 additional images reached"}
                    </p>
                  )}

                  {(modalItem.images?.length || 0) > 0 && (
                    <>
                      <textarea
                        value={serializeListInput(modalItem.galleryAltTh)}
                        onChange={(event) =>
                          setModalItem((prev) =>
                            prev
                              ? {
                                  ...prev,
                                  galleryAltTh: parseListInput(
                                    event.target.value,
                                  ),
                                }
                              : prev,
                          )
                        }
                        placeholder={
                          isTh
                            ? "Gallery Alt TH (บรรทัดละ 1 ค่า ไล่ตามลำดับรูป)"
                            : "Gallery Alt TH (one per line, image order)"
                        }
                        rows={2}
                        className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
                      />
                      <textarea
                        value={serializeListInput(modalItem.galleryAltEn)}
                        onChange={(event) =>
                          setModalItem((prev) =>
                            prev
                              ? {
                                  ...prev,
                                  galleryAltEn: parseListInput(
                                    event.target.value,
                                  ),
                                }
                              : prev,
                          )
                        }
                        placeholder={
                          isTh
                            ? "Gallery Alt EN (บรรทัดละ 1 ค่า ไล่ตามลำดับรูป)"
                            : "Gallery Alt EN (one per line, image order)"
                        }
                        rows={2}
                        className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
                      />
                    </>
                  )}
                </div>

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
                    <h4 className="text-sm font-semibold">
                      {isTh ? "FAQ (TH)" : "FAQ (TH)"}
                    </h4>
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
                    <h4 className="text-sm font-semibold">
                      {isTh ? "FAQ (EN)" : "FAQ (EN)"}
                    </h4>
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
                      checked={modalItem.published}
                      onChange={(event) =>
                        setModalItem((prev) =>
                          prev
                            ? { ...prev, published: event.target.checked }
                            : prev,
                        )
                      }
                    />
                    {isTh ? "เผยแพร่" : "Published"}
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
              </div>

              <div className="mt-5 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={closeModal}
                  disabled={saving}
                  className="rounded-md border border-border px-4 py-2 text-sm transition-all duration-200 hover:-translate-y-0.5 hover:bg-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF5B00] disabled:opacity-60"
                >
                  {isTh ? "ยกเลิก" : "Cancel"}
                </button>
                <button
                  type="button"
                  onClick={saveModalItem}
                  disabled={saving}
                  className="rounded-md border border-[#FF5B00] bg-[#FF5B00] px-4 py-2 text-sm text-white transition-all duration-200 hover:-translate-y-0.5 hover:bg-[#e65200] hover:shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF5B00] disabled:opacity-60"
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
                className="rounded-md border border-border px-4 py-2 text-sm transition-all duration-200 hover:-translate-y-0.5 hover:bg-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF5B00]"
              >
                {isTh ? "ยกเลิก" : "Cancel"}
              </button>
              <button
                type="button"
                onClick={confirmDeleteItem}
                className="rounded-md border border-[#FF5B00] bg-[#FF5B00] px-4 py-2 text-sm text-white transition-all duration-200 hover:-translate-y-0.5 hover:bg-[#e65200] hover:shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF5B00]"
              >
                {isTh ? "ใช่, ลบ" : "Yes, Delete"}
              </button>
            </div>
          </div>
        </div>
      )}
    </AdminSectionLayout>
  );
}
