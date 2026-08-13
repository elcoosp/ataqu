import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';
import { afterEach, vi } from 'vitest';
import React from 'react';
import { i18n } from '@lingui/core';

// Activate Lingui locale and load empty messages to prevent stderr warnings
i18n.load('en', {});
i18n.activate('en');

window.matchMedia = window.matchMedia || vi.fn().mockImplementation((query: string) => ({
  matches: false,
  media: query,
  onchange: null,
  addListener: vi.fn(),
  removeListener: vi.fn(),
  addEventListener: vi.fn(),
  removeEventListener: vi.fn(),
  dispatchEvent: vi.fn(),
}));

class ResizeObserverMock {
  observe() {}
  unobserve() {}
  disconnect() {}
}
window.ResizeObserver = window.ResizeObserver || ResizeObserverMock;

class IntersectionObserverMock {
  observe() {}
  unobserve() {}
  disconnect() {}
}
window.IntersectionObserver = window.IntersectionObserver || IntersectionObserverMock;

afterEach(() => {
  cleanup();
});

vi.mock('@ataqu/ui', async () => {
  const actual = await vi.importActual('@ataqu/ui');
  return {
    ...actual,
    Shell: ({ children }: { children: React.ReactNode }) =>
      React.createElement('div', { 'data-testid': 'shell-mock' }, children),
    DashboardLayout: ({ children }: { children: React.ReactNode }) =>
      React.createElement('div', { 'data-testid': 'dashboard-layout-mock' }, children),
  };
});
