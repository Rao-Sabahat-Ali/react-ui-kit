import { mkdirSync, mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { scanDirectories, scanKitImports, selectStyleFiles, uiKitStyles, virtualModuleCode, type StyleManifest } from './index';

const manifest: StyleManifest = {
  schema: 1,
  package: '@sabahat/react-ui-kit',
  version: '0.0.0',
  base: 'base.css',
  order: [
    'base.css',
    'bootstrap/forms.css',
    'bootstrap/buttons.css',
    'bootstrap/grid.css',
    'bootstrap/button-group.css',
    'utilities/display.css',
    'utilities/spacing.css',
    'utilities/display@md.css',
    'components/Button.css',
    'components/Field.css',
    'components/Icon.css',
    'components/InputText.css',
    'components/Spinner.css',
  ],
  bootstrap: {
    forms: { css: 'bootstrap/forms.css', classes: ['form-control'] },
    buttons: { css: 'bootstrap/buttons.css', classes: ['btn', 'btn-primary'] },
    grid: { css: 'bootstrap/grid.css', classes: ['row', 'col', 'col-6', 'container'] },
    'button-group': { css: 'bootstrap/button-group.css', needs: ['buttons'], classes: ['btn-group'] },
  },
  utilities: {
    display: { files: ['utilities/display.css', 'utilities/display@md.css'], classes: ['d-flex', 'd-none'] },
    spacing: { files: ['utilities/spacing.css'], classes: ['mt-3', 'p-2'] },
  },
  components: {
    Button: { css: 'components/Button.css', bootstrap: ['buttons'], utilities: [], needs: ['Icon', 'Spinner'] },
    Field: { css: 'components/Field.css', bootstrap: ['forms'], utilities: [], needs: [] },
    Icon: { css: 'components/Icon.css', bootstrap: [], utilities: [], needs: [] },
    InputText: { css: 'components/InputText.css', bootstrap: ['forms'], utilities: ['display'], needs: ['Field', 'Icon'] },
    Spinner: { css: 'components/Spinner.css', bootstrap: [], utilities: [], needs: [] },
    ThemeToggle: { css: null, bootstrap: [], utilities: [], needs: ['Button'] },
  },
  exports: { Button: 'Button', Field: 'Field', Icon: 'Icon', InputText: 'InputText', Spinner: 'Spinner', ThemeToggle: 'ThemeToggle', IndexItem: 'Icon' },
};

describe('scanKitImports', () => {
  it('collects named value imports and ignores types', () => {
    const r = scanKitImports(`import { Button, type ButtonProps, InputText as Input } from '@sabahat/react-ui-kit';
      import type { Field } from '@sabahat/react-ui-kit';
      import { Other } from 'somewhere-else';`);
    expect([...r.names].sort()).toEqual(['Button', 'InputText']);
    expect(r.all).toBe(false);
  });

  it('handles multi-line imports, default + named and comments', () => {
    const r = scanKitImports(`import {
      // Icon, commented out
      Icon,
      Spinner,
    } from "@sabahat/react-ui-kit";
    /* import { Dialog } from '@sabahat/react-ui-kit'; */`);
    expect([...r.names].sort()).toEqual(['Icon', 'Spinner']);
  });

  it('flags usages it cannot analyse', () => {
    expect(scanKitImports(`import * as UI from '@sabahat/react-ui-kit';`).all).toBe(true);
    expect(scanKitImports(`export * from '@sabahat/react-ui-kit';`).all).toBe(true);
    expect(scanKitImports(`const m = await import('@sabahat/react-ui-kit');`).all).toBe(true);
  });

  it('re-exports count as imports', () => {
    expect([...scanKitImports(`export { Button } from '@sabahat/react-ui-kit';`).names]).toEqual(['Button']);
  });
});

describe('selectStyleFiles', () => {
  it('returns base + needed pieces in manifest order, with transitive component needs', () => {
    const r = selectStyleFiles(manifest, { names: ['Button'] });
    expect(r.files).toEqual(['base.css', 'bootstrap/buttons.css', 'components/Button.css', 'components/Icon.css', 'components/Spinner.css']);
    expect(r.components).toEqual(['Button', 'Icon', 'Spinner']);
  });

  it('follows needs of components without a stylesheet', () => {
    expect(selectStyleFiles(manifest, { names: ['ThemeToggle'] }).files).toContain('components/Button.css');
  });

  it('merges partials, utilities and components, deduplicated and ordered', () => {
    const r = selectStyleFiles(manifest, { names: ['InputText', 'Button', 'Field'] });
    expect(r.files).toEqual([
      'base.css',
      'bootstrap/forms.css',
      'bootstrap/buttons.css',
      'utilities/display.css',
      'utilities/display@md.css',
      'components/Button.css',
      'components/Field.css',
      'components/Icon.css',
      'components/InputText.css',
      'components/Spinner.css',
    ]);
  });

  it('resolves exported helper names to their component and ignores unknown names', () => {
    expect(selectStyleFiles(manifest, { names: ['IndexItem', 'useTheme', 'ThemeProvider'] }).components).toEqual(['Icon']);
  });

  it('loads only base for an app that imports no components', () => {
    expect(selectStyleFiles(manifest, { names: ['ThemeProvider'] }).files).toEqual(['base.css']);
  });

  it('adds Bootstrap pieces for include entries given as class names, groups or partials', () => {
    const r = selectStyleFiles(manifest, { names: ['Icon'], include: ['d-md-flex', 'mt-3', 'col-md-6', 'row', 'grid', 'nope-9'] });
    expect(r.files).toEqual(['base.css', 'bootstrap/grid.css', 'utilities/display.css', 'utilities/spacing.css', 'utilities/display@md.css', 'components/Icon.css']);
    expect(r.unknown).toEqual(['nope-9']);
  });

  it('pulls in partials that hold rules a partial extends', () => {
    expect(selectStyleFiles(manifest, { names: [], include: ['btn-group'] }).files).toEqual(['base.css', 'bootstrap/buttons.css', 'bootstrap/button-group.css']);
  });

  it('can drop components from the transitive needs', () => {
    const r = selectStyleFiles(manifest, { names: ['Button'], exclude: ['Spinner'] });
    expect(r.components).toEqual(['Button', 'Icon']);
  });

  it('emits one import per file through the package exports', () => {
    expect(virtualModuleCode('@sabahat/react-ui-kit', ['base.css', 'components/Icon.css'])).toBe(
      "import '@sabahat/react-ui-kit/styles/base.css';\nimport '@sabahat/react-ui-kit/styles/components/Icon.css';\n",
    );
  });
});

describe('uiKitStyles plugin', () => {
  function project(files: Record<string, string>) {
    const dir = mkdtempSync(join(tmpdir(), 'ui-kit-styles-'));
    for (const [name, content] of Object.entries(files)) {
      mkdirSync(join(dir, name, '..'), { recursive: true });
      writeFileSync(join(dir, name), content);
    }
    writeFileSync(join(dir, 'manifest.json'), JSON.stringify(manifest));
    return dir;
  }
  const setup = (dir: string, options: Parameters<typeof uiKitStyles>[0] = {}, withManifest = true) => {
    const warnings: string[] = [];
    const plugin = uiKitStyles({ manifest: withManifest ? join(dir, 'manifest.json') : join(dir, 'missing.json'), ...options });
    const configResolved = plugin.configResolved as (c: unknown) => void;
    configResolved({ root: dir, logger: { warn: (m: string) => warnings.push(m) } });
    const resolveId = plugin.resolveId as (id: string) => string | null;
    const load = plugin.load as (id: string) => string | null;
    return { warnings, resolveId, load, plugin };
  };

  it('resolves the virtual module and loads imports for the components found in src', () => {
    const dir = project({
      'src/main.tsx': `import { Button } from '@sabahat/react-ui-kit';\nimport '@sabahat/react-ui-kit/styles.css';`,
      'src/pages/Home.tsx': `import { InputText, type ButtonProps } from '@sabahat/react-ui-kit';`,
      'src/ignored.test.tsx': `import { Spinner } from '@sabahat/react-ui-kit';`,
    });
    const { resolveId, load } = setup(dir, { include: ['d-flex'] });
    const id = resolveId('virtual:ui-kit-styles');
    expect(id).toBe('\0virtual:ui-kit-styles');
    expect(resolveId('something-else')).toBeNull();
    expect(load(id as string)).toBe(
      [
        'base.css',
        'bootstrap/forms.css',
        'bootstrap/buttons.css',
        'utilities/display.css',
        'utilities/display@md.css',
        'components/Button.css',
        'components/Field.css',
        'components/Icon.css',
        'components/InputText.css',
        'components/Spinner.css',
      ]
        .map((f) => `import '@sabahat/react-ui-kit/styles/${f}';`)
        .join('\n') + '\n',
    );
    expect(load('other')).toBeNull();
  });

  it('scans extra directories and honours `components`', () => {
    const dir = project({ 'src/main.tsx': '', 'packages/ui/a.ts': `import { Icon } from '@sabahat/react-ui-kit';` });
    const { resolveId, load } = setup(dir, { scan: ['src', 'packages'], components: ['Spinner'] });
    const code = load(resolveId('virtual:ui-kit-styles') as string) as string;
    expect(code).toContain('components/Icon.css');
    expect(code).toContain('components/Spinner.css');
    expect(code).not.toContain('Button.css');
  });

  it('falls back to the full stylesheet when the manifest is missing', () => {
    const dir = project({ 'src/main.tsx': `import { Button } from '@sabahat/react-ui-kit';` });
    const { resolveId, load, warnings } = setup(dir, {}, false);
    expect(load(resolveId('virtual:ui-kit-styles') as string)).toBe("import '@sabahat/react-ui-kit/styles.css';\n");
    expect(warnings[0]).toMatch(/falling back/);
  });

  it('falls back to the full stylesheet for namespace imports', () => {
    const dir = project({ 'src/main.tsx': `import * as UI from '@sabahat/react-ui-kit';` });
    const { resolveId, load, warnings } = setup(dir);
    expect(load(resolveId('virtual:ui-kit-styles') as string)).toBe("import '@sabahat/react-ui-kit/styles.css';\n");
    expect(warnings[0]).toMatch(/cannot be analysed/);
  });

  it('warns about include entries that match nothing', () => {
    const dir = project({ 'src/main.tsx': `import { Icon } from '@sabahat/react-ui-kit';` });
    const { resolveId, load, warnings } = setup(dir, { include: ['d-flexx'] });
    load(resolveId('virtual:ui-kit-styles') as string);
    expect(warnings.join()).toContain('d-flexx');
  });

  it('scanDirectories skips node_modules and dist', () => {
    const dir = project({
      'src/a.ts': `import { Icon } from '@sabahat/react-ui-kit';`,
      'src/node_modules/x/b.ts': `import { Button } from '@sabahat/react-ui-kit';`,
      'src/dist/c.ts': `import { Spinner } from '@sabahat/react-ui-kit';`,
    });
    expect([...scanDirectories([join(dir, 'src')]).names]).toEqual(['Icon']);
  });
});
