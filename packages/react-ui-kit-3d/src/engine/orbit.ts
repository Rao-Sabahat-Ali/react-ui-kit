import type * as T from 'three';
import type { ThreeModule } from '../types';

const TAU = Math.PI * 2;
const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

export interface OrbitHooks {
  /** Called after every user-driven camera change. */
  onInput(): void;
  /** Inertia after a drag release is allowed (not under reduced motion). */
  inertia(): boolean;
}

/**
 * Orbit controls in-house (about 1 KB gzip; no OrbitControls import): the camera moves on a sphere around a
 * target. Pointer drag rotates, two-finger pinch and Ctrl+wheel zoom, keys (←/→/↑/↓, +/-, Home) work while the
 * canvas has focus. Polar angle and distance are limited.
 */
export function createOrbit(three: ThreeModule, camera: T.PerspectiveCamera) {
  const target = new three.Vector3();
  const home = { target: new three.Vector3(), r: 1, th: 0, ph: 1 };
  let r = 1;
  let th = 0;
  let ph = 1;
  let vTh = 0;
  let vPh = 0;
  const api = {
    moved: false,
    place() {
      r = clamp(r, home.r * 0.45, home.r * 2.4);
      ph = clamp(ph, 0.12, Math.PI - 0.12);
      camera.position.set(target.x + r * Math.sin(ph) * Math.sin(th), target.y + r * Math.cos(ph), target.z + r * Math.sin(ph) * Math.cos(th));
      camera.lookAt(target);
    },
    /** Make the current camera pose the home pose (also the pose Home resets to). */
    setHome(position: T.Vector3, at: T.Vector3) {
      target.copy(at);
      home.target.copy(at);
      const d = position.clone().sub(at);
      r = home.r = d.length() || 1;
      th = home.th = Math.atan2(d.x, d.z);
      ph = home.ph = Math.acos(clamp(d.y / r, -1, 1));
      api.place();
    },
    rotate(dTh: number, dPh: number) {
      th += dTh;
      ph += dPh;
      api.moved = true;
      api.place();
    },
    zoom(factor: number) {
      r *= factor;
      api.moved = true;
      api.place();
    },
    reset() {
      target.copy(home.target);
      r = home.r;
      th = home.th;
      ph = home.ph;
      vTh = vPh = 0;
      api.moved = false;
      api.place();
    },
    /** Advances inertia; true while the camera is still gliding. */
    update(dt: number) {
      if (Math.abs(vTh) + Math.abs(vPh) < 0.02) return false;
      api.rotate(vTh * dt, vPh * dt);
      const k = Math.exp(-dt * 5);
      vTh *= k;
      vPh *= k;
      return true;
    },
    attach(canvas: HTMLCanvasElement, hooks: OrbitHooks) {
      const pointers = new Map<number, { x: number; y: number }>();
      let last = 0;
      const down = (e: PointerEvent) => {
        if (e.pointerType === 'mouse' && e.button !== 0) return;
        pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
        try {
          canvas.setPointerCapture(e.pointerId);
        } catch {
          // no pointer capture (jsdom, detached element)
        }
        vTh = vPh = 0;
        last = e.timeStamp;
        canvas.dataset.dragging = '';
      };
      const move = (e: PointerEvent) => {
        const p = pointers.get(e.pointerId);
        if (!p) return;
        const dx = e.clientX - p.x;
        const dy = e.clientY - p.y;
        const box = canvas.getBoundingClientRect();
        const h = box.height || 1;
        if (pointers.size === 2) {
          const other = [...pointers].find(([id]) => id !== e.pointerId)![1];
          const before = Math.hypot(p.x - other.x, p.y - other.y);
          const after = Math.hypot(e.clientX - other.x, e.clientY - other.y);
          if (after > 0) api.zoom(before / after);
        } else {
          const dt = Math.max((e.timeStamp - last) / 1000, 0.001);
          vTh = (-dx * TAU) / h / dt;
          vPh = (-dy * Math.PI) / h / dt;
          api.rotate((-dx * TAU) / h, (-dy * Math.PI) / h);
        }
        last = e.timeStamp;
        p.x = e.clientX;
        p.y = e.clientY;
        hooks.onInput();
      };
      const up = (e: PointerEvent) => {
        if (!pointers.delete(e.pointerId)) return;
        if (pointers.size === 0) delete canvas.dataset.dragging;
        if (!hooks.inertia() || pointers.size > 0 || e.timeStamp - last > 100) vTh = vPh = 0;
        hooks.onInput();
      };
      const wheel = (e: WheelEvent) => {
        if (!e.ctrlKey && !e.metaKey) return; // plain wheel scrolls the page
        e.preventDefault();
        api.zoom(Math.exp(e.deltaY * 0.01));
        hooks.onInput();
      };
      const key = (e: KeyboardEvent) => {
        if (e.altKey || e.ctrlKey || e.metaKey) return;
        const step = 0.14;
        switch (e.key) {
          case 'ArrowLeft': api.rotate(step, 0); break;
          case 'ArrowRight': api.rotate(-step, 0); break;
          case 'ArrowUp': api.rotate(0, -step); break;
          case 'ArrowDown': api.rotate(0, step); break;
          case '+': case '=': api.zoom(0.88); break;
          case '-': case '_': api.zoom(1.14); break;
          case 'Home': api.reset(); break;
          default: return;
        }
        e.preventDefault();
        hooks.onInput();
      };
      canvas.addEventListener('pointerdown', down);
      canvas.addEventListener('pointermove', move);
      canvas.addEventListener('pointerup', up);
      canvas.addEventListener('pointercancel', up);
      canvas.addEventListener('wheel', wheel, { passive: false });
      canvas.addEventListener('keydown', key);
      return () => {
        canvas.removeEventListener('pointerdown', down);
        canvas.removeEventListener('pointermove', move);
        canvas.removeEventListener('pointerup', up);
        canvas.removeEventListener('pointercancel', up);
        canvas.removeEventListener('wheel', wheel);
        canvas.removeEventListener('keydown', key);
        delete canvas.dataset.dragging;
      };
    },
  };
  return api;
}
