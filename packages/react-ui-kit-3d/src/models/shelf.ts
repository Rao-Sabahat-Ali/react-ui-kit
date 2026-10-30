import type { ModelFactory } from '../types';

/** A small flat-pack shelf: two sides, three shelves, a back panel and four cam dowels. Ten parts. */
export const buildShelf: ModelFactory = (THREE) => {
  const shelf = new THREE.Group();
  shelf.name = 'shelf';
  const box = (w: number, h: number, d: number, x: number, y: number, z: number, kind: string, name: string) => {
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d));
    m.position.set(x, y, z);
    m.userData.sheet = kind;
    m.name = name;
    shelf.add(m);
  };
  box(0.04, 1.5, 0.32, -0.58, 0.75, 0, 'shell', 'left side');
  box(0.04, 1.5, 0.32, 0.58, 0.75, 0, 'shell', 'right side');
  [0.2, 0.75, 1.3].forEach((y, i) => box(1.12, 0.04, 0.3, 0, y, 0.01, 'surface', `shelf ${i + 1}`));
  box(1.12, 1.46, 0.012, 0, 0.75, -0.15, 'raised', 'back panel');
  for (const [i, [x, y]] of ([[-0.54, 0.2], [0.54, 0.2], [-0.54, 1.3], [0.54, 1.3]] as const).entries()) {
    const dowel = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.09, 16));
    dowel.rotation.z = Math.PI / 2;
    dowel.position.set(x, y, 0.08);
    dowel.userData.sheet = 'accent';
    dowel.name = `dowel ${i + 1}`;
    shelf.add(dowel);
  }
  return shelf;
};
