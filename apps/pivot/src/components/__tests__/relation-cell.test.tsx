import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { RelationCell } from '../relation-cell';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });

describe('RelationCell', () => {
  it('renders placeholder when no value', () => {
    const onSelect = vi.fn();
    render(
      <QueryClientProvider client={queryClient}>
        <RelationCell app="cinq" onSelect={onSelect} />
      </QueryClientProvider>
    );
    expect(screen.getByText(/Link cinq/i)).toBeTruthy();
  });

  it('renders value label when provided', () => {
    const onSelect = vi.fn();
    const value = { app: 'cinq', entityId: '123', label: 'Acme Corp' };
    render(
      <QueryClientProvider client={queryClient}>
        <RelationCell app="cinq" onSelect={onSelect} value={value} />
      </QueryClientProvider>
    );
    expect(screen.getByText('Acme Corp')).toBeTruthy();
  });

  it('calls onSelect with null when clear clicked', () => {
    const onSelect = vi.fn();
    const value = { app: 'cinq', entityId: '123', label: 'Acme Corp' };
    render(
      <QueryClientProvider client={queryClient}>
        <RelationCell app="cinq" onSelect={onSelect} value={value} />
      </QueryClientProvider>
    );
    const clearBtn = screen.getByRole('button', { name: /x/i });
    fireEvent.click(clearBtn);
    expect(onSelect).toHaveBeenCalledWith(null);
  });
});
