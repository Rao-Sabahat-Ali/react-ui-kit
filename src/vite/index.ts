/**
 * `@sabahat/react-ui-kit/vite` — load only the CSS of the kit components an app uses.
 *
 * ```ts
 * // vite.config.ts
 * import { uiKitStyles } from '@sabahat/react-ui-kit/vite';
 * export default defineConfig({ plugins: [react(), uiKitStyles({ include: ['d-flex', 'gap-3'] })] });
 * // main.tsx
 * import 'virtual:ui-kit-styles';
 * ```
 *
 * Dependency-free (node built-ins only). Reads `dist/styles/manifest.json` shipped with the kit.
 */
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { dirname, extname, join, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { Plugin } from 'vite';

/** Public id of the virtual module the plugin provides. */
export const VIRTUAL_ID = 'virtual:ui-kit-styles';
const RESOLVED_ID = `\0${VIRTUAL_ID}`;

export interface StyleManifest {
  schema: number;
  package: string;
  version: string;
  base: string;
  /** Every css file in cascade order (relative to dist/styles). */
  order: string[];
  /** Bootstrap partials; `needs` are partials whose file holds rules this one extends (`button-group` -> `buttons`). */
  bootstrap: Record<string, { css: string; needs?: string[]; classes: string[] }>;
  /** Bootstrap utilities by key; one file per breakpoint (`display.css`, `display@md.css` …). */
  utilities: Record<string, { files: string[]; classes: string[] }>;
  components: Record<string, { css: string | null; bootstrap: string[]; utilities: string[]; needs: string[] }>;
  /** Exported component value name -> component folder. */
  exports: Record<string, string>;
}

export interface UiKitStylesOptions {
  /**
   * Bootstrap pieces the app uses directly, by class name (`'d-flex'`, `'mt-3'`, `'col-md-6'`, `'row'`),
   * utility key (`'spacing'` keys such as `'margin-top'`, `'display'`) or Bootstrap partial (`'grid'`, `'containers'`).
   */
  include?: string[];
  /** Kit components to add even though the source never imports them by name. */
  components?: string[];
  /** Kit components to drop from the *transitive* needs (e.g. `['DatePicker']` when DataTable column date filters are unused). */
  exclude?: string[];
  /** Directories scanned for `import { … } from '@sabahat/react-ui-kit'`. Default: `<root>/src`. */
  scan?: string[];
  /** Path to the kit's `manifest.json`. Default: the one next to this plugin inside the installed package. */
  manifest?: string;
  /** Package name used in emitted imports. Default: the name in the manifest. */
  packageName?: string;
}

export interface KitImports {
  /** Value names imported from the kit. */
  names: Set<string>;
  /** The source uses the kit in a way that cannot be analysed (namespace import, `export *`, dynamic import). */
  all: boolean;
}

const stripComments = (code: string) => code.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:\\])\/\/.*$/gm, '$1');

/** Finds the kit's named value imports in a source file (type-only imports are ignored). */
export function scanKitImports(code: string, packageName = '@sabahat/react-ui-kit'): KitImports {
  const result: KitImports = { names: new Set(), all: false };
  const pkg = packageName.replace(/[.*+?^${}()|[\]\\/]/g, '\\$&');
  const src = stripComments(code);
  const decl = new RegExp(`\\b(import|export)\\s+(type\\s+)?([\\w$\\s{},*]+?)\\s*from\\s*['"]${pkg}['"]`, 'g');
  for (const m of src.matchAll(decl)) {
    if (m[2]) continue;
    const clause = m[3] ?? '';
    if (m[1] === 'export' && clause.trim().startsWith('*')) result.all = true;
    if (/\*\s*as\s/.test(clause)) result.all = true;
    const braces = /\{([^}]*)\}/.exec(clause);
    if (braces) {
      for (const part of (braces[1] ?? '').split(',')) {
        const spec = part.trim();
        if (!spec || /^type\s/.test(spec)) continue;
        const imported = spec.split(/\s+as\s+/)[0]?.trim();
        if (imported) result.names.add(imported);
      }
    }
    // `import Kit from '@sabahat/react-ui-kit'` (default) is not a thing the kit exports, ignore.
  }
  if (new RegExp(`import\\(\\s*['"]${pkg}['"]\\s*\\)`).test(src)) result.all = true;
  return result;
}

const SOURCE = /\.(?:[cm]?[jt]sx?)$/;
const SKIP_DIR = new Set(['node_modules', 'dist', '.git', 'coverage']);

function listSources(dir: string): string[] {
  if (!existsSync(dir)) return [];
  const out: string[] = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (entry.isDirectory()) {
      if (!SKIP_DIR.has(entry.name)) out.push(...listSources(join(dir, entry.name)));
    } else if (SOURCE.test(entry.name) && !/\.(?:test|spec|stories)\.|\.d\.ts$/.test(entry.name)) {
      out.push(join(dir, entry.name));
    }
  }
  return out;
}

/** Union of kit imports across the given directories. */
export function scanDirectories(dirs: string[], packageName?: string): KitImports {
  const result: KitImports = { names: new Set(), all: false };
  for (const dir of dirs) {
    for (const file of listSources(dir)) {
      const found = scanKitImports(readFileSync(file, 'utf8'), packageName);
      found.names.forEach((n) => result.names.add(n));
      result.all ||= found.all;
    }
  }
  return result;
}

const BREAKPOINT = /-(sm|md|lg|xl|xxl)(?=-|$)/;
const normalize = (cls: string) => cls.replace(BREAKPOINT, '');

