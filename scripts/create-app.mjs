// OPS-017: create a new app from templates/starter for a design-system profile.
// Usage: node scripts/create-app.mjs <target-dir> --profile <saas|admin|dashboard|cms|pos|game|ecommerce|landing> [--title "My app"] [--description "..."]
import { cpSync, existsSync, readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { basename, join, resolve } from 'node:path';
import { PROFILES_SHELL } from './profile-shells.mjs';

const args = process.argv.slice(2);
const target = args[0];
const opt = (name, fallback) => {
  const i = args.indexOf(`--${name}`);
  return i === -1 ? fallback : args[i + 1];
};
if (!target) {
  console.error('Usage: node scripts/create-app.mjs <target-dir> --profile <profile> [--title "..."] [--description "..."]');
  process.exit(1);
}
const profile = opt('profile', 'saas');
const shell = PROFILES_SHELL[profile];
if (!shell) {
  console.error(`Unknown profile "${profile}". Use one of: ${Object.keys(PROFILES_SHELL).join(', ')}`);
  process.exit(1);
}
const dir = resolve(target);
if (existsSync(dir) && readdirSync(dir).length) {
  console.error(`${dir} is not empty.`);
  process.exit(1);
}
const root = join(import.meta.dirname, '..');
const kitVersion = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8')).version;
const name = basename(dir).toLowerCase().replace(/[^a-z0-9-]+/g, '-');
const replacements = {
  __APP_NAME__: name,
  __APP_TITLE__: opt('title', basename(dir)),
  __APP_DESCRIPTION__: opt('description', `A ${profile} app built on the personal design system.`),
  __PROFILE__: profile,
  __DEFAULT_THEME__: shell.defaultTheme,
  __SHELL_VARIANT__: `variant="${shell.variant}"`,
  __BOTTOM_NAV__: String(shell.bottomNav),
  __KIT_DEP__: `^${kitVersion}`,
};

cpSync(join(root, 'templates', 'starter'), dir, { recursive: true });
const walk = (d) => readdirSync(d).flatMap((f) => (statSync(join(d, f)).isDirectory() ? walk(join(d, f)) : [join(d, f)]));
for (const file of walk(dir)) {
  let text = readFileSync(file, 'utf8');
  for (const [k, v] of Object.entries(replacements)) text = text.split(k).join(v);
  writeFileSync(file, text);
}
console.log(`Created ${dir} (profile ${profile}). Next: cd ${target} && npm install && npm run dev`);
