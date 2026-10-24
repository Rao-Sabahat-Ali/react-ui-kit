# Tasks — react-ui-kit

Spec-driven: implement only from specs in design-system-mcp (`get_component_spec`). Follow the `spec-driven-workflow` skill.
Legend: `[ ]` todo · `[~]` in progress · `[x]` done. Each UI task = component + SCSS + tests per AC + examples + exports, reviewed by `reviewer` (+ `a11y-reviewer` for interactive, `security-reviewer` where flagged).

## Done (v0.1.0)

- [x] **OPS-001** Scaffold: Vite library build (ESM + styles.css + d.ts), Vitest + Testing Library, strict TS, docs app, CLAUDE.md, agents, skills.
- [x] **UI-001** Foundations: generated tokens, Bootstrap bridge, ThemeProvider (+ themeScript), LocaleProvider, hooks (controllable state, focus trap, floating, click outside, scroll lock, media query), utils (cx, position, compare, safeUrl).
- [x] **UI-002** Core slice: Icon, Spinner, Button, Field, InputText, Checkbox/CheckboxGroup, Select, Card, Badge, Tag, Skeleton, Message, Portal, FocusTrap, Dialog, Tabs, Paginator, DataTable (phase 1), ThemeToggle (toggle mode).
- [x] **UI-003** Docs app: home, foundations (live tokens), profiles comparison, roadmap, component pages with preview/code, theme + profile switcher.

- [x] **UI-004** (v0.2.0, for svenska-ord) `useOverlay` shared hook; layout + feedback set: AppShell (+`useAppShell`, bottomNav), Topbar, SidebarNav (`onNavigate`), BottomNav (new spec), PageHeader, Drawer, ConfirmDialog (+`useConfirm`), Toast (+`useToast`), ProgressBar, Switch, RadioGroup, SelectButton, EmptyState, StatCard.
- [x] **UI-005** BottomNav docs example present and covered by the docs e2e smoke test.

## Phase 2 — Form controls

Profiles: all. Shared groundwork first (UI-200), then controls in order.

- [x] **UI-200** Shared: `utils/mask.ts`, `utils/date.ts` (Intl-based calendar maths), `utils/number.ts` (locale parse/format), `useTypeahead`, `useRovingFocus` hooks with tests; all reserved locale keys + plural `tp()`.
- [x] **UI-201** Switch — spec `switch.md` — reviews: a11y-reviewer
- [x] **UI-202** RadioButton — spec `radio-button.md` — reviews: a11y-reviewer
- [x] **UI-203** InputTextarea — spec `input-textarea.md` — reviews: a11y-reviewer
- [x] **UI-204** InputGroup — spec `input-group.md` — reviews: a11y-reviewer
- [x] **UI-205** IconField — spec `icon-field.md` — reviews: a11y-reviewer
- [x] **UI-206** FloatLabel — spec `float-label.md` — reviews: a11y-reviewer
- [x] **UI-207** Password — spec `password.md` — reviews: security-reviewer, a11y-reviewer
- [x] **UI-208** InputNumber — spec `input-number.md` — reviews: a11y-reviewer
- [x] **UI-209** SelectButton — spec `select-button.md` — reviews: a11y-reviewer
- [x] **UI-210** ToggleButton — spec `toggle-button.md` — reviews: a11y-reviewer
- [x] **UI-211** TriStateCheckbox — spec `tri-state-checkbox.md` — reviews: a11y-reviewer
- [x] **UI-212** MultiStateCheckbox — spec `multi-state-checkbox.md` — reviews: a11y-reviewer
- [x] **UI-213** ListBox — spec `list-box.md` — reviews: a11y-reviewer
- [x] **UI-214** MultiSelect — spec `multi-select.md` — reviews: a11y-reviewer
- [x] **UI-215** AutoComplete — spec `auto-complete.md` — reviews: a11y-reviewer
- [x] **UI-216** Chips — spec `chips.md` — reviews: a11y-reviewer
- [x] **UI-217** InputMask — spec `input-mask.md` — reviews: a11y-reviewer
- [x] **UI-218** KeyFilter — spec `key-filter.md` — reviews: a11y-reviewer
- [x] **UI-219** InputOtp — spec `input-otp.md` — reviews: security-reviewer, a11y-reviewer
- [x] **UI-220** Slider — spec `slider.md` — reviews: a11y-reviewer
- [x] **UI-221** Rating — spec `rating.md` — reviews: a11y-reviewer
- [x] **UI-222** DatePicker — spec `date-picker.md` — reviews: a11y-reviewer
- [x] **UI-223** CascadeSelect — spec `cascade-select.md` — reviews: a11y-reviewer
- [x] **UI-224** TreeSelect — spec `tree-select.md` — reviews: a11y-reviewer
- [x] **UI-225** ColorPicker — spec `color-picker.md` — reviews: a11y-reviewer
- [x] **UI-226** Knob — spec `knob.md` — reviews: a11y-reviewer
- [x] **UI-227** Mention — spec `mention.md` — reviews: security-reviewer, a11y-reviewer
- [x] **UI-240** `utils/sanitize.ts` allowlist HTML sanitizer + tests (prereq for Editor).
- [x] **UI-228** Editor — spec `editor.md` — reviews: security-reviewer, a11y-reviewer

