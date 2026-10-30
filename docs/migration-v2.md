# Upgrading to react-ui-kit 2.0.0 (identity v2)

For app authors and coding agents moving an app from 1.4.0 (or any 1.x) to 2.0.0. The full list of changes is in the [CHANGELOG](../CHANGELOG.md); this guide covers what you have to do.

Most apps need three things: the install, the font change, and a visual check. The rest only matters if your app styles kit internals or depends on a default that changed.

## 1. Install

```bash
npm install @sabahat/react-ui-kit@2.0.0
```

Optional 3D package (see [its README](../packages/react-ui-kit-3d/README.md)):

```bash
npm install @sabahat/react-ui-kit-3d three
npm install -D @types/three   # for TypeScript model factories
```

React 19 and Bootstrap 5.3 are unchanged. After installing, check there is a single kit version with `npm ls @sabahat/react-ui-kit`.

## 2. Fonts

Albert Sans replaces Fraunces (headings) and Instrument Sans (body). The old font files are no longer shipped, so a preload or precache that names them now returns 404.

Before:

```html
<link rel="preload" as="font" type="font/woff2" crossorigin href="/fonts/fraunces-latin-wght-normal.woff2">
```

After (the URL your bundler gives `@sabahat/react-ui-kit/dist/fonts/albert-sans-latin-wght-normal.woff2`):

```html
<link rel="preload" as="font" type="font/woff2" crossorigin href="/fonts/albert-sans-latin-wght-normal.woff2">
```

Remove any preload of `instrument-sans-*`. If a service worker precaches fonts, list the four `albert-sans-*.woff2` files (latin and latin-ext, normal and italic) instead of the Fraunces and Instrument Sans files.

## 3. Breaking changes

### Visual identity and tokens

The look changes everywhere: white paper, kraft shell, 2px ink lines, signal-blue accent, flat surfaces. Kit components need no code change for this. Your own CSS does if it hard-codes values.

No token name was removed, but the values changed. Replace hard-coded colours, radii and the serif heading family with tokens.

Before:

```css
.page-title { font-family: Fraunces, serif; border-radius: 4px; color: #2b2b2b; }
```

After:

```css
.page-title { font-family: var(--ui-font-family-heading); border-radius: var(--ui-radius); color: var(--ui-color-text); }
```

Radius is now 6px (`--ui-radius`), 10px (`--ui-radius-lg`) and 3px (`--ui-radius-sm`).

### Focus rings are outlines

Restyled components draw focus as an outline (`--ui-focus-ring-width`, offset `--ui-focus-ring-offset`), not a `box-shadow`. If your CSS overrides a kit control's focus with `box-shadow`, remove that rule and let the kit draw it, or use the same tokens:

```css
.my-control:focus-visible {
  outline: var(--ui-focus-ring-width) solid var(--ui-color-focus-ring);
  outline-offset: var(--ui-focus-ring-offset);
}
```

### Badge is not a pill

`Badge` defaults to `pill={false}`: count badges use the small part radius. The markup is the same.

```tsx
<Badge value={3} />        // 2.0.0: small radius (was a pill in 1.x)
<Badge value={3} pill />   // keeps the 1.x shape
```

### ProgressBar markup

The root no longer has `.progress`. The track does, and the fill moves by a custom property instead of a `width` style.

| | 1.4.0 | 2.0.0 |
|---|---|---|
| Root | `.progress.ui-progress-bar[role=progressbar]` | `.ui-progress-bar[role=progressbar]` |
| Track | the root | `.progress.ui-progress-bar__track` |
| Fill | `.progress-bar.bg-primary`, `style="width: 40%"` | `.ui-progress-bar__fill`, `style="--ui-progress-value: 0.4"` |
| Colour | `bg-<variant>` | `variant` through `--ui-progress-fill` |
| `showValue` at `lg` | text inside the fill | text beside the track |

The `ProgressBar` props are unchanged. Do not select `.progress-bar` or `bg-*` on the fill any more; use `variant`, `size` and `showValue`.

### Divider

`<Divider />` is a hairline in `--ui-color-line-muted`. `type="dashed"` and `type="dotted"` are 2px rules. The props are unchanged. For the 1.x 1px rule:

