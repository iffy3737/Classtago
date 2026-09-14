import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig} from 'vite';

export default defineConfig(({ mode }) => {
  const mobileBuild = mode === 'mobile';
  return {
    plugins: [react()],
    base: mobileBuild ? './' : '/',
    build: mobileBuild ? { outDir: 'mobile-dist', emptyOutDir: true } : undefined,
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      // AI Studio's web preview watches port 3000. Keep Vite as the foreground
      // preview process and proxy EDUNIXO's real Express API sidecar on 3001.
      host: true,
      port: 3000,
      strictPort: true,
      proxy: {
        '/api': {
          target: 'http://127.0.0.1:3001',
          changeOrigin: true,
          secure: false,
        },
      },
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      hmr: process.env.DISABLE_HMR !== 'true',
      watch: process.env.DISABLE_HMR === 'true' ? null : {
        ignored: [
          '**/*.md',
          '**/*.txt',
          '**/*.sql',
          '**/*.csv',
          '**/*.py',
          '**/*.cjs',
          '**/*.patch',
          '**/tools/**',
          '**/supabase/migrations/**',
        ],
      },
    },
  };
});
