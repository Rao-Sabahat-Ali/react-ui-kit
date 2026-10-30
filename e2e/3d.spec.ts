import { expect, test, type Page } from '@playwright/test';
import { acknowledgeNotice } from './consent';

// Real rendering of @sabahat/react-ui-kit-3d in Chromium with software WebGL (SwiftShader), against the docs app.
test.use({ launchOptions: { args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] } });

const SCENES = '#/components/scene-3d';
const scene = (page: Page, index: number) => page.locator('.ui-scene3d').nth(index);
const HERO = 0;
const TURNTABLE = 1;
const POSTER_DEMO = 5;

async function ready(page: Page, index: number, state = 'ready') {
  await expect(scene(page, index)).toHaveAttribute('data-state', /./); // the lazy demo replaced its placeholder
  await scene(page, index).scrollIntoViewIfNeeded();
  await expect(scene(page, index)).toHaveAttribute('data-state', state, { timeout: 20_000 });
}

/** Fraction of the element's pixels that are not near-white paper (ink, kraft, accent). */
async function inkPixels(page: Page, index: number): Promise<number> {
  const png = (await scene(page, index).screenshot()).toString('base64');
  return page.evaluate(async (b64) => {
    const img = new Image();
    img.src = `data:image/png;base64,${b64}`;
    await img.decode();
    const c = document.createElement('canvas');
    c.width = img.width;
    c.height = img.height;
    const g = c.getContext('2d')!;
    g.drawImage(img, 0, 0);
    const d = g.getImageData(0, 0, c.width, c.height).data;
    let ink = 0;
    for (let i = 0; i < d.length; i += 4) if (d[i]! + d[i + 1]! + d[i + 2]! < 600) ink++;
    return ink;
  }, png);
}

test.beforeEach(async ({ page }) => {
  await acknowledgeNotice(page);
  await page.addInitScript(() => localStorage.setItem('ui:theme', 'light'));
});

test('the canvas renders non-blank pixels (sheet look: ink edges and kraft parts on white)', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto(SCENES);
  await ready(page, HERO);
  await expect(page.locator('.ui-scene3d').nth(HERO).locator('canvas')).toHaveAttribute('role', 'img');
  expect(await inkPixels(page, HERO)).toBeGreaterThan(2000);
});

test('the poster stays in the same box when WebGL is disabled, and three is never downloaded', async ({ page }) => {
  await page.addInitScript(() => {
    const original = HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext = function (type: string, ...rest: unknown[]) {
      return /webgl/.test(type) ? null : (original as (...a: unknown[]) => unknown).call(this, type, ...rest);
    } as typeof original;
  });
  const requested: string[] = [];
  page.on('request', (r) => requested.push(r.url()));
  await page.goto(SCENES);
  await ready(page, HERO, 'error');
  const box = scene(page, HERO);
  await expect(box.locator('.ui-scene3d__poster svg')).toBeVisible();
  await expect(box.getByRole('img', { name: /flat-pack stool/ })).toHaveCount(1); // the poster carries the text alternative
  await expect(box.locator('canvas')).toHaveAttribute('aria-hidden', 'true');
  const poster = await box.locator('.ui-scene3d__poster').boundingBox();
  const canvas = await box.locator('canvas').boundingBox();
  expect(poster).toEqual(canvas);
  expect(requested.filter((u) => /three\.module/.test(u))).toEqual([]);
});

test('reduced motion draws one still frame of the finished scene: no animation, no Pause button', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto(SCENES);
  await ready(page, HERO);
  await expect(scene(page, HERO)).not.toHaveAttribute('data-animating', /.*/);
  await expect(scene(page, HERO).getByRole('button', { name: /pause|play/i })).toHaveCount(0);
  const first = await scene(page, HERO).screenshot();
  await page.waitForTimeout(900);
  expect(Buffer.compare(first, await scene(page, HERO).screenshot())).toBe(0);
});

