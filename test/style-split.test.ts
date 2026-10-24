import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import * as sass from 'sass';
import { beforeAll, describe, expect, it } from 'vitest';
import { bootstrapOrder, buildStyleSplit, splitTopLevel, collectClassTokens, definedClasses, importedComponents, normalizeClass, type StyleSplitManifest } from '../scripts/build-style-split.mjs';
import { selectStyleFiles, type StyleManifest } from '../src/vite';

const root = join(import.meta.dirname, '..');

/** Rules of expanded css, comments stripped, whitespace collapsed; `@media` blocks are flattened to one rule each. */
function rules(css: string): string[] {
  return splitTopLevel(css).filter((unit) => !unit.startsWith('@charset')).flatMap((unit) => {
    if (!unit.startsWith('@media')) return [unit.replace(/\s+/g, ' ')];
    const head = unit.slice(0, unit.indexOf('{')).trim();
    const inner = unit.slice(unit.indexOf('{') + 1, unit.lastIndexOf('}'));
    return splitTopLevel(inner).map((r) => `${head} { ${r.replace(/\s+/g, ' ')} }`);
  });
}
const multiset = (items: string[]) => {
  const m = new Map<string, number>();
  for (const i of items) m.set(i, (m.get(i) ?? 0) + 1);
  return m;
};

describe('class token collection', () => {
  it('collects exact tokens from class names, constants and render props, but not from other attributes', () => {
    const { exact } = collectClassTokens(
      `const SIZE = { sm: 'btn-sm' };
       export const A = () => <div role="alert" className="card p-3" data-x="table" render={() => <i className="d-flex" />} />;`,
    );
    expect([...exact].sort()).toEqual(['btn-sm', 'card', 'd-flex', 'p-3']);
  });

  it('turns template literals into prefix/suffix patterns', () => {
    const { exact, patterns } = collectClassTokens('const c = `btn btn-${v} border-${tone}-subtle ${x}-sm`;');
    expect([...exact]).toEqual(['btn']);
    expect(patterns).toEqual([
      { prefix: 'btn-', suffix: '' },
      { prefix: 'border-', suffix: '-subtle' },
    ]);
  });

  it('ignores comparisons and non-class calls', () => {
    const { exact } = collectClassTokens(`if (kind === 'table') el.setAttribute('role', 'row'); cx('ui-x');`);
    expect([...exact]).toEqual(['ui-x']);
  });

  it('normalises responsive variants', () => {
    expect(normalizeClass('col-md-6')).toBe('col-6');
    expect(normalizeClass('d-lg-none')).toBe('d-none');
    expect(normalizeClass('btn-sm')).toBe('btn');
    expect(normalizeClass('mt-3')).toBe('mt-3');
  });

  it('reads defined classes, owned ones only when asked', () => {
    const css = '.a{} .b .c{} .d:hover{} .e:not(.f){}';
    expect([...definedClasses(css)].sort()).toEqual(['a', 'b', 'c', 'd', 'e']);
    expect([...definedClasses(css, { owned: true })].sort()).toEqual(['a', 'd', 'e']);
  });

  it('counts rendered components, not hooks, types or constants', () => {
    const names = ['Button', 'KeyFilter', 'Menu'];
    const src = `import { Button } from '../Button/Button';
      import { useKeyFilter } from '../KeyFilter/useKeyFilter';
      import type { MenuItem } from '../Menu/types';
      import { DEFAULT_X } from '../Menu/Menu';`;
    expect([...importedComponents(src, 'x.tsx', names)]).toEqual(['Button']);
  });
});

