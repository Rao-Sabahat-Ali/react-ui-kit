import { useLayoutEffect, useRef, type DependencyList, type RefObject } from 'react';
import { safeAnimate } from './env';
import { EASING, MOTION, readMotionMs } from './tokens';

export interface FlipOptions {
  /** Selector for the animated children. Default: the container's direct children. */
  selector?: string;
  /** Duration in ms. Default `--ui-motion-step` (420). */
  duration?: number;
  /** Easing for the move. Default `out`; use `snap` for a dropped card settling. */
  easing?: keyof typeof EASING;
  enabled?: boolean;
}

interface Box {
  x: number;
  y: number;
}

/**
 * FLIP layout animation for lists and boards. When the render driven by `deps` moves, adds or reorders children of
 * `containerRef`, each moved child slides from its old position to its new one using `transform` only (never a layout
 * property). Identity is the DOM element, so React keys keep working. New children fade in; removed ones vanish.
 * More than 8 children, reduced motion, a hidden tab or no WAAPI: the layout simply changes.
 */
export function useFlip(containerRef: RefObject<HTMLElement | null>, deps: DependencyList, options: FlipOptions = {}): void {
  const { selector, duration, easing = 'out', enabled = true } = options;
  const boxes = useRef(new Map<Element, Box>());
  const running = useRef(new Map<Element, Animation>());

  useLayoutEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const items = (selector ? Array.from(container.querySelectorAll<HTMLElement>(selector)) : (Array.from(container.children) as HTMLElement[]));
    const origin = container.getBoundingClientRect();
    const read = (el: Element): Box => {
      const r = el.getBoundingClientRect();
      return { x: r.left - origin.left, y: r.top - origin.top };
    };

    // Visual position now (includes any transform of an interrupted move), then the true layout position.
    const visual = new Map<Element, Box>(items.map((el) => [el, read(el)]));
    for (const [el, animation] of running.current) {
      animation.cancel();
      running.current.delete(el);
    }
    const next = new Map<Element, Box>(items.map((el) => [el, read(el)]));
    const previous = boxes.current;
    const first = previous.size > 0;
    const ms = duration ?? readMotionMs(container, 'step');

    if (enabled && first && items.length <= MOTION.maxAnimated) {
      for (const el of items) {
        const after = next.get(el)!;
        const before = previous.get(el);
        if (!before) {
          const fade = safeAnimate(el, [{ opacity: 0 }, { opacity: 1 }], { duration: readMotionMs(container, 'part'), easing: EASING.out, reduced: 'fade' });
          if (fade) running.current.set(el, fade);
          continue;
        }
        const drift = { x: visual.get(el)!.x - after.x, y: visual.get(el)!.y - after.y };
        const dx = before.x + drift.x - after.x;
        const dy = before.y + drift.y - after.y;
        if (Math.abs(dx) < 1 && Math.abs(dy) < 1) continue;
        const animation = safeAnimate(el, [{ transform: `translate(${dx}px, ${dy}px)` }, { transform: 'translate(0, 0)' }], {
          duration: ms,
          easing: EASING[easing],
          reduced: 'skip',
        });
        if (animation) {
          running.current.set(el, animation);
          animation.addEventListener?.('finish', () => running.current.delete(el));
        }
      }
    }
    boxes.current = next;
    // The caller owns the dependency list: layout changes are driven by the data it passes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  useLayoutEffect(
    () => () => {
      for (const animation of running.current.values()) animation.cancel();
      running.current.clear();
    },
    [],
  );
}
