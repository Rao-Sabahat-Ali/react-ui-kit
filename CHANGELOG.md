# Changelog

All notable changes to `@sabahat/react-ui-kit`. Versions follow [semver](https://semver.org/); each release is a git tag (`vX.Y.Z`) and the design-system-mcp submodule is bumped to it.

## 1.3.0 (unreleased)
Blueprints: complete, runnable screens built only from kit components and the design contract, so every personal app looks and behaves the same without re-explaining the design.

### Added
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
