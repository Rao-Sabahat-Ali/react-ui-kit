import type { Page } from '@playwright/test';

/**
 * The docs show a cookie notice on a first visit. Tests that are about something else start as a returning visitor:
 * the notice has been acknowledged (policy version 2026-10, as in docs-app/src/App.tsx), so it does not cover the page
 * or animate while screenshots and computed styles are taken. cookie-notice.spec.ts covers the notice itself.
 */
export const acknowledgeNotice = (page: Page) =>
  page.addInitScript(() => {
    try {
      localStorage.setItem('ui:consent', JSON.stringify({ version: '2026-10', decidedAt: new Date().toISOString(), mode: 'notice', categories: { necessary: true } }));
    } catch {
      // storage unavailable: the notice shows, tests that do not care still run
    }
  });
