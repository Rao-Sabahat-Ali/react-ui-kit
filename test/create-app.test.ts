import { execFileSync } from 'node:child_process';
import { existsSync, mkdtempSync, readFileSync, readdirSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterAll, describe, expect, it } from 'vitest';
// @ts-expect-error — plain .mjs script module
import { BLUEPRINT_HOMES, PROFILES_SHELL, STARTER_INCLUDE } from '../scripts/profile-shells.mjs';

const root = join(import.meta.dirname, '..');
const base = mkdtempSync(join(tmpdir(), 'kit-starter-'));
afterAll(() => rmSync(base, { recursive: true, force: true }));
const walk = (d: string): string[] => readdirSync(d).flatMap((f) => (statSync(join(d, f)).isDirectory() ? walk(join(d, f)) : [join(d, f)]));

describe('create-app (OPS-017)', () => {
  it.each(Object.keys(PROFILES_SHELL))('generates a %s starter without placeholders', (profile) => {
    const dir = join(base, profile);
    execFileSync('node', [join(root, 'scripts/create-app.mjs'), dir, '--profile', profile, '--title', `Demo ${profile}`]);
    for (const file of walk(dir)) expect(readFileSync(file, 'utf8'), file).not.toMatch(/__[A-Z_]+__/);
    expect(readFileSync(join(dir, 'src/App.tsx'), 'utf8')).toContain(`profile="${profile}"`);
    expect(readFileSync(join(dir, 'index.html'), 'utf8')).toContain(`'${profile}'`);
  });

  it.each(Object.keys(PROFILES_SHELL))('%s starter loads only the styles it uses (style plugin)', (profile) => {
    const dir = join(base, `${profile}-styles`);
    execFileSync('node', [join(root, 'scripts/create-app.mjs'), dir, '--profile', profile]);
    const config = readFileSync(join(dir, 'vite.config.ts'), 'utf8');
    expect(config).toContain("import { uiKitStyles } from '@sabahat/react-ui-kit/vite'");
    expect(config).toMatch(/plugins: \[react\(\), uiKitStyles\(\{ include: \[[^\]]*\] \}\)\]/);
    const main = readFileSync(join(dir, 'src/main.tsx'), 'utf8');
    expect(main).toContain("import 'virtual:ui-kit-styles';");
    expect(main).not.toContain('styles.css');
    expect(readFileSync(join(dir, 'src/vite-env.d.ts'), 'utf8')).toContain("declare module 'virtual:ui-kit-styles'");
    const pkg = JSON.parse(readFileSync(join(dir, 'package.json'), 'utf8')) as { dependencies: Record<string, string> };
    expect(pkg.dependencies['@sabahat/react-ui-kit']).toBe(`^${(JSON.parse(readFileSync(join(root, 'package.json'), 'utf8')) as { version: string }).version}`);
  });

  // Every Bootstrap class the generated source writes itself must be in `include`, because the plugin cannot see app class names.
  describe.skipIf(!existsSync(join(root, 'dist/styles/manifest.json')))('style plugin include lists cover the generated source', () => {
    const manifest = JSON.parse(readFileSync(join(root, 'dist/styles/manifest.json'), 'utf8')) as {
      bootstrap: Record<string, { classes: string[] }>;
      utilities: Record<string, { classes: string[] }>;
    };
    const known = new Set([...Object.values(manifest.bootstrap), ...Object.values(manifest.utilities)].flatMap((p) => p.classes));
    const stem = (c: string) => c.replace(/-(sm|md|lg|xl|xxl)(?=-|$)/, '');
    const used = (dir: string) => {
      const classes = new Set<string>();
      for (const file of walk(join(dir, 'src')).filter((f) => /\.tsx?$/.test(f) && !/\.test\./.test(f))) {
        for (const literal of readFileSync(file, 'utf8').matchAll(/(['"`])((?:(?!\1)[^\\\n]|\\.)*)\1/g)) {
          for (const token of (literal[2] ?? '').split(/\s+/)) if (/^[a-z][a-z0-9-]*$/.test(token) && (known.has(token) || known.has(stem(token)))) classes.add(token);
        }
      }
      return classes;
    };
    const listed = (dir: string) => {
      const match = /include: \[([^\]]*)\]/.exec(readFileSync(join(dir, 'vite.config.ts'), 'utf8'));
      return new Set((match?.[1] ?? '').split(',').map((c) => c.trim().replace(/'/g, '')).filter(Boolean));
    };

    it.each([...Object.keys(BLUEPRINT_HOMES), 'saas'])('%s', (profile) => {
      const dir = join(base, `${profile}-include`);
      execFileSync('node', [join(root, 'scripts/create-app.mjs'), dir, '--profile', profile]);
      const include = listed(dir);
      const missing = [...used(dir)].filter((c) => !include.has(c));
      expect(missing, `classes used by the ${profile} starter but not in uiKitStyles include`).toEqual([]);
      if (profile === 'saas') expect([...include]).toEqual(STARTER_INCLUDE);
    });
  });

  it.each(Object.keys(BLUEPRINT_HOMES))('starts the %s profile from its blueprint instead of the empty page', (profile) => {
    const { screen, heading, files } = (BLUEPRINT_HOMES as Record<string, { screen: string; heading: string; files: string[] }>)[profile]!;
    const dir = join(base, `${profile}-blueprint`);
    execFileSync('node', [join(root, 'scripts/create-app.mjs'), dir, '--profile', profile, '--title', 'Kassa']);
    for (const file of files) {
      // Copied verbatim from the shared source, so docs and starters cannot diverge.
      expect(readFileSync(join(dir, 'src/screens', file), 'utf8'), file).toBe(readFileSync(join(root, 'templates/blueprints', file), 'utf8'));
    }
    const app = readFileSync(join(dir, 'src/App.tsx'), 'utf8');
    expect(app).toContain(`import { ${screen} } from './screens/${screen}'`);
    expect(app).toContain(`<ThemeProvider profile="${profile}">`);
    expect(app).toContain('appName="Kassa"');
    expect(app).not.toContain('Welcome');
    expect(readFileSync(join(dir, 'src/App.test.tsx'), 'utf8')).toContain(`name: '${heading}'`);
    expect(readFileSync(join(dir, 'CLAUDE.md'), 'utf8')).toContain(`\`${screen}\` blueprint`);
  });

  it('keeps the empty starter page for profiles without a blueprint and with --blank', () => {
    const saas = join(base, 'saas-plain');
    execFileSync('node', [join(root, 'scripts/create-app.mjs'), saas, '--profile', 'saas']);
    expect(existsSync(join(saas, 'src/screens'))).toBe(false);
    expect(readFileSync(join(saas, 'src/App.tsx'), 'utf8')).toContain('Welcome');
    const blank = join(base, 'dashboard-blank');
    execFileSync('node', [join(root, 'scripts/create-app.mjs'), blank, '--profile', 'dashboard', '--blank']);
    expect(existsSync(join(blank, 'src/screens'))).toBe(false);
    expect(readFileSync(join(blank, 'src/App.tsx'), 'utf8')).toContain('Welcome');
  });

  // Type-checks the generated apps against the built kit types. Needs `npm run build` first (dist/types); the app is generated
  // inside the repo so react, vitest and testing-library resolve from the kit's node_modules.
  describe.skipIf(!existsSync(join(root, 'dist/types/index.d.ts')))('generated blueprint apps typecheck', () => {
    it.each(Object.keys(BLUEPRINT_HOMES))('%s', (profile) => {
      const dir = join(root, `.tmp-starter-${profile}-${process.pid}`);
      try {
        execFileSync('node', [join(root, 'scripts/create-app.mjs'), dir, '--profile', profile]);
        writeFileSync(
          join(dir, 'tsconfig.check.json'),
          JSON.stringify({
            extends: join(dir, 'tsconfig.json'),
            compilerOptions: { noEmit: true, baseUrl: '.', paths: { '@sabahat/react-ui-kit': [join(root, 'dist/types/index.d.ts')] }, types: ['vite/client', 'node', '@testing-library/jest-dom/vitest'] },
            include: ['src'],
          }),
        );
        execFileSync(join(root, 'node_modules/.bin/tsc'), ['-p', join(dir, 'tsconfig.check.json')], { stdio: 'pipe' });
      } finally {
        rmSync(dir, { recursive: true, force: true });
      }
    }, 120_000);
  });

  it('rejects unknown profiles', () => {
    expect(() => execFileSync('node', [join(root, 'scripts/create-app.mjs'), join(base, 'x'), '--profile', 'nope'], { stdio: 'pipe' })).toThrow();
  });
});
