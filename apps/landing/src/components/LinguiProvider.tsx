"use client";

import { useState, useEffect } from "react";
import { I18nProvider } from "@lingui/react";
import { i18n } from "@lingui/core";
import { usePathname } from "next/navigation";

const SUPPORTED_LOCALES = ["en", "fr", "de", "es", "pt"];

function getLocaleFromPath(pathname: string): string {
  const segments = pathname.split("/").filter(Boolean);
  const firstSegment = segments[0];
  if (firstSegment && SUPPORTED_LOCALES.includes(firstSegment)) {
    return firstSegment;
  }
  return "en";
}

// Load the default catalog synchronously on the server to avoid undefined messages
let defaultMessages: any = null;
try {
  // This will be inlined by Next.js during build
  defaultMessages = require("@/locales/en/messages").messages;
} catch (_) {
  // Fallback empty
  defaultMessages = {};
}
// Load the default locale synchronously so i18n._() works on the server
i18n.load("en", defaultMessages);
i18n.activate("en");

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
        // Fallback to en (already loaded synchronously)
        i18n.activate("en");
        setLoaded(true);
      }
    }
    loadCatalog();
  }, [locale]);

  // On the server, we render immediately since i18n is loaded synchronously
  // On the client, we wait for the effect to run.
  const [isMounted, setIsMounted] = useState(false);
  useEffect(() => {
    setIsMounted(true);
  }, []);

  if (!isMounted && typeof window !== "undefined") {
    // Client-side initial render: wait for the effect to load the catalog
    // But we already have 'en' loaded, so we can show the fallback.
    // To avoid flash, we render with 'en' initially.
    return <I18nProvider i18n={i18n}>{children}</I18nProvider>;
  }

  return <I18nProvider i18n={i18n}>{children}</I18nProvider>;
}
