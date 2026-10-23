import { execFileSync } from 'node:child_process';
import { mkdtempSync, readFileSync, readdirSync, rmSync, statSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterAll, describe, expect, it } from 'vitest';
// @ts-expect-error — plain .mjs script module
import { PROFILES_SHELL } from '../scripts/profile-shells.mjs';

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

  it('rejects unknown profiles', () => {
    expect(() => execFileSync('node', [join(root, 'scripts/create-app.mjs'), join(base, 'x'), '--profile', 'nope'], { stdio: 'pipe' })).toThrow();
  });
});
