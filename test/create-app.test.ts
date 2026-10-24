import { execFileSync } from 'node:child_process';
import { existsSync, mkdtempSync, readFileSync, readdirSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterAll, describe, expect, it } from 'vitest';
// @ts-expect-error — plain .mjs script module
import { BLUEPRINT_HOMES, PROFILES_SHELL } from '../scripts/profile-shells.mjs';

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
