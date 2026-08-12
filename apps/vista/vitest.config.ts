import { defineViteConfig } from '@ataqu/vite-preset';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  ...defineViteConfig({ appName: 'vista' }),
  test: {
    environment: 'jsdom',
    include: ['src/**/*.test.{ts,tsx}'],
    exclude: ['node_modules', 'dist', 'e2e/**'],
  },
});
