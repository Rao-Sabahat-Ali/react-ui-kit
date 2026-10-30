import { resolve } from 'node:path';
import react from '@vitejs/plugin-react';
import { defineConfig, type Plugin } from 'vite';
import { scssOptions } from './vite.config';

/** Preloads the latin font (as the kit's _fonts.scss advises) so the first paint does not reflow when it swaps in. */
const docsPreloads = (): Plugin => ({
  name: 'docs-preloads',
  transformIndexHtml: {
    order: 'post',
    handler: (_html, ctx) => {
      const bundle = ctx.bundle ?? {};
      const tags: { tag: string; attrs?: Record<string, string | boolean>; children?: string; injectTo: 'head-prepend' | 'head' }[] = [];
      const font = Object.keys(bundle).find((name) => /albert-sans-latin-wght-normal-.*\.woff2$/.test(name));
      if (font) tags.push({ tag: 'link', attrs: { rel: 'preload', as: 'font', type: 'font/woff2', crossorigin: '', href: `./${font}` }, injectTo: 'head-prepend' });

      return tags;
    },
  },
});

/** Docs web app: live catalogue of every component for humans and agents. */
export default defineConfig({
  root: resolve(import.meta.dirname, 'docs-app'),
  base: './',
  plugins: [react(), docsPreloads()],
  css: { preprocessorOptions: { scss: scssOptions } },
  resolve: {
    alias: {
      '@sabahat/react-ui-kit-3d': resolve(import.meta.dirname, 'packages/react-ui-kit-3d/src/index.ts'),
      '@sabahat/react-ui-kit': resolve(import.meta.dirname, 'src/index.ts'),
    },
  },
  build: { outDir: resolve(import.meta.dirname, 'docs-dist'), emptyOutDir: true },
  server: { port: 5180 },
});
