import type * as T from 'three';
import { readMotionMs, safeUrl } from '@sabahat/react-ui-kit';
import type { CameraOptions, ModelContext, ModelDef, SceneLook, SceneTokens, ThreeModule, Vec3 } from '../types';
import { defaultTiming, planAssemble, type AssemblePlan } from './assemble';
import { lineUniforms } from './lines';
import { createOrbit } from './orbit';
import { createSheet, disposeTree } from './sheet';

export interface StageInit {
  three: ThreeModule;
  canvas: HTMLCanvasElement;
  /** The element whose size the canvas follows. */
  box: HTMLElement;
  look: SceneLook;
  maxDpr: number;
  camera?: CameraOptions;
  controls: boolean;
  /** Degrees per second; 0 = off. */
  autoRotate: number;
  assemble: boolean;
  reducedMotion: boolean;
  paused: boolean;
  tokens: SceneTokens;
  /** The first frame of the finished scene has been drawn. */
  onFirstFrame?(): void;
  onAnimating?(on: boolean): void;
  onError?(error: unknown): void;
}

export type Stage = ReturnType<typeof createStage>;

interface Entry {
  def: ModelDef;
  holder: T.Group;
  object?: T.Object3D;
  key?: unknown;
  build: number;
  plan?: AssemblePlan;
}

const IDLE_MS = 3000;
const v3 = (three: ThreeModule, v: Vec3) => new three.Vector3(...v);

async function loadModel(src: string): Promise<T.Object3D> {
  // Only relative and http(s) URLs and binary glTF data URLs; refused before any request or import.
  const ok = /^data:model\/gltf-binary[;,]/i.test(src.trim()) ? src.trim() : safeUrl(src);
  if (!ok || /^(mailto|tel):/i.test(ok)) throw new Error('Model3D: refused an unsafe model URL');
  const { GLTFLoader } = await import('three/addons/loaders/GLTFLoader.js');
  return (await new GLTFLoader().loadAsync(ok)).scene;
}

