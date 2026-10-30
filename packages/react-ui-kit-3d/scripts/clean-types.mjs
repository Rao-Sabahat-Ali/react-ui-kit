// Removes stylesheet side-effect imports from emitted declarations: consumers' TypeScript
// cannot resolve `./styles/index.scss` (TS2882). Styles ship as dist/styles.css.
import { readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const walk = (dir) => readdirSync(dir).flatMap((f) => (statSync(join(dir, f)).isDirectory() ? walk(join(dir, f)) : [join(dir, f)]));
let changed = 0;
for (const file of walk('dist/types').filter((f) => f.endsWith('.d.ts'))) {
  const src = readFileSync(file, 'utf8');
  const out = src.replace(/^import ['"][^'"]+\.s?css['"];\r?\n/gm, '');
  if (out !== src) {
    writeFileSync(file, out);
    changed++;
  }
}
console.log(`clean-types: ${changed} declaration file(s) updated`);
