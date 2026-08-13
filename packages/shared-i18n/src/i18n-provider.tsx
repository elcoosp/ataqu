// packages/shared-i18n/src/i18n-provider.tsx
import { useEffect, useState } from 'react';
import { I18nProvider as LinguiProvider } from '@lingui/react';
import { i18n } from '@lingui/core';

interface Props {
  children: React.ReactNode;
  locale?: string;
}

export const I18nProvider = ({ children, locale = 'en' }: Props) => {
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    async function load() {
      try {
        // Dynamically import the app's compiled messages
        // Assumes the app has a `src/locales/${locale}/messages.ts` file
        const { messages } = await import(
          /* @vite-ignore */ `../../src/locales/${locale}/messages.ts`
        );
        i18n.load(locale, messages);
        i18n.activate(locale);
        setLoaded(true);
      } catch {
        // Fallback to empty messages if not found
        i18n.load(locale, {});
        i18n.activate(locale);
        setLoaded(true);
      }
    }
    load();
  }, [locale]);

  if (!loaded) return null;

  return <LinguiProvider i18n={i18n}>{children}</LinguiProvider>;
};
