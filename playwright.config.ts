import { defineConfig, devices } from '@playwright/test';

/** Port of the built docs preview; override with E2E_PORT when another checkout already uses 5181. */
const port = Number(process.env.E2E_PORT ?? 5181);

/** E2E smoke + visual tests against the built docs app (npm run build:docs). */
export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? 'github' : 'list',
  use: { baseURL: `http://localhost:${port}`, trace: 'retain-on-failure' },
  // Visual baselines are per-OS; they live next to the spec (…-snapshots/…-darwin.png).
  expect: { toHaveScreenshot: { maxDiffPixelRatio: 0.01, animations: 'disabled' } },
  projects: [
    { name: 'desktop', use: { ...devices['Desktop Chrome'] } },
    { name: 'mobile', use: { ...devices['Pixel 7'] }, grep: /@mobile/ },
  ],
  webServer: {
    command: `npx vite preview --config vite.docs.config.ts --port ${port} --strictPort`,
    port,
    reuseExistingServer: !process.env.CI,
  },
});
