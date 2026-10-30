import { lazy, Suspense, type ComponentType } from 'react';

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
    title: 'A procedural factory',
    description: 'A factory receives the dynamically imported three module and a context ({ tokens, look, reducedMotion }) and returns an Object3D. Mark meshes with userData.sheet = "shell" | "accent" | "raised" | "ink" to pick their fill in the sheet look. Each direct child is one assembly part.',
    code: `import type { ModelFactory } from '@sabahat/react-ui-kit-3d';\n\nexport const buildStool: ModelFactory = (THREE) => {\n  const stool = new THREE.Group();\n  const seat = new THREE.Mesh(new THREE.CylinderGeometry(0.46, 0.46, 0.08, 48));\n  seat.position.y = 0.86;\n  stool.add(seat);\n  for (let i = 0; i < 3; i++) {\n    const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.05, 0.85, 20));\n    leg.userData.sheet = 'shell'; // kraft\n    // …position the leg\n    stool.add(leg);\n  }\n  return stool;\n};\n\n<Scene3D aria-label="Flat-pack stool" poster={<StoolPoster />} assemble>\n  <Model3D factory={buildStool} parts="children" fit />\n</Scene3D>`,
    render: demo((m) => m.HeroDemo),
  },
  {
    title: 'Placement, several models and glTF files',
    description: 'position, rotation and scale place a model and update without rebuilding it. src loads a .glb or .gltf with GLTFLoader, imported only when used; only relative and http(s) URLs are accepted, javascript: and data: URLs (other than data:model/gltf-binary) are refused without a request and reported through onError. Keep factory and animate stable (module level or useCallback): a new function identity rebuilds the model.',
    code: `<Scene3D aria-label="A stool next to a small shelf" poster={<ShelfPoster />} controls="orbit">\n  <Model3D factory={buildShelf} position={[-0.9, 0, 0]} scale={0.8} rotation={[0, 0.5, 0]} fit />\n  <Model3D factory={buildStool} position={[0.9, 0, 0.2]} fit />\n  {/* or a file: <Model3D src="/models/desk.glb" restyle={false} /> */}\n</Scene3D>`,
    render: demo((m) => m.PlacementDemo),
  },
];
