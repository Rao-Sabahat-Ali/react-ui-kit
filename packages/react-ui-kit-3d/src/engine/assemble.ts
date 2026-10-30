import type * as T from 'three';
import { EASING, MOTION } from '@sabahat/react-ui-kit';
import type { ThreeModule } from '../types';
import { lineMaterial, quadGeometry, type LineUniforms } from './lines';

export const MAX_PARTS = 12;

/** CSS cubic-bezier() string to an easing function (x to y), Newton solved. */
export function cubicBezier(spec: string, fallback: string): (x: number) => number {
  const m = /cubic-bezier\(([^)]+)\)/.exec(spec) ?? /cubic-bezier\(([^)]+)\)/.exec(fallback)!;
  const [x1, y1, x2, y2] = m[1]!.split(',').map(Number) as [number, number, number, number];
  const cx = 3 * x1, bx = 3 * (x2 - x1) - cx, ax = 1 - cx - bx;
  const cy = 3 * y1, by = 3 * (y2 - y1) - cy, ay = 1 - cy - by;
  return (x) => {
    if (x <= 0) return 0;
    if (x >= 1) return 1;
    let t = x;
    for (let i = 0; i < 8; i++) {
      const e = ((ax * t + bx) * t + cx) * t - x;
      const d = (3 * ax * t + 2 * bx) * t + cx;
      if (Math.abs(e) < 1e-5 || Math.abs(d) < 1e-6) break;
      t -= e / d;
    }
    return ((ay * t + by) * t + cy) * t;
  };
}

export interface AssembleTiming {
  step: number;
  stagger: number;
  out: (x: number) => number;
  snap: (x: number) => number;
  dash: [number, number];
  color: string;
}

export interface AssemblePlan {
  /** Total duration in ms. */
  duration: number;
  /** Put every part at its exploded position. */
  explode(): void;
  /** Advance to `ms`; true when finished (parts at their exact authored transforms, guides removed). */
  apply(ms: number): boolean;
  setColor(color: string): void;
  /** Snap to the finished state and remove the guides. */
  finish(): void;
}

/**
 * The 3D Assemble: each direct child of `object` (at most 12) starts exploded outward from the object's centre by
 * 0.6x its size, a dashed guide line traces its path, parts arrive one by one (`stagger`), travel `step` ms with
 * ease-out, the last one settling with the snap overshoot. Final transforms are the authored ones, exactly.
 */
export function planAssemble(three: ThreeModule, object: T.Object3D, u: LineUniforms, timing: AssembleTiming): AssemblePlan | null {
  const children = object.children.filter((c) => !c.userData.sheetPart).slice(0, MAX_PARTS);
  if (children.length === 0) return null;
  object.updateWorldMatrix(true, true);
  const whole = new three.Box3().setFromObject(object);
  const center = whole.getCenter(new three.Vector3());
  const size = Math.max(...whole.getSize(new three.Vector3()).toArray(), 1e-6);
  const toLocal = new three.Matrix3().setFromMatrix4(object.matrixWorld).invert();
  const guides = new three.Group();
  guides.userData.sheetPart = true;
  object.add(guides);

  const parts = children.map((obj, i) => {
    const home = obj.position.clone();
    const mid = new three.Box3().setFromObject(obj).getCenter(new three.Vector3());
    const dir = mid.sub(center);
    if (dir.lengthSq() < 1e-8) dir.set(0, 1, 0);
    const from = home.clone().add(dir.normalize().multiplyScalar(size * 0.6).applyMatrix3(toLocal));
    const material = lineMaterial(three, u, timing.color, { dash: timing.dash, transparent: true });
    const attr = { start: new Float32Array(6) };
    const guide = new three.Mesh(quadGeometry(three, attr.start), material);
    guide.frustumCulled = false;
    guide.renderOrder = 10;
    guides.add(guide);
    return { obj, home, from, material, guide, delay: i * timing.stagger, last: i === children.length - 1 };
  });
  const duration = (parts.length - 1) * timing.stagger + timing.step;
  const setGuide = (p: (typeof parts)[number], to: T.Vector3) => {
    const pos = p.guide.geometry.getAttribute('position');
    const end = p.guide.geometry.getAttribute('aEnd');
    for (let v = 0; v < 4; v++) {
      pos.setXYZ(v, p.home.x, p.home.y, p.home.z);
      end.setXYZ(v, to.x, to.y, to.z);
    }
    pos.needsUpdate = end.needsUpdate = true;
  };
  const tmp = new three.Vector3();
  const plan: AssemblePlan = {
    duration,
    explode() {
      for (const p of parts) {
        p.obj.position.copy(p.from);
        setGuide(p, p.from);
        p.material.uniforms.uOpacity!.value = 1;
      }
    },
    apply(ms) {
      let done = true;
      for (const p of parts) {
        const t = Math.min(Math.max((ms - p.delay) / timing.step, 0), 1);
        if (t < 1) done = false;
        const e = (p.last ? timing.snap : timing.out)(t);
        p.obj.position.lerpVectors(p.from, p.home, e);
        setGuide(p, tmp.copy(p.obj.position));
        p.material.uniforms.uOpacity!.value = t >= 1 ? 0 : 1 - t * 0.5;
      }
      if (done) plan.finish();
      return done;
    },
    setColor(color) {
      for (const p of parts) p.material.uniforms.uColor!.value.set(color);
    },
    finish() {
      for (const p of parts) p.obj.position.copy(p.home);
      guides.removeFromParent();
      for (const g of guides.children as T.Mesh[]) {
        g.geometry.dispose();
        (g.material as T.Material).dispose();
      }
      guides.clear();
    },
  };
  return plan;
}

export const defaultTiming = (read: (name: 'step' | 'stagger') => number, easing: (name: 'out' | 'snap') => string, color: string): AssembleTiming => ({
  step: read('step') || MOTION.step,
  stagger: read('stagger') || MOTION.stagger,
  out: cubicBezier(easing('out'), EASING.out),
  snap: cubicBezier(easing('snap'), EASING.snap),
  dash: [4, 3],
  color,
});
