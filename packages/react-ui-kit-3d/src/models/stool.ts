import type { ModelFactory } from '../types';

/** A flat-pack stool: a round seat, three splayed legs and three screws. Seven parts, one per assembly step. */
export const buildStool: ModelFactory = (THREE) => {
  const stool = new THREE.Group();
  stool.name = 'stool';
  const up = new THREE.Vector3(0, 1, 0);

  const seat = new THREE.Mesh(new THREE.CylinderGeometry(0.46, 0.46, 0.08, 48));
  seat.position.y = 0.86;
  seat.name = 'seat';
  stool.add(seat);

  for (let i = 0; i < 3; i++) {
    const a = (i / 3) * Math.PI * 2 + Math.PI / 6;
    const top = new THREE.Vector3(Math.cos(a) * 0.3, 0.82, Math.sin(a) * 0.3);
    const foot = new THREE.Vector3(Math.cos(a) * 0.44, 0, Math.sin(a) * 0.44);
    const dir = top.clone().sub(foot);
    const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.052, dir.length(), 20));
    leg.position.copy(top.clone().add(foot).multiplyScalar(0.5));
    leg.quaternion.setFromUnitVectors(up, dir.normalize());
    leg.userData.sheet = 'shell';
    leg.name = `leg ${i + 1}`;
    stool.add(leg);

    const screw = new THREE.Group();
    const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.024, 0.024, 0.2, 12));
    const head = new THREE.Mesh(new THREE.CylinderGeometry(0.056, 0.056, 0.03, 16));
    head.position.y = -0.115;
    shaft.userData.sheet = head.userData.sheet = 'accent';
    screw.add(shaft, head);
    screw.position.set(Math.cos(a) * 0.36, 0.7, Math.sin(a) * 0.36);
    screw.name = `screw ${i + 1}`;
    stool.add(screw);
  }
  return stool;
};

