/// <reference types="vitest/config" />
import { resolve } from 'node:path';
import react from '@vitejs/plugin-react';
import type { DeprecationOrId } from 'sass';
import { defineConfig } from 'vite';

export const scssOptions = {
  loadPaths: [resolve(import.meta.dirname, 'node_modules')],
  quietDeps: true,
  // Bootstrap 5.3 still uses @import and global Sass functions.
  silenceDeprecations: ['import', 'global-builtin', 'color-functions', 'if-function'] as DeprecationOrId[],
};

export default defineConfig({
  plugins: [react()],
  css: { preprocessorOptions: { scss: scssOptions } },
  build: {
    outDir: 'dist',
    sourcemap: true,
    emptyOutDir: true,
    lib: {
      entry: resolve(import.meta.dirname, 'src/index.ts'),
      formats: ['es'],
      fileName: () => 'index.js',
      cssFileName: 'styles',
    },
    rolldownOptions: {
      external: ['react', 'react-dom', 'react/jsx-runtime', 'react-dom/client'],
    },
  },
  test: {
    environment: 'jsdom',
    setupFiles: ['./test/setup.ts'],
    css: false,
    include: ['src/**/*.test.{ts,tsx}', 'test/**/*.test.{ts,tsx}'],
  },
});
