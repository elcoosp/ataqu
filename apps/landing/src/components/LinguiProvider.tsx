"use client";

import { useState, useEffect } from "react";
import { I18nProvider } from "@lingui/react";
import { i18n } from "@lingui/core";
import { usePathname } from "next/navigation";

// Supported locales from lingui.config.ts
const SUPPORTED_LOCALES = ["en", "fr", "de", "es", "pt"];

function getLocaleFromPath(pathname: string): string {
  const segments = pathname.split("/").filter(Boolean);
  const firstSegment = segments[0];
  if (firstSegment && SUPPORTED_LOCALES.includes(firstSegment)) {
    return firstSegment;
  }
  return "en"; // fallback to default
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
      } catch (err) {
        console.error("Failed to load catalog for locale:", locale, err);
        // fallback to English
        const { messages } = await import(`@/locales/en/messages`);
        i18n.load("en", messages);
        i18n.activate("en");
        setLoaded(true);
      }
    }
    loadCatalog();
  }, [locale]);

  if (!loaded) {
    return null;
  }

  return <I18nProvider i18n={i18n}>{children}</I18nProvider>;
}
