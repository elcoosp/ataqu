import { vi } from 'vitest';

// Mock the @/lib/utils import from ui package
vi.mock('@ataqu/ui', async () => {
  const actual = await vi.importActual('@ataqu/ui');
  return {
    ...actual,
    cn: (...args: any[]) => args.filter(Boolean).join(' '),
  };
});

// Mock lucide-react icons
vi.mock('lucide-react', () => ({
  Plus: () => null,
  SearchIcon: () => null,
  X: () => null,
  ChevronUp: () => null,
  ChevronDown: () => null,
  Filter: () => null,
}));

// Mock @lingui/react/macro for tests (Trans is a component, we just render children)
vi.mock('@lingui/react/macro', () => ({
  Trans: ({ children }: { children: React.ReactNode }) => children,
  // t is not used in tests because we mock it
}));

// Mock sonner toast
vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
    warning: vi.fn(),
  },
}));
