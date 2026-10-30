# Changelog

All notable changes to `@sabahat/react-ui-kit`. Versions follow [semver](https://semver.org/); each release is a git tag (`vX.Y.Z`) and the design-system-mcp submodule is bumped to it.

## 2.1.1 — 2026-10-30

Four fixes to **CookieBanner**, found while integrating it into the svenska-ord app (spec: design-system-mcp `components/cookie-banner`, ACs 9, 12, 15, 17 and 18; `components/app-shell` AC-8). No API change.

### Fixed

- **CookieBanner no longer delays Largest Contentful Paint.** It entered from `opacity: 0`, so Chrome reported its text as the LCP element only once the fade was under way (svenska-ord Home: Lighthouse performance 0.94 to 0.75, simulated LCP 2.7 s to 6.5 s). With motion allowed it now rises by `--ui-assemble-distance` at full opacity from its first frame (the exit may still fade). Under reduced motion it appears at once, with no animation, and leaves with an opacity fade of at most 120 ms.
- **CookieBanner no longer sits under a fixed bottom nav.** Below `lg`, AppShell's `bottomNav` shares the bottom edge and layer with the banner and covered its buttons. AppShell now publishes the nav's rendered height as `--ui-bottom-nav-offset` on the document root while a fixed `bottomNav` is shown (removed when it is hidden or the shell unmounts; an embedded, non-fixed nav publishes nothing; an app with its own fixed bottom bar can set the same property). The banner sits on top of that height, one layer above the nav and still under dialog and drawer backdrops. Reserved space counts the nav once: `--ui-consent-offset` and the document's bottom padding are still the banner's own height (the shell pads `main` for the nav), and `scroll-padding-bottom` adds `--ui-bottom-nav-offset` so a focused element clears both. `scroll-padding-bottom` is now a `calc()` with that variable instead of a plain length.
- **CookieBanner's shadow is no longer cut off at the bottom of the viewport.** `--ui-shadow-lift` reaches about 26px below the sheet, but the banner was 16px from the edge. The fixed region now keeps `--ui-space-8` (or the safe-area inset when larger) below the sheet; over a bottom nav the gap shrinks to `--ui-space-3`. The banner's reserved height grows by the same 16px.
- **Reopening the notice from `openSettings()` moves focus to OK.** The reopen is a user action, so a keyboard user who pressed "Cookies and storage" at the end of a long page no longer has to tab back from the end. After OK, focus still returns to the element that called `openSettings()`. On load the banner still never takes focus; consent mode still opens the preferences dialog.

## 2.1.0 — 2026-10-30

### Added

- **CookieBanner**, with `ConsentProvider`, `useConsent` and `ConsentGate` (spec: design-system-mcp `components/cookie-banner`). A non-modal region lifted at the bottom of the sheet that says what an app stores on the visitor's device. Consent mode offers Reject all, Accept all (the same button, neither focused) and Choose, which opens the kit `Dialog` with one `Switch` per category; notice mode is one OK button for apps that only store what they need. The decision is a small record (`version`, `decidedAt`, `mode`, per-category booleans) in localStorage (`ui:consent`) or, with `storage="cookie"`, a first-party `ui_consent` cookie. Records are validated by shape and expire after `maxAgeDays` or when `policyVersion` changes; a decision in another tab applies without a reload. `ConsentGate` mounts optional scripts only after the category is granted; `openSettings()` reopens the choice. While visible it reserves its height (`--ui-consent-offset`, plus bottom padding and `scroll-padding-bottom` on the document), so a focused element is never hidden behind it. New locale keys: `cookieTitle`, `cookiePolicyLabel`, `cookieNoticeMessage`, `cookieConsentMessage`, `cookieReject`, `cookieAccept`, `cookieChoose`, `cookieSave`, `cookieAcknowledge`, `cookiePreferencesTitle`, `cookiePreferencesIntro`, `cookieRequiredReason`.
- Docs: a CookieBanner page with consent, notice, cookie-storage, ConsentGate and reopen examples (each with its own storage key and a Reset example action), a Privacy page listing exactly what the docs store, and a cookie notice with a "Cookies and storage" link in the docs rail.

### Fixed

- **Switch.** A switch that is on and disabled now shows its knob (it was the same colour as the greyed track).
- **Docs.** The first page load no longer moves focus to `main`; route changes still do.

## 2.0.0 — 2026-10-30

Identity v2, "Monteringsanvisning" (the assembly sheet). The look changes everywhere: white instruction paper, kraft shell, 2px ink lines, signal-blue accent, Albert Sans and an assembly motion grammar. Several components change their markup and a few defaults change, so read **Breaking changes** and the [upgrade guide](docs/migration-v2.md) before you move from 1.4.0. Install with `npm install @sabahat/react-ui-kit@2.0.0`.

Specs: design-system-mcp `foundations/identity` and `foundations/motion` (MCP 1.0.0); tokens 2.0.0. The optional 3D package ships separately as [`@sabahat/react-ui-kit-3d` 0.1.0](packages/react-ui-kit-3d/CHANGELOG.md).

### Breaking changes

Everything an app could notice. Before and after snippets are in the [upgrade guide](docs/migration-v2.md).

- **Visual identity.** White ground, kraft shell, 2px ink structure lines (`--ui-line-width`) instead of 1px borders, flat resting surfaces, accent focus and selection. Every visual regression baseline changes.
- **Tokens.** No token name was removed, but every palette, radius, shadow and font value changed (no pine, paper or Fraunces values remain). An app that hard-coded old hex values, old radii or the serif heading family must change them. Radius is 6px (`radius`), 10px (`radius-lg`) and 3px (`radius-sm`). `color-focus-ring` is a solid accent and `focus-ring-width` is 2px.
- **Fonts.** Albert Sans replaces Fraunces and Instrument Sans. The preload path is `fonts/albert-sans-latin-wght-normal.woff2`; a service-worker precache of the old files must list the four `albert-sans-*.woff2` files instead.
- **Focus rings.** Restyled components draw their focus ring as an outline (`outline: var(--ui-focus-ring-width) solid var(--ui-color-focus-ring)`, offset `--ui-focus-ring-offset`), not as a `box-shadow`. An app that overrode focus with `box-shadow` gets two rings or none.
- **Badge.** The default is no longer a pill: `pill` defaults to `false` and count badges use the small part radius (`--ui-radius-sm`). Status dots are circles. Pass `pill` to keep the old shape. Count badges in Tabs, TabMenu, SidebarNav, PanelMenu, MenuList, BottomNav and Button use the kit `.ui-badge` styling.
- **ProgressBar.** The root element no longer has the `.progress` class. The track is `.progress.ui-progress-bar__track` inside the `role="progressbar"` root. The fill is `.ui-progress-bar__fill` with no `bg-*` class: its colour comes from `variant` through `--ui-progress-fill`, and its length from `--ui-progress-value` (0 to 1) by transform. The `lg` value text sits beside the track, not inside the fill. Code that styles `.progress-bar` width or `bg-*` on the fill must change.
- **Divider.** The default rule is a hairline (`--ui-line-width-hairline`) in `--ui-color-line-muted`. `dashed` and `dotted` are 2px rules in `--ui-color-border-strong`.
- **Kbd.** Keycaps are no longer monospace: Albert Sans 600 with tabular figures, drawn with a line. Use `<code>` for code.
- **Link.** `link-primary` is the accent colour, not ink (Bootstrap would paint it ink). Underlines are themed: 1px at rest, 2px on hover and focus.
- **Terminal.** Always a dark "night sheet": the component sets `data-bs-theme="dark"` on itself, in light apps too. Entries settle in with a short motion.
- **Stepper.** Markers are light numerals, not circles; complete steps show an ink check and a 2px track. The active step's content is wrapped in a new `div.ui-stepper__body` and a guide `span` is added before the heading. Selectors such as `.ui-stepper__panel > div` no longer match the same element.
- **DeferredContent.** Loaded content is wrapped in a new `div.ui-deferred-content__body` (with `data-assemble`).
- **SpeedDial.** The trigger and the actions are square parts with the part radius: `rounded-circle` is gone from both. The trigger has `--ui-shadow-lift`, and the actions fold back into the trigger at 70% of the entrance time.
- **Presence.** Overlays stay mounted for about 70% of their entrance time after they close, with `data-state="closed"` and `inert`, and are then removed or hidden. This covers Dialog, Drawer, Toast, Popover, Tooltip, ConfirmPopup, MegaMenu, ContextMenu, CommandPalette, the popup-style Select family, SpeedDial and the Menubar submenus. Focus is restored to the previously focused element when the user closes, not when the exit ends. Code that expects the node to be gone, or `hidden` to be set, in the same frame as a close must wait for the exit. Tests and server rendering are unaffected: without `document.getAnimations` (jsdom, SSR) overlays unmount at once.
- **Menubar.** The first-level submenu's `hidden` attribute now follows the presence state, so it is set after the exit, not at the moment of closing.
- **Also visible.** Toasts have no coloured side border. Icon stroke is 2px. The AppShell sidebar no longer animates its width. Timeline events assemble in once when they first scroll into view (`animate`, default on; instant under reduced motion). Buttons have 6px corners and a 2px line.

### Changed
- **Tokens (generated).** Palette replaced: white ground, neutral chrome (no cream), ink `#121212`, kraft ramp for the shell, signal blue `#1E5AA8` / `#8DB3E8`, new chart series. New keys: `color-shell`, `color-shell-hover`, `color-shell-contrast`, `color-line`, `color-line-muted`, `line-width` (2px), `line-width-hairline`, `font-weight-display` (250), `shadow-lift`, `shadow-drag`, `focus-ring-offset`, `motion-instant|quick|part|step|stagger`, `easing-out|snap|in`, `assemble-distance`. Radius is now 6px (`radius`), 10px (`radius-lg`), 3px (`radius-sm`). No pine, paper or Fraunces values remain; every semantic key apps used still exists. `color-focus-ring` is a solid accent colour and `focus-ring-width` is 2px.
- **Profiles.** cms accent is pencil red, pos primary is go-green with minimal motion, game is the night sheet with a warm yellow accent and bolder assemble travel, ecommerce primary is orange, admin is compact with 3px corners.
- **Font.** Albert Sans variable (OFL, 100–900, normal + italic, latin + latin-ext) replaces Fraunces and Instrument Sans, self-hosted in `src/fonts` and shipped to `dist/fonts` as before. Preload `fonts/albert-sans-latin-wght-normal.woff2` for the fastest first paint; update any app that precached the old files.
- **Global surfaces.** `::selection` (accent), `caret-color`, `accent-color`, one focus ring (accent, 2px, offset 2px), thin scrollbars in the line colour, tabular numerals in tables, link underline offset.
- **Restyled primitives.** Button (6px, 2px line, ink primary, outline secondary in ink, 1px press feedback at `motion-instant`), inputs/selects/checkbox/radio/switch (2px line, accent focus and checked), Card (2px line, flat), Tabs (accent step indicator that slides, transform only), SidebarNav/Topbar/AppShell (kraft shell, active link is a white part with a 2px line), PageHeader/Section/IndexList (2px structural lines, hairlines between rows), Tag, Badge, Toast/Dialog/Drawer/Menu (lifted with `shadow-lift`, enter and exit through `usePresence`; toasts reflow with FLIP; no coloured side border on toasts). The Icon stroke is now 2px. The AppShell sidebar no longer animates its width.
- **StatCard / StatGroup** are the parts list: line icon, quantity mark (`12×`, new `quantity` prop), label, ruled strip. Values tick with `QuantityTick`. The existing API is unchanged.

- **Restyle waves.** Every component is drawn in the identity parts grammar (2px ink line, accent focus and selection, a lift only on overlays, motion from `src/motion`).
  - **Forms (wave 1, 35 components).** Controls are drawn parts: 2px ink line, accent on focus, danger line plus a line-art warning icon on invalid, dashed line when read-only. Checkbox, radio, switch and tri-state marks draw in and the switch knob slides. SelectButton has a sliding accent indicator. Slider and Knob values tick. Rating is line-art stars with press feedback. InputOtp cells are numbered parts. Chips keep stable identity with enter, ghost-leave and FLIP. Select, MultiSelect, AutoComplete, CascadeSelect, TreeSelect, DatePicker, ColorPicker and Mention panels are lifted overlays and their option lists assemble on open. Payment components are style only.
  - **Overlays and menus (wave 2).** Popover, Tooltip, ConfirmPopup, MegaMenu, ContextMenu and CommandPalette are lifted parts with origin-aware enter and exit. Flyouts slide from the parent edge. CommandPalette assembles and FLIP-reflows its results. Tour has a dashed guide ring. Steps, TabMenu and TableOfContents share the sliding accent mark (`useSlidingMark`). Breadcrumb uses line-art chevrons. Dock magnifies its neighbours (transform only). TabMenu turns through view transitions and PanelMenu expands by turning in.
  - **Data, charts and file (wave 3).** DataTable is a grid (2px frame and header line, hairline rows, accent selection marker, dashed resize guides, FLIP and exit ghosts). Paginator has a sliding mark. DataView, OrderList, PickList and TreeTable use FLIP. Tree, OrganizationChart and TreeTable draw guide lines and clip reveals. Timeline has a dashed guide, numbered markers and assembles on first view. Chart and Sparkline draw in on first render. Scheduler is built from parts. FileUpload is a dashed plate with a kraft drag state and row presence. OrderSummary and DescriptionList are ruled sheets.
  - **Panels, buttons and media (wave 4).** Accordion, Barcode, Carousel, CopyButton, DeferredContent, Divider, Fieldset, Galleria, Image, ImageCompare, Panel, QRCode, ScrollPanel, SpeedDial, SplitButton, Splitter, Stepper, ToggleButton and Toolbar.
  - **Misc, messages and layout (wave 5).** Avatar, Badge, BlockUI, BottomNav, Chip, Countdown, EmptyState, Grid, Highlight, Inplace, Kbd, Link, Message, Messages, MeterGroup, PaymentStatus, ProgressBar, ProgressCircle, ScrollTop, Skeleton, Spinner, Stack, Terminal, ThemeToggle and Toast.
  - **Polish pass.** Badge radius and count badges, leftover motion, layout fixes, Menubar submenu presence, Tour ring FLIP, Tree, OrganizationChart and OrderSummary reveal (`useReveal`), a 28px Splitter hit area, a Galleria side-thumbnail column with a 2px marker, and SelectButton re-measuring on resize and font load. Style-split tests now wait for settled marks and ignore infinite animations.
- **Bundle budgets raised** to the identity v2 sizes. Identity v2 restyled every component and added the in-house motion engine (`src/motion`, about 4 KB gzip), StepSheet, QuantityTick and KanbanBoard. `bundle-budget.json` (gzip) moves from `dist/index.js` 180.8 KiB to 198.3 KiB and from `dist/styles.css` 64.1 KiB to 77.4 KiB. Apps that use per-component styles (`virtual:ui-kit-styles`) and tree-shaking load only what they import, and the 10% tolerance guards growth from here.

### Added
- **KanbanBoard** (spec `kanban-board`, 19 acceptance criteria, all tested): numbered stages with quantity marks; keyboard pick-up, move, drop and cancel with one polite announcement per event; a "Move to..." card menu; pointer drag (4px threshold, 200ms touch hold, auto-scroll, placeholder, snap settle); WIP warn and block; swimlanes; a filter that uses Highlight; quick add; F2 rename; column collapse; loading and error states; read-only mode; windowed columns; optimistic async `onMove` with rollback and a Retry toast; reduced motion and RTL.
- `applyKanbanMove(cards, move, lanes?)` (pure, typed helper) and the `KanbanCardData`, `KanbanColumnDef`, `KanbanMove` and related types.
- **Task board blueprint** (`templates/blueprints/Board.tsx`, docs `#/blueprints`, pattern `board`, profiles saas, admin and dashboard) and `create-app --blueprint <slug>` (for example `--profile saas --blueprint board`).
- `create-app --with-3d` adds `@sabahat/react-ui-kit-3d`, its `three` peer, `@types/three` and the package stylesheet to a new app.
- **EmptyState `media` slot.** Replaces the icon, for example a `Scene3D variant="empty-state"` or an `Image`. The slot is sized (10rem square, 6rem at `size="sm"`) and clips overflow. The media brings its own text alternative.
- **Timeline** `numbered` (opt-in markers 1, 2, 3) and `animate` (first-view assemble along the guide line, default on).
- Hooks: `useReveal` (presence for regions that reveal with clip-path and opacity, exported from the motion module) and `useSlidingMark` (the shared accent mark, exported from the hooks).
- Docs app: spec purposes render through `InlineMarkdown` (emphasis, code and links; nothing is parsed as HTML). A **Depth (3D)** page shows the optional package.
- **Motion engine** (`src/motion`, ADR 0002): `MOTION`, `EASING`, `useReducedMotion`, `usePresence`, `useAssemble`, `useFlip`, `useCountTick`, `useViewTransition`, `safeAnimate`, `prefersReducedMotion`, `canAnimate`. Dependency-free, reduced-motion safe, stops in hidden tabs, transform/opacity/clip-path only.
- `QuantityTick` — a count that rolls changed digits, announced once through a polite status region.
- `StepSheet`, `StepPanel`, `useStepSheet` — numbered step panels (the signature of multi-step work): large light numeral, title, one value, one action; current, complete and upcoming states, `aria-current="step"`, inert actions off the current step, focus moves to the new step, Assemble on entry.
- Icons: `flame`, `book`, `clock`, `layers`, `box`, `target`, `list`.
- Docs app: kraft rail with line-art icons, white sheet, a StepSheet on the home page, shell/line swatches and an Assemble demo on Foundations.
- ADR 0002 (motion engine) and ADR 0003 (optional 3D package on plain three.js).

## 1.4.0 — 2026-10-24

One release bundling: spec completion (Tabs scrollable, IftaLabel, ImageCompare, AnimateOnScroll, Terminal), QRCode and Barcode, eight everyday components (CopyButton, Countdown, DescriptionList, Sparkline, ProgressCircle, TableOfContents, Highlight, Tour), the payment suite and the fixes from its security review. Install with `npm install @sabahat/react-ui-kit@1.4.0`.

### Security review fixes
#### Security
- `PaymentCardForm` raw mode: the number, expiry, security code (and name/postal code) inputs are now uncontrolled, so React no longer mirrors card data into the DOM `value` attribute (readable by CSS attribute selectors, session replay and MutationObserver tools). React state holds only brand, error codes and last4. Tests assert `getAttribute('value')` is empty after typing and pasting and that `outerHTML` contains neither the PAN nor the CVC. The inputs are emptied on submit and on unmount.
- `PaymentCardForm` never lets its submit reach a parent `onSubmit` (`stopPropagation`) and no longer renders a nested `<form>`: inside an ancestor form it renders `div role="group"` and handles Enter and Pay itself. Avoid nesting it.
- Raw `onSubmit` may return a promise; fields are cleared even when it throws or rejects (new `onError`, otherwise rethrown), and the fieldset is disabled while submitting.
- `HostedField` / `PaymentCardForm`: new `onDestroy(field, element)` (unmount your provider element there) and `onReady` is no longer repeated for the same element under StrictMode. Hosted error-summary links and label clicks focus the slot container when `onFocusRequest` is omitted.
- `OrderSummary` validates input (NaN/Infinity/negative amounts, non-integer quantities, negative discount) and clamps the total at 0; the discount row shows if and only if it is subtracted; an invalid currency code no longer throws. Minor units are rounded from the decimal value (`1.005` is 101, `0.145` is 15). New exports `calculateOrderTotals`, `toMinorUnits`, `currencyFractionDigits`; the Checkout blueprint takes its "Place order" amount from the same calculation.
- `validateExpiry` rejects trailing digits and junk (`12/20301`); `maskCardNumber` reveals the last four only for a complete-length number.
- `PaymentMethodSelector` slugifies method ids used in `aria-controls`/`aria-describedby`.
- `TableOfContents` survives invalid `from`/`headings` selectors and tracks scanned headings by element (DOM clobbering). `Tour` closes with the new reason `missing` (not `done`) when no step has a target.
- `CopyButton`: documented that card data and secrets must never be copied; new `sensitive` prop calls `onCopy()` without the text.
- `uiKitStyles` (Vite plugin) emits JSON-escaped specifiers and rejects manifest entries that are not plain relative `.css` paths (falls back to the full stylesheet). `create-app` escapes `--title` and `--description` for JSON, HTML, JSX attributes and Markdown. The Checkout blueprint email check no longer accepts whitespace or several `@`.

### Payments
Payments: UI for paying, never the payment itself. The kit never talks to a payment provider and never stores card data.

#### Added
- `PaymentMethodSelector` — payment methods as ruled rows in a native-radio radiogroup (one tab stop, arrow keys, accent marker on the selected row). Each method takes `label`, `description`, `icon` (name or your own node, no brand logos ship), `badge`, `disabled` with an announced `disabledReason`, and `children` revealed only while selected (for example the card form).
- `PaymentCardForm` — `mode="hosted"` (default, recommended) renders labelled `HostedField` slots for a provider's iframes (`onReady`, `onFocusRequest`, provider state `focused/invalid/complete/empty/error`, error summary on submit). `mode="raw"` for tokenisation APIs and tests: brand grouping, Luhn, expiry `MM / YY` with an injectable `now`, CVC length by brand, optional holder name and postal code, `cc-*` autocomplete, `inputMode="numeric"`, paste sanitising, caret kept while formatting. `onChange` carries only `{ brand, complete, errors, last4 }`; `onSubmit(values)` is the only place raw values leave; values are cleared after submit (`clearOnSubmit`) and on unmount; no console, storage, cookie, URL or DOM-attribute writes (all tested). `PAYMENT_RAW_MODE_NOTICE` documents the PCI scope.
- `HostedField`, `paymentFieldStyle()` (resolves the theme to concrete values in the shape Stripe/Adyen style objects accept), `PAYMENT_FIELD_VARIABLES` and the `--ui-payment-field-*` custom properties.
- Utilities with published test vectors: `luhnCheck`, `detectCardBrand` (visa, mastercard incl. 2-series, amex, discover, diners, jcb, unionpay, maestro), `formatCardNumber`, `maskCardNumber` (last four only), `getCardLast4`, `validateExpiry`, `formatExpiry`, `cvcLengthFor`, `isValidCardLength`, `cardDigits`, `CARD_BRAND_LABELS`, `TEST_CARD_NUMBERS`.
- `OrderSummary` (+ `formatMoney`) — a real table with caption (items, then subtotal, shipping, discount, tax and a total set apart by weight and one rule), `Intl` currency and locale, integer minor-unit sums, tabular figures, promo slot, `collapsible="below-lg"` disclosure ("Show summary 86,40 kr"), skeleton, empty state, struck prices spoken as "was … now …", polite "Total updated" announcement.
- `PaymentStatus` — `processing | requires_action | succeeded | failed | canceled` in the EmptyState layout; failed announces assertively, the rest politely; Try again, Use another method, Confirm payment; tabular `reference`.
- **Checkout blueprint** (`templates/blueprints/Checkout.tsx`, `Checkout.data.ts`; docs `#/blueprints/checkout`, profile `ecommerce`, pattern `checkout`): guest-first, four steps in a linear Stepper, Card/Digital wallet/Bank transfer/Invoice, a simulated hosted provider, summary on every step, "Place order · 86,40 kr", confirmation; preview toggles for loading totals, a declined first attempt and 3-D Secure.
- Locale keys for all of the above (`payment*`, `order*`).
- Tests per acceptance criterion, including the security requirements; blueprint smoke and interaction tests; Playwright visits the new blueprint at 1280 px and 390 px.

#### Notes
- Raw card entry puts your site in a larger PCI DSS scope (SAQ A-EP or D): prefer hosted fields. Tokenisation, idempotency keys, amounts, 3-D Secure and confirmation by webhook are server-side.
- `create-app --profile ecommerce` is unchanged: a checkout is not a home screen.

### New components
Eight everyday components that were missing from the kit.

#### Added
- `CopyButton` — copies text with the Clipboard API (hidden-textarea fallback), swaps label and icon to a copied or failed state, announces it in a polite live region, icon-only variant, `timeout`, `onCopy`/`onError`; never renders or logs the value. `copyToClipboard()` is exported from utils.
- `Countdown` — `role="timer"` that is silent by default (optional polite announcements at thresholds), `target` or `duration`, `elapsed` count-up mode, `dd:hh:mm:ss` / `hh:mm:ss` / `mm:ss` / locale-aware `words` formats, pausable, tabular numerals, stops ticking while the tab is hidden, `onComplete` and `completedContent`.
- `DescriptionList` and `DescriptionItem` — a real `<dl>`; `columns` 1-3, `layout` stacked or inline, `ruled`, `span`, `copyable` values (CopyButton), empty-value placeholder, long-token wrapping.
- `Sparkline` — tiny axis-free line, area or bar chart on the chart tokens, optional min/max markers, `label` plus generated or custom `summary` as text alternative. `StatCard` now renders its `sparkline` prop with it (tests unchanged).
- `ProgressCircle` — circular progress/gauge with `size`, `strokeWidth`, centre content slot, intent `variant`, indeterminate state and `role="progressbar"` with value text; transition and spin are off under reduced motion.
- `TableOfContents` — "On this page" navigation from headings (`from`, `headings`) or `items` with nesting, `IntersectionObserver` scrollspy with `aria-current="location"`, smooth scroll (instant under reduced motion) with focus on the heading, `sticky`, `onNavigate` for routers.
- `Highlight` — marks matches of one or more terms with `<mark>` (accent-subtle): case, diacritic and whole-word options, regex-escaped terms, no `innerHTML`, guards for long text (`maxLength`, `maxMatches`, 20 terms).
- `Tour` — non-modal guided product tour: ordered steps anchored by selector, ref or function, popover (title, body, step counter, Previous/Next/Skip/Done), flat highlight ring, focus moves to the panel and is restored on close, Escape closes, Tab continues to the page, target scrolled into view (reduced-motion aware), missing targets skipped with a dev-only warning. Built on `useFloating` and `useOverlay`.
- Locale keys: `copy`, `copied`, `copyFailed`, `copyLabel`, `countdownRemaining`, `countdownElapsed`, `countdownComplete`, `sparklineSummary`, `onThisPage`, `tour`, `tourNext`, `tourPrevious`, `tourDone`, `tourSkip`.

#### Notes
- Calendar and date-range selection already exist: `DatePicker` with `inline` and `selectionMode="range"`.

### Spec completion
Finishes the spec: every specified component now has code, tests and a live docs example, and the last PrimeReact gaps are closed.

#### Added
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

#### Changed
- `create-app` starters (and the dashboard/admin blueprint starters) use the style plugin by default: `vite.config.ts` has `uiKitStyles({ include: [...] })` from `@sabahat/react-ui-kit/vite`, `main.tsx` imports `virtual:ui-kit-styles`, and `src/vite-env.d.ts` declares the module. Pass-through lists of Bootstrap classes live in `scripts/profile-shells.mjs` and are checked against the generated sources by `test/create-app.test.ts`.
- The Settings blueprint uses `Tabs scrollable` instead of utility classes.
- Blueprint shells and the AppShell example pass `variant="sidebar"` explicitly.

#### Fixed
- `Drawer` reduced motion: the per-edge animation rule outranked the reduced-motion rule, so the slide still ran; it is now disabled.

#### Tests
- Added the previously missing AC tests: Drawer AC-4..AC-11, LocaleProvider AC-1/AC-2, AppShell AC-4, Portal AC-2, Toast AC-5; a registry test that every spec has docs examples; the e2e docs test now visits every component page and rejects "Not implemented yet". Test helper `test/scss.ts` compiles component SCSS to assert rules jsdom cannot evaluate (media queries).

### New components
#### Added
- `QRCode` — scannable QR codes from an in-house, dependency-free encoder (`encodeQr`, `qrCapacity`, `QrError` are exported): numeric, alphanumeric and UTF-8 byte modes chosen automatically, versions 1-40, error correction L/M/Q/H, Reed-Solomon over GF(256), all eight masks with the standard penalty selection. Module shapes (`square`, `rounded`, `dots`, `diamond`; timing, alignment and format modules always stay square), finder shapes and eye shapes, colours from the new always-dark-on-light QR tokens, logo from image (through `safeImageSrc`), kit `Icon` or text with shape/size/padding/excavate (level H is forced, size clamped to 0.1-0.3 and the version bumped so the logo never covers a finder), `renderAs="svg" | "canvas"`, `caption`, `bordered`, `describedValue`. Dynamic by design: memoised encoding, in-place SVG updates, `status` (`loading` Skeleton + Spinner, `expired` with a Refresh button, `scanned`), `expiresAt` / `onExpire` with timer cleanup and a polite live region, a typed error state with `onError`, and a ref handle with `toDataURL`, `toBlob` and `download` (PNG or SVG, sanitised file names, resolved colours). Dev builds warn about < 4:1 contrast, inverted codes, a quiet zone below 4 modules and risky finder mixes (circle with another shape, or any ring/eye mix under dot modules).
- `Barcode` — dependency-free SVG barcodes: Code 128 (sets A/B/C with automatic switching), EAN-13, EAN-8, UPC-A (automatic check digits, verified when supplied), Code 39 and Interleaved 2 of 5, with validation, `displayValue` text with tabular numerals and EAN/UPC grouping, guard bars, per-format quiet zones, an invalid-value error state and `onError`.
- `getIconDefinition(name)` (from `Icon`) returns the registered path data, used to draw icon logos into exports.
- Shared helpers: `utils/scan` (colour parsing, WCAG contrast, token resolution) and the `useScanColorWarnings` hook.
- Locale keys: `qrCode`, `qrWithLogo`, `qrLoading`, `qrExpired`, `qrRefresh`, `qrScanned`, `qrTooLong`, `qrEmpty`, `qrUnavailable`, `barcode`, `barcodeEmpty`, `barcodeInvalidCharacter`, `barcodeInvalidLength`, `barcodeCheckDigit`.
- Generated tokens `--ui-color-qr-foreground` (ink) and `--ui-color-qr-background` (white), identical in light and dark and in every profile.
- Docs: rich galleries for both components (shapes, finders, colours, sizes, logo variants, error-correction comparison, live typing, auto-refreshing and expiring codes with countdown, status states, PNG/SVG download and copy image, ticket and payment cards, dark theme; Barcode formats, live check digit, invalid values, POS receipt).
- Tests: 21 encoder tests (known answers from ISO/IEC 18004 Annex I, textbook "HELLO WORLD", RS generators, format/version information, capacity table, mask selection, golden matrices), 32 `QRCode` and 16 `Barcode` tests, one per acceptance criterion.

#### Changed
- Bundle budget raised (`dist/index.js` 140129 to 158679 bytes, `dist/styles.css` 57699 to 60605) for the encoders, renderers and regenerated tokens; apps import components individually and tree-shake them.

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
- Self-hosted OFL fonts (Fraunces, Instrument Sans in 1.4.0, replaced by Albert Sans in the identity v2 foundation; latin + latin-ext, `unicode-range`), shipped as `dist/fonts/*.woff2` and referenced from `dist/styles.css`. No third-party font requests; strict CSPs keep working.
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

