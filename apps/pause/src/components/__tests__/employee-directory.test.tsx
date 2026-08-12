// @vitest-environment happy-dom
import { render, screen } from '@testing-library/react';
import type { ComponentProps } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { EmployeeDirectory } from '../employee-directory';

vi.mock('@ataqu/api-client', () => ({
  useListEmployees: () => ({
    data: [{ id: '1', full_name: 'John Doe', job_title: 'Dev', email: 'john@doe.com' }],
    isLoading: false,
  }),
  useSearchEmployees: () => ({ data: [], isLoading: false }),
}));

vi.mock('@tanstack/react-router', () => ({
  useNavigate: () => () => {},
}));

vi.mock('@lingui/macro', () => ({
  Trans: ({ children }: any) => children,
  t: (str: string) => str,
}));

vi.mock('@ataqu/shared-hooks', () => ({
  useDebounce: (v: string) => v,
}));

vi.mock('@ataqu/ui', () => ({
  Button: ({ children }: ComponentProps<'button'>) => <button type="button">{children}</button>,
  Input: () => <input />,
  Skeleton: () => <div />,
  Card: ({ children }: ComponentProps<'div'>) => <div>{children}</div>,
}));

vi.mock('../empty-state', () => ({
  EmptyState: () => <div data-testid="empty-state" />,
}));

describe('EmployeeDirectory', () => {
  it('renders employee card', () => {
    render(<EmployeeDirectory onAddEmployee={() => {}} />);
    expect(screen.getByText('John Doe')).toBeTruthy();
  });
});
