import { useState } from 'react';
import { Button, EmptyState, Message } from '@sabahat/react-ui-kit';
import { Model3D, Scene3D } from '../index';
// Explicit: index.ts is side-effect-free in app builds, so its stylesheet import is tree-shaken (the docs app does the same for the kit).
import '../styles.scss';
import { buildShelf } from '../models/shelf';
import { StoolPoster, ShelfPoster, TokenPoster } from '../models/posters';
import { buildStool } from '../models/stool';
import { animateToken, buildToken } from '../models/token';

// The demos live in one module so the docs app can load the package (and, from it, three) only when a demo renders.

export function HeroDemo() {
  return (
    <Scene3D
      variant="hero"
      aria-label="A flat-pack stool: a round seat, three legs and three screws"
      description="The seat, the three legs and the three screws travel in along dashed guide lines and click into place, then the stool turns slowly."
      poster={<StoolPoster />}
      assemble
      autoRotate
    >
      <Model3D factory={buildStool} parts="children" fit label="Stool" />
    </Scene3D>
  );
}

export function TurntableDemo() {
  return (
    <div className="row g-4 align-items-center">
      <div className="col-md-7">
        <Scene3D
          controls="orbit"
          autoRotate={10}
          aria-label="Flat-pack shelf in kraft and white, three shelves"
          description="A small shelf with two kraft sides, three white shelves and a back panel."
          poster={<ShelfPoster />}
        >
          <Model3D factory={buildShelf} fit label="Shelf" />
        </Scene3D>
      </div>
      <div className="col-md-5">
        <h4 className="h5">Kraft shelf, 3 boards</h4>
        <p className="text-body-secondary mb-3">Drag to turn it, or focus the view and use the arrow keys. Plus and minus zoom, Home resets.</p>
        <Button>Add to cart</Button>
      </div>
    </div>
  );
}

export function PlacementDemo() {
  return (
    <Scene3D aria-label="A stool standing next to a small shelf" description="Two models share one scene, each placed with position, rotation and scale." poster={<ShelfPoster />} controls="orbit">
      <Model3D factory={buildShelf} position={[-0.9, 0, 0]} scale={0.8} rotation={[0, 0.5, 0]} fit label="Shelf" />
      <Model3D factory={buildStool} position={[0.9, 0, 0.2]} fit label="Stool" />
    </Scene3D>
  );
}

export function EmptyDemo() {
  return (
    <EmptyState
      variant="first-run"
      media={
        <Scene3D variant="empty-state" aria-label="An unassembled flat-pack stool" poster={<StoolPoster />} assemble>
          <Model3D factory={buildStool} parts="children" fit />
        </Scene3D>
      }
      title="No stools yet"
      description="Add the first one and its parts snap together here."
      action={<Button>Add a stool</Button>}
    />
  );
}

export function GameDemo() {
  return (
    <div data-bs-theme="dark" data-ui-profile="game" className="p-3 rounded-3" style={{ background: 'var(--ui-color-bg)', color: 'var(--ui-color-text)' }}>
      <Scene3D
        look="shaded"
        autoRotate={16}
        assemble
        aria-label="A hexagonal game token with a yellow gem floating above it"
        description="The gem turns and bobs above a dark hexagonal base with a kraft plate and six studs."
        poster={<TokenPoster />}
      >
        <Model3D factory={buildToken} animate={animateToken} parts="children" fit label="Token" />
      </Scene3D>
    </div>
  );
}

export function BackdropDemo() {
  return (
    <div className="position-relative overflow-hidden rounded-3" style={{ border: 'var(--ui-line-width) solid var(--ui-color-line)', minBlockSize: '18rem' }}>
      <Scene3D className="position-absolute top-0 start-0 h-100 rounded-0" decorative assemble look="sheet" poster={<ShelfPoster />} camera={{ position: [3.2, 1.6, 3.6], target: [0, 0.75, 0] }}>
        <Model3D factory={buildShelf} parts="children" position={[1.4, 0, 0]} />
      </Scene3D>
      <div className="position-relative p-5" style={{ maxInlineSize: '28rem' }}>
        <h4 className="h3">Everything comes flat</h4>
        <p className="mb-3">The shelf behind this text is decoration only: it assembles once and then sits still.</p>
        <Button>Start the build</Button>
      </div>
    </div>
  );
}

export function PosterDemo() {
  const [error, setError] = useState<string | null>(null);
  return (
    <div className="d-grid gap-3">
      <Scene3D
        aria-label="A flat-pack shelf (the 3D view could not be built)"
        poster={<ShelfPoster />}
        loading="eager"
        onError={(e) => setError(e instanceof Error ? e.message : String(e))}
      >
        <Model3D
          factory={() => {
            throw new Error('This model failed to build.');
          }}
        />
      </Scene3D>
      {error && <Message severity="info" title="onError was called">{error} The poster stays in the same box, so nothing shifts.</Message>}
    </div>
  );
}
