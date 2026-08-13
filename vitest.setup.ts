import '@testing-library/jest-dom';
import { i18n } from '@lingui/core';
import { I18nProvider } from '@lingui/react';
import React from 'react';

i18n.load({
  en: {}
});
i18n.activate('en');

vi.mock('@testing-library/react', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@testing-library/react')>();
  return {
    ...actual,
    render: (ui: React.ReactElement, options?: any) => {
      const ExistingWrapper = options?.wrapper || (({ children }: any) => children);
      const Wrapper = ({ children }: { children: React.ReactNode }) =>
        React.createElement(I18nProvider, { i18n }, React.createElement(ExistingWrapper, null, children));

      return actual.render(ui, { ...options, wrapper: Wrapper });
    },
  };
});
