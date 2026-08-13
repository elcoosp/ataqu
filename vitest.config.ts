import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react-swc';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  plugins: [
    react({
      plugins: [['@lingui/swc-plugin', {}]],
    }),
  ],
  resolve: {
    dedupe: ['react', 'react-dom', '@lingui/core', '@lingui/react'],
    alias: {
      'react': path.resolve(__dirname, 'node_modules/react'),
      'react-dom': path.resolve(__dirname, 'node_modules/react-dom'),
      'react/jsx-dev-runtime': path.resolve(__dirname, 'node_modules/react/jsx-dev-runtime.js'),
      'react/jsx-runtime': path.resolve(__dirname, 'node_modules/react/jsx-runtime.js'),
      '@lingui/core': path.resolve(__dirname, 'node_modules/@lingui/core'),
      '@lingui/react': path.resolve(__dirname, 'node_modules/@lingui/react'),
      '@ataqu/shared-i18n': path.resolve(__dirname, 'packages/shared-i18n/src/index'),
      '@ataqu/shared-utils': path.resolve(__dirname, 'packages/shared-utils/src/index'),
      '@ataqu/shared-hooks': path.resolve(__dirname, 'packages/shared-hooks/src/index'),
      '@ataqu/shared-stores': path.resolve(__dirname, 'packages/shared-stores/src/index'),
      '@ataqu/types': path.resolve(__dirname, 'packages/types/src/index'),
      '@ataqu/api-client': path.resolve(__dirname, 'packages/api-client/src/index'),
      '@ataqu/ui': path.resolve(__dirname, 'packages/ui/src/index'),
    },
  },
  optimizeDeps: {
    include: ['react', 'react-dom', 'react/jsx-dev-runtime', 'react/jsx-runtime']
  },
  test: {
    environment: 'happy-dom',
    include: ['**/*.{test,spec}.?(c|m)[jt]s?(x)'],
    exclude: ['**/node_modules/**', '**/.git/**', '**/e2e/**', '**/playwright/**'],
    globals: true,
    setupFiles: ['./vitest.setup.ts'],
  },
});
