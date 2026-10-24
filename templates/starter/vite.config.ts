/// <reference types="vitest/config" />
import { uiKitStyles } from '@sabahat/react-ui-kit/vite';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

export default defineConfig({
  // Loads only the CSS of the kit components the source imports. `include` lists the Bootstrap classes this app writes itself
  // (className="row g-3"); add an entry when you use a new one. See the kit README, "Loading only the styles you use".
  plugins: [react(), uiKitStyles({ include: __STYLE_INCLUDE__ })],
  test: { environment: 'jsdom', setupFiles: ['./src/setupTests.ts'] },
});
