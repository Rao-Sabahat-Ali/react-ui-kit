// Bundle budget of the 3D package's own code (three is external and not counted): dist/index.js must stay
// at or below 12 KB gzip, dist/styles.css at or below 2 KB gzip. Also asserts dist/index.js imports three
// only dynamically (the entry must never load three).
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { gzipSync } from 'node:zlib';

const root = join(import.meta.dirname, '..');
const limits = { 'dist/index.js': 12 * 1024, 'dist/styles.css': 2 * 1024 };
let failed = false;
for (const [file, limit] of Object.entries(limits)) {
  const size = gzipSync(readFileSync(join(root, file))).length;
  const ok = size <= limit;
  failed ||= !ok;
  console.log(`${ok ? '✓' : '✗'} ${file}: ${(size / 1024).toFixed(1)} KB gzip (limit ${limit / 1024} KB)`);
}
const js = readFileSync(join(root, 'dist/index.js'), 'utf8');
const staticThree = /^\s*(import|export)\s[^;]*from\s*['"]three(\/[^'"]*)?['"]|^\s*import\s*['"]three/m.test(js);
console.log(`${staticThree ? '✗' : '✓'} dist/index.js has no static three import`);
failed ||= staticThree;
if (failed) process.exit(1);
