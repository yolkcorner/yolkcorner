"use client";

import {
  createContext,
  useContext,
  useState,
  ReactNode,
  useEffect,
  useCallback,
} from "react";

import rawTranslationsData from "./translations.json";
export type Lang = "th" | "en";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type TranslationSchema = Record<string, any>;
interface TranslationsRoot {
  th: TranslationSchema;
  en: TranslationSchema;
}
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const translationsData = rawTranslationsData as any as TranslationsRoot;

export type Translations = TranslationSchema;

export const translations = translationsData;

export const LangContext = createContext<{
  lang: Lang;
  setLang: (lang: Lang) => void;
  t: TranslationSchema;
}>({
  lang: "th",
  setLang: () => {},
  t: translationsData.th,
});

export const LangProvider = ({ children }: { children: ReactNode }) => {
  const [lang, setLangState] = useState<Lang>("th");

  const setLang = useCallback((nextLang: Lang) => {
    setLangState(nextLang);
    window.localStorage.setItem("lang", nextLang);
    document.documentElement.lang = nextLang;
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      const saved = window.localStorage.getItem("lang");
      if (saved === "th" || saved === "en") {
        setLangState(saved);
        document.documentElement.lang = saved;
        return;
      }

      document.documentElement.lang = "th";
    }, 0);

    return () => {
      window.clearTimeout(timer);
    };
  }, []);

  useEffect(() => {
    document.documentElement.lang = lang;
  }, [lang]);

  const t = translations[lang];
  return (
    <LangContext.Provider value={{ lang, setLang, t }}>
      {children}
    </LangContext.Provider>
  );
};

export const useLang = () => useContext(LangContext);
