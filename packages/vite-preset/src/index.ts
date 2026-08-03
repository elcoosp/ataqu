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
      alias: [
        // Exact match for the main entry
        { find: /^@ataqu\/ui$/, replacement: path.resolve(packagesDir, 'ui/src/index.ts') },
        // Exact match for styles.css subpath
        { find: /^@ataqu\/ui\/styles\.css$/, replacement: path.resolve(packagesDir, 'ui/src/styles.css') },
        // For other packages, generic alias (but we'll keep it as a fallback)
        // But we want to avoid prefix matching for ui, so we add a generic after.
        // Actually, we can use a regex that doesn't match ui subpaths.
        // Simpler: we'll map all @ataqu/* to packages/* but the UI-specific ones will be caught first.
        { find: /^@ataqu\/(.+)$/, replacement: path.resolve(packagesDir, '$1/src/index.ts') },
      ],
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
