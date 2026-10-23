import { useEffect, type RefObject } from 'react';
import { getFocusable } from '../utils/dom';

export interface FocusTrapOptions {
  active?: boolean;
  initialFocus?: RefObject<HTMLElement | null> | undefined;
  restoreFocus?: boolean;
}

/** Stack of active traps: only the top-most one handles Tab. */
const stack: HTMLElement[] = [];

export function useFocusTrap(ref: RefObject<HTMLElement | null>, { active = true, initialFocus, restoreFocus = true }: FocusTrapOptions = {}): void {
  useEffect(() => {
    const container = ref.current;
    if (!active || !container) return;
    const previouslyFocused = document.activeElement as HTMLElement | null;
    // React runs child effects before parent effects, so a parent trap mounting in the
    // same commit as a nested one must sit *below* it in the stack and not steal focus.
    const nestedIndex = stack.findIndex((el) => container.contains(el));
    if (nestedIndex === -1) {
      stack.push(container);
      const target = initialFocus?.current ?? getFocusable(container)[0] ?? container;
      if (target === container && !container.hasAttribute('tabindex')) container.setAttribute('tabindex', '-1');
      target.focus();
    } else {
      stack.splice(nestedIndex, 0, container);
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Tab' || stack[stack.length - 1] !== container) return;
      const focusable = getFocusable(container);
      if (focusable.length === 0) {
        event.preventDefault();
        container.focus();
        return;
      }
      const first = focusable[0]!;
      const last = focusable[focusable.length - 1]!;
      const activeEl = document.activeElement;
      if (event.shiftKey && (activeEl === first || activeEl === container)) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && activeEl === last) {
        event.preventDefault();
        first.focus();
      }
    };
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      const index = stack.lastIndexOf(container);
      if (index !== -1) stack.splice(index, 1);
      if (restoreFocus && previouslyFocused?.isConnected) previouslyFocused.focus();
    };
  }, [active, ref, initialFocus, restoreFocus]);
}
