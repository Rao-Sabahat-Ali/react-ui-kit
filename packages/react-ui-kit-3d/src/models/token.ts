import type { AnimateFn, ModelFactory } from '../types';

/** A game token: hexagonal base, raised plate, six studs and a floating gem. Nine parts. */
export const buildToken: ModelFactory = (THREE) => {
  const token = new THREE.Group();
  token.name = 'token';

  const base = new THREE.Mesh(new THREE.CylinderGeometry(0.72, 0.72, 0.14, 6));
  base.userData.sheet = 'surface';
  base.name = 'base';
  const plate = new THREE.Mesh(new THREE.CylinderGeometry(0.56, 0.56, 0.06, 6));
  plate.position.y = 0.1;
  plate.userData.sheet = 'shell';
  plate.name = 'plate';
  token.add(base, plate);

  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2;
    const stud = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.05, 14));
    stud.position.set(Math.cos(a) * 0.64, 0.1, Math.sin(a) * 0.64);
    stud.userData.sheet = 'ink';
    stud.name = `stud ${i + 1}`;
    token.add(stud);
  }

  // The gem sits in a group so its float and spin never fight the assembly, which moves the group.
  const gem = new THREE.Group();
  const crystal = new THREE.Mesh(new THREE.OctahedronGeometry(0.34));
  crystal.scale.y = 1.45;
  crystal.position.y = 0.0;
  crystal.userData.sheet = 'accent';
  gem.add(crystal);
  gem.position.y = 0.62;
  gem.name = 'gem';
  token.add(gem);
  token.userData.crystal = crystal;
  return token;
};

/** `animate` for the token: the gem turns and bobs. Runs only while motion is allowed and the scene is visible. */
export const animateToken: AnimateFn = (token, { elapsed }) => {
  const crystal = token.userData.crystal as { rotation: { y: number }; position: { y: number } } | undefined;
  if (!crystal) return;
  crystal.rotation.y = elapsed * 0.9;
  crystal.position.y = Math.sin(elapsed * 1.7) * 0.05;
};
