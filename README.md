# react-ui-kit

React 19 + Bootstrap 5.3 component library for the personal design system — PrimeReact-level coverage without PrimeReact, light/dark themes, and app-type profiles (`saas`, `admin`, `dashboard`, `cms`, `pos`, `game`, `ecommerce`, `landing`).

Specs, tokens and rules: [`design-system-mcp`](https://github.com/Rao-Sabahat-Ali/design-system-mcp) (also an MCP server for coding agents).

## Use in an app

```bash
npm install react@^19 react-dom@^19
npm install github:Rao-Sabahat-Ali/react-ui-kit#main   # private: uses your git credentials; pin a tag for production
```

```tsx
import '@sabahat/react-ui-kit/styles.css';
import { ThemeProvider, Button, Field, InputText } from '@sabahat/react-ui-kit';

createRoot(root).render(
  <ThemeProvider profile="admin">
    <Field label="Email"><InputText type="email" /></Field>
    <Button>Save changes</Button>
  </ThemeProvider>
);
```

Add `themeScript({ profile })` output to `index.html` `<head>` to avoid a flash of the wrong theme.

## Loading only the styles you use

`@sabahat/react-ui-kit/styles.css` is everything (about 58 KB gzip, 430 KB raw) and keeps working unchanged. Pages that only use a few components can load just their CSS with the Vite plugin `@sabahat/react-ui-kit/vite`:

```ts
// vite.config.ts
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';
import { uiKitStyles } from '@sabahat/react-ui-kit/vite';

export default defineConfig({
  plugins: [react(), uiKitStyles({ include: ['d-flex', 'gap-3', 'row', 'col-md-6'] })],
});
```

```tsx
// main.tsx (instead of '@sabahat/react-ui-kit/styles.css')
import 'virtual:ui-kit-styles';
```

```ts
// vite-env.d.ts (TypeScript only)
declare module 'virtual:ui-kit-styles';
```

`virtual:ui-kit-styles` is a virtual module the plugin generates: one `import` per CSS file, in cascade order, for **only** what the app needs:

- `base.css` (always): self-hosted fonts, all design tokens (profiles, light/dark/contrast, density), Bootstrap config, root, reboot, type and helpers, the token bridge, kit utilities and reduced motion.
- the stylesheet of every kit component the app source imports by name (`import { Button, Toast } from '@sabahat/react-ui-kit'`; `type` imports are ignored), plus the components those need (`needs` in the manifest, derived from their TSX imports and class usage; `Button` -> `Icon`, `Spinner`).
- the Bootstrap partials (`buttons`, `forms`, `modal` …) and utilities (`display`, `flex`, … with their breakpoint variants) those components render.

Options (all optional):

| Option | Meaning |
|---|---|
| `include: string[]` | Bootstrap the app uses **directly** by class name: `'d-flex'`, `'mt-3'`, `'col-md-6'`, `'row'`; or a utility key (`'display'`) or partial (`'grid'`, `'containers'`). Unknown entries warn. |
| `components: string[]` | Kit components to add although the source never names them. |
| `exclude: string[]` | Components to drop from the *transitive* needs, e.g. `['DatePicker']` when no `DataTable` column uses a date filter. Components you import by name are never dropped. |
| `scan: string[]` | Directories scanned for kit imports. Default `['src']`; add other source roots (monorepo packages). |
| `manifest`, `packageName` | Override the manifest path / package name (rarely needed). |

Good to know:

- The plugin scans source files with a regular expression (named imports, `export … from`, multi-line, comments). A namespace import (`import * as UI`), `export *` or a dynamic `import()` of the kit cannot be analysed, so it logs a warning and loads the full `styles.css`. The same fallback applies if `dist/styles/manifest.json` is missing (an older kit).
- It works in `vite dev` too: adding a new kit import to a source file reloads the page with the extra styles.
- Bootstrap classes the **app** writes itself (`<div className="d-flex gap-3">`) are not detectable; list them in `include`. Classes the kit renders are covered by the manifest.
- Dynamic class names in app code (`` `p-${n}` ``) need an `include` entry per class family (`'p-3'` loads the whole `padding` utility).
- Each piece is an exact slice of the full stylesheet (the build compiles `styles.css` once and cuts it at markers; a test proves the pieces are a partition), and the docs app is checked page by page to render with identical computed styles.

The pieces ship in the package as `dist/styles/**` (`@sabahat/react-ui-kit/styles/*`): `base.css`, `bootstrap/<partial>.css`, `utilities/<key>[@<breakpoint>].css`, `components/<Name>.css` and `manifest.json` (per component: its css file, the Bootstrap partials, utilities and other components it needs; the global cascade `order`; gzip size of every file). `node scripts/measure-style-split.mjs [Component …]` prints the size an app would load.

## Status

Implemented (v0.2.0): ThemeProvider, LocaleProvider, Icon, Button, Spinner, Field, InputText, Checkbox/CheckboxGroup, RadioGroup, Switch, SelectButton, Select (custom + native), Card, StatCard, Badge, Tag, Skeleton, ProgressBar, Message, Toast, EmptyState, Dialog, ConfirmDialog, Drawer, Tabs, Paginator, DataTable (phase 1), AppShell, Topbar, SidebarNav, BottomNav, PageHeader, Portal, FocusTrap, ThemeToggle (toggle mode).
Everything else is specified and queued in [tasks.md](tasks.md). Live catalogue: `npm run dev`.

## Development

```bash
npm install
npm run dev     # docs app http://localhost:5180
npm run check   # typecheck + tests + build
```

See [CLAUDE.md](CLAUDE.md) for the spec-driven workflow, agents and conventions.
