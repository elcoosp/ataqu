import path from 'path';
import { fileURLToPath } from 'url';
import { defineConfig, type UserConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { tanstackRouter } from '@tanstack/router-plugin/vite';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const APP_PORTS: Record<string, number> = {
  aegis: 5173,
  cinq: 5174,
  dial: 5175,
  pivot: 5176,
  spark: 5177,
  tempo: 5178,
  sond: 5179,
  vault: 5180,
  pause: 5181,
  vista: 5182,
};

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
      tailwindcss(),
    ],
    resolve: {
      preserveSymlinks: true, // Required for Vite 8 / Rolldown in pnpm workspaces
    },
    publicDir: path.resolve(packagesDir, 'shared-assets/public'),
    server: {
      port: APP_PORTS[options.appName] || 5173,
      strictPort: true,
      proxy: {
        '/api': 'http://localhost:8080',
        '/ws': { target: 'ws://localhost:8080', ws: true },
      },
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
