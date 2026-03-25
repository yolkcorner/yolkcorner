export interface ServiceCategory {
  id: string;
  name: string;
  nameEn?: string;
  coverUrl: string;
}

export interface AboutMember {
  id: string;
  name?: string;
  nameEn?: string;
  positionTitle?: string;
  positionTitleEn?: string;
  positionDescription?: string;
  positionDescriptionEn?: string;
  contactPhone?: string;
  portfolioLink?: string;
  socials?: {
    instagram?: {
      enabled?: boolean;
      url?: string;
    };
    facebook?: {
      enabled?: boolean;
      url?: string;
    };
    tiktok?: {
      enabled?: boolean;
      url?: string;
    };
  };
  imageUrl?: string;
  roleTitle?: string;
  details?: string;
}

export interface PortfolioAlbum {
  id: string;
  categoryId: string;
  name: string;
  nameEn?: string;
  coverUrl: string;
  topText: string;
  topTextEn?: string;
  images: string[];
  password?: string; // 4-digit album password (plain, optional)
}

export interface ContactPhone {
  id: string;
  owner: string;
  number: string;
  enabled: boolean;
}

export interface ContactEmail {
  id: string;
  email: string;
  enabled: boolean;
}

export interface ContactSocial {
  enabled: boolean;
  url: string;
}

