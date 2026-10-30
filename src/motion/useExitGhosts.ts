import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { canUseDOM } from '../utils/dom';
import { canAnimate, isDocumentHidden, prefersReducedMotion } from './env';
import { MOTION, readMotionMs } from './tokens';

export interface Ghost<T> {
  key: string;
  item: T;
  /** Position the item had in the displayed list. */
  index: number;
}

/**
 * Exit presence for list rows whose data was removed. Returns "ghosts": copies of the removed items that the caller
 * renders (inert, `data-state="closed"`) at their former position for the exit duration, then drops. Only items that
 * disappear from `source` ghost; items that merely leave `display` (paging, filtering, sorting) vanish at once.
 * Reduced motion, a hidden tab, no WAAPI (jsdom, SSR) or more than 8 removals: no ghosts, the row is simply gone.
 */
export function useExitGhosts<T>(source: readonly T[], display: readonly T[], keyOf: (item: T) => string, enabled = true): Ghost<T>[] {
  const [ghosts, setGhosts] = useState<Ghost<T>[]>([]);
  const previous = useRef<{ source: Map<string, T>; display: string[] } | null>(null);
  const timers = useRef(new Set<number>());

  useLayoutEffect(() => {
    const sourceKeys = new Map(source.map((item) => [keyOf(item), item]));
    const displayKeys = display.map(keyOf);
    const before = previous.current;
    previous.current = { source: sourceKeys, display: displayKeys };
    if (!before || !enabled || !canUseDOM || !canAnimate() || isDocumentHidden() || prefersReducedMotion()) return;
    const removed: Ghost<T>[] = [];
    before.display.forEach((key, index) => {
      if (!sourceKeys.has(key) && before.source.has(key)) removed.push({ key, item: before.source.get(key)!, index });
    });
    if (removed.length === 0 || removed.length > MOTION.maxAnimated) return;
    const ms = Math.round(readMotionMs(document.documentElement, 'part') * 0.7);
    setGhosts((current) => [...current, ...removed]);
    const gone = new Set(removed.map((g) => g.key));
    const timer = window.setTimeout(() => {
      timers.current.delete(timer);
      setGhosts((current) => current.filter((g) => !gone.has(g.key)));
    }, ms);
    timers.current.add(timer);
    // The caller owns the lists; `keyOf` is expected to be stable in meaning.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [source, display, enabled]);

  useEffect(
    () => () => {
      for (const timer of timers.current) window.clearTimeout(timer);
      timers.current.clear();
    },
    [],
  );

  return ghosts;
}

/** Insert ghost nodes into a rendered list at their former positions (clamped), keeping the live order otherwise. */
export function withGhosts<N>(live: N[], ghosts: Ghost<unknown>[], render: (ghost: Ghost<never>) => N[]): N[] {
  if (ghosts.length === 0) return live;
  const out = [...live];
  let offset = 0;
  for (const ghost of [...ghosts].sort((a, b) => a.index - b.index)) {
    const at = Math.min(ghost.index + offset, out.length);
    const nodes = render(ghost as Ghost<never>);
    out.splice(at, 0, ...nodes);
    offset += nodes.length;
  }
  return out;
}
