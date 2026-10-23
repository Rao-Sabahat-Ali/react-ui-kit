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

test('every implemented component page renders without errors', async ({ page }) => {
  test.setTimeout(180_000);
  const errors = errorsOn(page);
  for (const c of catalog.components.filter((x) => x.status !== 'specified')) {
    await page.goto(`/#/components/${c.slug}`);
    await expect(page.getByRole('heading', { level: 1, name: c.name })).toBeVisible();
  }
  expect(errors).toEqual([]);
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
