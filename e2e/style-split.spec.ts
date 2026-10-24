import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { expect, test } from '@playwright/test';
import * as sass from 'sass';
import catalog from '../docs-app/src/catalog.generated.json' with { type: 'json' };
import { collectClassTokens, importedComponents } from '../scripts/build-style-split.mjs';
import { scanDirectories, selectStyleFiles, type StyleManifest } from '../src/vite';

/**
 * Proof that loading only the styles a page needs renders exactly like the full stylesheet: for every
 * component docs page, the page's CSS is swapped for the pieces `@sabahat/react-ui-kit/vite` would load for
 * (docs shell + that page's example imports + the Bootstrap classes its example code uses) and the computed style of
 * every element must be identical.
 */
const root = join(import.meta.dirname, '..');
const stylesDir = join(root, 'dist/styles');
const assetsDir = join(root, 'docs-dist/assets');
const ready = existsSync(join(stylesDir, 'manifest.json')) && existsSync(assetsDir);

test.describe('split styles render identically @split', () => {
  test.describe.configure({ retries: 1 }); // a few examples show the current time
  test.skip(!ready, 'run `npm run build` and `npm run build:docs` first');
  test.setTimeout(240_000);

  const manifest = (ready ? JSON.parse(readFileSync(join(stylesDir, 'manifest.json'), 'utf8')) : {}) as StyleManifest;
  const shell = ready ? [...scanDirectories([join(root, 'docs-app/src')]).names] : [];
  const componentNames = Object.keys(manifest.components ?? {});
  const fonts = ready ? readdirSync(assetsDir).filter((f) => f.endsWith('.woff2')) : [];

  // The docs app bundles its own stylesheet (docs.scss) after the kit's; it stays untouched.
  const docsCss = ready ? sass.compile(join(root, 'docs-app/src/docs.scss'), { loadPaths: [join(root, 'node_modules')], quietDeps: true }).css : '';

  const cssFor = (names: string[], include: string[]) => {
    const { files } = selectStyleFiles(manifest, { names, include });
    return files
      .map((f) => readFileSync(join(stylesDir, f), 'utf8'))
      .concat(docsCss)
      .join('\n')
      .replace(/\.\.\/fonts\/([\w-]+)\.woff2/g, (_m, name: string) => fonts.find((f) => f.startsWith(`${name}-`)) ?? `${name}.woff2`);
  };

  // `shell`: the whole page with the styles of the docs shell + the component. `isolated`: only the styles of the
  // component under test (and what it needs) are loaded, and only the example previews are compared.
  for (const mode of ['shell', 'isolated'] as const) {
    for (const c of catalog.components.filter((x) => x.status !== 'specified')) {
      test(`${c.name} page (${mode})`, async ({ browser, baseURL }) => {
      const examples = join(root, 'src/components', c.name, `${c.name}.examples.tsx`);
      const imported = existsSync(examples) ? [...importedComponents(readFileSync(examples, 'utf8'), examples, componentNames)] : [];
      // Bootstrap classes the example code itself uses (`d-flex gap-3`) are the app's direct usage: `include`.
      const direct = existsSync(examples) ? [...collectClassTokens(readFileSync(examples, 'utf8'), examples).exact] : [];
      const css = cssFor([...(mode === 'shell' ? shell : []), c.name, ...imported], direct);

      // A fresh context per run: the swapped stylesheet must never come from a cache of the full one.
      const computed = async (swap: boolean) => {
        const context = await browser.newContext({ baseURL, viewport: { width: 1280, height: 800 }, reducedMotion: 'reduce' });
        try {
          const page = await context.newPage();
          if (swap) await page.route(/\/assets\/index-[^/]+\.css$/, (route) => route.fulfill({ contentType: 'text/css', body: css }));
          await page.goto(`/#/components/${c.slug}`);
          await expect(page.getByRole('heading', { level: 1, name: c.name })).toBeVisible();
          await page.evaluate(() => document.fonts.ready);
          await page.waitForTimeout(300);
          const scope = mode === 'shell' ? 'body *' : '.docs-example__preview *';
          return await page.evaluate((selector) => {
            return [...document.querySelectorAll(selector)].map((el) => {
              const cs = getComputedStyle(el);
              const animated = cs.animationName !== 'none';
              const props: Record<string, string> = {};
              for (const key of cs) {
                if (animated && /^(transform|translate|rotate|scale|opacity)/.test(key)) continue;
                if (!key.startsWith('--')) props[key] = cs.getPropertyValue(key);
              }
              return { el: `${el.tagName.toLowerCase()}.${el.getAttribute('class') ?? ''}`.slice(0, 120), props };
            });
          }, scope);
        } finally {
          await context.close();
        }
      };
      const full = await computed(false);
      const split = await computed(true);
      expect(split.length, 'element count').toBe(full.length);
      test.skip(full.length === 0, 'the page has no example preview to compare');
      const diffs: string[] = [];
      full.forEach((f, i) => {
        const s = split[i]!;
        for (const key in f.props) {
          // Custom properties (`--bs-carousel-*`, `--bs-breakpoint-*`) are declared by the partial that uses them; what they
          // resolve to shows up in the regular properties compared here.
          if (key.startsWith('--')) continue;
          // `.visually-hidden` is absolutely positioned at its static position, which depends on the layout above it.
          if (/visually-hidden/.test(f.el) && /^(top|bottom|left|right|inset)/.test(key)) continue;
          if (f.props[key] !== s.props[key]) diffs.push(`${f.el} { ${key}: ${f.props[key]} -> ${s.props[key]} }`);
        }
      });
      expect(diffs.slice(0, 10), 'computed styles differ between the full stylesheet and the split pieces').toEqual([]);
    });
   }
  }
});
