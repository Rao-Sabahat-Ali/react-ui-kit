// Splits the kit stylesheet into independently loadable pieces (dist/styles/**) and a manifest that says,
// for every kit component, which pieces it needs. dist/styles.css (everything) is NOT touched by this.
//
//   dist/styles/base.css                  fonts, tokens (profiles/themes/contrast), Bootstrap config+root+reboot+type+helpers,
//                                         the token bridge, kit utilities, reduced-motion
//   dist/styles/bootstrap/<partial>.css   one Bootstrap partial (+ the bridge rules that override it)
//   dist/styles/utilities/<key>.css       one Bootstrap utility (`d-*`, `mt-*` …, responsive variants included)
//   dist/styles/components/<Name>.css     one kit component stylesheet
//   dist/styles/manifest.json             needs per component (derived from TSX imports + class usage) and the cascade order
//
// Usage: node scripts/build-style-split.mjs   (also called from vite.config.ts after the library build)
import { existsSync, mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { gzipSync } from 'node:zlib';
import { transform } from 'lightningcss';
import * as sass from 'sass';
import ts from 'typescript';

const defaultRoot = join(import.meta.dirname, '..');

/** Same targets Vite uses for `build.cssTarget` (baseline widely available), so minification matches styles.css. */
const v = (major, minor = 0) => (major << 16) | (minor << 8);
const TARGETS = { chrome: v(111), edge: v(111), firefox: v(114), safari: v(16, 4), ios_saf: v(16, 4) };

const SILENCE = ['import', 'global-builtin', 'color-functions', 'if-function'];

/** Bootstrap partials that are always part of base.css (their rules are needed by every page). */
const BASE_PARTIALS = ['root', 'reboot', 'type', 'helpers'];
/** Bootstrap partials that only define configuration (variables, maps, mixins); they emit no CSS. */
const CONFIG_PARTIALS = ['functions', 'variables', 'variables-dark', 'maps', 'mixins', 'utilities'];
/** State classes shared by many Bootstrap partials: they never pull a partial in on their own. */
const STATE_TOKENS = new Set(['show', 'active', 'disabled', 'hide', 'hiding', 'collapsed']);
const BREAKPOINT = /-(sm|md|lg|xl|xxl)(?=-|$)/;
/** Normalise responsive variants (`col-md-6` -> `col-6`, `d-lg-none` -> `d-none`) so manifests stay small. */
export const normalizeClass = (cls) => cls.replace(BREAKPOINT, '');

const minifyCss = (css, filename) =>
  new TextDecoder().decode(transform({ filename, code: new TextEncoder().encode(css), minify: true, targets: TARGETS }).code);

function sassCompiler(root) {
  const loadPaths = [join(root, 'node_modules'), join(root, 'src/styles')];
  const options = { loadPaths, quietDeps: true, silenceDeprecations: SILENCE, style: 'expanded' };
  return {
    string: (source) => sass.compileString(source, { ...options, url: new URL(`file://${join(root, 'src/styles/_split-entry.scss')}`) }).css,
    file: (path) => sass.compile(path, options).css,
  };
}

/** Bootstrap partial names in cascade order, read from bootstrap.scss itself. */
export function bootstrapOrder(root = defaultRoot) {
  const text = readFileSync(join(root, 'node_modules/bootstrap/scss/bootstrap.scss'), 'utf8');
  return [...text.matchAll(/^@import "([^"]+)";/gm)].map((m) => m[1]).filter((n) => n !== 'mixins/banner');
}

/**
 * Classes a stylesheet defines (selectors only; `:not(...)` arguments excluded).
 * With `owned`, only classes that have a stand-alone rule count (a selector that is one class, optionally with
 * pseudo-classes/elements, like `.btn-close:hover`). `.alert-dismissible .btn-close` or `.btn .badge` only style an
 * element together with another class, so they do not make their partial the owner of `btn-close` / `btn`.
 */
export function definedClasses(css, { owned = false } = {}) {
  const found = new Set();
  const walkSelector = (selector) => {
    if (owned) {
      const classes = selector.filter((c) => c.type === 'class');
      const simple = selector.every((c) => c.type === 'class' || c.type === 'pseudo-class' || c.type === 'pseudo-element');
      if (simple && classes.length === 1) found.add(classes[0].name);
      return;
    }
    for (const c of selector) {
      if (c.type === 'class') found.add(c.name);
      else if (c.type === 'pseudo-class' && Array.isArray(c.selectors) && c.kind !== 'not') c.selectors.forEach(walkSelector);
    }
  };
  transform({
    filename: 'x.css',
    code: new TextEncoder().encode(css),
    visitor: {
      Rule: {
        style(rule) {
          rule.value.selectors.forEach(walkSelector);
        },
      },
    },
  });
  return found;
}

/** Class-name tokens used by a TypeScript source: exact tokens and dynamic prefixes (`btn-${x}` -> `btn-`). */
export function collectClassTokens(text, fileName = 'x.tsx') {
  const exact = new Set();
  // Dynamic class names: `border-${tone}-subtle` -> { prefix: 'border-', suffix: '-subtle' }; `btn-${x}` -> { prefix: 'btn-', suffix: '' }.
  const patterns = [];
  const SKIP_CALLS = new Set([
    'createElement', 'getAttribute', 'setAttribute', 'hasAttribute', 'removeAttribute', 'addEventListener', 'removeEventListener',
    'querySelector', 'querySelectorAll', 'closest', 'matches', 'getElementById', 'test', 'includes', 'startsWith', 'endsWith',
    'indexOf', 'split', 'replace', 'replaceAll', 'localeCompare', 'padStart', 'padEnd', 'join', 'format', 'toLocaleString',
    'DateTimeFormat', 'NumberFormat', 't', 'translate', 'matchMedia', 'getComputedStyle', 'getPropertyValue', 'setProperty',
    'emit', 'on', 'off', 'once', 'dispatchEvent', 'Error', 'warn', 'error', 'log',
  ]);
  const SKIP_PROPS = new Set(['role', 'type', 'key', 'id', 'name', 'label', 'tag', 'as', 'kind', 'value', 'href', 'to', 'title']);
  const CLASS_LIST_FNS = new Set(['cx', 'clsx', 'classNames', 'classnames', 'cn']);
  const TOKEN = /^[a-z][a-z0-9_-]*$/i;
  /** Tokens of a string piece. `open` tells whether the piece continues into a `${}` at its start/end. */
  const addText = (s, { openStart = false, openEnd = false } = {}) => {
    const parts = s.split(/\s+/).filter(Boolean);
    parts.forEach((tok, i) => {
      if (!TOKEN.test(tok)) return;
      const touchesStart = i === 0 && openStart && !/^\s/.test(s);
      const touchesEnd = i === parts.length - 1 && openEnd && !/\s$/.test(s);
      if (touchesStart || touchesEnd) return; // handled as part of a pattern
      if (tok.endsWith('-')) patterns.push({ prefix: tok, suffix: '' });
      else exact.add(tok);
    });
  };
  /** Pattern for the `${}` between two literal pieces. */
  const addGap = (left, right) => {
    const l = /\s$/.test(left) ? '' : (left.split(/\s+/).filter(Boolean).at(-1) ?? '');
    const r = /^\s/.test(right) ? '' : (right.split(/\s+/).filter(Boolean)[0] ?? '');
    const prefix = TOKEN.test(l) ? l : '';
    const suffix = r && /^[a-z0-9_-]+$/i.test(r) ? r : '';
    if (prefix) patterns.push({ prefix, suffix });
  };
  const sf = ts.createSourceFile(fileName, text, ts.ScriptTarget.Latest, true, fileName.endsWith('x') ? ts.ScriptKind.TSX : ts.ScriptKind.TS);
  const calleeName = (e) => (ts.isPropertyAccessExpression(e) ? e.name.text : ts.isIdentifier(e) ? e.text : '');
  const visit = (node) => {
    if (ts.isImportDeclaration(node) || ts.isExportDeclaration(node) || ts.isTypeNode(node) || ts.isInterfaceDeclaration(node) || ts.isTypeAliasDeclaration(node)) return;
    if (ts.isJsxAttribute(node) && !/class/i.test(node.name.getText(sf))) {
      // `role="alert"` is not a class, but render props (`itemTemplate={(x) => <div className="p-2" />}`) are code.
      const value = node.initializer && ts.isJsxExpression(node.initializer) ? node.initializer.expression : undefined;
      if (value && (ts.isArrowFunction(value) || ts.isFunctionExpression(value))) visit(value);
      return;
    }
    if (ts.isBinaryExpression(node) && [ts.SyntaxKind.EqualsEqualsEqualsToken, ts.SyntaxKind.ExclamationEqualsEqualsToken, ts.SyntaxKind.EqualsEqualsToken, ts.SyntaxKind.ExclamationEqualsToken].includes(node.operatorToken.kind)) return;
    if (ts.isCaseClause(node)) {
      node.statements.forEach(visit);
      return;
    }
    // Class-building helpers (`bpClass('gap', bp, 3)` -> gap-3, gap-md-3): their literal arguments are class stems.
    if (ts.isCallExpression(node) && /class/i.test(calleeName(node.expression)) && !CLASS_LIST_FNS.has(calleeName(node.expression))) {
      for (const arg of node.arguments) {
        if (ts.isStringLiteral(arg) && /^[a-z][a-z0-9]*(-[a-z0-9]+)*$/i.test(arg.text)) patterns.push({ prefix: `${arg.text}-`, suffix: '' });
      }
    }
    if ((ts.isCallExpression(node) || ts.isNewExpression(node)) && SKIP_CALLS.has(calleeName(node.expression))) {
      visit(node.expression);
      return;
    }
    if (ts.isPropertyAssignment(node) && SKIP_PROPS.has(node.name.getText(sf).replace(/['"]/g, ''))) return;
    if (ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node)) addText(node.text);
    else if (ts.isTemplateExpression(node)) {
      const pieces = [node.head.text, ...node.templateSpans.map((span) => span.literal.text)];
      pieces.forEach((text, i) => addText(text, { openStart: i > 0, openEnd: i < pieces.length - 1 }));
      for (let i = 0; i < pieces.length - 1; i++) addGap(pieces[i], pieces[i + 1]);
      node.templateSpans.forEach((span) => visit(span.expression));
      return;
    }
    ts.forEachChild(node, visit);
  };
  visit(sf);
  return { exact, patterns, prefixes: new Set(patterns.map((p) => p.prefix)) };
}

/**
 * Kit components a source file renders: value imports of component-like names (`Button`, not `useKeyFilter`,
 * `DEFAULT_X` or a `type`) from `../Button/Button`, `../Button` or `../../components/Button`.
 */
export function importedComponents(text, fileName, components) {
  const found = new Set();
  const sf = ts.createSourceFile(fileName, text, ts.ScriptTarget.Latest, true);
  for (const st of sf.statements) {
    if (!ts.isImportDeclaration(st) || !ts.isStringLiteral(st.moduleSpecifier) || !st.importClause || st.importClause.isTypeOnly) continue;
    const m = /^\.\.\/(?:\.\.\/components\/)?([A-Z][A-Za-z0-9]*)(?:\/|$)/.exec(st.moduleSpecifier.text);
    if (!m || !components.includes(m[1])) continue;
    const bindings = st.importClause.namedBindings;
    const names = [];
    if (st.importClause.name) names.push(st.importClause.name.text);
    if (bindings && ts.isNamedImports(bindings)) for (const el of bindings.elements) if (!el.isTypeOnly) names.push(el.name.text);
    if (names.some((n) => /^[A-Z]/.test(n) && !/^[A-Z0-9_]+$/.test(n))) found.add(m[1]);
  }
  return found;
}

/** Value (non-type) names an index.ts exports, following `export * from`. */
function exportedValueNames(file, seen = new Set()) {
  if (seen.has(file) || !existsSync(file)) return new Set();
  seen.add(file);
  const sf = ts.createSourceFile(file, readFileSync(file, 'utf8'), ts.ScriptTarget.Latest, true);
  const names = new Set();
  for (const st of sf.statements) {
    if (ts.isExportDeclaration(st)) {
      if (st.isTypeOnly) continue;
      if (st.exportClause && ts.isNamedExports(st.exportClause)) {
        for (const el of st.exportClause.elements) if (!el.isTypeOnly) names.add(el.name.text);
      } else if (st.moduleSpecifier && ts.isStringLiteral(st.moduleSpecifier)) {
        const base = join(dirname(file), st.moduleSpecifier.text);
        const target = [`${base}.ts`, `${base}.tsx`, join(base, 'index.ts')].find(existsSync);
        if (target) exportedValueNames(target, seen).forEach((n) => names.add(n));
      }
    } else if (ts.canHaveModifiers(st) && ts.getModifiers(st)?.some((m) => m.kind === ts.SyntaxKind.ExportKeyword)) {
      if (ts.isVariableStatement(st)) st.declarationList.declarations.forEach((d) => ts.isIdentifier(d.name) && names.add(d.name.text));
      else if ((ts.isFunctionDeclaration(st) || ts.isClassDeclaration(st) || ts.isEnumDeclaration(st)) && st.name) names.add(st.name.text);
    }
  }
  return names;
}

const isSource = (f) => /\.tsx?$/.test(f) && !/\.(test|examples|spec|stories)\.tsx?$/.test(f) && !f.endsWith('.d.ts');
const walkSources = (dir) =>
  readdirSync(dir, { withFileTypes: true }).flatMap((d) => (d.isDirectory() ? walkSources(join(dir, d.name)) : isSource(d.name) ? [join(dir, d.name)] : []));

const gz = (s) => gzipSync(s).length;

/** Top-level rules and at-rule blocks of expanded css (comments dropped), each as its own string. */
export function splitTopLevel(css) {
  const text = css.replace(/\/\*[\s\S]*?\*\//g, '');
  const out = [];
  let depth = 0;
  let start = 0;
  let quote = '';
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (quote) {
      if (c === '\\') i++;
      else if (c === quote) quote = '';
    } else if (c === '"' || c === "'") quote = c;
    else if (c === '{') depth++;
    else if ((c === '}' && --depth === 0) || (c === ';' && depth === 0)) {
      out.push(text.slice(start, i + 1).trim());
      start = i + 1;
    }
  }
  return out.filter(Boolean);
}

/**
 * Compiles every piece and derives the manifest.
 * @returns {{ files: Map<string,string>, manifest: object }}  files are keyed by path relative to dist/styles
 */
export function buildStyleSplit({ root = defaultRoot, minify = true } = {}) {
  const compiler = sassCompiler(root);
  const finish = (css, name) => (minify ? minifyCss(css, name) : css);
  const pkg = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'));
  const order = bootstrapOrder(root);
  const partials = order.filter((n) => !CONFIG_PARTIALS.includes(n) && n !== 'utilities/api');
  const prelude =
    ["@import 'bootstrap-config';", ...CONFIG_PARTIALS.map((n) => `@import 'bootstrap/scss/${n}';`)].join('\n') + '\n';

  // Bridge parts that must follow the Bootstrap partial they override.
  const bridgeFor = {
    buttons: '@each $intent in $ui-intents { @include ui-bridge-intent($intent, btn); }',
    forms: '@include ui-bridge-forms;',
    dropdown: '@include ui-bridge-dropdown;',
    nav: '@include ui-bridge-nav;',
    progress: '@include ui-bridge-progress;',
    'list-group': '@include ui-bridge-list-group;',
    close: '@include ui-bridge-close;',
  };

  const files = new Map();
  const sizes = {};
  const put = (path, css) => files.set(path, finish(css, path));

  const componentsDir = join(root, 'src/components');
  const names = readdirSync(componentsDir, { withFileTypes: true })
    .filter((d) => d.isDirectory() && existsSync(join(componentsDir, d.name, 'index.ts')))
    .map((d) => d.name)
    .sort((a, b) => a.localeCompare(b));
  const componentNamesWithScss = names.filter((n) => existsSync(join(componentsDir, n, `${n}.scss`)));
  const optionalPartials = partials.filter((n) => !BASE_PARTIALS.includes(n));

  // The whole stylesheet compiled ONCE in cascade order and cut at markers, so every piece is exactly what the full
  // stylesheet contains (including selectors Sass merged through @extend, e.g. `.btn-sm, .btn-group-sm > .btn`).
  const marker = (id) => `/*! ui-split:${id} */`;
  const entry = [
    `$ui-font-path: '../fonts';`,
    marker('base'),
    "@import 'fonts';",
    prelude,
    ...BASE_PARTIALS.map((n) => `@import 'bootstrap/scss/${n}';`),
    "@import 'tokens.generated';",
    "@import 'bridge-parts';",
    '@include ui-bridge-root;',
    '@each $intent in $ui-intents { @include ui-bridge-intent($intent, text-bg); }',
    '@include ui-bridge-forced-colors;',
    "@import 'utilities';",
    ...optionalPartials.map((n) => `${marker(`bootstrap/${n}`)}\n@import 'bootstrap/scss/${n}';\n${bridgeFor[n] ?? ''}`),
    ...componentNamesWithScss.map((n) => `${marker(`components/${n}`)}\n@import '../components/${n}/${n}';`),
  ].join('\n');
  const parts = compiler.string(entry).split(/\/\*! ui-split:(\S+) \*\//);
  const slices = new Map();
  for (let i = 1; i < parts.length; i += 2) slices.set(parts[i], parts[i + 1]);
  put('base.css', slices.get('base'));

  // Bootstrap partials
  const bootstrapClasses = {};
  const looseClasses = {};
  const bootstrapFiles = {};
  const bootstrapNeeds = {};
  const standalone = {};
  for (const name of optionalPartials) {
    const slice = slices.get(`bootstrap/${name}`);
    bootstrapClasses[name] = new Set([...definedClasses(slice, { owned: true })].map(normalizeClass));
    looseClasses[name] = new Set([...definedClasses(slice)].map(normalizeClass));
    bootstrapFiles[name] = `bootstrap/${name}.css`;
    put(bootstrapFiles[name], slice);
    standalone[name] = definedClasses(compiler.string(`${prelude}@import 'bootstrap/scss/${name}';\n`));
  }
  // A partial whose @extend targets live in another partial (`button-group` extends `.btn-sm`) has its rules inside
  // that other partial's file: it needs it.
  for (const q of optionalPartials) {
    const extra = [...definedClasses(slices.get(`bootstrap/${q}`))].filter((c) => !standalone[q].has(c));
    for (const p of optionalPartials) {
      if (p !== q && extra.some((c) => standalone[p].has(c))) (bootstrapNeeds[p] ??= new Set()).add(q);
    }
  }

  // Bootstrap utilities: one file per utility key and breakpoint. Bootstrap emits every key's base rules first, then one
  // block per breakpoint, so a later breakpoint wins over any base rule of any key; the pieces keep that order.
  const keysProbe = compiler.string(`${prelude}:root { --keys: #{map-keys($utilities)}; }`);
  const utilityKeys = /--keys:\s*([^;]+);/.exec(keysProbe)[1].split(',').map((k) => k.trim().replace(/^["']|["']$/g, ''));
  const utilityClasses = {};
  const utilityFiles = {};
  const phaseFiles = new Map(); // phase -> [{ key, file }]
  const BREAKPOINT_NAMES = { 576: 'sm', 768: 'md', 992: 'lg', 1200: 'xl', 1400: 'xxl' };
  const phaseRank = (phase) => (phase === 'base' ? -1 : /^\d+$/.test(phase) ? Number(phase) : 1e6);
  for (const key of utilityKeys) {
    const expanded = compiler.string(`${prelude}$utilities: map-get-multiple($utilities, ('${key}'));\n@import 'bootstrap/scss/utilities/api';\n`);
    if (!expanded.trim()) continue;
    utilityClasses[key] = new Set([...definedClasses(expanded)].map(normalizeClass));
    utilityFiles[key] = [];
    const byPhase = new Map();
    for (const unit of splitTopLevel(expanded)) {
      const media = /^@media\s+([^{]+)\{/.exec(unit);
      const width = media && /\(min-width:\s*(\d+)px\)/.exec(media[1]);
      const phase = media ? (width ? width[1] : media[1].trim()) : 'base';
      byPhase.set(phase, `${byPhase.get(phase) ?? ''}${unit}\n`);
    }
    for (const [phase, css] of byPhase) {
      const suffix = phase === 'base' ? '' : `@${BREAKPOINT_NAMES[phase] ?? phase.replace(/[^\w]+/g, '-')}`;
      const file = `utilities/${key}${suffix}.css`;
      put(file, css);
      utilityFiles[key].push(file);
      if (!phaseFiles.has(phase)) phaseFiles.set(phase, []);
      phaseFiles.get(phase).push(file);
    }
  }

  // Kit components
  const ownClasses = {};
  const componentFiles = {};
  for (const n of componentNamesWithScss) {
    const slice = slices.get(`components/${n}`);
    ownClasses[n] = definedClasses(slice);
    componentFiles[n] = `components/${n}.css`;
    put(componentFiles[n], slice);
  }

  const matches = (p, cls) => cls.startsWith(p.prefix) && cls.endsWith(p.suffix) && cls.length > p.prefix.length + p.suffix.length;
  const matchPartials = ({ exact, patterns }) => {
    const matched = { bootstrap: new Set(), utilities: new Set() };
    const bsNames = Object.keys(bootstrapClasses);
    const utNames = Object.keys(utilityClasses);
    for (const t of exact) {
      const n = normalizeClass(t);
      if (STATE_TOKENS.has(t)) continue;
      const owners = bsNames.filter((name) => bootstrapClasses[name].has(n));
      owners.forEach((name) => matched.bootstrap.add(name));
      const utils = utNames.filter((k) => utilityClasses[k].has(n));
      utils.forEach((k) => matched.utilities.add(k));
      // A class no partial owns (it only appears next to other classes, e.g. `.btn-group > .btn`) still needs the
      // partials that style it.
      if (!owners.length && !utils.length) bsNames.filter((name) => looseClasses[name].has(n)).forEach((name) => matched.bootstrap.add(name));
    }
    for (const p of patterns) {
      // `btn-${x}`: the partial owning `btn`; `border-${x}-subtle` / `spinner-${x}`: every piece with a matching class.
      const stem = p.prefix.replace(/-+$/, '');
      const stemOwners = p.suffix ? [] : bsNames.filter((name) => bootstrapClasses[name].has(stem));
      const hits = stemOwners.length ? stemOwners : bsNames.filter((name) => [...bootstrapClasses[name]].some((c) => matches(p, c)));
      hits.forEach((name) => matched.bootstrap.add(name));
      utNames.filter((k) => [...utilityClasses[k]].some((c) => matches(p, c))).forEach((k) => matched.utilities.add(k));
    }
    return matched;
  };

  const components = {};
  const exportsMap = {};
  const tokenCache = {};
  for (const n of names) {
    const dir = join(componentsDir, n);
    const exact = new Set();
    const patterns = [];
    const imports = new Set();
    for (const file of walkSources(dir)) {
      const text = readFileSync(file, 'utf8');
      const t = collectClassTokens(text, file);
      t.exact.forEach((x) => exact.add(x));
      patterns.push(...t.patterns);
      importedComponents(text, file, names).forEach((c) => c !== n && imports.add(c));
    }
    tokenCache[n] = { exact, patterns };
    components[n] = { imports };
    for (const name of exportedValueNames(join(dir, 'index.ts'))) exportsMap[name] ??= n;
  }

  // Cross-component needs by `ui-*` class usage (a component rendering another component's classes without importing it).
  for (const n of names) {
    const { exact, patterns } = tokenCache[n];
    const own = ownClasses[n] ?? new Set();
    for (const t of exact) {
      if (!t.startsWith('ui-') || own.has(t)) continue;
      for (const [other, set] of Object.entries(ownClasses)) if (other !== n && set.has(t)) components[n].imports.add(other);
    }
    for (const p of patterns) {
      if (!p.prefix.startsWith('ui-') || [...own].some((c) => matches(p, c))) continue;
      for (const [other, set] of Object.entries(ownClasses)) if (other !== n && [...set].some((c) => matches(p, c))) components[n].imports.add(other);
    }
  }

  // Foundation code (theme, hooks, utils; locale holds sentences, not class names) must not depend on Bootstrap partials or utilities.
  const foundation = {};
  for (const dir of ['theme', 'hooks', 'utils']) {
    const exact = new Set();
    const patterns = [];
    for (const file of walkSources(join(root, 'src', dir))) {
      const t = collectClassTokens(readFileSync(file, 'utf8'), file);
      t.exact.forEach((x) => exact.add(x));
      patterns.push(...t.patterns);
    }
    const m = matchPartials({ exact, patterns });
    if (m.bootstrap.size || m.utilities.size) foundation[dir] = { bootstrap: [...m.bootstrap], utilities: [...m.utilities] };
  }

  const sorted = (set, ref) => [...set].sort((a, b) => ref.indexOf(a) - ref.indexOf(b));
  const manifestComponents = {};
  for (const n of names) {
    const m = matchPartials(tokenCache[n]);
    manifestComponents[n] = {
      css: componentFiles[n] ?? null,
      bootstrap: sorted(m.bootstrap, partials),
      utilities: sorted(m.utilities, utilityKeys),
      needs: [...components[n].imports].sort((a, b) => a.localeCompare(b)),
    };
  }

  const cascade = [
    'base.css',
    ...optionalPartials.map((p) => bootstrapFiles[p]),
    ...[...phaseFiles.keys()].sort((a, b) => phaseRank(a) - phaseRank(b)).flatMap((phase) => phaseFiles.get(phase)),
    ...componentNamesWithScss.map((n) => componentFiles[n]),
  ];
  for (const f of cascade) sizes[f] = { bytes: files.get(f).length, gzip: gz(files.get(f)) };

  const manifest = {
    schema: 1,
    package: pkg.name,
    version: pkg.version,
    base: 'base.css',
    order: cascade,
    bootstrap: Object.fromEntries(
      optionalPartials.map((k) => [k, { css: bootstrapFiles[k], needs: [...(bootstrapNeeds[k] ?? [])], classes: [...bootstrapClasses[k]].sort() }]),
    ),
    utilities: Object.fromEntries(
      utilityKeys.filter((k) => utilityFiles[k]).map((k) => [k, { files: utilityFiles[k], classes: [...utilityClasses[k]].sort() }]),
    ),
    components: manifestComponents,
    exports: Object.fromEntries(Object.entries(exportsMap).filter(([, c]) => c in manifestComponents).sort(([a], [b]) => a.localeCompare(b))),
    sizes,
    foundation,
  };
  return { files, manifest };
}

export function writeStyleSplit({ root = defaultRoot, outDir = join(root, 'dist/styles'), minify = true } = {}) {
  const { files, manifest } = buildStyleSplit({ root, minify });
  rmSync(outDir, { recursive: true, force: true });
  for (const [path, css] of files) {
    const target = join(outDir, path);
    mkdirSync(dirname(target), { recursive: true });
    writeFileSync(target, css);
  }
  writeFileSync(join(outDir, 'manifest.json'), `${JSON.stringify(manifest, null, 1)}\n`);
  return { manifest, outDir };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const { manifest, outDir } = writeStyleSplit();
  const total = Object.values(manifest.sizes).reduce((a, s) => a + s.gzip, 0);
  console.log(`style split: ${manifest.order.length} files in ${outDir} (${(total / 1024).toFixed(1)} KB gzip when all loaded)`);
}
