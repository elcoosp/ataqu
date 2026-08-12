import { defineViteConfig } from '@ataqu/vite-preset';

export default defineViteConfig({
  appName: 'vista',
  build: {
    target: 'esnext',
  },
  esbuild: {
    target: 'esnext',
  },
});