test('assemble and auto-rotate animate by default and Pause stops them', async ({ page }) => {
  await page.goto(SCENES);
  await ready(page, HERO);
  await expect(scene(page, HERO)).toHaveAttribute('data-animating', '');
  const pause = scene(page, HERO).getByRole('button', { name: 'Pause animation' });
  await pause.click();
  await expect(scene(page, HERO)).not.toHaveAttribute('data-animating', /.*/, { timeout: 5000 });
  await expect(scene(page, HERO).getByRole('button', { name: 'Play animation' })).toBeVisible();
  const a = await scene(page, HERO).screenshot();
  await page.waitForTimeout(600);
  expect(Buffer.compare(a, await scene(page, HERO).screenshot())).toBe(0);
  await page.evaluate(() => sessionStorage.removeItem('ui-scene3d:paused'));
});

test('keyboard orbit: arrows turn the view, Home resets it, only while the canvas has focus', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto(SCENES);
  await ready(page, TURNTABLE);
  const view = scene(page, TURNTABLE).getByRole('application', { name: /shelf/i });
  const frame = () => scene(page, TURNTABLE).locator('canvas').screenshot();
  const unfocused = await frame();

  await page.keyboard.press('ArrowRight'); // nothing is focused: no effect
  await page.waitForTimeout(150);
  expect(Buffer.compare(unfocused, await frame())).toBe(0);

  await view.focus();
  const home = await frame(); // includes the focus ring
  await page.keyboard.press('ArrowRight');
  await page.keyboard.press('ArrowRight');
  await page.keyboard.press('ArrowUp');
  await page.waitForTimeout(150);
  const turned = await frame();
  expect(Buffer.compare(home, turned)).not.toBe(0);

  await page.keyboard.press('Home');
  await page.waitForTimeout(150);
  expect(Buffer.compare(home, await frame())).toBe(0);

  await page.keyboard.press('Tab'); // Tab leaves the canvas (next stop: Reset view)
  await expect(scene(page, TURNTABLE).getByRole('button', { name: 'Reset view' })).toBeFocused();
});

test('pointer drag orbits the turntable', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto(SCENES);
  await ready(page, TURNTABLE);
  const canvas = scene(page, TURNTABLE).locator('canvas');
  const before = await canvas.screenshot();
  const box = (await canvas.boundingBox())!;
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.down();
  await page.mouse.move(box.x + box.width / 2 + 90, box.y + box.height / 2, { steps: 6 });
  await page.mouse.up();
  await page.waitForTimeout(150);
  expect(Buffer.compare(before, await canvas.screenshot())).not.toBe(0);
});

test('poster fallback example: a throwing model keeps the poster and reports onError', async ({ page }) => {
  await page.goto(SCENES);
  await ready(page, POSTER_DEMO, 'error');
  await expect(page.locator('.ui-message__body', { hasText: 'This model failed to build.' })).toBeVisible();
  await expect(scene(page, POSTER_DEMO).locator('.ui-scene3d__poster svg')).toBeVisible();
});

test('three is requested only after a scene nears the viewport', async ({ page }) => {
  const requested: string[] = [];
  page.on('request', (r) => requested.push(r.url()));
  await page.setViewportSize({ width: 1280, height: 600 });
  await page.goto('#/3d');
  await expect(page.getByRole('heading', { level: 1, name: 'Depth (3D)' })).toBeVisible();
  await expect(scene(page, 0)).toHaveAttribute('data-state', 'poster');
  const top = await scene(page, 0).evaluate((el) => el.getBoundingClientRect().top);
  expect(top, 'the first scene starts more than 200px below the fold').toBeGreaterThan(600 + 200);
  await page.waitForTimeout(800);
  expect(requested.filter((u) => /three\.module|GLTFLoader/.test(u))).toEqual([]);

  await scene(page, 0).scrollIntoViewIfNeeded();
  await expect(scene(page, 0)).toHaveAttribute('data-state', 'ready', { timeout: 20_000 });
  expect(requested.filter((u) => /three\.module/.test(u)).length).toBe(1);
  expect(requested.filter((u) => /GLTFLoader/.test(u))).toEqual([]); // only loaded for Model3D src
});
