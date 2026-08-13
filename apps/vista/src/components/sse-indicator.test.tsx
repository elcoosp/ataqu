import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { SseIndicator } from './sse-indicator';

describe('SseIndicator', () => {
  it('renders connected state', () => {
    render(<SseIndicator isConnected={true} />);
    expect(screen.getByText('Live')).toBeTruthy();
  });
});
