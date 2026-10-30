import { useCallback, useEffect, useLayoutEffect, useRef, type RefObject } from 'react';
import { canUseDOM } from '../utils/dom';
import { safeAnimate } from './env';
import { EASING, MOTION, readAssembleDistance, readMotionMs } from './tokens';

export interface AssembleOptions {
  /** Selector for the parts, in DOM order. Default `[data-assemble]`. */
  parts?: string;
  /** Selector for the dashed guide line(s), drawn in with clip-path. Default `[data-assemble-guide]`. */
  guide?: string;
  /** Delay between parts in ms. Default `--ui-motion-stagger` (40). */
  stagger?: number;
  /** Travel in px. Default `--ui-assemble-distance` (12). */
  distance?: number;
  /** Duration of one part in ms. Default `--ui-motion-part` (280). */
  duration?: number;
  /** Direction of travel: `block` (default, from below) or `inline` (from the reading start; mirrors in RTL). */
  axis?: 'block' | 'inline';
  /** Enter from the opposite side (from above for `block`, from the reading end for `inline`), for parts that are lowered into place. */
  reverse?: boolean;
  /** Turn the movement off (parts simply sit in place). Default true. */
  enabled?: boolean;
  /** Replays the assembly whenever this value changes (for example the current step id). */
  trigger?: unknown;
  /** Called when the last animated part has settled (also when nothing needed to animate). */
  onComplete?: () => void;
}

export interface AssembleControls {
  /** Play the assembly again now. */
  replay: () => void;
  /** Stop immediately; every part is left in its final place. */
  cancel: () => void;
}

/**
 * The Assemble movement (motion v2): the parts of a step enter in order along a dashed guide line (translate up to
 * `assemble-distance` + opacity), and the last part settles with `easing-snap`. Web Animations API only; parts
 * stay in their natural, visible position the whole time (`fill: backwards`), so a failed script never hides content.
 *
 * - Reduced motion: parts fade (opacity only, ≤ 120 ms, no stagger, no travel).
 * - Hidden tab or no WAAPI: nothing animates and `onComplete` fires at once.
 * - At most 8 parts animate; the rest appear immediately.
 */
export function useAssemble(ref: RefObject<HTMLElement | null>, options: AssembleOptions = {}): AssembleControls {
  const { parts = '[data-assemble]', guide = '[data-assemble-guide]', enabled = true, trigger, axis = 'block', reverse = false } = options;
  const running = useRef<Animation[]>([]);
  const optionsRef = useRef(options);
  optionsRef.current = options;

  const cancel = useCallback(() => {
    for (const animation of running.current) animation.cancel();
    running.current = [];
  }, []);

  const play = useCallback(() => {
    const root = ref.current;
    cancel();
    if (!root || !canUseDOM) return;
    const o = optionsRef.current;
    const stagger = o.stagger ?? readMotionMs(root, 'stagger');
    const distance = o.distance ?? readAssembleDistance(root);
    const duration = o.duration ?? readMotionMs(root, 'part');
    const rtl = axis === 'inline' && getComputedStyle(root).direction === 'rtl';
    const sign = reverse ? -1 : 1;
    const from = axis === 'inline' ? `translate(${(rtl ? distance : -distance) * sign}px, 0)` : `translate(0, ${distance * sign}px)`;

    const targets = Array.from(root.querySelectorAll<HTMLElement>(parts)).slice(0, MOTION.maxAnimated);
    const lines = Array.from(root.querySelectorAll<HTMLElement>(guide));
    const started: Animation[] = [];

    lines.forEach((line) => {
      const a = safeAnimate(line, [{ clipPath: 'inset(0 0 100% 0)' }, { clipPath: 'inset(0 0 0 0)' }], {
        duration: duration + stagger * targets.length,
        easing: EASING.out,
        fill: 'backwards',
        reduced: 'skip',
      });
      if (a) started.push(a);
    });

    targets.forEach((part, i) => {
      const last = i === targets.length - 1;
      const a = safeAnimate(part, [{ opacity: 0, transform: from }, { opacity: 1, transform: 'translate(0, 0)' }], {
        duration,
        delay: i * stagger,
        easing: last ? EASING.snap : EASING.out,
        fill: 'backwards',
        reduced: 'fade',
      });
      if (a) started.push(a);
    });

    running.current = started;
    if (started.length === 0) {
      o.onComplete?.();
      return;
    }
    Promise.allSettled(started.map((a) => a.finished)).then(() => {
      if (running.current === started) {
        running.current = [];
        optionsRef.current.onComplete?.();
      }
    });
  }, [ref, parts, guide, axis, reverse, cancel]);

  useLayoutEffect(() => {
    if (!enabled) return;
    play();
    return cancel;
    // `trigger` is the replay key supplied by the caller.
  }, [enabled, trigger, play, cancel]);

  useEffect(() => cancel, [cancel]);

  return { replay: play, cancel };
}
