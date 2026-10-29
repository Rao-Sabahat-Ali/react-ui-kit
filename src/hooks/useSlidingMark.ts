import { useLayoutEffect, type DependencyList, type RefObject } from 'react';

export interface SlidingMarkOptions {
  /** Selector (inside the container) of the element the mark sits under or beside, e.g. `[aria-current="page"]`. */
  target: string;
  /** `x`: the mark is a horizontal bar under the target; `y`: a vertical bar beside it. */
  axis?: 'x' | 'y';
  enabled?: boolean;
}

/**
 * Position data for a sliding accent mark (the same mark Tabs draws). The container gets `--ui-mark-pos` and
 * `--ui-mark-size` (unitless px) and `data-mark="ready"` once placed, so CSS can draw the mark with a pseudo-element
 * (`transform: translateX(calc(var(--ui-mark-pos) * 1px)) scaleX(var(--ui-mark-size))`) and transition only the
 * movement that follows the first placement. The container must be `position: relative`; offsets are physical, so
 * the mark is anchored at `left: 0` / `top: 0` in both reading directions. No re-render is involved.
 */
export function useSlidingMark(ref: RefObject<HTMLElement | null>, { target, axis = 'x', enabled = true }: SlidingMarkOptions, deps: DependencyList): void {
  useLayoutEffect(() => {
    const container = ref.current;
    if (!container || !enabled) return;
    const place = () => {
      const el = container.querySelector<HTMLElement>(target);
      if (!el) {
        container.style.setProperty('--ui-mark-size', '0');
        return;
      }
      const c = container.getBoundingClientRect();
      const r = el.getBoundingClientRect();
      const pos = axis === 'x' ? r.left - c.left + container.scrollLeft : r.top - c.top + container.scrollTop;
      const size = axis === 'x' ? r.width : r.height;
      container.style.setProperty('--ui-mark-pos', String(Math.round(pos * 100) / 100));
      container.style.setProperty('--ui-mark-size', String(Math.round(size * 100) / 100));
    };
    place();
    let frame = 0;
    // The first placement must not animate; later moves do.
    if (container.dataset.mark !== 'ready') frame = requestAnimationFrame(() => (container.dataset.mark = 'ready'));
    const observer = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(place);
    observer?.observe(container);
    container.querySelectorAll(target).forEach((el) => observer?.observe(el));
    return () => {
      cancelAnimationFrame(frame);
      observer?.disconnect();
    };
    // The caller owns the dependency list: the mark follows the data it passes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ref, target, axis, enabled, ...deps]);
}
