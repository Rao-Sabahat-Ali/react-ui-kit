---
name: react-ui-kit (Monteringsanvisning, identity v2)
description: A personal React 19 + Bootstrap 5.3 design system drawn as an assembly sheet: white paper, kraft shell, 2px ink lines, one signal-blue accent, numbered step panels whose parts click into place.
colors:
  ink: "#121212"
  ink-hover: "#2c2c2c"
  ink-active: "#000000"
  ink-subtle: "#ededed"
  paper: "#ffffff"
  paper-sunken: "#f4f4f4"
  kraft: "#c49a6c"
  kraft-hover: "#b58a5a"
  kraft-ink: "#121212"
  signal-blue: "#1e5aa8"
  signal-blue-hover: "#174a8c"
  signal-blue-subtle: "#e8f0fb"
  signal-blue-deep: "#123b70"
  text-muted: "#5a5a5a"
  text-subtle: "#737373"
  hairline: "#e2e2e2"
  border-strong: "#cdcdcd"
  border-input: "#858585"
  success: "#1f7a3e"
  danger: "#bf2a1f"
  warning: "#f5b301"
  warning-deep: "#6b4600"
  info: "#3f6479"
  go-green: "#1f7a3e"
  cta-orange: "#c2410c"
  pencil-red: "#b3261e"
  signal-yellow-light: "#8a5f00"
  signal-yellow-night: "#ffc53d"
typography:
  display:
    fontFamily: "Albert Sans, system-ui, -apple-system, Segoe UI, Roboto, Helvetica Neue, Arial, sans-serif"
    fontSize: "6rem"
    fontWeight: 250
    lineHeight: 0.95
    letterSpacing: "-0.03em"
  quantity:
    fontFamily: "Albert Sans, system-ui, -apple-system, Segoe UI, Roboto, Helvetica Neue, Arial, sans-serif"
    fontSize: "2.25rem"
    fontWeight: 250
    lineHeight: 1.1
    letterSpacing: "-0.02em"
    fontFeature: "tnum"
  headline:
    fontFamily: "Albert Sans, system-ui, -apple-system, Segoe UI, Roboto, Helvetica Neue, Arial, sans-serif"
    fontSize: "2.25rem"
    fontWeight: 600
    lineHeight: 1.1
    letterSpacing: "-0.02em"
  title:
    fontFamily: "Albert Sans, system-ui, -apple-system, Segoe UI, Roboto, Helvetica Neue, Arial, sans-serif"
    fontSize: "1.25rem"
    fontWeight: 600
    lineHeight: 1.25
    letterSpacing: "-0.02em"
  body:
    fontFamily: "Albert Sans, system-ui, -apple-system, Segoe UI, Roboto, Helvetica Neue, Arial, sans-serif"
    fontSize: "1rem"
    fontWeight: 400
    lineHeight: 1.5
  label:
    fontFamily: "Albert Sans, system-ui, -apple-system, Segoe UI, Roboto, Helvetica Neue, Arial, sans-serif"
    fontSize: "0.875rem"
    fontWeight: 600
    lineHeight: 1.5
rounded:
  sm: "3px"
  md: "6px"
  lg: "10px"
spacing:
  space-1: "4px"
  space-2: "8px"
  space-3: "12px"
  space-4: "16px"
  space-5: "20px"
  space-6: "24px"
  space-8: "32px"
  space-10: "40px"
  space-12: "48px"
  space-16: "64px"
components:
  button-primary:
    backgroundColor: "{colors.ink}"
    textColor: "{colors.paper}"
    typography: "{typography.body}"
    rounded: "{rounded.md}"
    padding: "0 12px"
    height: "40px"
  button-primary-hover:
    backgroundColor: "{colors.ink-hover}"
  button-primary-active:
    backgroundColor: "{colors.ink-active}"
  button-outline:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.ink}"
    typography: "{typography.body}"
    rounded: "{rounded.md}"
    padding: "0 12px"
    height: "40px"
  button-outline-hover:
    backgroundColor: "{colors.paper-sunken}"
  input:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.ink}"
    typography: "{typography.body}"
    rounded: "{rounded.md}"
    padding: "0 12px"
    height: "40px"
  step-panel:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.ink}"
    rounded: "{rounded.lg}"
    padding: "24px"
  step-panel-current:
    textColor: "{colors.signal-blue}"
  card:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.ink}"
    rounded: "{rounded.lg}"
    padding: "16px"
  parts-list-item:
    textColor: "{colors.ink}"
    typography: "{typography.quantity}"
    padding: "16px"
  data-table:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.ink}"
    typography: "{typography.label}"
    rounded: "{rounded.lg}"
  shell-rail:
    backgroundColor: "{colors.kraft}"
    textColor: "{colors.kraft-ink}"
    width: "256px"
  shell-topbar:
    backgroundColor: "{colors.kraft}"
    textColor: "{colors.kraft-ink}"
    height: "56px"
  dialog:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.ink}"
    rounded: "{rounded.lg}"
  toast:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.ink}"
    rounded: "{rounded.lg}"
  message:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.ink}"
    rounded: "{rounded.lg}"
    padding: "12px 16px"
  empty-state:
    textColor: "{colors.text-muted}"
    rounded: "{rounded.lg}"
    padding: "40px 16px"
  kanban-card:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.ink}"
    rounded: "{rounded.md}"
    padding: "12px"
