import { defineConfig } from 'vitest/config';
import { defineViteConfig } from '@ataqu/vite-preset';

export default defineConfig({
  ...defineViteConfig({ appName: 'vista' }),
  test: {
    environment: 'jsdom',
    include: ['src/**/*.test.{ts,tsx}'],
    exclude: ['node_modules', 'dist', 'e2e/**'],
  },
});