## Phase 3 — Overlays, menus, messages

Reuse Dialog overlay stack, useFloating, useFocusTrap.

- [x] **UI-301** Tooltip — spec `tooltip.md` — reviews: a11y-reviewer
- [x] **UI-302** Popover — spec `popover.md` — reviews: a11y-reviewer
- [x] **UI-303** Drawer — spec `drawer.md` — reviews: a11y-reviewer
- [x] **UI-304** ConfirmDialog — spec `confirm-dialog.md` — reviews: a11y-reviewer
- [x] **UI-305** ConfirmPopup — spec `confirm-popup.md` — reviews: a11y-reviewer
- [x] **UI-306** Toast — spec `toast.md`
- [x] **UI-307** Messages — spec `messages.md`
- [x] **UI-308** Menu — spec `menu.md` — reviews: security-reviewer, a11y-reviewer
- [x] **UI-309** TieredMenu — spec `tiered-menu.md` — reviews: security-reviewer, a11y-reviewer
- [x] **UI-310** ContextMenu — spec `context-menu.md` — reviews: security-reviewer, a11y-reviewer
- [x] **UI-311** SplitButton — spec `split-button.md` — reviews: a11y-reviewer
- [x] **UI-312** Menubar — spec `menubar.md` — reviews: security-reviewer, a11y-reviewer
- [x] **UI-313** MegaMenu — spec `mega-menu.md` — reviews: security-reviewer, a11y-reviewer
- [x] **UI-314** PanelMenu — spec `panel-menu.md` — reviews: security-reviewer, a11y-reviewer
- [x] **UI-315** Breadcrumb — spec `breadcrumb.md` — reviews: security-reviewer, a11y-reviewer
- [x] **UI-316** Steps — spec `steps.md` — reviews: a11y-reviewer
- [x] **UI-317** TabMenu — spec `tab-menu.md` — reviews: a11y-reviewer
- [x] **UI-318** SpeedDial — spec `speed-dial.md` — reviews: a11y-reviewer
- [x] **UI-319** Dock — spec `dock.md` — reviews: a11y-reviewer
- [x] **UI-320** ThemeToggle `mode="menu"` (light/dark/system) using Menu — closes ThemeToggle AC-2

## Phase 4 — Layout, panels, app shells

Needed by every profile; unlocks real app scaffolds.

- [x] **UI-401** AppShell — spec `app-shell.md` — reviews: a11y-reviewer
- [x] **UI-402** Topbar — spec `topbar.md` — reviews: a11y-reviewer
- [x] **UI-403** SidebarNav — spec `sidebar-nav.md` — reviews: a11y-reviewer
- [x] **UI-404** PageHeader — spec `page-header.md` — reviews: a11y-reviewer
- [x] **UI-405** EmptyState — spec `empty-state.md` — reviews: a11y-reviewer
- [x] **UI-406** StatCard — spec `stat-card.md` — reviews: a11y-reviewer
- [x] **UI-407** Accordion — spec `accordion.md` — reviews: a11y-reviewer
- [x] **UI-408** Panel — spec `panel.md` — reviews: a11y-reviewer
- [x] **UI-409** Fieldset — spec `fieldset.md` — reviews: a11y-reviewer
- [x] **UI-410** Divider — spec `divider.md` — reviews: a11y-reviewer
- [x] **UI-411** Toolbar — spec `toolbar.md` — reviews: a11y-reviewer
- [x] **UI-412** Splitter — spec `splitter.md` — reviews: security-reviewer, a11y-reviewer
- [x] **UI-413** Stepper — spec `stepper.md` — reviews: a11y-reviewer
- [x] **UI-414** ScrollPanel — spec `scroll-panel.md` — reviews: a11y-reviewer
- [x] **UI-415** DeferredContent — spec `deferred-content.md` — reviews: a11y-reviewer

## Phase 4b — New specs (design-system v0.3.0)

- [x] **UI-450** Link — spec `link.md`
- [x] **UI-451** Kbd — spec `kbd.md`
- [x] **UI-452** Stack — spec `stack.md`
- [x] **UI-453** Grid — spec `grid.md`
- [x] **UI-454** NumberFormat — spec `number-format.md`
- [x] **UI-455** DateFormat — spec `date-format.md`
- [x] **UI-456** CommandPalette — spec `command-palette.md` — reviews: a11y-reviewer
- [x] **UI-457** Scheduler — spec `scheduler.md` — reviews: a11y-reviewer
- [x] **UI-458** Generated high-contrast tokens replace hand-written bridge CSS (TOK-011).

