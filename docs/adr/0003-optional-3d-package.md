# ADR 0003 — Optional 3D package on plain three.js

- Status: accepted
- Date: 2026-10-30

## Context
Identity v2 wants depth on a few surfaces: landing heroes, game menus and empty-state illustrations. The core kit must keep zero runtime dependencies besides React and its bundle budget (ADR 0002, `bundle-budget.json`), and Lighthouse performance ≥ 0.9 on app key routes. three.js is about 150 KB gzip. Objects come from the `img2threejs` skill, whose output is a procedural TypeScript factory that builds a `THREE.Object3D` from code, or from glTF files.

Options considered:
1. **3D components inside the core kit** behind dynamic import. Rejected: the core would gain a peer dependency every app must install, and its types would depend on three.
2. **react-three-fiber + drei.** Rejected: two more runtime dependencies (plus their own peers), a second React reconciler, and far more API than three components need.
3. **A separate package on plain three.js**, imperative inside React components. Accepted.

## Decision
- New package `@sabahat/react-ui-kit-3d` in `packages/react-ui-kit-3d/` of this repo (npm workspaces; the root package stays the core kit and its published `files` exclude `packages/`). Versioned and published on its own, starting at 0.1.0.
- Peer dependencies: `react`, `react-dom`, `@sabahat/react-ui-kit` (tokens, Button, Icon, locale, motion helpers) and `three` (`>=0.170.0`). No other runtime dependencies. `@types/three` is a dev dependency.
- three is never imported statically: the package entry contains no `three` import; `Scene3D` calls `import('three')` (and `three/addons/loaders/GLTFLoader.js` only when a `src` model is used) when the scene first nears the viewport. Until then, and whenever WebGL is unavailable, the context is lost, or loading fails, the scene shows its `poster`.
- Components: `Scene3D` (canvas host, camera, lighting, render loop, a11y, fallbacks) and `Model3D` (declares one object by `factory` or `src`). Hero and empty-state use are slots and patterns (`landing-sections`, `game-menu-hud`, EmptyState `media`), not extra components.
- The default `look="sheet"` renders the assembly-sheet world in 3D: surface-coloured flat fills with 2px-looking ink edges, colours read live from `--ui-*` tokens and refreshed on theme or profile change. The 3D Assemble movement explodes an object's parts along dashed guide lines and settles them with `--ui-easing-snap`.
- Render on demand: frames are drawn only while something moves (assemble, auto-rotate, controls, a model's `animate`). The loop stops offscreen, in a hidden tab and under `prefers-reduced-motion` (a single still frame is drawn). Device pixel ratio is capped (default 2). Everything three allocates is disposed on unmount.
- The package has its own bundle budget for its code (excluding three) and its own tests: jsdom unit tests with a mocked three module for logic and a11y, Playwright (Chromium with software WebGL) for real rendering.

## Consequences
- Apps that never import the 3D package pay nothing. Apps that do pay three only on routes that render a scene, after the scene nears the viewport.
- The MCP serves 3D specs like any other component; specs name their package in front matter (`package: '@sabahat/react-ui-kit-3d'`) so `get_component_code` and conformance look in the package folder.
- Charts stay 2D (`rules/data-display`: no 3D charts). 3D is decoration and product display only, never the only carrier of information: every scene has a text alternative.
- Interactive physics, post-processing and shader effects are out of scope until a spec needs them.