describe('style split build', () => {
  let files: Map<string, string>;
  let manifest: StyleSplitManifest;
  beforeAll(() => {
    ({ files, manifest } = buildStyleSplit({ root, minify: false }));
  }, 120_000);

  it('emits base, one file per Bootstrap partial, per utility and per component stylesheet', () => {
    expect(files.has('base.css')).toBe(true);
    for (const p of ['buttons', 'forms', 'modal', 'grid', 'close']) expect(files.has(`bootstrap/${p}.css`)).toBe(true);
    expect(files.has('utilities/display.css')).toBe(true);
    expect(files.has('utilities/display@md.css')).toBe(true);
    const scss = Object.values(manifest.components).filter((c) => c.css);
    expect(scss.length).toBeGreaterThanOrEqual(100);
    for (const c of scss) expect(files.has(c.css as string)).toBe(true);
    for (const f of manifest.order) expect(files.has(f), f).toBe(true);
  });

  it('orders base first, Bootstrap partials in Bootstrap order, then utilities, then components alphabetically', () => {
    const order = manifest.order;
    expect(order[0]).toBe('base.css');
    const idx = (f: string) => order.indexOf(f);
    const partials = bootstrapOrder(root).filter((p) => manifest.bootstrap[p]);
    expect(order.filter((f) => f.startsWith('bootstrap/'))).toEqual(partials.map((p) => `bootstrap/${p}.css`));
    expect(idx('bootstrap/forms.css')).toBeLessThan(idx('bootstrap/buttons.css'));
    expect(idx('bootstrap/buttons.css')).toBeLessThan(idx('bootstrap/modal.css'));
    const lastBootstrap = Math.max(...order.map((f, i) => (f.startsWith('bootstrap/') ? i : -1)));
    const firstUtility = order.findIndex((f) => f.startsWith('utilities/'));
    const firstComponent = order.findIndex((f) => f.startsWith('components/'));
    expect(lastBootstrap).toBeLessThan(firstUtility);
    expect(Math.max(...order.map((f, i) => (f.startsWith('utilities/') ? i : -1)))).toBeLessThan(firstComponent);
    // Bootstrap emits every key's base rules before any breakpoint block; so do the pieces.
    const utilities = order.filter((f) => f.startsWith('utilities/'));
    const firstResponsive = utilities.findIndex((f) => f.includes('@'));
    expect(utilities.slice(0, firstResponsive).every((f) => !f.includes('@'))).toBe(true);
    expect(utilities.slice(firstResponsive).every((f) => f.includes('@'))).toBe(true);
    expect(utilities.indexOf('utilities/margin@sm.css')).toBeLessThan(utilities.indexOf('utilities/display@md.css'));
    const comps = order.filter((f) => f.startsWith('components/'));
    expect(comps).toEqual([...comps].sort((a, b) => a.localeCompare(b)));
  });

  it('derives needs from TSX imports and class usage', () => {
    const c = manifest.components;
    expect(c.Button?.needs).toEqual(expect.arrayContaining(['Icon', 'Spinner']));
    expect(c.Button?.bootstrap).toContain('buttons');
    expect(c.Spinner?.bootstrap).toContain('spinners'); // `spinner-${size}` has no owner stem
    expect(manifest.bootstrap['button-group']?.needs).toContain('buttons'); // `.btn-group-sm > .btn` extends `.btn-sm`
    expect(c.Dialog?.bootstrap).toEqual(expect.arrayContaining(['modal', 'close']));
    expect(c.Toast?.bootstrap).toEqual(expect.arrayContaining(['toasts', 'close']));
    expect(c.Tag?.utilities).toContain('subtle-border-color'); // `border-${tone}-subtle`
    expect(c.ConfirmDialog?.needs).toEqual(expect.arrayContaining(['Button', 'Dialog']));
    expect(c.InputText?.needs).not.toContain('KeyFilter'); // only a hook is imported
    expect(c.ThemeToggle?.css).toBeNull();
    expect(c.ThemeToggle?.needs).toEqual(expect.arrayContaining(['Button', 'Menu']));
  });

  it('maps exported value names to their component, ignoring types and hooks', () => {
    expect(manifest.exports.IndexItem).toBe('IndexList');
    expect(manifest.exports.Button).toBe('Button');
    expect(manifest.exports.ButtonProps).toBeUndefined();
    expect(manifest.exports.useTheme).toBeUndefined();
  });

  it('keeps foundation code (theme, hooks, utils) free of Bootstrap class dependencies', () => {
    expect(manifest.foundation).toEqual({});
  });

  it('has the same rules as the monolithic stylesheet (split is a partition, nothing lost or invented)', () => {
    const full = rules(sass.compile(join(root, 'src/styles/index.scss'), { loadPaths: [join(root, 'node_modules')], quietDeps: true, silenceDeprecations: ['import', 'global-builtin', 'color-functions', 'if-function'] }).css);
    const split = [...files.values()].flatMap(rules);
    const a = multiset(full);
    const b = multiset(split);
    const missing = [...a].filter(([r, n]) => (b.get(r) ?? 0) < n).map(([r]) => r.slice(0, 120));
    const extra = [...b].filter(([r, n]) => (a.get(r) ?? 0) < n).map(([r]) => r.slice(0, 120));
    expect(missing).toEqual([]);
    expect(extra).toEqual([]);
  }, 120_000);

  it('selects files in cascade order for an app importing a few components', () => {
    const m = manifest as unknown as StyleManifest;
    const { files: list, components } = selectStyleFiles(m, { names: ['Toast', 'Button', 'useTheme'] });
    expect(list[0]).toBe('base.css');
    expect(components).toEqual(expect.arrayContaining(['Toast', 'Button', 'Icon', 'Spinner']));
    expect(list).toEqual([...list].sort((x, y) => m.order.indexOf(x) - m.order.indexOf(y)));
    expect(list.indexOf('bootstrap/buttons.css')).toBeLessThan(list.indexOf('components/Button.css'));
    expect(list).not.toContain('components/DataTable.css');
  });
});

describe('built output', () => {
  const dist = join(root, 'dist');
  const built = existsSync(join(dist, 'styles/manifest.json'));
  it.skipIf(!built)('ships the split files and leaves styles.css complete', () => {
    const manifest = JSON.parse(readFileSync(join(dist, 'styles/manifest.json'), 'utf8')) as StyleSplitManifest;
    for (const f of manifest.order) expect(existsSync(join(dist, 'styles', f)), f).toBe(true);
    expect(existsSync(join(dist, 'vite.js'))).toBe(true);
    expect(existsSync(join(dist, 'types/vite/index.d.ts'))).toBe(true);
    expect(existsSync(join(dist, 'fonts'))).toBe(true);

    // dist/styles.css still defines every class any split file defines, and vice versa.
    const full = definedClasses(readFileSync(join(dist, 'styles.css'), 'utf8'));
    const split = new Set<string>();
    for (const f of manifest.order) definedClasses(readFileSync(join(dist, 'styles', f), 'utf8')).forEach((c) => split.add(c));
    expect([...split].filter((c) => !full.has(c))).toEqual([]);
    expect([...full].filter((c) => !split.has(c))).toEqual([]);
    expect(readFileSync(join(dist, 'styles.css'), 'utf8')).toContain('./fonts/');
    expect(readFileSync(join(dist, 'styles/base.css'), 'utf8')).toContain('../fonts/');
  });
});
