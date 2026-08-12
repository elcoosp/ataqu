// @vitest-environment happy-dom
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import type { ComponentProps } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { LeaveRequestForm } from '../leave-request-form';

const mutate = vi.fn();
vi.mock('@lingui/macro', () => ({
  Trans: ({ children }: any) => children,
  t: (str: string) => str,
}));

vi.mock('@ataqu/api-client', () => ({
  useCreateLeaveRequest: () => ({ mutate, isPending: false }),
}));

vi.mock('@ataqu/ui', () => ({
  Button: ({ children, ...props }: ComponentProps<'button'>) => (
    <button type="submit" {...props}>
      {children}
    </button>
  ),
  Input: (props: ComponentProps<'input'>) => <input {...props} />,
  Label: ({ children }: ComponentProps<'span'>) => <span>{children}</span>,
}));

describe('LeaveRequestForm', () => {
  it('submits form with valid data', async () => {
    const { container } = render(<LeaveRequestForm employeeId="123" />);

    const select = container.querySelector('#leave_type')!;
    fireEvent.change(select, { target: { value: 'sick' } });

    const startDateInput = container.querySelector('#start_date')!;
    fireEvent.change(startDateInput, { target: { value: '2026-01-01' } });

    const endDateInput = container.querySelector('#end_date')!;
    fireEvent.change(endDateInput, { target: { value: '2026-01-02' } });

    const submitButton = screen.getByRole('button', { name: /Request Leave/i });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(mutate).toHaveBeenCalledWith(
        expect.objectContaining({
          employee_id: '123',
          leave_type: 'sick',
          start_date: '2026-01-01',
          end_date: '2026-01-02',
        })
      );
    });
  });
});
