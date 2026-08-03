import type { LinguiConfig } from '@lingui/conf';
import { formatter } from '@lingui/format-po';

const config: LinguiConfig = {
  locales: ['en', 'fr'],
  sourceLocale: 'en',
  catalogs: [
    {
      path: '<rootDir>/packages/shared-i18n/locales/{locale}/messages',
      include: ['apps/*/src', 'packages/*/src'],
    },
  ],
  format: formatter({ lineNumbers: false }),
};
export default config;
