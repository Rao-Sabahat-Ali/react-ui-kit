// Fails when the gzipped library output grows more than 10% over bundle-budget.json (OPS-016).
// Update the budget deliberately with: node scripts/check-bundle.mjs --update
import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { gzipSync } from 'node:zlib';

const root = join(import.meta.dirname, '..');
const files = ['dist/index.js', 'dist/styles.css'];
const sizes = Object.fromEntries(files.map((f) => [f, gzipSync(readFileSync(join(root, f))).length]));
const budgetPath = join(root, 'bundle-budget.json');

if (process.argv.includes('--update')) {
  writeFileSync(budgetPath, `${JSON.stringify(sizes, null, 2)}\n`);
  console.log('Budget updated', sizes);
  process.exit(0);
}

const budget = JSON.parse(readFileSync(budgetPath, 'utf8'));
let failed = false;
for (const f of files) {
  const limit = Math.round(budget[f] * 1.1);
  const ok = sizes[f] <= limit;
  failed ||= !ok;
  console.log(`${ok ? '✓' : '✗'} ${f}: ${(sizes[f] / 1024).toFixed(1)} KB gzip (budget ${(budget[f] / 1024).toFixed(1)} KB +10%)`);
}
if (failed) {
  console.error('Bundle budget exceeded. If intended, run `node scripts/check-bundle.mjs --update` and explain why in the PR.');
  process.exit(1);
}
