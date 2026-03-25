import { Lang } from "@/lib/i18n";

export const pickLangText = (
  th: string | undefined,
  en: string | undefined,
  lang: Lang,
) => {
  if (lang === "en") {
    return (en || "").trim() || (th || "").trim();
  }

  return (th || "").trim() || (en || "").trim();
};