---

# Design System: react-ui-kit (Monteringsanvisning, identity v2)

Machine source of truth for tokens, rules and motion is the sibling repo `design-system-mcp` (`specs/tokens/tokens.json`, `specs/foundations/identity.md`, `motion.md`, `shape-elevation.md`, `specs/rules/consistency.md`). `src/styles/_tokens.generated.scss` is generated from it; this file records the system as built and does not replace those specs. Where the build and a spec differ, the build wins and the difference is listed under "Divergences" in Do's and Don'ts. Values below are the light, default-profile (saas) values; dark and profile values are in `.impeccable/design.json` and the generated tokens.

## Overview

**Creative North Star: "The Assembly Sheet"** (Monteringsanvisning)

Every flow is an instruction sheet: numbered steps, one action each, a picture before words, and parts that slide along a dashed guide and click into place. White paper carries the work. Structure is drawn, not boxed or shadowed: 2px ink lines with rounded 6px part corners and 10px sheets. The shell (rail, top bar, empty-state plates) is kraft cardboard, the material the parts came in. One signal blue marks where you are: the active step, the selection, the focus ring, progress and links. Type is a single Scandinavian grotesk, Albert Sans, with large light numerals where the sheet counts.

On working screens the world lends type, palette, density and one signature move. Navigation, controls and layouts stay the standard ones people already know (buttons, tabs, inputs, tables, menus): a screen reads as a working product first and an instruction sheet second. Multi-step work (sessions, onboarding, checkout, steppers, board columns) is the one place the sheet shows itself fully, as `StepSheet` panels with a large light numeral, one line-art figure or key value, and one action. Headline numbers are a parts list (a ruled strip of quantity marks), never a row of big-number tiles.

The system is flat at rest. Only things lifted off the sheet (menus, popovers, dialogs, drawers, toasts, dragged cards) carry the one soft offset shadow. Eight profiles (saas, admin, dashboard, cms, pos, game, ecommerce, landing) vary density, radius, motion pace and the primary or accent colour inside the same world.

Known ceilings, recorded as facts and not as rules: kraft is a flat colour with no material cue beyond hue; dashboard and admin screens carry little assembly vocabulary beyond chrome, numerals and the parts list, by design.

**Key Characteristics:**
- White sheet, kraft shell, ink structure, one blue.
- 2px ink lines (`--ui-line-width`) draw every distinct object; 1px hairlines only inside dense data.
- Albert Sans only; light display numerals (weight 250), UI text 400 to 600, tabular figures for counts.
- Ink primary button, one per view; profiles may recolour it (pos go-green, ecommerce orange).
- Flat resting surfaces; shadow only on lifted overlays and dragged items.
- Motion is material: Assemble, Turn, Tick, Lift and drop, built in-house, skippable under reduced motion.
- Optional 3D (`look="sheet"`) is an object drawn on the sheet, never a working-screen device.

## Colors

A white-and-ink palette with a kraft shell and a single blue. Nothing is tinted cream, nothing is a gradient. Status hues exist for meaning only.

### Primary
- **Ink** (`#121212`, hover `#2c2c2c`, active `#000000`): the primary button, the structural 2px line, body text. Inverted to `#f2f2f2` in the dark theme.

### Secondary
- **Signal Blue** (`#1e5aa8`, hover `#174a8c`, subtle `#e8f0fb`, deep `#123b70`): the active step numeral and outline, selected rows and items, the focus ring, links, progress, sliding marks, dashed assemble guides. Light-theme accent for every profile except cms; in dark it becomes `#8db3e8`.

### Tertiary
- **Kraft** (`#c49a6c`, hover `#b58a5a`, ink on kraft `#121212`): the app rail, top bar, bottom nav and the tint behind empty-state plates (22% kraft mixed into paper). A flat colour; dark theme uses a deep brown `#3b2d1c` with `#efe4d4` ink.

