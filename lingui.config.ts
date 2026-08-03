import type { LinguiConfig } from '@lingui/conf';

const config: LinguiConfig = {
  locales: ['en', 'fr'],
  sourceLocale: 'en',
  catalogs: [
    {
      path: '<rootDir>/packages/shared-i18n/locales/{locale}/messages',
      include: ['apps/*/src', 'packages/*/src'],
    },
  ],
  format: 'po',
};

export default config;
