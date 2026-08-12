import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { DatabaseGrid } from '../database-grid';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });

describe('DatabaseGrid', () => {
  const columns = [
    { name: 'Name', type: 'text' as const },
    { name: 'Amount', type: 'number' as const },
  ];

  it('renders columns headers', () => {
    render(
      <QueryClientProvider client={queryClient}>
        <DatabaseGrid databaseId="test" columns={columns} />
      </QueryClientProvider>
    );
    expect(screen.getByText('Name')).toBeInTheDocument();
    expect(screen.getByText('Amount')).toBeInTheDocument();
  });

  it('renders add row button', () => {
    render(
      <QueryClientProvider client={queryClient}>
        <DatabaseGrid databaseId="test" columns={columns} />
      </QueryClientProvider>
    );
    expect(screen.getByText(/Add Row/i)).toBeInTheDocument();
  });

  // More tests would require mocking API calls
});
