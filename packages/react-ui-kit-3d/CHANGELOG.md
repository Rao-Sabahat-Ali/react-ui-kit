# Changelog

All notable changes to `@sabahat/react-ui-kit-3d`. Versions follow [semver](https://semver.org/). The core kit is [`@sabahat/react-ui-kit`](../../CHANGELOG.md); decision record: [ADR 0003](../../docs/adr/0003-optional-3d-package.md).

## 0.1.0 — 2026-10-30

First release: an optional 3D package on plain three.js for the identity v2 assembly sheet. Install with `npm install @sabahat/react-ui-kit-3d three`. Works with `@sabahat/react-ui-kit` 2.0.0.

### Added
- **`Scene3D`**: canvas host with camera, lighting, a render loop and accessibility. `aria-label` is required unless `decorative`; `description` adds a longer text alternative. `poster` is the required line-art fallback in the same box as the canvas.
  - `variant`: `hero` (at least 20rem, 16:9), `inline` (4:3, the default) and `empty-state` (10rem square, for EmptyState `media`).
  - `look`: `sheet` (the default; flat token fills with 2px ink edges) or `shaded` (lit materials in the token colours, for the night sheet).
  - `controls="orbit"`: pointer drag, two-finger pinch, Ctrl+wheel zoom (a plain wheel still scrolls the page), arrow keys to rotate, `+` and `-` to zoom, Home to reset. Polar angle and distance are limited. In-house, about 1 KB gzip, so there is no extra import.
  - `autoRotate` (`true` is 12 degrees per second, or a number of degrees per second) with a Pause and Play control.
  - `assemble`: the 3D Assemble on first view.
  - `loading`: `visible` (starts 200px before the viewport, the default), `eager` or `interaction`.
  - `camera`, `aspectRatio`, `maxDpr` (default 2), `onReady` and `onError`.
- **`Model3D`**: declares one object by `factory` or `src`, with `position`, `rotation`, `scale`, `fit`, `parts`, `animate`, `restyle` and `label`.
  - A **factory** is `(three, ctx) => Object3D | Promise<Object3D>`. It builds with the `three` module it is handed, so the package never imports three itself. `mesh.userData.sheet` (`'shell' | 'accent' | 'raised' | 'ink'`) picks the sheet fill.
  - `parts="children"` makes each direct child one assembly part.
  - `src` loads glTF and GLB through `GLTFLoader`, which is imported only when used.
- **Sheet look.** Flat `MeshBasicMaterial` fills in `--ui-color-surface`, kraft `--ui-color-shell` for wooden parts and accent for screws and details. The 2px ink edges are screen-space quads (crease edges and a back-face silhouette), `--ui-line-width` wide in device pixels, in `src/engine/lines.ts`. Guide lines are the same quads, dashed.
- **3D Assemble.** Each part starts exploded outward by 0.6 times the object's size. A dashed accent guide traces each part's path. Parts arrive `--ui-motion-stagger` apart over `--ui-motion-step` with `--ui-easing-out`, and the last one settles with `--ui-easing-snap`. Final transforms are the authored ones.
- **Tokens live.** Colours are read from the scene's root element when the scene loads, and re-read when `data-bs-theme` or `data-ui-profile` changes. Materials are re-coloured in place; nothing is rebuilt.
- **Render on demand.** Frames are drawn only while something moves (assemble, auto-rotate, orbit or a model's `animate`) or changes. The loop stops offscreen (IntersectionObserver) and in a hidden tab. Under `prefers-reduced-motion` one still frame of the finished scene is drawn. The canvas follows its box (ResizeObserver).
- **Lazy three.** The package entry has no `three` import. `Scene3D` calls `import('three')` when the scene nears the viewport (or on mount or first interaction), and only if WebGL is available. `three/addons/loaders/GLTFLoader.js` is imported only for a `src` model.
- **Fallbacks.** Until three loads, and on no WebGL, a load error, a throwing factory or a lost context, the poster stays and `onError` is called. `webglcontextlost` shows the poster and `webglcontextrestored` rebuilds the scene.
- **Cleanup.** Geometries, materials, textures, the renderer and the WebGL context are released on unmount.
- **Strings.** `scene3dPause`, `scene3dPlay`, `scene3dReset` and `scene3dKeyboardHelp` have package-local English defaults. Translate them through the core `LocaleProvider` `messages`.
- **Development warnings**, for example a missing `aria-label`.
- **Tests.** One test per spec acceptance criterion (jsdom, mocked three), an entry-does-not-load-three test and a core-has-no-three guard. A Playwright end-to-end suite renders the scenes in Chromium with software WebGL.

### Dependencies
- Peer dependencies: `@sabahat/react-ui-kit` `^2.0.0` (tokens, Button, Icon, locale and motion helpers), `react` and `react-dom` `^19.0.0`, and `three` `>=0.170.0`. No other runtime dependencies (no react-three-fiber, no drei).
- `@types/three` is a dev dependency for TypeScript factories.

### Limits
- **Charts stay 2D.** 3D is decoration and product display only, never data and never the only carrier of information. Every scene has a text alternative and a line-art poster.
- Up to 12 parts animate with `parts="children"`.
- `src` accepts only relative and http(s) URLs and `data:model/gltf-binary`.
- DPR is capped by `maxDpr` (default 2).
- Interactive physics, post-processing and shader effects are out of scope until a spec needs them.
- The sheet look renders fills without lighting. Use `look="shaded"` when a model needs shading.

### Size
- Package JS 9.9 KB gzip, against a budget of 12 KB gzip (`npm run check:bundle` in the package, three excluded).
- `dist/styles.css` is budgeted at 2 KB gzip.
