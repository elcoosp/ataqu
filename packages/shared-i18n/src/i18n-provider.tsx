import React from 'react';
import { I18nProvider as LinguiProvider } from '@lingui/react';
import { i18n } from '@lingui/core';

// Activate English as default locale without loading any messages.
i18n.activate('en');

export const I18nProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <LinguiProvider i18n={i18n}>{children}</LinguiProvider>
);
