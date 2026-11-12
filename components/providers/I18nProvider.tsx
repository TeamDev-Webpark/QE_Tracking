"use client";

import { createContext, useContext, type ReactNode } from "react";
import { th, type Dictionary, type Lang } from "@/i18n/dictionaries";

type I18nValue = { lang: Lang; t: Dictionary };

const defaultValue: I18nValue = { lang: "th", t: th };
const I18nContext = createContext<I18nValue>(defaultValue);

export function I18nProvider({ children }: { lang?: Lang; children: ReactNode }) {
  return <I18nContext.Provider value={defaultValue}>{children}</I18nContext.Provider>;
}

export function useI18n() {
  return useContext(I18nContext);
}
