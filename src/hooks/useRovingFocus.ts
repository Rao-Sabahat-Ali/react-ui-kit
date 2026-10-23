import { useCallback, type KeyboardEvent, type RefObject } from 'react';

export interface RovingOptions {
  orientation?: 'horizontal' | 'vertical' | 'both';
  loop?: boolean;
  /** CSS selector for focusable items inside the container. */
  selector: string;
  rtl?: boolean;
}

/**
 * Roving tabindex keyboard handler (toolbar, tabs, menubar, dock). Arrow keys move focus between
 * items matching `selector` (skipping disabled), Home/End jump. Returns the new index or -1.
 */
export function useRovingFocus(containerRef: RefObject<HTMLElement | null>, { orientation = 'horizontal', loop = true, selector, rtl }: RovingOptions) {
  return useCallback(
    (event: KeyboardEvent<HTMLElement>): number => {
      const container = containerRef.current;
      if (!container) return -1;
      const items = Array.from(container.querySelectorAll<HTMLElement>(selector)).filter((el) => !el.hasAttribute('disabled') && el.getAttribute('aria-disabled') !== 'true');
      const current = items.indexOf(document.activeElement as HTMLElement);
      const isRtl = rtl ?? getComputedStyle(container).direction === 'rtl';
      const next = isRtl ? 'ArrowLeft' : 'ArrowRight';
      const prev = isRtl ? 'ArrowRight' : 'ArrowLeft';
      let target = -1;
      const forward = (orientation !== 'vertical' && event.key === next) || (orientation !== 'horizontal' && event.key === 'ArrowDown');
      const backward = (orientation !== 'vertical' && event.key === prev) || (orientation !== 'horizontal' && event.key === 'ArrowUp');
      if (forward) target = current + 1 >= items.length ? (loop ? 0 : current) : current + 1;
      else if (backward) target = current - 1 < 0 ? (loop ? items.length - 1 : current) : current - 1;
      else if (event.key === 'Home') target = 0;
      else if (event.key === 'End') target = items.length - 1;
      if (target < 0 || !items[target]) return -1;
      event.preventDefault();
      items.forEach((el, i) => el.setAttribute('tabindex', i === target ? '0' : '-1'));
      items[target]!.focus();
      return target;
    },
    [containerRef, selector, orientation, loop, rtl],
  );
}