export interface NewsItem {
  id: string;
  slug?: string;
  title: string;
  titleEn?: string;
  seoTitleTh?: string;
  seoTitleEn?: string;
  seoDescriptionTh?: string;
  seoDescriptionEn?: string;
  canonicalUrl?: string;
  noIndex?: boolean;
  summaryTh?: string;
  summaryEn?: string;
  keyTakeawaysTh?: string[];
  keyTakeawaysEn?: string[];
  faqTh?: NewsFaqItem[];
  faqEn?: NewsFaqItem[];
  authorName?: string;
  authorRole?: string;
  reviewedAt?: string;
  sourceLinks?: string[];
  coverAltTh?: string;
  coverAltEn?: string;
  body: string;
  bodyEn?: string;
  imageUrl: string;
  seoTagsTh?: string[];
  seoTagsEn?: string[];
  showOnHome: boolean;
  alwaysActive: boolean;
  startAt?: string;
  endAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface StoryItem {
  id: string;
  slug?: string;
  title: string;
  titleEn?: string;
  seoTitleTh?: string;
  seoTitleEn?: string;
  seoDescriptionTh?: string;
  seoDescriptionEn?: string;
  canonicalUrl?: string;
  noIndex?: boolean;
  summaryTh?: string;
  summaryEn?: string;
  keyTakeawaysTh?: string[];
  keyTakeawaysEn?: string[];
  faqTh?: StoryFaqItem[];
  faqEn?: StoryFaqItem[];
  authorName?: string;
  authorRole?: string;
  reviewedAt?: string;
  sourceLinks?: string[];
  coverAltTh?: string;
  coverAltEn?: string;
  galleryAltTh?: string[];
  galleryAltEn?: string[];
  body: string;
  bodyEn?: string;
  imageUrl: string;
  images: string[];
  seoTagsTh: string[];
  seoTagsEn?: string[];
  showOnHome: boolean;
  published: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface StoryFaqItem {
  question: string;
  answer: string;
}

export interface NewsFaqItem {
  question: string;
  answer: string;
}

export interface SeoSettings {
  descriptionTh: string;
  descriptionEn: string;
  keywordsTh: string[];
  keywordsEn: string[];
  googleSiteVerification?: string;
  allowIndexing: boolean;
  allowFollowing: boolean;
}

export interface HeroSlide {
  id: string;
  title: string;
  titleEn?: string;
  subtitle: string;
  subtitleEn?: string;
  ctaLabel: string;
  ctaLabelEn?: string;
  ctaHref: string;
  showCta: boolean;
  secondaryButtonLabel?: string;
  secondaryButtonLabelEn?: string;
  secondaryButtonHref?: string;
  showSecondaryButton?: boolean;
  backgroundUrl: string;
}

export type OpeningModalTargetPage =
  | "home"
  | "blog"
  | "news"
  | "download";

export type OpeningModalTriggerMode = "delay" | "scroll-30";

export interface OpeningModalItem {
  id: string;
  imageUrl: string;
  linkUrl: string;
  isActive: boolean;
  mode?: "welcome" | "promotion";
  targetPages?: OpeningModalTargetPage[];
  triggerMode?: OpeningModalTriggerMode;
  priority?: number;
  startAt?: string;
  endAt?: string;
  minIntervalHours?: number;
  snoozeHours?: number;
  muteDaysAfterClick?: number;
  createdAt: string;
  updatedAt: string;
}

export interface SiteContent {
  branding: {
    siteName: string;
    logoUrl: string;
  };
  hero: {
    title: string;
    titleEn?: string;
    subtitle: string;
    subtitleEn?: string;
    ctaLabel: string;
    ctaLabelEn?: string;
    ctaHref: string;
    showCta: boolean;
    secondaryButtonLabel?: string;
    secondaryButtonLabelEn?: string;
    secondaryButtonHref?: string;
    showSecondaryButton?: boolean;
    backgroundUrl: string;
    slides?: HeroSlide[];
  };
  services: {
    title: string;
    titleEn?: string;
    categories: ServiceCategory[];
  };
  about: {
    title: string;
    titleEn?: string;
    subtitle: string;
    subtitleEn?: string;
    members: AboutMember[];
  };
  portfolio: {
    title: string;
    titleEn?: string;
    categories: ServiceCategory[];
    albums: PortfolioAlbum[];
  };
  contact: {
    phones: ContactPhone[];
    emails: ContactEmail[];
    address: string;
    addressEn?: string;
    socials: {
      facebook: ContactSocial;
      instagram: ContactSocial;
      tiktok: ContactSocial;
      line: ContactSocial;
    };
    formTargetEmail: string;
  };
  news: {
    title: string;
    titleEn?: string;
    items: NewsItem[];
  };
  story: {
    title: string;
    titleEn?: string;
    items: StoryItem[];
  };
  openingModals: OpeningModalItem[];
  seo: SeoSettings;
  /**
   * Mapping of download albumId to password (plain 4-digit string or undefined)
   * Example: { "event-2026-03-25": "1234", ... }
   */
  downloadPasswords?: { [albumId: string]: string | undefined };
}

export const defaultSiteContent: SiteContent = {
  branding: {
    siteName: "Yolk Corner",
    logoUrl: "/logo.png?v=20260313",
  },
  hero: {
    title: "Yolk Corner PRODUCTION",
    titleEn: "Yolk Corner PRODUCTION",
    subtitle: "สร้างสรรค์ผลงานด้วยความเป็นมืออาชีพ",
    subtitleEn: "Creating professional content with passion",
    ctaLabel: "ดูผลงานของเรา",
    ctaLabelEn: "View Our Work",
    ctaHref: "/portfolio",
    showCta: true,
    secondaryButtonLabel: "เกี่ยวกับเรา",
    secondaryButtonLabelEn: "About",
    secondaryButtonHref: "/about",
    showSecondaryButton: true,
    backgroundUrl: "/hero-bg.png",
    slides: [
      {
        id: "hero-slide-1",
        title: "Yolk Corner PRODUCTION",
        titleEn: "Yolk Corner PRODUCTION",
        subtitle: "สร้างสรรค์ผลงานด้วยความเป็นมืออาชีพ",
        subtitleEn: "Creating professional content with passion",
        ctaLabel: "ดูผลงานของเรา",
        ctaLabelEn: "View Our Work",
        ctaHref: "/portfolio",
        showCta: true,
        secondaryButtonLabel: "เกี่ยวกับเรา",
        secondaryButtonLabelEn: "About",
        secondaryButtonHref: "/about",
        showSecondaryButton: true,
        backgroundUrl: "/hero-bg.png",
      },
    ],
  },
  services: {
    title: "บริการของเรา",
    titleEn: "Our Services",
    categories: [
      {
        id: "wedding",
        name: "งานแต่ง",
        nameEn: "Wedding",
        coverUrl: "/hero-bg.png",
      },
      {
        id: "ordination",
        name: "งานบวช",
        nameEn: "Ordination",
        coverUrl: "/hero-bg.png",
      },
      {
        id: "events",
        name: "งาน events",
        nameEn: "Events",
        coverUrl: "/hero-bg.png",
      },
      {
        id: "funeral",
        name: "งานศพ",
        nameEn: "Funeral",
        coverUrl: "/hero-bg.png",
      },
      {
        id: "product",
        name: "งานถ่ายสินค้า",
        nameEn: "Product",
        coverUrl: "/hero-bg.png",
      },
      {
        id: "corporate",
        name: "งานองค์กร",
        nameEn: "Corporate",
        coverUrl: "/hero-bg.png",
      },
      {
        id: "photobooth",
        name: "โฟโต้บูท",
        nameEn: "Photo Booth",
        coverUrl: "/hero-bg.png",
      },
      {
        id: "other",
        name: "อื่นๆ",
        nameEn: "Other",
        coverUrl: "/hero-bg.png",
      },
    ],
  },
  about: {
    title: "เกี่ยวกับเรา",
    titleEn: "About Us",
    subtitle: "ทีมงานมืออาชีพที่พร้อมสร้างสรรค์ผลงานให้คุณ",
    subtitleEn: "A professional team ready to create for you",
    members: [
      {
        id: "member-1",
        name: "สมาชิกทีมงาน 1",
        nameEn: "Team Member 1",
        positionTitle: "ช่างภาพ",
        positionTitleEn: "Photographer",
        positionDescription: "ดูแลภาพนิ่งและการเล่าเรื่องผ่านภาพ",
        positionDescriptionEn: "Responsible for still photography and visual storytelling",
        contactPhone: "",
        portfolioLink: "",
        socials: {
          instagram: { enabled: false, url: "" },
          facebook: { enabled: false, url: "" },
          tiktok: { enabled: false, url: "" },
        },
        imageUrl: "",
        roleTitle: "ช่างภาพ",
        details: "ดูแลภาพนิ่งและการเล่าเรื่องผ่านภาพ",
      },
      {
        id: "member-2",
        name: "สมาชิกทีมงาน 2",
        nameEn: "Team Member 2",
        positionTitle: "ช่างวิดีโอ",
        positionTitleEn: "Videographer",
        positionDescription: "รับผิดชอบการถ่ายทำและงานตัดต่อวิดีโอ",
        positionDescriptionEn: "Responsible for filming and video editing",
        contactPhone: "",
        portfolioLink: "",
        socials: {
          instagram: { enabled: false, url: "" },
          facebook: { enabled: false, url: "" },
          tiktok: { enabled: false, url: "" },
        },
        imageUrl: "",
        roleTitle: "ช่างวิดีโอ",
        details: "รับผิดชอบการถ่ายทำและงานตัดต่อวิดีโอ",
      },
    ],
  },
  portfolio: {
    title: "ผลงาน",
    titleEn: "Portfolio",
    categories: [
      {
        id: "wedding",
        name: "งานแต่ง",
        nameEn: "Wedding",
        coverUrl: "/hero-bg.png",
      },
      {
        id: "ordination",
        name: "งานบวช",
        nameEn: "Ordination",
        coverUrl: "/hero-bg.png",
      },
      {
        id: "events",
        name: "งาน events",
        nameEn: "Events",
        coverUrl: "/hero-bg.png",
      },
      {
        id: "funeral",
        name: "งานศพ",
        nameEn: "Funeral",
        coverUrl: "/hero-bg.png",
      },
      {
        id: "product",
        name: "งานถ่ายสินค้า",
        nameEn: "Product",
        coverUrl: "/hero-bg.png",
      },
      {
        id: "corporate",
        name: "งานองค์กร",
        nameEn: "Corporate",
        coverUrl: "/hero-bg.png",
      },
      {
        id: "photobooth",
        name: "โฟโต้บูท",
        nameEn: "Photo Booth",
        coverUrl: "/hero-bg.png",
      },
      {
        id: "other",
        name: "อื่นๆ",
        nameEn: "Other",
        coverUrl: "/hero-bg.png",
      },
    ],
    albums: [],
  },
  contact: {
    phones: [
      {
        id: "phone-1",
        owner: "",
        number: "",
        enabled: false,
      },
    ],
    emails: [
      {
        id: "email-1",
        email: "",
        enabled: false,
      },
    ],
    address: "",
    addressEn: "",
    socials: {
      facebook: { enabled: false, url: "" },
      instagram: { enabled: false, url: "" },
      tiktok: { enabled: false, url: "" },
      line: { enabled: false, url: "" },
    },
    formTargetEmail: "",
  },
  news: {
    title: "ข่าวสารและโปรโมชั่น",
    titleEn: "News & Promotions",
    items: [],
  },
  story: {
    title: "บล็อก",
    titleEn: "Blog",
    items: [],
  },
  openingModals: [],
  seo: {
    descriptionTh:
      "Yolk Corner Production รับถ่ายภาพและวิดีโอมืออาชีพ สำหรับงานแต่ง งานอีเวนต์ และงานองค์กร",
    descriptionEn:
      "Yolk Corner Production provides professional photography and videography for weddings, events, and corporate projects.",
    keywordsTh: [
      "ช่างภาพ",
      "ช่างวิดีโอ",
      "ถ่ายภาพงานแต่ง",
      "ถ่ายวิดีโออีเวนต์",
      "Yolk Corner",
    ],
    keywordsEn: [
      "photography",
      "videography",
      "wedding photographer",
      "event videography",
      "Yolk Corner production",
    ],
    googleSiteVerification: "",
    allowIndexing: true,
    allowFollowing: true,
  },
  downloadPasswords: {},
};
