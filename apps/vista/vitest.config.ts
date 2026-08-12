import { defineViteConfig } from '@ataqu/vite-preset';
import path from 'node:path';
import { defineConfig } from 'vitest/config';

const baseConfig = defineViteConfig({ appName: 'vista' });

export default defineConfig({
  ...baseConfig,
  esbuild: {
    target: 'esnext',
  },
  resolve: {
    ...baseConfig.resolve,
    alias: {
      ...(baseConfig.resolve?.alias as Record<string, string> | undefined),
      '@lingui/react/macro': path.resolve(__dirname, 'src/lingui-mock.tsx'),
      '@lingui/macro': path.resolve(__dirname, 'src/lingui-mock.tsx'),
    },
  },
  test: {
    environment: 'jsdom',
    include: ['src/**/*.test.{ts,tsx}'],
    exclude: ['node_modules', 'dist', 'e2e/**'],
  },
});
