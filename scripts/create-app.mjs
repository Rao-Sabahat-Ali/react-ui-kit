// OPS-017: create a new app from templates/starter for a design-system profile.
// Usage: node scripts/create-app.mjs <target-dir> --profile <saas|admin|dashboard|cms|pos|game|ecommerce|landing> [--title "My app"] [--description "..."] [--blank] [--blueprint <board>] [--with-3d]
// Generated apps load only the styles they use (uiKitStyles in vite.config.ts, `virtual:ui-kit-styles` in main.tsx).
// The dashboard and admin profiles start from a runnable blueprint (templates/blueprints) as the home screen; pass --blank for the empty starter page,
// or --blueprint <slug> (for example `board`) to start any profile from a specific blueprint.
// --with-3d adds the optional 3D package (@sabahat/react-ui-kit-3d + its three peer) and its stylesheet import.
import { cpSync, existsSync, mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { basename, join, resolve } from 'node:path';
import { BLUEPRINTS, BLUEPRINT_HOMES, PROFILES_SHELL, STARTER_INCLUDE } from './profile-shells.mjs';

const args = process.argv.slice(2);
const target = args[0];
const opt = (name, fallback) => {
  const i = args.indexOf(`--${name}`);
  return i === -1 ? fallback : args[i + 1];
};
if (!target) {
  console.error('Usage: node scripts/create-app.mjs <target-dir> --profile <profile> [--title "..."] [--description "..."] [--blank] [--blueprint <board>] [--with-3d]');
  process.exit(1);
}
const blank = args.includes('--blank');
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
const blueprint = opt('blueprint', undefined);
if (blueprint !== undefined && !Object.hasOwn(BLUEPRINTS, blueprint)) {
  console.error(`Unknown blueprint "${blueprint}". Use one of: ${Object.keys(BLUEPRINTS).join(', ')}`);
  process.exit(1);
}
const home = blueprint !== undefined ? BLUEPRINTS[blueprint] : blank ? undefined : BLUEPRINT_HOMES[profile];
const replacements = {
  __HOME_NOTE__: home
    ? `- The home screen is the \`${home.screen}\` blueprint (\`src/screens/\`, copied from react-ui-kit \`templates/blueprints\`). Replace its sample data (\`*.data.ts\`) and navigation; keep its structure, states and one-ink-button rule.`
    : '- Replace the placeholder pages with real screens built from the patterns (`get_pattern`).',
  __SCREEN__: home?.screen ?? '',
  __HOME_HEADING__: home?.heading ?? '',
  __APP_NAME__: name,
  __APP_TITLE__: opt('title', basename(dir)),
  __APP_DESCRIPTION__: opt('description', `A ${profile} app built on the personal design system.`),
  __PROFILE__: profile,
  __DEFAULT_THEME__: shell.defaultTheme,
  __SHELL_VARIANT__: `variant="${shell.variant}"`,
  __BOTTOM_NAV__: String(shell.bottomNav),
  __STYLE_INCLUDE__: `[${(home?.include ?? STARTER_INCLUDE).map((c) => `'${c}'`).join(', ')}]`,
  __KIT_DEP__: `^${kitVersion}`,
};

cpSync(join(root, 'templates', 'starter'), dir, { recursive: true });
if (home) {
  // One shared source: the same files the docs "Blueprints" pages render, so starters and docs never diverge.
  mkdirSync(join(dir, 'src', 'screens'), { recursive: true });
  for (const file of home.files) cpSync(join(root, 'templates', 'blueprints', file), join(dir, 'src', 'screens', file));
  cpSync(join(root, 'templates', 'blueprint-home', 'App.tsx'), join(dir, 'src', 'App.tsx'));
  cpSync(join(root, 'templates', 'blueprint-home', 'App.test.tsx'), join(dir, 'src', 'App.test.tsx'));
}
// User text (--title, --description) is untrusted input: escape it for the file it lands in.
const USER_TEXT = new Set(['__APP_TITLE__', '__APP_DESCRIPTION__']);
const htmlEscape = (v) => v.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
const jsonEscape = (v) => JSON.stringify(v).slice(1, -1);
// JSON files get JSON string escaping; everything else (HTML, JSX attributes, Markdown) gets HTML entities, which all three decode or render literally.
const escapeFor = (file, key, value) => (!USER_TEXT.has(key) ? value : file.endsWith('.json') ? jsonEscape(value) : htmlEscape(value));
const walk = (d) => readdirSync(d).flatMap((f) => (statSync(join(d, f)).isDirectory() ? walk(join(d, f)) : [join(d, f)]));
for (const file of walk(dir)) {
  let text = readFileSync(file, 'utf8');
  for (const [k, v] of Object.entries(replacements)) text = text.split(k).join(escapeFor(file, k, v));
  writeFileSync(file, text);
}
if (args.includes('--with-3d')) {
  const pkgPath = join(dir, 'package.json');
  const pkg = JSON.parse(readFileSync(pkgPath, 'utf8'));
  const threeVersion = JSON.parse(readFileSync(join(root, 'packages', 'react-ui-kit-3d', 'package.json'), 'utf8'));
  pkg.dependencies['@sabahat/react-ui-kit-3d'] = `^${threeVersion.version}`;
  pkg.dependencies.three = `^${threeVersion.devDependencies.three}`;
  pkg.devDependencies['@types/three'] = threeVersion.devDependencies['@types/three'];
  pkg.dependencies = Object.fromEntries(Object.entries(pkg.dependencies).sort(([a], [b]) => a.localeCompare(b)));
  pkg.devDependencies = Object.fromEntries(Object.entries(pkg.devDependencies).sort(([a], [b]) => a.localeCompare(b)));
  writeFileSync(pkgPath, `${JSON.stringify(pkg, null, 2)}\n`);
  const mainPath = join(dir, 'src', 'main.tsx');
  writeFileSync(mainPath, readFileSync(mainPath, 'utf8').replace("import 'virtual:ui-kit-styles';", "import 'virtual:ui-kit-styles';\nimport '@sabahat/react-ui-kit-3d/styles.css';"));
}
console.log(`Created ${dir} (profile ${profile}${home ? `, home screen: ${home.screen} blueprint` : ''}). Next: cd ${target} && npm install && npm run dev`);
