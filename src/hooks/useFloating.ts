import { useLayoutEffect, useState, type RefObject } from 'react';
import { computePosition, type Placement, type PositionResult } from '../utils/position';

/** Position a fixed floating element next to an anchor, updating on scroll/resize. */
export function useFloating(
  anchorRef: RefObject<HTMLElement | null>,
  floatingRef: RefObject<HTMLElement | null>,
  { open, placement = 'bottom-start', offset = 4, matchWidth = false }: { open: boolean; placement?: Placement; offset?: number; matchWidth?: boolean },
): PositionResult & { minWidth?: number } {
  const [pos, setPos] = useState<PositionResult & { minWidth?: number }>({ top: 0, left: 0, placement });

  useLayoutEffect(() => {
    if (!open) return;
    const update = () => {
      const anchor = anchorRef.current;
      const floating = floatingRef.current;
      if (!anchor || !floating) return;
      const a = anchor.getBoundingClientRect();
      const f = floating.getBoundingClientRect();
      const rtl = getComputedStyle(anchor).direction === 'rtl';
      const width = matchWidth ? Math.max(f.width, a.width) : f.width;
      const next = computePosition(a, { width, height: f.height }, { placement, offset, rtl });
      setPos(matchWidth ? { ...next, minWidth: a.width } : next);
    };
    update();
    window.addEventListener('resize', update);
    window.addEventListener('scroll', update, true);
    return () => {
      window.removeEventListener('resize', update);
      window.removeEventListener('scroll', update, true);
    };
  }, [open, anchorRef, floatingRef, placement, offset, matchWidth]);

  return pos;
}
