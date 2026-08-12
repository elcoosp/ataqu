import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'browser',
    provider: 'playwright',
    setupFiles: ['./src/test-setup.ts'],
    globals: true,
    include: ['src/**/*.{test,spec}.{ts,tsx}'],
    browser: {
      enabled: true,
      name: 'chromium',
      headless: true,
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@ataqu/ui': path.resolve(__dirname, '../../packages/ui/src'),
    },
  },
});