## Phase 5 — Data

- [x] **UI-500** DataTable phase 2: column filters, global filter, lazy/server mode, resize/reorder, frozen columns, row expansion, column visibility, CSV export, `stateKey` persistence (after SPEC-013 adds ACs)
- [x] **UI-501** DataTable phase 3: inline cell/row editing, virtual scroll, row grouping, grid keyboard navigation, context menu
- [ ] **UI-502** DataTable follow-ups from review: virtual scroll + grid navigation needs a VirtualScroller scroll-to-index API (Ctrl+End/PageDown stop at rendered rows); keyboard activation of onRowClick in cell-navigation mode; column kept when leaving a group header row; resize handle 24px hit area (WCAG 2.5.7); clear reorder live region; cancel resize listeners on unmount; aria-sort for groupBy column; resetState calls onPageChange when controlled.
- [ ] **UI-503** a11y follow-ups from svenska-ord review: `Message` live region rendered persistently so content changes announce reliably.
- [x] **UI-502** VirtualScroller — spec `virtual-scroller.md` — reviews: a11y-reviewer
- [x] **UI-503** DataView — spec `data-view.md` — reviews: a11y-reviewer
- [x] **UI-504** Tree — spec `tree.md` — reviews: a11y-reviewer
- [x] **UI-505** TreeTable — spec `tree-table.md` — reviews: a11y-reviewer
- [x] **UI-506** OrderList — spec `order-list.md` — reviews: a11y-reviewer
- [x] **UI-507** PickList — spec `pick-list.md` — reviews: a11y-reviewer
- [x] **UI-508** Timeline — spec `timeline.md` — reviews: a11y-reviewer
- [x] **UI-509** OrganizationChart — spec `organization-chart.md` — reviews: a11y-reviewer

## Phase 6 — Charts, media, files, misc

- [x] **UI-601** ProgressBar — spec `progress-bar.md`
- [x] **UI-602** MeterGroup — spec `meter-group.md`
- [x] **UI-603** Avatar — spec `avatar.md`
- [x] **UI-604** Chip — spec `chip.md`
- [x] **UI-605** BlockUI — spec `block-ui.md`
- [x] **UI-606** Inplace — spec `inplace.md`
- [x] **UI-607** ScrollTop — spec `scroll-top.md`
- [x] **UI-608** Image — spec `image.md` — reviews: security-reviewer, a11y-reviewer
- [x] **UI-609** Carousel — spec `carousel.md` — reviews: a11y-reviewer
- [x] **UI-610** Galleria — spec `galleria.md` — reviews: a11y-reviewer
- [x] **UI-611** FileUpload — spec `file-upload.md` — reviews: security-reviewer
- [x] **UI-612** Chart — spec `chart.md`

## Follow-ups from parallel build

- [x] **UI-901** Label defaults moved to locale keys (MultiSelect, AutoComplete, Chips, ColorPicker, DatePicker, CommandPalette, Slider, MultiStateCheckbox, ThemeToggle, Chart, Editor, ConfirmPopup, MegaMenu, Steps, Stepper); `labels` props still override.
- [x] **UI-903** Scheduler: eventCount_one/_other + schedulerView keys; compact month view (< md: dots + selected-day agenda). "+n more" keeps its anchored dialog (same behaviour as Popover, avoids per-cell triggers).
- [x] **UI-904** Helpers moved to `src/utils/element.ts`; locale keys added; built-in icons pause, play, rotate, maximize replace inline SVGs.
- [x] **UI-902** `Responsive<T>` moved to `src/utils/responsive.ts`. ListBox keeps its own windowing on purpose: activedescendant scrolling needs direct control of scrollTop.

## Ops / quality

- [x] **OPS-010** GitHub Actions: `npm ci && npm run check && npm run build:docs` on PRs. — reviewer
- [x] **OPS-011** Lint: evaluate ESLint (react-hooks, jsx-a11y) as dev deps — needs architect approval + ADR.
- [x] **OPS-012** Not done by decision (2026-10-24: axe-core not approved as a dependency). Covered instead by jsx-a11y lint, AC tests and Playwright smoke.
- [x] **OPS-013** Playwright visual baselines for light/dark × saas/admin/pos/game (local; CI skips OS-specific baselines).
- [x] **OPS-014** Release flow: semver tags, CHANGELOG.md, `npm pack` smoke test installing into a Vite app; bump submodule in design-system-mcp. — architect
- [x] **OPS-015** Docs deployed on Vercel: https://react-ui-kit-docs.vercel.app (Deployment Protection optional).
- [x] **OPS-016** Bundle budget check (fail CI if `dist/index.js` gzip grows > 10% without note).
- [x] **OPS-017** Starter template (`templates/starter`) + `npm run create-app <dir> -- --profile <profile>`: AppShell per profile shell, ThemeProvider, toast/confirm providers, CLAUDE.md, tasks.md, test; verified building against the packed kit.