/** The imperative three.js side of a Scene3D: renderer, models, motion loop, controls. Pure of React. */
export function createStage(init: StageInit) {
  const { three, canvas, box } = init;
  const renderer = new three.WebGLRenderer({ canvas, antialias: true, alpha: true });
  renderer.setClearColor(0x000000, 0);
  const scene = new three.Scene();
  const camera = new three.PerspectiveCamera(init.camera?.fov ?? 35, 1, 0.1, 100);
  const world = new three.Group(); // turntable: auto-rotate spins this, orbit controls move the camera
  const key = new three.DirectionalLight(0xffffff, 3.4);
  key.position.set(3, 5, 4);
  scene.add(world, new three.HemisphereLight(0xffffff, 0x8a8a8a, 2.6), key);

  const u = lineUniforms(three);
  let tokens = init.tokens;
  const sheet = createSheet(three, tokens, init.look, u);
  const orbit = createOrbit(three, camera);
  const models = new Map<string, Entry>();
  const opts = { autoRotate: init.autoRotate, paused: init.paused, reducedMotion: init.reducedMotion };

  let visible = true;
  let docVisible = typeof document === 'undefined' || document.visibilityState !== 'hidden';
  let lost = false;
  let disposed = false;
  let built = false;
  let pending = 0;
  let raf = 0;
  let last = 0;
  let elapsed = 0;
  let dirty = true;
  let shown = false;
  let announced = false;
  let spin = 0;
  let lastInput = -Infinity;
  let asm: 'none' | 'pending' | 'running' = 'none';
  let asmMs = 0;
  let dims = '';
  let cache: { center: T.Vector3; radius: number } | null | undefined;
  let detach: (() => void) | undefined;
  let glide = false;

  const ctx = (): ModelContext => ({ tokens, look: init.look, reducedMotion: opts.reducedMotion });
  const moving = () => !opts.reducedMotion && !opts.paused;
  const animated = () => [...models.values()].some((e) => e.object && e.def.animate);
  const canRun = () => built && visible && docVisible && !lost && !disposed;
  const animating = () => asm === 'running' || (moving() && (opts.autoRotate > 0 || animated())) || glide || Math.abs(spin) > 0.01;

  function schedule() {
    if (!raf && canRun()) raf = requestAnimationFrame(tick);
  }
  function cancelFrame() {
    if (raf) cancelAnimationFrame(raf);
    raf = 0;
  }
  function request() {
    dirty = true;
    schedule();
  }

  // Framing: the camera looks at the union of the `fit` models (else all models) from far enough that its bounding box is fully visible.
  function bounds() {
    if (cache !== undefined) return cache;
    const fitted = [...models.values()].filter((e) => e.def.fit && e.object);
    const list = fitted.length ? fitted : [...models.values()].filter((e) => e.object);
    const spinY = world.rotation.y;
    world.rotation.y = 0;
    world.updateMatrixWorld(true);
    const box3 = new three.Box3();
    for (const e of list) box3.expandByObject(e.holder);
    world.rotation.y = spinY;
    world.updateMatrixWorld(true);
    if (box3.isEmpty()) return (cache = null);
    return (cache = { center: box3.getCenter(new three.Vector3()), radius: box3.getSize(new three.Vector3()).length() / 2 });
  }
  function frame() {
    const info = bounds();
    const fitted = [...models.values()].some((e) => e.def.fit);
    const at = !fitted && init.camera?.target ? v3(three, init.camera.target) : (info?.center ?? new three.Vector3());
    if (init.camera?.position && !fitted) return orbit.setHome(v3(three, init.camera.position), at);
    const fov = (camera.fov * Math.PI) / 180;
    const half = Math.min(fov, 2 * Math.atan(Math.tan(fov / 2) * camera.aspect)) / 2;
    const dist = ((info?.radius ?? 1) * (init.assemble && !opts.reducedMotion ? 1.2 : 1.06)) / Math.sin(half);
    camera.near = dist / 50;
    camera.far = dist * 50;
    camera.updateProjectionMatrix();
    orbit.setHome(new three.Vector3(0.55, 0.45, 1).normalize().multiplyScalar(dist).add(at), at);
  }
  function refit() {
    cache = undefined;
    if (!orbit.moved) frame();
    request();
  }

  function resize(force = false) {
    const w = Math.floor(box.clientWidth);
    const h = Math.floor(box.clientHeight);
    if (!w || !h || disposed) return;
    const dpr = Math.min(window.devicePixelRatio || 1, init.maxDpr);
    const now = `${w}x${h}@${dpr}`;
    if (!force && now === dims) return;
    dims = now;
    renderer.setPixelRatio(dpr);
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    u.uRes.value.set(w * dpr, h * dpr);
    u.uWidth.value = tokens.lineWidth * dpr;
    camera.updateProjectionMatrix();
    if (!orbit.moved) frame();
    request();
  }

  function place(e: Entry) {
    const d = e.def;
    e.holder.position.set(...(d.position ?? [0, 0, 0]));
    e.holder.rotation.set(...(d.rotation ?? [0, 0, 0]));
    const s = d.scale ?? 1;
    if (typeof s === 'number') e.holder.scale.setScalar(s);
    else e.holder.scale.set(...s);
  }

  function fail(error: unknown) {
    init.onError?.(error);
  }

  function settle() {
    if (--pending > 0 || disposed) return;
    if (!built) {
      built = true;
      resize(true);
      world.updateMatrixWorld(true);
      frame();
      if (init.assemble && !opts.reducedMotion) {
        const read = (n: 'step' | 'stagger') => readMotionMs(box, n);
        const ease = (n: 'out' | 'snap') => getComputedStyle(box).getPropertyValue(`--ui-easing-${n}`);
        for (const e of models.values()) {
          if (e.def.parts !== 'children' || !e.object) continue;
          e.plan = planAssemble(three, e.object, u, defaultTiming(read, ease, tokens.accent)) ?? undefined;
          e.plan?.explode();
          if (e.plan) asm = 'pending';
        }
      }
    } else {
      refit();
    }
    request();
  }

  async function build(e: Entry) {
    const id = ++e.build;
    pending++;
    if (e.object) {
      e.holder.remove(e.object);
      disposeTree(e.object);
      e.object = undefined;
    }
    try {
      const { factory, src } = e.def;
      const object = src ? await loadModel(src) : factory ? await factory(three, ctx()) : (() => { throw new Error('Model3D needs a factory or a src'); })();
      if (id !== e.build || disposed) return disposeTree(object);
      if (e.def.restyle !== false) sheet.restyle(object);
      e.holder.add(object);
      e.object = object;
    } catch (error) {
      if (id === e.build) fail(error);
    } finally {
      settle();
    }
  }

  function endAssemble() {
    asm = 'none';
    for (const e of models.values()) {
      e.plan?.finish();
      e.plan = undefined;
    }
  }

  function step(dt: number) {
    elapsed += dt;
    if (asm === 'pending') {
      asm = 'running';
      asmMs = 0;
    }
    if (asm === 'running') {
      asmMs += dt * 1000;
      let done = true;
      for (const e of models.values()) if (e.plan && !e.plan.apply(asmMs)) done = false;
      if (done) endAssemble();
    }
    if (moving() && opts.autoRotate > 0) {
      const idle = performance.now() - lastInput > IDLE_MS;
      spin += ((idle ? (opts.autoRotate * Math.PI) / 180 : 0) - spin) * (1 - Math.exp(-dt * 2.5));
      world.rotation.y += spin * dt;
    } else spin = 0;
    glide = orbit.update(dt);
    if (moving()) for (const e of models.values()) if (e.object) e.def.animate?.(e.object, { elapsed, delta: dt });
  }

  function tick(now: number) {
    raf = 0;
    if (!canRun()) return;
    step(last ? Math.min((now - last) / 1000, 0.1) : 0);
    last = now;
    renderer.render(scene, camera);
    dirty = false;
    if (!shown) {
      shown = true;
      init.onFirstFrame?.();
    }
    const on = animating();
    if (on !== announced) init.onAnimating?.((announced = on));
    if (on) schedule();
    else last = 0;
  }

  function wake() {
    last = 0;
    if (dirty || animating()) schedule();
  }
  const onVisibility = () => {
    docVisible = document.visibilityState !== 'hidden';
    if (docVisible) wake();
    else cancelFrame();
  };
  document.addEventListener('visibilitychange', onVisibility);

  function bindControls(on: boolean) {
    detach?.();
    detach = on
      ? orbit.attach(canvas, {
          onInput: () => {
            lastInput = performance.now();
            request();
          },
          inertia: () => !opts.reducedMotion,
        })
      : undefined;
  }
  bindControls(init.controls);

  return {
    setModel(id: string, def: ModelDef) {
      let e = models.get(id);
      if (!e) {
        e = { def, holder: new three.Group(), build: 0 };
        models.set(id, e);
        world.add(e.holder);
      }
      e.def = def;
      place(e);
      const next = def.src ?? def.factory;
      if (next !== e.key || !e.object) {
        e.key = next;
        void build(e);
      } else if (built) refit();
    },
    removeModel(id: string) {
      const e = models.get(id);
      if (!e) return;
      e.build++;
      e.holder.removeFromParent();
      disposeTree(e.holder);
      models.delete(id);
      if (built) refit();
    },
    /** Call once after the initial models are registered: with none, the stage is built right away. */
    start() {
      if (models.size === 0) {
        pending = 1;
        settle();
      }
    },
    set(patch: Partial<{ autoRotate: number; paused: boolean; reducedMotion: boolean; controls: boolean }>) {
      if (patch.controls !== undefined) bindControls(patch.controls);
      Object.assign(opts, { autoRotate: patch.autoRotate ?? opts.autoRotate, paused: patch.paused ?? opts.paused, reducedMotion: patch.reducedMotion ?? opts.reducedMotion });
      if (opts.reducedMotion && asm !== 'none') endAssemble();
      wake();
      request();
    },
    setTokens(next: SceneTokens) {
      tokens = next;
      sheet.setTokens(next);
      for (const e of models.values()) e.plan?.setColor(next.accent);
      u.uWidth.value = next.lineWidth * renderer.getPixelRatio();
      request();
    },
    setVisible(v: boolean) {
      visible = v;
      if (v) wake();
      else cancelFrame();
    },
    setLost(v: boolean) {
      lost = v;
      if (v) cancelFrame();
    },
    resize,
    request,
    /** Home camera and turntable angle. */
    reset() {
      orbit.reset();
      world.rotation.y = 0;
      spin = 0;
      request();
    },
    dispose(releaseContext = true) {
      disposed = true;
      cancelFrame();
      document.removeEventListener('visibilitychange', onVisibility);
      detach?.();
      for (const e of models.values()) disposeTree(e.holder);
      models.clear();
      sheet.dispose();
      scene.clear();
      renderer.dispose();
      if (releaseContext) renderer.forceContextLoss();
      if (announced) init.onAnimating?.(false);
    },
  };
}
