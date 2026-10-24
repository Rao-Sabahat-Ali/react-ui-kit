# Changelog

All notable changes to `@sabahat/react-ui-kit`. Versions follow [semver](https://semver.org/); each release is a git tag (`vX.Y.Z`) and the design-system-mcp submodule is bumped to it.

## 1.4.0 — 2026-10-24
Finishes the spec: every specified component now has code, tests and a live docs example, and the last PrimeReact gaps are closed.

### Added
- `IftaLabel` — label inside the control's border, above the value; works with InputText, InputTextarea and Select (custom and native) through the Field control contract (`help`, `error`, `required`).
- `ImageCompare` — before/after slider (`role="slider"`, pointer and keyboard: arrows, Page Up/Down, Home/End, `aria-valuenow`/`aria-valuetext`), corner labels, controlled or uncontrolled, RTL-aware clipping, no transition under reduced motion.
- `AnimateOnScroll` — reveals content once (or repeatedly with `once={false}`) when it scrolls into view via IntersectionObserver; `fade` and `slide-up` presets using only opacity and transform; visible immediately without IntersectionObserver, under reduced motion and in server output.
- `Terminal` — command console: labelled input, `onCommand` returning text or ReactNode (sync or async), ArrowUp/ArrowDown history, built-in `clear`, `role="log"` output that is announced and keyboard-scrollable.
- `Tabs` `scrollable`: horizontal scrolling tab row with previous/next buttons that exist only while the tabs overflow (real, labelled buttons kept out of the tab order; arrow keys and selection scroll the active tab into view; RTL-aware; instant under reduced motion).
- `Drawer` `responsive` (`'md' | 'lg' | 'xl'`): inline `complementary` panel from the breakpoint up, normal drawer below it.
- `AppShell` `header` prop (alias of `topbar`); the default `variant` now follows the active ThemeProvider profile (`sidebar`, `top-nav` for ecommerce/landing, `full-bleed` for pos/game).
- Docs examples for ThemeProvider (profile, theme, density and contrast switching), LocaleProvider (message overrides, number/date formatting, RTL), FocusTrap and Portal; the docs registry also discovers `src/theme/*.examples.tsx` and `src/locale/*.examples.tsx`, so all 121 specs show as implemented.
- Locale keys: `tabsScrollBack`, `tabsScrollForward`, `imageCompare*`, `terminal*`.
- RTL detection for `sd`, `ug` and `ckb` in LocaleProvider.

### Changed
- `create-app` starters (and the dashboard/admin blueprint starters) use the style plugin by default: `vite.config.ts` has `uiKitStyles({ include: [...] })` from `@sabahat/react-ui-kit/vite`, `main.tsx` imports `virtual:ui-kit-styles`, and `src/vite-env.d.ts` declares the module. Pass-through lists of Bootstrap classes live in `scripts/profile-shells.mjs` and are checked against the generated sources by `test/create-app.test.ts`.
- The Settings blueprint uses `Tabs scrollable` instead of utility classes.
- Blueprint shells and the AppShell example pass `variant="sidebar"` explicitly.

### Fixed
- `Drawer` reduced motion: the per-edge animation rule outranked the reduced-motion rule, so the slide still ran; it is now disabled.

### Tests
- Added the previously missing AC tests: Drawer AC-4..AC-11, LocaleProvider AC-1/AC-2, AppShell AC-4, Portal AC-2, Toast AC-5; a registry test that every spec has docs examples; the e2e docs test now visits every component page and rejects "Not implemented yet". Test helper `test/scss.ts` compiles component SCSS to assert rules jsdom cannot evaluate (media queries).

## 1.3.0 — 2026-10-24
Blueprints: complete, runnable screens built only from kit components and the design contract, so every personal app looks and behaves the same without re-explaining the design.

### Added
- `TimePicker` — time-of-day input as a segmented spinbutton group (hours, minutes, optional seconds, AM/PM). 12/24-hour by locale, `step`, `min`/`max`, `'HH:mm'` string value, typing + arrow/Page/Home/End keys, Field integration, RTL, hidden form input.
- `DataScroller` — infinite list loaded in chunks via `loadMore`. Inline scroll box or window, auto (IntersectionObserver) or manual loading, always-present keyboard "Load more" button, loading/empty/error-with-retry states, live-region announcements.
- Locale keys: `emptyValue`, `loadMore`, `loadingMore`, `loadFailed`, `retry`, `itemsLoaded_one/_other`, `endOfList`.

- **Blueprints** section in the docs app (`#/blueprints`, listed in the docs navigation) with six live, deterministic example screens, each with a "Pattern" note (MCP pattern slugs), the highlights and a "Copy source" block:
  - **Analytics dashboard** (profile `dashboard`): AppShell, Topbar and SidebarNav; PageHeader with a date-range Select and one ink action; StatGroup of four KPIs with deltas and sparklines; line chart (current against previous period) and bar chart, each with a text summary and table fallback; sortable, filterable, paginated DataTable of orders with Tag statuses and an identical overflow menu per row; activity Timeline; per-widget Skeleton, empty and error states with Retry; light and dark, comfortable and compact density.
  - **Admin list to detail** (profile `admin`): DataTable with search, status filter, selection and pagination; row click opens a Drawer; bulk Toolbar; ConfirmDialog that names the object; New invoice form in a Drawer with an error summary.
  - **Overview and index page** (profile `saas`): the `overview` and `index-page` patterns.
  - **Settings page**: vertical Tabs (scrollable row below lg), Sections, Fields, instant Switches, explicit Save with validation, discard prompt, danger zone.
  - **Sign in and reset**: the `auth` pattern (generic errors, autocomplete, password requirements).
  - **Article and detail page**: the `article-detail` pattern with loading and not-found states.
- Blueprint sources live in `templates/blueprints/` (one file per screen plus `*.data.ts`), shared by the docs and the starters.
- `create-app --profile dashboard` and `--profile admin` scaffold the Analytics dashboard / Admin list-detail blueprint as the home screen (`src/screens/`, copied from `templates/blueprints`); `--blank` keeps the empty starter page. Generated apps are type-checked in `test/create-app.test.ts`.
- Tests: a vitest smoke suite per blueprint (one h1, ordered headings, one main landmark, no console errors, states) plus interaction tests; Playwright visits every blueprint at 1280 px and 390 px (no horizontal scroll). `E2E_PORT` overrides the e2e preview port.

### Changed
- `Card` accepts `titleAs="h1"` (the auth pattern uses the card title as the page heading).
- `Timeline` wraps long words (`overflow-wrap: anywhere`) so emails and tracking numbers never widen the page.
- Docs: `CodeBlock` takes `label` and `tall`; the docs navigation becomes a drawer on blueprint pages so the frame gets the full width.

### Per-component styles
Load only the CSS of the components an app uses. `@sabahat/react-ui-kit/styles.css` is unchanged (byte-identical output), so nothing breaks for apps that want everything.

#### Added
- `dist/styles/**`: the stylesheet split into `base.css` (fonts, tokens, Bootstrap root/reboot/type/helpers, bridge, reduced motion), `bootstrap/<partial>.css`, `utilities/<key>[@<bp>].css` (Bootstrap emits every key's base rules before any breakpoint block; the pieces keep that order), `components/<Name>.css`, and `manifest.json` (per component: css file, Bootstrap partials, utilities, other components needed, derived at build time from TSX imports and class usage; exported names; cascade order; sizes). Exposed as `@sabahat/react-ui-kit/styles/*`.
- `@sabahat/react-ui-kit/vite`: dependency-free ESM Vite plugin. `import 'virtual:ui-kit-styles'` resolves to imports of only `base.css` + the partials, utilities and components the app source imports from the kit (plus `include` for Bootstrap classes the app uses directly, `components`, `exclude`, `scan`). Works in dev, falls back to `styles.css` when it cannot analyse the imports or the manifest is missing. See the README section "Loading only the styles you use".
- `scripts/build-style-split.mjs` (run by `npm run build`) and `scripts/measure-style-split.mjs`.
- Tests: manifest generator and plugin (source imports -> expected css list and order), a partition test (the pieces contain exactly the rules of the full stylesheet, including selectors Sass merged through `@extend`), a build-output test, and an e2e check that renders every docs page with only the pieces it needs and compares computed styles with the full stylesheet.

#### Changed
- `src/styles/_bridge.scss` is now a set of mixins in `_bridge-parts.scss` so each Bootstrap override ships with the partial it overrides; `_bridge.scss` emits them in the original order (`dist/styles.css` is byte-identical to 1.2.0).
- Package `exports` gains `./vite` and `./styles/*`; `package.json` version 1.3.0.

### Measured
Render-blocking CSS (all pieces concatenated, as an app bundle ships them) for an app using PageHeader, Section, IndexList, StatCard, StatGroup, Button, Tag, SelectButton, InputText, Tabs, Toast, ProgressBar, EmptyState, Skeleton, ThemeToggle, AppShell, Topbar, SidebarNav, BottomNav, ConfirmDialog, Dialog, DataTable and Message (37 components with their needs):

| | raw | gzip | brotli |
|---|---|---|---|
| `styles.css` (everything) | 430.7 KB | 58.3 KB | 43.9 KB |
| `virtual:ui-kit-styles` | 256.7 KB | 36.6 KB | 28.1 KB |

That is 37% less gzip; a Button-only app loads 15.1 KB gzip (11.9 KB brotli). The remaining floor is `base.css` (9.8 KB gzip, mostly the tokens of all eight profiles) and the Bootstrap partials the kit renders (about 16 KB gzip).

## 1.2.1 — 2026-10-24
First npm release (`npm install @sabahat/react-ui-kit`): MIT license, package metadata, README for external use, `prepublishOnly` gate. No code changes since 1.2.0.

## 1.2.0 — 2026-10-24
Layout primitives for cross-screen consistency (design-system-mcp 0.5.0, `rules/consistency`).

### Added
- `Section` — titled part of a page (heading, description, actions, optional hairline), labelled region.
- `IndexList` / `IndexItem` — ruled list of things to open or act on; replaces grids of equal cards. Supports whole-row links, trailing actions, compact multi-column indexes.
- `StatGroup` — ruled row of headline numbers; `StatCard` inside it renders plain automatically.
- Docs examples for all three; `StatCard` `variant` is now optional (`plain` inside a group).

## 1.1.1 — 2026-10-24
### Changed
- Fraunces ships as the `wght` variable file (37 KB latin instead of 67 KB with the optical-size axis) so the first screen paints faster on slow connections.

## 1.1.0 — 2026-10-24

New visual identity from design-system-mcp 0.4.0 (**Nordic editorial**). No component API was removed; the look changes everywhere.

### Changed (visual)
- Tokens regenerated: warm paper surfaces, ink primary, pine accent, earthy status and chart colours; warm charcoal dark theme; radii 2 / 4 / 8 px; subtler warm shadows.
- Selection, checked, current-page, progress, active tab and active menu states use the new **accent** tokens instead of primary (about 30 components); primary is reserved for the main action.
- Headings, card titles, page titles, stat values and the Topbar brand use the heading family (Fraunces) with tuned weight and tracking; `::selection`, `code` and link underlines follow the accent.
- Flat resting surfaces: Card/StatCard hover strengthens the border instead of adding a shadow; Dock and BlockUI drop backdrop blur; EmptyState and StatCard icons are plain glyphs (no tinted circles); SidebarNav sections are ruled (no caps) with a pine edge marker for the active item; PageHeader gets an editorial rule.
- Form controls use `--ui-color-border-input` (≥ 3:1 contrast).

### Added
- Self-hosted OFL fonts (Fraunces, Instrument Sans; latin + latin-ext, `unicode-range`), shipped as `dist/fonts/*.woff2` and referenced from `dist/styles.css`. No third-party font requests; strict CSPs keep working.
- `StatCard` `variant="plain"` and the `.ui-stat-group` ruled row for key numbers (StatCard AC-4, AC-5).

## 1.0.0 — 2026-10-24

First stable release: every component specified in design-system-mcp (110) is implemented, tested against its acceptance criteria and shown in the docs app.

### Breaking
- The locale catalogue type is exported as `LocaleMessages` (was `Messages`, which now names the `Messages` component).
- Hard-coded English labels moved to locale keys (`src/locale/en.ts`); apps overriding strings should use `LocaleProvider` `messages`.

### Added
- **Forms:** AutoComplete, CascadeSelect, Chips, ColorPicker, DatePicker, FileUpload, FloatLabel, IconField, InputGroup, InputMask, InputNumber, InputOtp, InputTextarea, KeyFilter, Knob, ListBox, Mention, MultiSelect, MultiStateCheckbox, Password, Rating, Slider, ToggleButton, TreeSelect, TriStateCheckbox.
- **Data:** DataTable phase 2/3 (column and global filters, lazy/server mode, resize, reorder, frozen columns, row expansion, column visibility, CSV export with formula-injection escaping, state persistence, cell/row editing, virtual scroll, grouping, APG grid navigation, context menu), DataView, OrderList, OrganizationChart, PickList, Scheduler, Timeline, Tree, TreeTable, VirtualScroller.
- **Overlays & menus:** CommandPalette, ConfirmPopup, ContextMenu, Dock, MegaMenu, Menu, Menubar, PanelMenu, Popover, SpeedDial, SplitButton, TabMenu, TieredMenu, Tooltip; shared `useOverlay` (stacking, inert background, focus trap and restore).
- **Layout & media:** Accordion, Avatar, BlockUI, Breadcrumb, Carousel, Chart (SVG, no dependency), Chip, DeferredContent, Divider, Editor (sanitised rich text), Fieldset, Galleria, Grid, Image, Inplace, Kbd, Link, MeterGroup, Messages, Panel, ScrollPanel, ScrollTop, Splitter, Stack, Stepper, Steps, Toolbar, DateFormat, NumberFormat.
- ThemeToggle menu mode (light / dark / system).
- Starter template and `create-app` script per app profile.
- Tooling: ESLint (react-hooks, jsx-a11y), Playwright e2e + visual tests, CI, bundle budget.

### Fixed / accessibility
- Touch targets: icon-only buttons and the PageHeader back link meet `--ui-touch-target-min` on coarse pointers.
- Global `prefers-reduced-motion` rule for kit transitions; `EmptyState` `titleAs` accepts `h1`.
- Docs deploy keeps the stylesheet (explicit import; `sideEffects` tree-shaking).
- Emitted declarations no longer import `./styles/index.scss` (TS2882 in strict consumers); verified by an `npm pack` smoke install into a fresh Vite + TypeScript app.

## 0.2.0 — 2026-10-23

Core slice: tokens bridge, theming (light/dark, profiles, density, contrast), AppShell, Topbar, SidebarNav, BottomNav, Button, Card, Checkbox, ConfirmDialog, DataTable (phase 1), Dialog, Drawer, EmptyState, Field, Icon, InputText, Message, PageHeader, Paginator, ProgressBar, RadioButton, Select, SelectButton, Skeleton, Spinner, StatCard, Switch, Tabs, Tag, ThemeToggle, Toast, docs app.