```css
.ui-divider { --ui-divider-width: 1px; }
```

### Kbd is not monospace

Keycaps use Albert Sans with tabular figures. If you want the old mono look:

```css
.my-shortcut.ui-kbd { font-family: var(--ui-font-family-mono); }
```

### Link `link-primary`

`link-primary` is the accent colour, not ink. For an ink link, set a class with `color: var(--ui-color-text)`.

### Terminal is always dark

`Terminal` sets `data-bs-theme="dark"` on itself, so it is a night sheet in light apps too. There is no prop to switch that off.

### Stepper and DeferredContent wrap their content

`Stepper` puts the active step's children in a new `div.ui-stepper__body`. `DeferredContent` puts loaded children in a new `div.ui-deferred-content__body`. Selectors that matched direct children must match one level deeper.

Before:

```css
.ui-stepper__panel > .checkout-fields { margin-top: 1rem; }
```

After:

```css
.ui-stepper__body > .checkout-fields { margin-top: 1rem; }
```

Tests that query `.ui-deferred-content > …` need the same change.

### SpeedDial parts are square

The trigger and the actions no longer carry `rounded-circle`. If your design needs round buttons:

```css
.ui-speed-dial__trigger,
.ui-speed-dial__action { border-radius: 50%; }
```

### Overlays stay mounted while they close

Dialog, Drawer, Toast, Popover, Tooltip, ConfirmPopup, MegaMenu, ContextMenu, CommandPalette, the Select family, SpeedDial and Menubar submenus keep their DOM for about 70% of their entrance time after closing. During that time they carry `data-state="closed"` and `inert`. Then they are removed or hidden. Focus is restored when the user closes, not when the exit ends.

If a test or a script expects the node to be gone in the same frame as the close, wait for it:

Before:

```ts
await user.keyboard('{Escape}');
expect(screen.queryByRole('dialog')).toBeNull();
```

After (Testing Library retries until the node is gone; in jsdom the node is removed at once, so unit tests keep passing):

```ts
await user.keyboard('{Escape}');
await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
```

In a real browser (Playwright) use the auto-waiting assertion:

```ts
await expect(page.getByRole('dialog')).toBeHidden();
```

Menubar submenus follow the same rule: their `hidden` attribute is set after the exit, not when the menu closes.

## 4. New, and optional to adopt

- **Task board.** `npm run create-app -- ../my-board --profile saas --blueprint board` starts from the Task board blueprint, built on `KanbanBoard`. Pattern `board` in the design system. Move tasks in your own state with `applyKanbanMove(cards, move, lanes?)`.
- **StepSheet** for multi-step flows, **QuantityTick** for counts, `StatGroup` as the ruled parts list.
- **EmptyState `media`** takes a `Scene3D variant="empty-state"` or an `Image` in place of the icon. Media brings its own text alternative.
- **Timeline** `numbered` for ordered events, and `animate={false}` if you want the 1.x static timeline. Animation is on by default and is instant under reduced motion.
- **3D.** `create-app --with-3d` adds the optional package to a new app. Scenes never replace information; every scene needs an `aria-label` (or `decorative`, which hides it from assistive technology).

## 5. Verify the upgrade

1. **Build and tests.** Run your app's typecheck, unit tests and build. Fix failures from sections 2 and 3 first.
2. **Design check.** For agents with the design-system MCP: run `check_ui_code` on every changed UI file and fix each error. The v2 rules added in the MCP 1.0.0 release include `hard-offset-shadow`, `side-border-accent` and `layout-animation`.
3. **Visual baselines.** Expect every snapshot to change. Review each screen in light and dark, at comfortable and compact density, and at phone width. Only then update the baselines (for Playwright: `npx playwright test --update-snapshots`).
4. **Lighthouse.** Run Lighthouse on your key routes. The kit's target is a performance score of at least 0.9 on app key routes (ADR 0003). Check the font preload in the network waterfall: the Albert Sans file should load from your origin on the first request.
5. **Motion.** Turn on reduced motion in the OS or browser and check that the screens still read correctly. Overlays and steps should appear and disappear without travel.
