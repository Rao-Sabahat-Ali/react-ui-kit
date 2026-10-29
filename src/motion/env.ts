import { canUseDOM } from '../utils/dom';

/** True when the user asked for reduced motion (read at call time, not reactive). */
export function prefersReducedMotion(): boolean {
  if (!canUseDOM || typeof window.matchMedia !== 'function') return false;
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

/**
 * Exit animations need a browser that runs CSS animations / the Web Animations API. Without `document.getAnimations`
 * (SSR, jsdom, very old browsers) overlays unmount at once, which is the same final state without the wait.
 */
export function canAnimate(): boolean {
  return canUseDOM && typeof document.getAnimations === 'function';
}

export function isDocumentHidden(): boolean {
  return canUseDOM && document.visibilityState === 'hidden';
}

const running = new Set<Animation>();
let listening = false;

// Animations stop when the tab is hidden: jump to the end state instead of burning frames.
function onVisibility() {
  if (document.visibilityState !== 'hidden') return;
  for (const animation of [...running]) {
    try {
      animation.finish();
    } catch {
      animation.cancel();
    }
  }
  running.clear();
}

function track(animation: Animation) {
  if (!listening && canUseDOM) {
    document.addEventListener('visibilitychange', onVisibility);
    listening = true;
  }
  running.add(animation);
  const release = () => running.delete(animation);
  animation.addEventListener?.('finish', release);
  animation.addEventListener?.('cancel', release);
}

/** Keep only the opacity channel of each keyframe: the reduced-motion alternative to a spatial move. */
export function opacityOnly(keyframes: Keyframe[]): Keyframe[] {
  return keyframes.map((k) => {
    const out: Keyframe = {};
    if (k.opacity !== undefined) out.opacity = k.opacity;
    if (k.offset !== undefined) out.offset = k.offset;
    return out;
  });
}

export interface SafeAnimateOptions extends KeyframeAnimationOptions {
  /** What to do under prefers-reduced-motion: skip entirely (default) or fade opacity only (≤ 120 ms). */
  reduced?: 'skip' | 'fade';
}

/**
 * Web Animations API wrapper used by every kit motion hook. Returns `null` (and does nothing, so the element
 * already sits in its final state) when WAAPI is unavailable, the tab is hidden, or reduced motion is on and the
 * caller chose `skip`. Only ever hand it transform / opacity / clip-path / box-shadow keyframes.
 */
export function safeAnimate(el: Element, keyframes: Keyframe[], options: SafeAnimateOptions): Animation | null {
  if (typeof (el as HTMLElement).animate !== 'function' || isDocumentHidden()) return null;
  const { reduced = 'skip', ...timing } = options;
  let frames = keyframes;
  let opts: KeyframeAnimationOptions = timing;
  if (prefersReducedMotion()) {
    if (reduced === 'skip') return null;
    frames = opacityOnly(keyframes);
    const d = Math.min(Number(timing.duration ?? 0), 120);
    opts = { ...timing, duration: d, delay: 0, easing: 'linear' };
  }
  const animation = (el as HTMLElement).animate(frames, opts);
  track(animation);
  return animation;
}
