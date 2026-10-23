import type { ReactElement, Ref, RefObject } from 'react';
import { getFocusable } from '../../utils/dom';

/*
 * Small helpers shared by the overlay/menu components (Tooltip, Popover, Menu family, SpeedDial, Dock).
 * Candidates for src/utils once the shared-code owner accepts them.
 */

export function assignRef<T>(ref: Ref<T> | undefined, value: T | null): void {
  if (typeof ref === 'function') ref(value);
  else if (ref) (ref as RefObject<T | null>).current = value;
}

/** Callback ref writing to several refs. */
export function mergeRefs<T>(...refs: (Ref<T> | undefined)[]): (node: T | null) => void {
  return (node) => refs.forEach((r) => assignRef(r, node));
}

/** React 19: `ref` is a regular prop on the element. */
export function elementRef<T>(element: ReactElement): Ref<T> | undefined {
  return (element.props as { ref?: Ref<T> }).ref;
}

/** Text direction of an element (computed style first, then the nearest `dir` attribute). */
export function isRtl(el: Element | null | undefined): boolean {
  if (!el) return false;
  if (typeof getComputedStyle === 'function' && getComputedStyle(el).direction === 'rtl') return true;
  return el.closest('[dir]')?.getAttribute('dir')?.toLowerCase() === 'rtl';
}

function tabbables(scope: HTMLElement): HTMLElement[] {
  return getFocusable(scope).filter((el) => !el.closest('[hidden]'));
}

/**
 * Move focus to the next/previous tabbable element after `from` (in the enclosing modal if any).
 * Used when Tab closes a popup whose items live in a portal. Returns false when there is none.
 */
export function focusAdjacentTabbable(from: HTMLElement, backwards = false): boolean {
  const scope = (from.closest('[aria-modal="true"]') as HTMLElement | null) ?? document.body;
  const list = tabbables(scope);
  let index = list.indexOf(from);
  if (index === -1) {
    // `from` is not tabbable itself (e.g. tabindex=-1): find its slot in document order.
    index = list.findIndex((el) => from.compareDocumentPosition(el) & Node.DOCUMENT_POSITION_FOLLOWING);
    if (index === -1) index = list.length;
    index = backwards ? index : index - 1;
  }
  const target = list[backwards ? index - 1 : index + 1];
  if (target) {
    target.focus();
    return true;
  }
  from.focus();
  return false;
}
