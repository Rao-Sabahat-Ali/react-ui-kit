/// <reference types="vitest/config" />
import { copyFileSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import react from '@vitejs/plugin-react';
import type { DeprecationOrId } from 'sass';
import { defineConfig, type Plugin } from 'vite';
import { writeStyleSplit } from './scripts/build-style-split.mjs';

// Library mode inlines every url() asset as base64 (1 MB of fonts in styles.css, no unicode-range
// laziness). The lib build points font urls at a placeholder, then this plugin ships the woff2 files
// next to the CSS (dist/fonts) and rewrites the urls to ./fonts/…, which consumer bundlers resolve.
const FONT_PLACEHOLDER = '/__ui_fonts__';
function shipFonts(): Plugin {
  return {
    name: 'ui-ship-fonts',
    apply: 'build',
    closeBundle() {
      const src = resolve(import.meta.dirname, 'src/fonts');
      const out = resolve(import.meta.dirname, 'dist/fonts');
      mkdirSync(out, { recursive: true });
      for (const f of readdirSync(src)) copyFileSync(resolve(src, f), resolve(out, f));
      const css = resolve(import.meta.dirname, 'dist/styles.css');
      writeFileSync(css, readFileSync(css, 'utf8').replaceAll(FONT_PLACEHOLDER, './fonts'));
    },
  };
}

// Besides the unchanged dist/styles.css, emit dist/styles/** (base, Bootstrap partials, utilities, one file per
// component, manifest.json) for apps that load only the styles they use (see `@sabahat/react-ui-kit/vite`).
function splitStyles(): Plugin {
  return {
    name: 'ui-split-styles',
    apply: 'build',
    closeBundle() {
      writeStyleSplit({ root: import.meta.dirname, outDir: resolve(import.meta.dirname, 'dist/styles') });
    },
  };
}

export const scssOptions = {
  loadPaths: [resolve(import.meta.dirname, 'node_modules')],
  quietDeps: true,
  // Bootstrap 5.3 still uses @import and global Sass functions.
  silenceDeprecations: ['import', 'global-builtin', 'color-functions', 'if-function'] as DeprecationOrId[],
};

export default defineConfig({
  plugins: [react(), shipFonts(), splitStyles()],
  css: { preprocessorOptions: { scss: { ...scssOptions, additionalData: `$ui-font-path: '${FONT_PLACEHOLDER}';\n` } } },
  build: {
    outDir: 'dist',
    sourcemap: true,
    emptyOutDir: true,
    lib: {
      entry: { index: resolve(import.meta.dirname, 'src/index.ts'), vite: resolve(import.meta.dirname, 'src/vite/index.ts') },
      formats: ['es'],
      fileName: (_format, entry) => `${entry}.js`,
      cssFileName: 'styles',
    },
    rolldownOptions: {
      external: ['react', 'react-dom', 'react/jsx-runtime', 'react-dom/client', 'vite', /^node:/],
    },
  },
  test: {
    environment: 'jsdom',
    setupFiles: ['./test/setup.ts'],
    css: false,
    include: ['src/**/*.test.{ts,tsx}', 'test/**/*.test.{ts,tsx}', 'docs-app/src/**/*.test.{ts,tsx}'],
    alias: { '@sabahat/react-ui-kit': resolve(import.meta.dirname, 'src/index.ts') },
  },
});
