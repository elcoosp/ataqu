"use client";

import { useState, useEffect } from "react";
import { I18nProvider } from "@lingui/react";
import { i18n } from "@lingui/core";
import { usePathname } from "next/navigation";

const SUPPORTED_LOCALES = ["en", "fr", "de", "es", "pt"];

function getLocaleFromPath(pathname: string): string {
  const segments = pathname.split("/").filter(Boolean);
  const first = segments[0];
  if (first && SUPPORTED_LOCALES.includes(first)) return first;
  return "en";
}

export function LinguiProvider({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const locale = getLocaleFromPath(pathname);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    async function loadCatalog() {
      try {
        const { messages } = await import(`@/locales/${locale}/messages`);
        i18n.load(locale, messages);
        i18n.activate(locale);
        setLoaded(true);
      } catch {
        const { messages } = await import(`@/locales/en/messages`);
        i18n.load("en", messages);
        i18n.activate("en");
        setLoaded(true);
      }
    }
    loadCatalog();
  }, [locale]);

  if (!loaded) return null;
  return <I18nProvider i18n={i18n}>{children}</I18nProvider>;
}