### Neutral
- **Paper** (`#ffffff`): ground and surface. Dark theme: night sheet `#0f0f10`, surface `#151517`, raised `#1c1c1e`.
- **Paper Sunken** (`#f4f4f4`): subtle ground, hovered rows, card captions.
- **Hairline** (`#e2e2e2`) and **Border Strong** (`#cdcdcd`): row dividers and emphasis borders inside data. **Border Input** (`#858585`) keeps form boundaries above 3:1.
- **Text Muted** (`#5a5a5a`) and **Text Subtle** (`#737373`): secondary copy and upcoming-step numerals.
- **Status:** success `#1f7a3e`, danger `#bf2a1f`, warning `#f5b301` (text on warning is ink; emphasis `#6b4600`), info `#3f6479`. A Message frames itself in the status colour and draws its icon in the status emphasis colour.
- **Profile overrides:** pos primary go-green `#1f7a3e`; ecommerce primary call-to-action orange `#c2410c`; cms accent pencil red `#b3261e`; game accent signal yellow (`#ffc53d` on the night sheet, `#8a5f00` on paper) and game's night sheet is deeper (`#060607` ground).

### Named Rules
**The One Ink Rule.** The primary action is solid ink (or the profile's primary), once per view. Secondary actions are drawn: a 2px ink outline with no fill.

**The Signal Blue Rule.** Blue means "this is where you are": active step, selection, focus, progress, links. It is never decoration, never a second brand colour, never a button fill.

**The Chart Palette Rule.** Series colours come from `--ui-color-chart-1..8` (chart-1 is the signal blue, chart-2 a kraft brown); a chart never invents hues.

## Typography

**Display Font:** Albert Sans (variable 100 to 900, self-hosted, latin plus latin-ext; fallback system-ui stack)
**Body Font:** Albert Sans
**Label/Mono Font:** Albert Sans for labels; `ui-monospace` stack for code only

**Character:** One grotesk at two temperatures. Numerals and display numbers are light (weight 250) and large, like the step numbers on an instruction page; everything you read or press is 400 to 600. Heading tracking is slightly tight (-0.02em).

### Hierarchy
- **Display** (250, `clamp(3rem, 12vw, 6rem)`, 0.95): the step numeral in a StepSheet panel. Current is signal blue, complete is muted, upcoming is subtle. Kanban column numerals are the same voice at 2rem; `ui-qty--display` is 3rem.
- **Quantity** (250, 2.25rem, 1.1, tabular figures): headline numbers in the parts list (`StatCard` value) and quantity marks such as `12×`; the multiplication sign is muted.
- **Headline** (600, 2.25rem, 1.1, -0.02em): `PageHeader` title; the page's 2px ink rule sits below it.
- **Title** (600, 1.25rem, 1.25): step titles, empty-state titles, dialog titles.
- **Body** (400, 1rem, 1.5; 0.875rem in the admin profile, 1.125rem in pos and landing): running text; step body copy is capped at 36ch, empty-state copy at 40ch.
- **Label** (600, 0.875rem): table headers, field labels, tab labels (500, active 600). Sentence case always.

### Named Rules
**The Light Numeral Rule.** Only numbers that count or order things (step numbers, quantities, scores) use the light display weight. Headings never do.

**The Real Count Rule.** A quantity mark (`8×`, `1×`) appears only on a real count. Never a decorative 01/02/03 and never a number invented to fill a figure.

## Layout

A white working area beside a kraft rail. The app shell is a 16rem sticky rail (4.5rem collapsed) under a 3.5rem kraft top bar, both edged with a 2px ink line; main padding is 2rem on wide screens, 1.5rem under 1200px and 1rem under 768px, and mobile swaps the rail for a kraft bottom nav. Spacing is a 4px-based scale (`--ui-space-1..16`: 4, 8, 12, 16, 20, 24, 32, 40, 48, 64). Controls are 32, 40 and 48px tall (sm, md, lg) with a 44px minimum touch target on coarse pointers; density modes (compact, comfortable, spacious) and profiles retune these.

Screens are built from PageHeader, Section, IndexList, StatGroup (the parts list), DataTable and StepSheet. StepSheet panels share their 2px lines (borders overlap) and run as a ruled strip from 768px up (`--strip`) or as a stack with the figure beside the copy (`--stack`); each panel is at least 14rem tall with the action at its bottom start. Cards are for distinct objects only. Breakpoints follow Bootstrap (576, 768, 1200). Logical properties throughout; RTL mirrors the reading direction, including motion.

## Elevation & Depth

Flat by default. Resting things (cards, controls, step panels, tables) are outlined in the 2px ink line and carry no shadow; a resting element never has both a line and a shadow. Depth appears only for things lifted off the sheet: the lifted level for menus, popovers, dialogs, drawers and toasts, the drag level for picked-up cards and rows (with scale 1.02). Hover on a card changes its border colour, not its shadow. In the dark theme the ink line becomes mid-grey (`#8f8f8f`) and surfaces get lighter as they rise (`surface` to `surface-raised`).

### Shadow Vocabulary
- **Lift** (`box-shadow: 0 8px 24px -6px rgb(18 18 18 / 0.2), 0 2px 6px 0 rgb(18 18 18 / 0.08)`): menus, popovers, dialogs, drawers, toasts. Always paired with the 2px ink line and `surface-raised`.
- **Drag** (`box-shadow: 0 16px 36px -8px rgb(18 18 18 / 0.3), 0 4px 10px 0 rgb(18 18 18 / 0.1)`): a dragged Kanban card or row.
- **Sticky** (`box-shadow: 0 1px 2px 0 rgb(18 18 18 / 0.08)`): sticky headers only.
- `--ui-shadow-md/lg/xl` still exist for existing apps; new work uses lift and drag.

### Named Rules
**The Flat Sheet Rule.** Line or shadow, never both. A resting surface is drawn with the 2px line; only a lifted part adds the soft offset shadow.

**The Overlay Line Rule.** A lifted part keeps its 2px ink line and gets the shadow on top, so it reads as a part set on the sheet and not a glow.

## Shapes

Parts are drawn with rounded 6px corners (`--ui-radius`); sheets, panels, cards, dialogs, menus and toasts use 10px (`--ui-radius-lg`); small chips, checkboxes and badges use 3px (`--ui-radius-sm`); switches, avatars and status dots are circles. Buttons are not pills. Nested radius is outer minus padding. Profiles shift the whole scale (admin 3px and 6px; pos and game 10px and 14px). Lines are 2px ink with non-scaling strokes in line art; hairlines (1px) appear only between data rows and list items. Line-art figures are drawn at their own fixed size in `currentColor`, with a dashed 2px guide in the accent, paper fills only, and no text, quantity marks or glyph icons inside the drawing. Dashed 2px accent lines are the guide a part assembles along.

## Components

Components keep their familiar anatomy; the world shows in line, type, marks and motion.

### Buttons
- **Shape:** 6px corners (`rounded.md`), 2px border, 40px tall (sm 32, lg 48 with 10px corners), gap 0.5em for an icon.
- **Primary:** solid ink on paper text, medium weight, 12px side padding. One per view.
- **Hover / Focus:** colour at 160ms; press settles 1px down at 90ms (transform only, off under reduced motion). Focus is the global ring: accent, 2px, offset 2px.
- **Secondary / Ghost:** outline is a 2px ink line with no fill, hover fills paper-sunken; text variants use the intent emphasis colour on a subtle ground; links use signal blue.

### Inputs / Fields
- **Style:** paper ground, 2px ink line, 6px corners, 40px tall; border input contrast stays above 3:1.
- **Focus:** the border turns signal blue and the global ring appears.
- **Error / Disabled:** border danger; disabled uses border-strong on paper-sunken with subtle text.

### Navigation
- **Rail and top bar:** kraft ground, ink text, 2px ink edge; the hovered item takes kraft-hover. Mobile uses a kraft bottom nav.
- **Tabs:** a transparent strip with one signal-blue bar under the selected tab that slides (transform and scale only); active label is semibold. The same sliding mark is used by paged indicators (short 2px dashes with one blue mark).
- **Menus:** a lifted part; the highlighted item (hover, keyboard cursor and open parent look identical) takes an accent-subtle ground and a 2px accent marker inside the item.

### StepSheet (signature component)
Numbered step panels sharing 2px ink lines. Each panel shows a large light numeral, a title, a line-art figure or key value, short body copy and one action at its bottom start. The current panel gets a signal-blue numeral, a blue 2px outline and a visible dashed guide along which its parts assemble; complete panels go muted with a check; upcoming panels lighten and their action is inert. Used for sessions, onboarding, checkout and Stepper content.

### Parts list (StatGroup and StatCard)
A ruled strip between two 2px ink lines, items separated by 1px hairlines, each item a small line icon, a light tabular quantity and a muted label. It collapses to two columns on phones. Never rendered as boxed tiles.

### Data (DataTable, KanbanBoard)
- **DataTable:** a 2px ink frame with 10px corners, a 2px ink line under the header, hairlines between rows, tabular numerals, hover and stripes in paper-sunken. A selected row is accent-subtle with a 2px accent marker at its inline start.
- **KanbanBoard:** columns are numbered stages (light 2rem numeral), cards are 2px-line parts, columns assemble along a dashed accent guide; a picked-up card lifts with the drag shadow and settles with the snap easing; other cards make room with FLIP layout motion.

### Overlays and feedback (Dialog, Toast, Message, EmptyState)
- **Dialog, popover, drawer, toast:** `surface-raised`, 2px ink line, 10px corners, the lift shadow. Enter at part or step pace with scale from 0.98 and opacity; exit at 70% duration on the ease-in curve.
- **Message:** a ruled note on paper, a 2px frame in the status colour, a line-art icon in the status emphasis colour, no tinted ground and no coloured side border.
- **Toast:** severity is the icon colour plus text.
- **EmptyState:** a kraft-tinted plate with a 2px ink line, a line-art drawing instead of an icon bubble (or a `Scene3D` in the media slot), one title, one sentence, one action; its parts assemble in.

### Motion (Assemble, Turn, Tick, Lift and drop)
Tokens: instant 90ms, quick 160ms, part 280ms, step 420ms, stagger 40ms (max 8 parts), assemble distance 12px, out `cubic-bezier(0.16, 1, 0.3, 1)`, snap `cubic-bezier(0.34, 1.4, 0.64, 1)` only for the final part or a dropped card, in `cubic-bezier(0.7, 0, 0.84, 0)` for exits. Profiles retune pace (pos 120/200ms with 4px travel; game 280/520ms with 20px travel). Animation is transform, opacity, clip-path and box-shadow only, never layout and never `transition: all`; every animation resolves to its final state under reduced motion (fades up to 120ms allowed). Hooks live in `src/motion` (`useAssemble`, `useFlip`, `useCountTick`, `usePresence`, `useViewTransition`); no animation library.

### Optional 3D (`@sabahat/react-ui-kit-3d`, `look="sheet"`)
Flat surface fills with 2px ink edges read live from the tokens, kraft for wooden parts, accent for screws and details, on a transparent background so the page's paper shows through; it assembles in 3D along dashed accent guides. Allowed for one landing hero object, a game menu backdrop (`look="shaded"` on the night sheet), an empty-state illustration and an ecommerce turntable; never for charts, readable content or working screens, and always with a text alternative and a line-art poster.

## Do's and Don'ts

### Do:
- **Do** draw structure with the 2px ink line (`--ui-line-width`, `--ui-color-line`) and use 1px hairlines only inside dense data.
- **Do** keep the primary button ink, one per view, and put the action inside the step it belongs to.
- **Do** use signal blue only for the active step, selection, focus, progress and links.
- **Do** number a sequence only when order carries meaning; write counts as quantity marks (`8×`) only when they are real counts.
- **Do** use kraft for the shell and empty-state plates and white for the work.
- **Do** read every colour, radius, line, shadow and duration from `var(--ui-*)` tokens; theme the browser surfaces (selection in accent at 28%, accent caret, scrollbars in border-strong, tabular numerals).
- **Do** start motion from the visible final state, honour reduced motion, and let a figure's parts lower along its dashed guide.

### Don't:
- **Don't** put a line and a shadow on the same resting element, or add any shadow to a resting surface.
- **Don't** use gradients, glass or blur, glow, neon, hard offset shadows, or a coloured side border on alerts and list items.
- **Don't** use eyebrow or kicker labels above headings, all-caps labels, pills as the default shape, icon bubbles, or decorative emoji and unicode stand-ins for icons.
- **Don't** build page structure from same-size icon-heading-text card grids, or headline numbers from big-number tiles.
- **Don't** costume working screens as paper (torn edges, staples, texture behind data); kraft is a flat shell colour.
- **Don't** put text or quantity marks inside a line-art figure, or give a figure any fill other than paper.
- **Don't** use 3D for data, working screens, or as the only carrier of information.
- **Don't** pull in another UI kit, animation library, Bootstrap JS or Popper.

### Divergences (build wins, specs not yet updated)
- Step numeral tops out at 6rem (96px) in the build; the direction contract asks for 96 to 120px.
- Dark theme structural line is mid-grey `#8f8f8f` (as in `foundations/color.md` and the generated tokens); `foundations/identity.md` says "paper-white line art" for the night sheet.
- Legacy tokens `--ui-motion-duration-*`, `--ui-motion-easing-*` and `--ui-shadow-md/lg/xl` remain in the generated file for existing apps; new work does not use them.
