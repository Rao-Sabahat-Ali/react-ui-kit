import { vi } from 'vitest';
import type { PerspectiveCamera, Scene } from 'three';

/** Counts how often the mocked three module was loaded (its factory runs on the first import). */
export const probe = { threeLoads: 0 };

/** URLs the mocked GLTFLoader was asked to load. */
export const gltf = { loads: [] as string[] };

/** Stands in for THREE.WebGLRenderer: jsdom has no WebGL. Everything else in the mocked three is the real library. */
export class FakeRenderer {
  static instances: FakeRenderer[] = [];
  static failWith: Error | null = null;
  domElement: HTMLCanvasElement;
  pixelRatio = 1;
  render = vi.fn();
  setSize = vi.fn();
  setPixelRatio = vi.fn((v: number) => {
    this.pixelRatio = v;
  });
  setClearColor = vi.fn();
  dispose = vi.fn();
  forceContextLoss = vi.fn();
  constructor(params: { canvas: HTMLCanvasElement }) {
    if (FakeRenderer.failWith) throw FakeRenderer.failWith;
    this.domElement = params.canvas;
    FakeRenderer.instances.push(this);
  }
  getPixelRatio() {
    return this.pixelRatio;
  }
  /** The scene and camera of the most recent render call. */
  last(): [Scene, PerspectiveCamera] {
    return this.render.mock.calls.at(-1) as [Scene, PerspectiveCamera];
  }
}

export class FakeIntersectionObserver {
  static instances: FakeIntersectionObserver[] = [];
  targets = new Set<Element>();
  constructor(
    private cb: IntersectionObserverCallback,
    public options?: IntersectionObserverInit,
  ) {
    FakeIntersectionObserver.instances.push(this);
  }
  observe(el: Element) {
    this.targets.add(el);
  }
  unobserve(el: Element) {
    this.targets.delete(el);
  }
  disconnect() {
    this.targets.clear();
  }
  takeRecords() {
    return [];
  }
  trigger(isIntersecting: boolean) {
    const target = [...this.targets][0];
    if (target) this.cb([{ isIntersecting, target, intersectionRatio: isIntersecting ? 1 : 0 } as IntersectionObserverEntry], this as unknown as IntersectionObserver);
  }
}

export class FakeResizeObserver {
  static instances: FakeResizeObserver[] = [];
  targets = new Set<Element>();
  constructor(private cb: ResizeObserverCallback) {
    FakeResizeObserver.instances.push(this);
  }
  observe(el: Element) {
    this.targets.add(el);
  }
  unobserve(el: Element) {
    this.targets.delete(el);
  }
  disconnect() {
    this.targets.clear();
  }
  trigger() {
    const target = [...this.targets][0];
    if (target) this.cb([{ target } as ResizeObserverEntry], this as unknown as ResizeObserver);
  }
}

export interface BrowserMocks {
  /** Run the queued animation frames once, `ms` later. */
  step(ms?: number): void;
  /** Run frames until none is queued (animations ended), at most `max`. */
  settle(max?: number): number;
  pending(): number;
  /** The observer that loads three (200px margin) and the one that tracks visibility. */
  near(): FakeIntersectionObserver;
  view(): FakeIntersectionObserver;
  size(): FakeResizeObserver;
  setSize(w: number, h: number): void;
  setDpr(dpr: number): void;
  setReducedMotion(on: boolean): void;
  setHidden(hidden: boolean): void;
  restore(): void;
}

/** Fake IntersectionObserver, ResizeObserver, WebGL context, layout size, devicePixelRatio, matchMedia and a manual frame loop. */
export function installBrowserMocks(): BrowserMocks {
  FakeRenderer.instances = [];
  FakeRenderer.failWith = null;
  FakeIntersectionObserver.instances = [];
  FakeResizeObserver.instances = [];
  const saved = {
    io: window.IntersectionObserver,
    ro: window.ResizeObserver,
    raf: window.requestAnimationFrame,
    caf: window.cancelAnimationFrame,
    mm: window.matchMedia,
    dpr: window.devicePixelRatio,
    getContext: HTMLCanvasElement.prototype.getContext,
  };
  let size = [400, 300];
  Object.defineProperty(HTMLElement.prototype, 'clientWidth', { configurable: true, get: () => size[0] });
  Object.defineProperty(HTMLElement.prototype, 'clientHeight', { configurable: true, get: () => size[1] });
  window.IntersectionObserver = FakeIntersectionObserver as unknown as typeof IntersectionObserver;
  window.ResizeObserver = FakeResizeObserver as unknown as typeof ResizeObserver;
  HTMLCanvasElement.prototype.getContext = vi.fn(() => ({ getExtension: () => null })) as unknown as typeof HTMLCanvasElement.prototype.getContext;

  let id = 0;
  let now = 1000;
  const queue = new Map<number, FrameRequestCallback>();
  window.requestAnimationFrame = (cb) => (queue.set(++id, cb), id);
  window.cancelAnimationFrame = (n) => void queue.delete(n);

  let reduced = false;
  const listeners = new Set<() => void>();
  window.matchMedia = ((query: string) => ({
    get matches() {
      return reduced && query.includes('prefers-reduced-motion');
    },
    media: query,
    addEventListener: (_: string, fn: () => void) => listeners.add(fn),
    removeEventListener: (_: string, fn: () => void) => listeners.delete(fn),
  })) as unknown as typeof window.matchMedia;

  const mocks: BrowserMocks = {
    step(ms = 16) {
      now += ms;
      const frames = [...queue];
      queue.clear();
      for (const [, cb] of frames) cb(now);
    },
    settle(max = 400) {
      let n = 0;
      while (queue.size && n < max) {
        mocks.step();
        n++;
      }
      return n;
    },
    pending: () => queue.size,
    near: () => FakeIntersectionObserver.instances.find((o) => o.options?.rootMargin === '200px')!,
    view: () => FakeIntersectionObserver.instances.find((o) => o.options?.rootMargin !== '200px')!,
    size: () => FakeResizeObserver.instances.findLast((o) => o.targets.size > 0)!,
    setSize(w, h) {
      size = [w, h];
    },
    setDpr(dpr) {
      Object.defineProperty(window, 'devicePixelRatio', { configurable: true, value: dpr });
    },
    setReducedMotion(on) {
      reduced = on;
      for (const fn of listeners) fn();
    },
    setHidden(hidden) {
      Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => (hidden ? 'hidden' : 'visible') });
      document.dispatchEvent(new Event('visibilitychange'));
    },
    restore() {
      Object.assign(window, { IntersectionObserver: saved.io, ResizeObserver: saved.ro, requestAnimationFrame: saved.raf, cancelAnimationFrame: saved.caf, matchMedia: saved.mm });
      Object.defineProperty(window, 'devicePixelRatio', { configurable: true, value: saved.dpr });
      HTMLCanvasElement.prototype.getContext = saved.getContext;
      delete (document as { visibilityState?: unknown }).visibilityState;
      delete (HTMLElement.prototype as { clientWidth?: unknown }).clientWidth;
      delete (HTMLElement.prototype as { clientHeight?: unknown }).clientHeight;
    },
  };
  return mocks;
}
