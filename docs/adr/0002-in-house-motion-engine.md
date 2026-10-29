# ADR 0002 — In-house motion engine (no animation library)

- Status: accepted
- Date: 2026-10-29

## Context
Identity v2 ("Monteringsanvisning") defines a small motion grammar in design-system-mcp `foundations/motion`: Assemble (parts slide along a guide line and click into place), Turn (view transitions), Tick (rolling counts) and Lift and drop (FLIP). It needs mount/unmount with exit animations, staggered entrances, layout (FLIP) animation and number rolls. Framer Motion, GSAP, react-spring and similar libraries are banned by the dependency policy (React is the only runtime dependency) and would add tens of kilobytes for four movements.

## Decision
Build the movements on platform primitives in `src/motion/`, all exported from the package and covered by unit tests with a mocked Web Animations API and `matchMedia`:
- **CSS** for declarative enter/exit (`[data-state="open" | "closed"]` keyframes using the `--ui-motion-*`, `--ui-easing-*` and `--ui-assemble-distance` tokens).
- **Web Animations API** (`safeAnimate`) for sequenced and dynamic motion: `useAssemble`, `useFlip`, `QuantityTick`. Parts keep their natural, visible position (`fill: backwards`), so a failed script never hides content.
- **View Transitions API** (`useViewTransition`) for Turn, with a fallback that simply runs the update.
- `usePresence(open, { exit })` keeps content mounted with `data-state="closed"` for ~70% of the entrance duration, then unmounts. Correctness never waits on `transitionend`.

Rules enforced in code and tests: only `transform`, `opacity`, `clip-path` and `box-shadow` are animated (never layout properties, never `transition: all`); `prefers-reduced-motion` resolves spatial motion instantly (opacity fades of at most 120 ms); animations are skipped in a hidden tab and finished when the tab becomes hidden; lists animate at most 8 items; tokens are read live from the document so profiles (pos, game) change distances and durations without code changes.

Environments without `document.getAnimations` (SSR, jsdom, very old browsers) unmount overlays immediately, which keeps every existing synchronous test and server render valid.

## Consequences
- No new dependency; the engine adds roughly 4 KB gzip to `dist/index.js` (see `bundle-budget.json`).
- Overlays (Dialog, Drawer, Menu popups, Toast) stay mounted and inert for a short exit; focus is restored when the user closes, not when the exit ends.
- Interruptible FLIP and richer spring physics are out of scope; add them only when a spec needs them, and keep them dependency-free.
