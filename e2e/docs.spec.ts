import { expect, test, type Page } from '@playwright/test';
import catalog from '../docs-app/src/catalog.generated.json' with { type: 'json' };

const errorsOn = (page: Page) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
  return errors;
};

test('home renders with landmarks @mobile', async ({ page }) => {
  const errors = errorsOn(page);
  await page.goto('/');
  await expect(page.getByRole('heading', { level: 1, name: 'react-ui-kit' })).toBeVisible();
  await expect(page.getByRole('navigation', { name: 'Docs' })).toBeAttached();
  expect(errors).toEqual([]);
});

test('every component page renders live examples without errors', async ({ page }) => {
  test.setTimeout(240_000);
  const errors = errorsOn(page);
  // All specs, including the foundation providers (ThemeProvider, LocaleProvider, FocusTrap, Portal): none may show "not implemented".
  for (const c of catalog.components) {
    await page.goto(`/#/components/${c.slug}`);
    await expect(page.getByRole('heading', { level: 1, name: c.name })).toBeVisible();
    await expect(page.getByText('Not implemented yet'), `${c.name} has no docs examples`).toHaveCount(0);
    await expect(page.getByRole('heading', { level: 3 }).first(), `${c.name} shows no example`).toBeVisible();
  }
  expect(errors).toEqual([]);
});

const BLUEPRINTS = ['analytics-dashboard', 'admin-list-detail', 'overview-index', 'settings', 'sign-in', 'article-detail'];

test.describe('blueprints', () => {
  for (const slug of BLUEPRINTS) {
    for (const [label, size] of [['desktop', { width: 1280, height: 900 }], ['390px', { width: 390, height: 844 }]] as const) {
      test(`${slug} renders at ${label} without errors or horizontal scroll @mobile`, async ({ page }) => {
        const errors = errorsOn(page);
        await page.setViewportSize(size);
        await page.goto(`/#/blueprints/${slug}`);
        await expect(page.locator('main')).toHaveCount(1);
        await expect(page.getByRole('heading', { level: 1 })).toHaveCount(1);
        await expect(page.getByRole('heading', { level: 2, name: 'Pattern' })).toBeVisible();
        const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
        expect(overflow, 'page scrolls horizontally').toBeLessThanOrEqual(0);
        // The framed screen itself must not overflow either.
        const frameOverflow = await page.locator('.docs-blueprint__frame').evaluate((el) => el.scrollWidth - el.clientWidth);
        expect(frameOverflow, 'blueprint frame scrolls horizontally').toBeLessThanOrEqual(0);
        expect(errors).toEqual([]);
      });
    }
  }

  test('listed in the docs navigation and reachable from the index', async ({ page }) => {
    await page.goto('/#/blueprints');
    await expect(page.getByRole('heading', { level: 1, name: 'Blueprints' })).toBeVisible();
    for (const title of ['Analytics dashboard', 'Admin list to detail', 'Overview and index page', 'Settings page', 'Sign in and reset', 'Article and detail page']) {
      await expect(page.getByRole('link', { name: new RegExp(title) }).first()).toBeVisible();
    }
    await page.getByRole('link', { name: /Analytics dashboard/ }).first().click();
    await expect(page.getByRole('heading', { level: 1, name: 'Overview' })).toBeVisible();
  });

  test('dashboard states, density and theme work in the browser', async ({ page }) => {
    await page.goto('/#/blueprints/analytics-dashboard');
    await page.locator('label', { hasText: /^Error$/ }).click();
    await expect(page.getByText('Recent orders did not load')).toBeVisible();
    await page.getByRole('button', { name: 'Retry' }).first().click();
    await page.locator('label', { hasText: /^Ready$/ }).click();
    await expect(page.getByRole('table', { name: 'Recent orders' })).toBeVisible();
    await page.getByRole('button', { name: 'Density' }).click();
    await page.getByRole('menuitemradio', { name: 'Compact' }).click();
    await expect(page.locator('[data-ui-density="compact"]').first()).toBeAttached();
  });
});

test('theme toggle and profile switch apply attributes', async ({ page }) => {
  await page.goto('/');
  const html = page.locator('html');
  const before = await html.getAttribute('data-bs-theme');
  await page.getByRole('button', { name: 'Dark mode' }).click();
  await expect(html).not.toHaveAttribute('data-bs-theme', before ?? '');
  await page.getByRole('combobox', { name: 'App profile' }).click();
  await page.getByRole('option', { name: 'pos' }).click();
  await expect(html).toHaveAttribute('data-ui-profile', 'pos');
});

test('dialog keyboard flow: focus moves in, Escape closes, focus returns', async ({ page }) => {
  await page.goto('/#/components/dialog');
  const trigger = page.getByRole('button', { name: 'Edit user' }).first();
  await trigger.click();
  await expect(page.getByRole('dialog', { name: 'Edit user' })).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await expect(trigger).toBeFocused();
});

test.describe('visual @visual', () => {
  // Baselines are OS-specific; CI (Linux) skips until Linux baselines are generated there.
  test.skip(Boolean(process.env.CI), 'visual baselines are maintained locally');
  for (const theme of ['light', 'dark'] as const) {
    for (const profile of ['saas', 'admin', 'pos', 'game'] as const) {
      test(`buttons and form ${theme} ${profile}`, async ({ page }) => {
        await page.addInitScript(([t, p]) => {
          localStorage.setItem('ui:theme', t!);
          localStorage.setItem('docs:profile', p!);
        }, [theme, profile]);
        await page.goto('/#/profiles');
        await expect(page.getByRole('heading', { level: 1, name: 'App profiles' })).toBeVisible();
        await expect(page.locator('main')).toHaveScreenshot(`profiles-${theme}-${profile}.png`, { fullPage: false });
      });
    }
  }
});
