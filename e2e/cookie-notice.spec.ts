import { expect, test } from '@playwright/test';

// A first visit: no consent record is pre-seeded (see consent.ts for every other spec).
test.describe('cookie notice', () => {
  test('first visit shows the notice, OK hides it for good, and the sidebar link reopens it', async ({ page }) => {
    await page.goto('/');
    const notice = page.getByRole('region', { name: 'Cookies and storage' });
    await expect(notice).toBeVisible();
    await expect(notice).toContainText('No cookies, no tracking.');
    await expect(notice.getByRole('link', { name: 'Privacy and cookies' })).toHaveAttribute('href', '#/privacy');
    // Reserves its height so a focused element is never hidden behind it.
    const offset = await page.evaluate(() => document.documentElement.style.getPropertyValue('--ui-consent-offset'));
    expect(parseFloat(offset)).toBeGreaterThan(40);

    await notice.getByRole('button', { name: 'OK' }).click();
    await expect(notice).toHaveCount(0);
    expect(await page.evaluate(() => document.documentElement.style.getPropertyValue('--ui-consent-offset'))).toBe('');
    expect(await page.evaluate(() => document.cookie)).toBe('');

    await page.reload();
    await expect(page.getByRole('heading', { level: 1, name: 'react-ui-kit' })).toBeVisible();
    await expect(notice).toHaveCount(0);

    await page.getByRole('button', { name: 'Cookies and storage' }).click();
    await expect(notice).toBeVisible();
  });

  test('keyboard: the notice is the first stop, never takes focus on its own, and OK returns focus to the page', async ({ page }) => {
    await page.goto('/');
    const notice = page.getByRole('region', { name: 'Cookies and storage' });
    await expect(notice).toBeVisible();
    expect(await page.evaluate(() => document.activeElement === document.body)).toBe(true);
    await page.keyboard.press('Tab');
    await expect(notice.getByRole('link', { name: 'Privacy and cookies' })).toBeFocused();
    await page.keyboard.press('Tab');
    await expect(notice.getByRole('button', { name: 'OK' })).toBeFocused();
    await page.keyboard.press('Enter');
    await expect(notice).toHaveCount(0);
    await expect(page.locator('main')).toBeFocused();
  });

  test('the Privacy page lists what is stored', async ({ page }) => {
    await page.goto('/#/privacy');
    await expect(page.getByRole('heading', { level: 1, name: 'Privacy' })).toBeVisible();
    for (const key of ['ui:theme', 'docs:profile', 'ui:consent']) await expect(page.getByRole('rowheader', { name: key })).toBeVisible();
  });

  test('a focused control is never hidden behind the notice at the bottom of the page', async ({ page }) => {
    await page.goto('/#/roadmap');
    const notice = page.getByRole('region', { name: 'Cookies and storage' });
    await expect(notice).toBeVisible();
    const top = (await notice.boundingBox())!.y;
    await page.keyboard.press('End');
    const last = page.getByRole('main').getByRole('button').last();
    await last.focus();
    await last.scrollIntoViewIfNeeded();
    const box = (await last.boundingBox())!;
    expect(box.y + box.height).toBeLessThanOrEqual(top);
  });
});
