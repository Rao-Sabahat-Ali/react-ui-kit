# react-ui-kit

React 19 + Bootstrap 5.3 component library for the personal design system — PrimeReact-level coverage without PrimeReact, light/dark themes, and app-type profiles (`saas`, `admin`, `dashboard`, `cms`, `pos`, `game`, `ecommerce`, `landing`).

Specs, tokens and rules: [`design-system-mcp`](https://github.com/Rao-Sabahat-Ali/design-system-mcp) (also an MCP server for coding agents).

## Install

```bash
npm install @sabahat/react-ui-kit react react-dom
```

Requires React 19. Bootstrap is compiled into the stylesheet; install `bootstrap` only if you import the SCSS (`@sabahat/react-ui-kit/scss/*`).

```tsx
import '@sabahat/react-ui-kit/styles.css';
import { ThemeProvider, PageHeader, Section, IndexList, IndexItem, Button } from '@sabahat/react-ui-kit';

createRoot(root).render(
  <ThemeProvider profile="saas">
    <PageHeader title="Today" actions={<Button>Start</Button>} />
    <Section title="Next steps">
      <IndexList>
        <IndexItem title="Review" description="8 words are waiting." action={<Button appearance="outline">Start</Button>} />
      </IndexList>
    </Section>
  </ThemeProvider>
);
```

Add `themeScript({ profile })` output to `index.html` `<head>` to avoid a flash of the wrong theme. Fonts (Albert Sans) ship in the package and load from your own origin. For the fastest first paint preload the latin file (`<link rel="preload" as="font" type="font/woff2" crossorigin href="…/fonts/albert-sans-latin-wght-normal.woff2">`, the URL your bundler gives `@sabahat/react-ui-kit/dist/fonts/albert-sans-latin-wght-normal.woff2`), and if you precache assets in a service worker include the four `albert-sans-*.woff2` files (latin and latin-ext, normal and italic) instead of the old Fraunces and Instrument Sans files.

## Design contract

The look is the "Monteringsanvisning" (assembly sheet) identity: white instruction paper, a kraft shell, 2px ink lines, an ink primary action, a signal-blue accent, Albert Sans, quantity marks (`12×`) and numbered step panels for multi-step work. Build screens from `PageHeader`, `Section`, `IndexList`, `StatGroup` (the parts list), `StepSheet` and `DataTable`. Specs, tokens, patterns and the consistency rules live in [design-system-mcp](https://github.com/Rao-Sabahat-Ali/design-system-mcp) (an MCP server for coding agents).

## Start from a blueprint

The docs app has a **Blueprints** section: complete, runnable screens (analytics dashboard, admin list to detail, task board, overview and index page, settings, sign in, article/detail, checkout) built only from kit components and the design contract. Their source is `templates/blueprints/`.

```bash
npm run create-app -- ../my-dashboard --profile dashboard   # home screen = Analytics dashboard blueprint
npm run create-app -- ../my-backoffice --profile admin      # home screen = Admin list to detail blueprint
npm run create-app -- ../my-board --profile saas --blueprint board # home screen = Task board blueprint (any profile)
npm run create-app -- ../my-app --profile dashboard --blank # empty starter page instead
```

Generated apps load only the styles they use: `vite.config.ts` registers `uiKitStyles({ include: [...] })` from `@sabahat/react-ui-kit/vite`, `main.tsx` imports `virtual:ui-kit-styles` and `src/vite-env.d.ts` declares that module (see "Loading only the styles you use" below). When you write a new Bootstrap class yourself (`className="d-flex gap-3"`), add it to `include`.

## Payments and PCI scope

`PaymentMethodSelector`, `PaymentCardForm`, `OrderSummary` and `PaymentStatus` are UI only: the kit never talks to a payment provider and never stores card data. Use `PaymentCardForm` in its default **hosted** mode and mount your provider's hosted fields (Stripe Elements, Adyen, ...) into the slots it gives you (`onReady(field, element)`); card data then never enters your page (smallest PCI scope, SAQ A). Pass `paymentFieldStyle(element)` to the provider so its iframes match the theme.

`mode="raw"` renders real inputs (brand grouping, Luhn, expiry, CVC) for tokenisation APIs and tests. It puts card data through your page's JavaScript and widens your PCI DSS scope (SAQ A-EP or D): `PAYMENT_RAW_MODE_NOTICE` repeats this. Its `onChange` never carries the number, expiry or CVC (only `{ brand, complete, errors, last4 }`), nothing is logged, stored or put in attributes, and values are cleared after submit and on unmount.

Security notes: raw-mode card inputs are uncontrolled (values never appear in DOM attributes); do not nest `PaymentCardForm` in another `<form>`; unmount provider elements in `onDestroy`; never put card data or secrets on the clipboard (`CopyButton` is for non-secret text; `sensitive` only withholds the text from `onCopy`, the clipboard is not cleared).

Always server-side: create the payment, derive provider idempotency keys, recompute amounts, handle 3-D Secure and confirm the result by webhook; never mark an order paid from the client. Docs and tests use published test numbers only (4242 4242 4242 4242, 5555 5555 5555 4444, 3782 822463 10005). No card-scheme logos ship; pass your own licensed `icon`. See the Checkout blueprint and design-system-mcp `rules/security.md` ("Payments").

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

All specified components are implemented (see the [live catalogue](https://react-ui-kit-docs.vercel.app) and [CHANGELOG](CHANGELOG.md)). Every component ships with WCAG 2.2 AA keyboard and screen-reader support, light/dark themes and eight app profiles.

## Development

```bash
npm install
npm run dev     # docs app http://localhost:5180
npm run check   # typecheck + tests + build
```

See [CLAUDE.md](CLAUDE.md) for the spec-driven workflow, agents and conventions.
