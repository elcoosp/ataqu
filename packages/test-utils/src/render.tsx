import React from 'react';
import { render } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { I18nProvider } from '@ataqu/shared-i18n';

const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
export const renderWithProviders = (ui: React.ReactElement, options = {}) => render(
  <QueryClientProvider client={queryClient}><I18nProvider>{ui}</I18nProvider></QueryClientProvider>,
  options
);
