"use client";

import { createContext, useContext } from "react";
import type { Dictionary, Locale } from "./index";

interface LanguageContextValue {
  locale: Locale;
  dict: Dictionary;
}

const LanguageContext = createContext<LanguageContextValue | null>(null);

export function LanguageProvider({
  locale,
  dict,
  children,
}: {
  locale: Locale;
  dict: Dictionary;
  children: React.ReactNode;
}) {
  return (
    <LanguageContext.Provider value={{ locale, dict }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useT(): Dictionary {
  const ctx = useContext(LanguageContext);
  if (!ctx) throw new Error("useT must be used inside LanguageProvider");
  return ctx.dict;
}

export function useLocale(): Locale {
  const ctx = useContext(LanguageContext);
  if (!ctx) throw new Error("useLocale must be used inside LanguageProvider");
  return ctx.locale;
}
