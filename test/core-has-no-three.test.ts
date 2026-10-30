import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

// ADR 0003: three lives only in the optional package. The core kit must never import it.
const root = join(import.meta.dirname, '..');
const walk = (dir: string): string[] => readdirSync(dir).flatMap((f) => (statSync(join(dir, f)).isDirectory() ? walk(join(dir, f)) : [join(dir, f)]));
// An import of three in any form: static, dynamic, require, `import type`, side-effect.
const SPECIFIER = /(?:\bfrom|\bimport|\brequire)\s*\(?\s*['"]three(?:\/[^'"]*)?['"]/;
const RUNTIME = /WebGLRenderer|\bTHREE\./;

describe('core kit has no three', () => {
  it('no core source file imports three (static, dynamic, type or side-effect imports)', () => {
    const offenders = walk(join(root, 'src'))
      .filter((f) => /\.(ts|tsx|scss|css)$/.test(f))
      .filter((f) => SPECIFIER.test(readFileSync(f, 'utf8')))
      .map((f) => f.slice(root.length + 1));
    expect(offenders).toEqual([]);
  });

  it.skipIf(!existsSync(join(root, 'dist', 'index.js')))('dist/index.js and dist/vite.js do not import or contain three', () => {
    for (const file of ['dist/index.js', 'dist/vite.js']) {
      const code = readFileSync(join(root, file), 'utf8');
      expect(SPECIFIER.test(code), `${file} imports three`).toBe(false);
      expect(RUNTIME.test(code), `${file} contains three runtime code`).toBe(false);
    }
  });

  it('package.json: three is no dependency of the core, and packages/ is not published with it', () => {
    const pkg = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8')) as Record<string, Record<string, string> | string[]>;
    for (const field of ['dependencies', 'peerDependencies', 'optionalDependencies', 'devDependencies']) {
      expect(Object.keys((pkg[field] as Record<string, string>) ?? {}), field).not.toContain('three');
    }
    expect((pkg.files as string[]).some((f) => f.startsWith('packages'))).toBe(false);
    expect(pkg.workspaces).toEqual(['packages/*']);
  });

  it('the 3D package keeps three as a peer and imports it only dynamically', () => {
    const pkg = JSON.parse(readFileSync(join(root, 'packages/react-ui-kit-3d/package.json'), 'utf8')) as { dependencies?: object; peerDependencies: Record<string, string> };
    expect(pkg.dependencies).toBeUndefined();
    expect(pkg.peerDependencies.three).toBe('>=0.170.0');
    const staticImport = /^\s*(import|export)\s[^;'"]*from\s*['"]three(\/[^'"]*)?['"]|^\s*import\s*['"]three/m;
    const offenders = walk(join(root, 'packages/react-ui-kit-3d/src'))
      .filter((f) => /\.(ts|tsx)$/.test(f) && !/\.(test|examples)\.tsx?$/.test(f) && !f.includes('/test/'))
      .filter((f) => staticImport.test(readFileSync(f, 'utf8').replace(/^import type .*$/gm, '').replace(/^export type .*$/gm, '')))
      .map((f) => f.slice(root.length + 1));
    expect(offenders).toEqual([]);
  });
});
