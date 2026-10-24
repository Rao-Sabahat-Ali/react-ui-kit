// Measures the render-blocking CSS an app would load with `@sabahat/react-ui-kit/vite` versus the full stylesheet.
// Usage: node scripts/measure-style-split.mjs [Component ...] [--include=d-flex,gap-3] [--exclude=DatePicker]
// Without components it measures the svenska-ord set from the 1.3.0 changelog. Needs `npm run build` first.
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { brotliCompressSync, gzipSync } from 'node:zlib';
import { selectStyleFiles } from '../dist/vite.js';

const root = join(import.meta.dirname, '..');
const manifest = JSON.parse(readFileSync(join(root, 'dist/styles/manifest.json'), 'utf8'));
const args = process.argv.slice(2);
const flag = (name) => (args.find((a) => a.startsWith(`--${name}=`))?.split('=')[1] ?? '').split(',').filter(Boolean);
const names = args.filter((a) => !a.startsWith('--'));
const SVENSKA_ORD = ['PageHeader', 'Section', 'IndexList', 'StatCard', 'StatGroup', 'Button', 'Tag', 'SelectButton', 'InputText', 'Tabs', 'Toast', 'ProgressBar', 'EmptyState', 'Skeleton', 'ThemeToggle', 'AppShell', 'Topbar', 'SidebarNav', 'BottomNav', 'ConfirmDialog', 'Dialog', 'DataTable', 'Message'];

const size = (css) => ({ raw: Buffer.byteLength(css), gzip: gzipSync(css).length, brotli: brotliCompressSync(css).length });
const kb = (n) => `${(n / 1024).toFixed(1)} KB`;
const full = size(readFileSync(join(root, 'dist/styles.css'), 'utf8'));
const selection = selectStyleFiles(manifest, { names: names.length ? names : SVENSKA_ORD, include: flag('include'), exclude: flag('exclude') });
// What an app bundle ships: the pieces concatenated into one render-blocking stylesheet.
const css = selection.files.map((f) => readFileSync(join(root, 'dist/styles', f), 'utf8')).join('');
const split = size(css);
const group = (prefix) => selection.files.filter((f) => f.startsWith(prefix)).map((f) => gzipSync(readFileSync(join(root, 'dist/styles', f))).length).reduce((a, b) => a + b, 0);

console.log(`components: ${selection.components.length} (${selection.components.join(', ')})`);
console.log(`files: ${selection.files.length}  base ${kb(gzipSync(readFileSync(join(root, 'dist/styles/base.css'))).length)}, bootstrap ${kb(group('bootstrap/'))}, utilities ${kb(group('utilities/'))}, components ${kb(group('components/'))} (gzip, per file)`);
console.log(`full styles.css : ${kb(full.raw)} raw, ${kb(full.gzip)} gzip, ${kb(full.brotli)} brotli`);
console.log(`split (concat)  : ${kb(split.raw)} raw, ${kb(split.gzip)} gzip, ${kb(split.brotli)} brotli  (${Math.round((1 - split.gzip / full.gzip) * 100)}% smaller gzip)`);
