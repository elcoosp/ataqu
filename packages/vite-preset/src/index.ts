import path from 'path';
import { fileURLToPath } from 'url';
import { defineConfig, type UserConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { tanstackRouter } from '@tanstack/router-plugin/vite';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const defineViteConfig = (options: { appName: string }): UserConfig => {
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
    // No aliases! Let pnpm workspace + package.json exports handle resolution.
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
