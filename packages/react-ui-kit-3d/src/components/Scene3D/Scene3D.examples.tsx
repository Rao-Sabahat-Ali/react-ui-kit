import { lazy, Suspense, type ComponentType } from 'react';

// The demos are loaded on demand (a separate chunk), and three loads later still, when a scene nears the viewport.
const demo = (pick: (m: typeof import('../../docs/demos')) => ComponentType) => {
  const Lazy = lazy(() => import('../../docs/demos').then((m) => ({ default: pick(m) })));
  return () => (
    <Suspense fallback={<div className="ui-scene3d ui-scene3d--inline" aria-hidden="true" />}>
      <Lazy />
    </Suspense>
  );
};

export const examples = [
  {
    title: 'Hero: assemble on first view, then auto-rotate (landing)',
    description: 'One hero object per view. The seat, legs and screws travel in along dashed guide lines and click into place; auto-rotate shows a Pause button. Under reduced motion you get one still frame of the finished stool.',
    code: `import { Scene3D, Model3D } from '@sabahat/react-ui-kit-3d';\nimport '@sabahat/react-ui-kit-3d/styles.css';\nimport { buildStool } from './models/stool';\n\n<Scene3D\n  variant="hero"\n  aria-label="A flat-pack stool: a round seat, three legs and three screws"\n  poster={<StoolPoster />}\n  assemble\n  autoRotate\n>\n  <Model3D factory={buildStool} parts="children" fit />\n</Scene3D>`,
    render: demo((m) => m.HeroDemo),
  },
  {
    title: 'Product turntable with orbit controls (ecommerce)',
    description: 'controls="orbit" makes the view one tab stop: drag or use the arrow keys to turn, plus and minus to zoom, Home to reset. Plain wheel still scrolls the page (Ctrl+wheel zooms).',
    code: `<Scene3D controls="orbit" autoRotate={10} aria-label="Flat-pack shelf in kraft and white" poster={<ShelfPoster />}>\n  <Model3D factory={buildShelf} fit />\n</Scene3D>`,
    render: demo((m) => m.TurntableDemo),
  },
  {
    title: 'Empty-state illustration (saas)',
    description: 'A Scene3D variant="empty-state" in the EmptyState media slot, which sizes it. It assembles when the state appears.',
    code: `<EmptyState\n  variant="first-run"\n  media={\n    <Scene3D variant="empty-state" aria-label="An unassembled flat-pack stool" poster={<StoolPoster />} assemble>\n      <Model3D factory={buildStool} parts="children" fit />\n    </Scene3D>\n  }\n  title="No stools yet"\n  description="Add the first one and its parts snap together here."\n  action={<Button>Add a stool</Button>}\n/>`,
    render: demo((m) => m.EmptyDemo),
  },
  {
    title: 'Game night sheet, shaded (game)',
    description: 'look="shaded" uses lit materials in the token colours; the game profile on the dark theme gives the night sheet and the warm signal-yellow accent. The model animates its gem (animate) and stops when paused, offscreen or under reduced motion.',
    code: `<div data-bs-theme="dark" data-ui-profile="game">\n  <Scene3D look="shaded" autoRotate={16} assemble aria-label="A hexagonal game token with a yellow gem" poster={<TokenPoster />}>\n    <Model3D factory={buildToken} animate={animateToken} parts="children" fit />\n  </Scene3D>\n</div>`,
    render: demo((m) => m.GameDemo),
  },
  {
    title: 'Decorative backdrop',
    description: 'decorative hides the scene from assistive technology and removes the controls. It assembles once and then sits still, so there is nothing to pause.',
    code: `<div className="position-relative">\n  <Scene3D className="position-absolute top-0 start-0 h-100" decorative assemble poster={<ShelfPoster />} camera={{ position: [3.2, 1.6, 3.6], target: [0, 0.75, 0] }}>\n    <Model3D factory={buildShelf} parts="children" position={[1.4, 0, 0]} />\n  </Scene3D>\n  <div className="position-relative">…content…</div>\n</div>`,
    render: demo((m) => m.BackdropDemo),
  },
  {
    title: 'Poster fallback',
    description: 'Without WebGL, when three fails to load, when the context is lost or when a model throws, the line-art poster stays in the same box and onError is called.',
    code: `<Scene3D aria-label="A flat-pack shelf (the 3D view could not be built)" poster={<ShelfPoster />} onError={(error) => report(error)}>\n  <Model3D factory={() => { throw new Error('This model failed to build.'); }} />\n</Scene3D>`,
    render: demo((m) => m.PosterDemo),
  },
];
