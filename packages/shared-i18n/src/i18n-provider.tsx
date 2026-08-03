import React, { useEffect, useState } from 'react';
import { I18nProvider as LinguiProvider } from '@lingui/react';
import { i18n } from '@lingui/core';
import { messages as enMessages } from '../locales/en/messages';
import { messages as frMessages } from '../locales/fr/messages';

// Load messages for each locale
i18n.load('en', enMessages);
i18n.load('fr', frMessages);

function getLocale(): string {
  if (typeof navigator === 'undefined') return 'en';
  const stored = localStorage.getItem('ataqu-locale');
  if (stored) return stored;
  const browserLocale = navigator.language?.split('-')[0] || 'en';
  return ['en', 'fr'].includes(browserLocale) ? browserLocale : 'en';
}

export const I18nProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [locale, setLocale] = useState('en');

  useEffect(() => {
    const detected = getLocale();
    setLocale(detected);
    i18n.activate(detected);
    localStorage.setItem('ataqu-locale', detected);
  }, []);

  if (!i18n.messages[locale]) {
    // Fallback: just show children without translation
    return <>{children}</>;
  }

  return <LinguiProvider i18n={i18n}>{children}</LinguiProvider>;
};
