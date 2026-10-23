import { resolve } from 'node:path';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';
import { scssOptions } from './vite.config';

/** Docs web app: live catalogue of every component for humans and agents. */
export default defineConfig({
  root: resolve(import.meta.dirname, 'docs-app'),
  base: './',
  plugins: [react()],
  css: { preprocessorOptions: { scss: scssOptions } },
  resolve: { alias: { '@sabahat/react-ui-kit': resolve(import.meta.dirname, 'src/index.ts') } },
  build: { outDir: resolve(import.meta.dirname, 'docs-dist'), emptyOutDir: true },
  server: { port: 5180 },
});