export interface Selection {
  /** Css files relative to dist/styles, in cascade order (base first). */
  files: string[];
  /** Kit components whose styles are included (direct + transitive). */
  components: string[];
  /** `include` entries that matched nothing. */
  unknown: string[];
}

/**
 * Pure selection: which css files an app needs.
 * @param names kit value imports (`Button`, `IndexItem` …); names that are not components (hooks, utils) are ignored
 */
export function selectStyleFiles(
  manifest: StyleManifest,
  { names = [], include = [], exclude = [] }: { names?: Iterable<string>; include?: string[]; exclude?: string[] } = {},
): Selection {
  const skip = new Set(exclude);
  const wanted = new Set<string>();
  const queue: string[] = [];
  for (const name of names) {
    const component = manifest.exports[name] ?? (name in manifest.components ? name : undefined);
    if (component) queue.push(component);
  }
  while (queue.length) {
    const next = queue.pop() as string;
    if (wanted.has(next)) continue;
    wanted.add(next);
    for (const need of manifest.components[next]?.needs ?? []) if (!skip.has(need)) queue.push(need);
  }

  const files = new Set<string>([manifest.base]);
  const addPartial = (name: string) => {
    const partial = manifest.bootstrap[name];
    if (!partial || files.has(partial.css)) return;
    files.add(partial.css);
    partial.needs?.forEach(addPartial);
  };
  const addUtility = (key: string) => manifest.utilities[key]?.files.forEach((f) => files.add(f));
  for (const name of wanted) {
    const c = manifest.components[name];
    if (!c) continue;
    if (c.css) files.add(c.css);
    c.bootstrap.forEach(addPartial);
    c.utilities.forEach(addUtility);
  }

  const unknown: string[] = [];
  for (const entry of include) {
    const cls = entry.replace(/^\./, '');
    let hit = false;
    if (manifest.bootstrap[cls]) {
      addPartial(cls);
      hit = true;
    }
    if (manifest.utilities[cls]) {
      addUtility(cls);
      hit = true;
    }
    if (!hit) {
      const stem = normalize(cls);
      for (const [name, piece] of Object.entries(manifest.bootstrap)) {
        if (!piece.classes.includes(stem)) continue;
        addPartial(name);
        hit = true;
      }
      for (const [key, piece] of Object.entries(manifest.utilities)) {
        if (!piece.classes.includes(stem)) continue;
        addUtility(key);
        hit = true;
      }
    }
    if (!hit) unknown.push(entry);
  }

  const rank = new Map(manifest.order.map((f, i) => [f, i]));
  return {
    files: [...files].sort((a, b) => (rank.get(a) ?? 0) - (rank.get(b) ?? 0)),
    components: [...wanted].sort(),
    unknown,
  };
}

/** Source of the virtual module for a selection. */
export function virtualModuleCode(packageName: string, files: string[]): string {
  return `${files.map((f) => `import '${packageName}/styles/${f}';`).join('\n')}\n`;
}

const FALLBACK = (packageName: string) => `import '${packageName}/styles.css';\n`;

function defaultManifestPath(): string {
  return join(dirname(fileURLToPath(import.meta.url)), 'styles', 'manifest.json');
}

export function uiKitStyles(options: UiKitStylesOptions = {}): Plugin {
  let manifest: StyleManifest | null = null;
  let scanDirs: string[] = [];
  let packageName = options.packageName ?? '@sabahat/react-ui-kit';
  let current = '';
  let warn: (message: string) => void = (m) => console.warn(m);

  const compute = (): string => {
    if (!manifest) return FALLBACK(packageName);
    const found = scanDirectories(scanDirs, packageName);
    if (found.all) {
      warn(`[ui-kit-styles] a namespace/dynamic import of ${packageName} cannot be analysed; loading the full styles.css`);
      return FALLBACK(packageName);
    }
    const selection = selectStyleFiles(manifest, {
      names: [...found.names, ...(options.components ?? [])],
      include: options.include,
      exclude: options.exclude,
    });
    for (const entry of selection.unknown) warn(`[ui-kit-styles] include "${entry}" matches no Bootstrap partial, utility or class`);
    return virtualModuleCode(packageName, selection.files);
  };

  return {
    name: 'ui-kit-styles',
    enforce: 'pre',
    configResolved(config) {
      const root = config.root;
      scanDirs = (options.scan ?? ['src']).map((d) => resolve(root, d));
      warn = (m) => config.logger.warn(m);
      const path = options.manifest ? resolve(root, options.manifest) : defaultManifestPath();
      if (existsSync(path)) {
        manifest = JSON.parse(readFileSync(path, 'utf8')) as StyleManifest;
        packageName = options.packageName ?? manifest.package;
      } else {
        config.logger.warn(`[ui-kit-styles] ${path} not found; falling back to the full styles.css`);
      }
    },
    resolveId(id) {
      return id === VIRTUAL_ID ? RESOLVED_ID : null;
    },
    load(id) {
      if (id !== RESOLVED_ID) return null;
      current = compute();
      return current;
    },
    configureServer(server) {
      const onSource = (file: string) => {
        if (!SOURCE.test(file) || !scanDirs.some((d) => file === d || file.startsWith(d + sep)) || extname(file) === '') return;
        const next = compute();
        if (next === current) return;
        const graph = server.environments?.client?.moduleGraph ?? server.moduleGraph;
        const mod = graph.getModuleById(RESOLVED_ID);
        if (mod) graph.invalidateModule(mod);
        server.ws.send({ type: 'full-reload' });
      };
      server.watcher.on('change', onSource).on('add', onSource).on('unlink', onSource);
    },
  };
}

export default uiKitStyles;
