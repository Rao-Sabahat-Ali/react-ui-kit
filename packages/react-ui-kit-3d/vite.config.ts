import { resolve } from 'node:path';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

/** Library build of @sabahat/react-ui-kit-3d: dist/index.js + dist/styles.css. three is never bundled. */
export default defineConfig({
  plugins: [react()],
  css: { preprocessorOptions: { scss: { quietDeps: true } } },
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
      external: ['react', 'react-dom', 'react/jsx-runtime', '@sabahat/react-ui-kit', 'three', /^three\//],
    },
  },
});
