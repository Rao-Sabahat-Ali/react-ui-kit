import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

describe('docs deployment config', () => {
  it('CSP hash matches the inline theme script in docs-app/index.html', () => {
    const root = join(import.meta.dirname, '..');
    const script = /<script>([\s\S]*?)<\/script>/.exec(readFileSync(join(root, 'docs-app', 'index.html'), 'utf8'))![1]!;
    const hash = createHash('sha256').update(script).digest('base64');
    expect(readFileSync(join(root, 'vercel.json'), 'utf8')).toContain(`'sha256-${hash}'`);
  });
});
