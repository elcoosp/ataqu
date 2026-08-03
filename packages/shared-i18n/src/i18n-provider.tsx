import React, { useEffect } from 'react';
import { I18nProvider as LinguiProvider } from '@lingui/react';
import { i18n } from '@lingui/core';
import { messages as enMessages } from '../locales/en/messages';
import { messages as frMessages } from '../locales/fr/messages';

i18n.load('en', enMessages);
i18n.load('fr', frMessages);
i18n.activate('en');

export const I18nProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <LinguiProvider i18n={i18n}>{children}</LinguiProvider>
);
