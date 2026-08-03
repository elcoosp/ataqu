import path from 'path';
import { fileURLToPath } from 'url';
import { defineConfig, type UserConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { tanstackRouter } from '@tanstack/router-plugin/vite';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const defineViteConfig = (options: { appName: string }): UserConfig => {
  const rootDir = path.resolve(__dirname, '../../../');
  const packagesDir = path.resolve(rootDir, 'packages');

  // Build alias map for all @ataqu/* packages we use
  const alias = {
    // Main entry for each package
    '@ataqu/ui': path.resolve(packagesDir, 'ui/src/index.ts'),
    '@ataqu/ui/styles.css': path.resolve(packagesDir, 'ui/src/styles.css'),
    '@ataqu/shared-hooks': path.resolve(packagesDir, 'shared-hooks/src/index.ts'),
    '@ataqu/shared-utils': path.resolve(packagesDir, 'shared-utils/src/index.ts'),
    '@ataqu/shared-stores': path.resolve(packagesDir, 'shared-stores/src/index.ts'),
    '@ataqu/shared-schemas': path.resolve(packagesDir, 'shared-schemas/src/index.ts'),
    '@ataqu/shared-i18n': path.resolve(packagesDir, 'shared-i18n/src/index.ts'),
    '@ataqu/types': path.resolve(packagesDir, 'types/src/index.ts'),
    '@ataqu/api-client': path.resolve(packagesDir, 'api-client/src/index.ts'),
    '@ataqu/test-utils': path.resolve(packagesDir, 'test-utils/src/index.ts'),
    // Add more as needed
  };

  return defineConfig({
    plugins: [
      tanstackRouter({
        target: 'react',
        autoCodeSplitting: true,
        routesDirectory: './src/routes',
        generatedRouteTree: './src/routeTree.gen.ts',
      }),
      react(),
    ],
    server: {
      proxy: {
        '/api': 'http://localhost:8080',
        '/ws': { target: 'ws://localhost:8080', ws: true },
      },
    },
    resolve: {
      alias,
    },
    build: {
      target: 'es2024',
      minify: 'esbuild',
      sourcemap: true,
      rollupOptions: {
        output: {
          manualChunks: (id) => {
            if (id.includes('node_modules')) {
              if (id.includes('react') || id.includes('react-dom')) return 'vendor-react';
              if (id.includes('tanstack')) return 'vendor-tanstack';
              if (id.includes('@radix-ui') || id.includes('lucide') || id.includes('class-variance-authority')) return 'vendor-ui';
              if (id.includes('@xyflow') || id.includes('reactflow') || id.includes('blocknote') || id.includes('recharts')) return 'vendor-heavy';
              return 'vendor';
            }
          },
        },
      },
    },
  });
};
