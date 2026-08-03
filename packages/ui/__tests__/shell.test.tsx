import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Shell } from '../src/components/shell';
import { I18nProvider } from '@ataqu/shared-i18n';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: false } },
});

const renderWithProviders = (ui: React.ReactElement) => {
  return render(
    <QueryClientProvider client={queryClient}>
      <I18nProvider>{ui}</I18nProvider>
    </QueryClientProvider>
  );
};

describe('Shell', () => {
  it('renders children and shows active app', () => {
    renderWithProviders(
      <Shell activeApp="cinq">
        <div>Test Content</div>
      </Shell>
    );
    expect(screen.getByText('Test Content')).toBeInTheDocument();
    // Check that the sidebar highlights CINQ (the link with text CINQ)
    const links = screen.getAllByRole('link');
    const cinqLink = links.find((l) => l.textContent?.includes('CINQ'));
    expect(cinqLink).toHaveClass('text-amber');
  });
});
