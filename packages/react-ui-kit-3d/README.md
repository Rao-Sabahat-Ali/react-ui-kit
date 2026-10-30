# @sabahat/react-ui-kit-3d

Optional 3D package for [`@sabahat/react-ui-kit`](../../README.md): `Scene3D` and `Model3D` on plain three.js. Apps that never import it pay nothing; apps that do pay three only when a scene nears the viewport. Decision record: [ADR 0003](../../docs/adr/0003-optional-3d-package.md). Specs: `get_component_spec("Scene3D")` and `get_component_spec("Model3D")` from the design-system MCP.

## Install

```bash
npm install @sabahat/react-ui-kit-3d three
npm install -D @types/three   # when you write model factories in TypeScript
```

Peers: `react` and `react-dom` 19, `@sabahat/react-ui-kit` (`^2.0.0`) and `three` (`>=0.170.0`). There are no other runtime dependencies (no react-three-fiber, no drei).

```tsx
import '@sabahat/react-ui-kit-3d/styles.css'; // once, next to the kit styles
import { Scene3D, Model3D } from '@sabahat/react-ui-kit-3d';
import { buildStool } from './models/stool';

<Scene3D
  variant="hero"
  aria-label="Flat-pack stool, three legs and a round seat"
  poster={<img src="/stool-poster.svg" alt="" />}
  assemble
  autoRotate
>
  <Model3D factory={buildStool} parts="children" fit />
</Scene3D>
```

## Components

| `Scene3D` prop | Default | |
|---|---|---|
| `aria-label` | – | Required unless `decorative`; a missing one warns in development. |
| `description` | – | Longer text alternative (visually hidden, `aria-describedby`). |
| `decorative` | `false` | Hidden from assistive technology, no controls. |
| `poster` | – | Required line-art fallback, in the same box as the canvas. |
| `variant` | `'inline'` | `hero` (min 20rem, 16:9), `inline` (4:3), `empty-state` (10rem square). |
| `look` | `'sheet'` | `sheet`: flat token fills with 2px ink edges. `shaded`: lit materials in the token colours. |
| `controls` | `'none'` | `orbit`: drag, pinch, keys. |
| `autoRotate` | `false` | `true` = 12°/s, or degrees per second. Shows Pause/Play. |
| `assemble` | `false` | The 3D Assemble on first view. |
| `loading` | `'visible'` | `visible` (200px margin), `eager`, `interaction`. |
| `camera`, `aspectRatio`, `maxDpr`, `onReady`, `onError` | | See the spec. |

`Model3D`: `factory` or `src`, `position`, `rotation`, `scale`, `fit`, `parts`, `animate`, `restyle`, `label`.

A **factory** is `(three, ctx) => Object3D | Promise<Object3D>`: build the object with the `three` module you are handed (never import three yourself, so it stays lazy) and mark meshes with `mesh.userData.sheet = 'shell' | 'accent' | 'raised' | 'ink'` to pick their fill in the sheet look (default: surface). Each direct child of the object is one assembly part (`parts="children"`, at most 12 animate). Keep `factory` and `animate` stable (module level or `useCallback`): a new function identity rebuilds the model. `src` loads glTF/GLB with `GLTFLoader`, imported only when used; only relative and http(s) URLs and `data:model/gltf-binary` are accepted.

## How it works

- **Lazy.** The package entry never imports three. `Scene3D` calls `import('three')` when the scene is near the viewport (or on mount / first interaction) and only if WebGL is available. Until then, and on any failure (no WebGL, load error, throwing factory, lost context), the poster stays and `onError` is called.
- **Sheet look.** Fills are flat `MeshBasicMaterial`s in `--ui-color-surface` (kraft `--ui-color-shell`, accent, ink per `userData.sheet`). WebGL lines are 1px, so the 2px ink look is drawn with screen-space quads: crease edges (`EdgesGeometry` turned into quads) and a back-face silhouette hull pushed outward in clip space, both `--ui-line-width` wide in device pixels (width × DPR) with square caps, in three core only (small shaders in `src/engine/lines.ts`). Guide lines are the same quads, dashed.
- **Tokens.** Colours are read from the scene's root element at load and re-read (materials re-coloured in place, nothing rebuilt) when `data-bs-theme` or `data-ui-profile` changes on the document or the nearest themed ancestor.
- **3D Assemble.** Each part starts exploded outward by 0.6× the object's size, a dashed accent guide traces its path, parts arrive `--ui-motion-stagger` apart over `--ui-motion-step` with `--ui-easing-out`, the last one settling with `--ui-easing-snap`. Final transforms are the authored ones, exactly.
- **Render on demand.** Frames are drawn only while something moves (assemble, auto-rotate, orbit, a model's `animate`) or something changed. The loop stops offscreen (IntersectionObserver) and in a hidden tab; under `prefers-reduced-motion` exactly one still frame of the finished scene is drawn. DPR is capped by `maxDpr` (default 2) and the canvas follows its box (ResizeObserver).
- **Orbit controls** are in-house (about 1 KB gzip) instead of three's `OrbitControls`, so there is no extra dynamic import: pointer drag rotates, two-finger pinch and Ctrl+wheel zoom (a plain wheel scrolls the page; `touch-action: pan-y`), ←/→/↑/↓ rotate, `+`/`-` zoom, Home resets, only while the canvas has focus. Polar angle and distance are limited.
- **Cleanup.** Geometries, materials, textures, the renderer and the WebGL context are released on unmount; `webglcontextlost` shows the poster and `webglcontextrestored` rebuilds the scene.

## Strings

The 3D strings (`scene3dPause`, `scene3dPlay`, `scene3dReset`, `scene3dKeyboardHelp`) are package-local English defaults (`en3d`) that follow the kit's locale pattern: pass translations through the kit's `LocaleProvider`, `messages={{ scene3dPause: 'Pausa' } as unknown as Partial<LocaleMessages>}`; without a translation the default is used.

## Develop

```bash
npm run build:3d          # from the repo root (build the core first: npm run build)
npm run check:3d          # typecheck, build and the bundle budget
npm test                  # the package tests run with the root suite (jsdom, mocked three)
npx playwright test e2e/3d.spec.ts   # real rendering in Chromium (software WebGL) against the docs app
```

Bundle budget for the package's own code (three excluded): `dist/index.js` ≤ 12 KB gzip, `dist/styles.css` ≤ 2 KB gzip (`scripts/check-bundle.mjs`).
