# Changelog

All notable changes to `@sabahat/react-ui-kit`. Versions follow [semver](https://semver.org/); each release is a git tag (`vX.Y.Z`) and the design-system-mcp submodule is bumped to it.

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
