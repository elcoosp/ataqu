import '@testing-library/jest-dom/vitest';
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
