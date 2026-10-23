import { useEffect, useRef, type RefObject } from 'react';

/** Calls `handler` on pointerdown outside every given element. */
export function useClickOutside(refs: RefObject<HTMLElement | null>[], handler: (event: PointerEvent) => void, active = true): void {
  const handlerRef = useRef(handler);
  handlerRef.current = handler;
  useEffect(() => {
    if (!active) return;
    const listener = (event: PointerEvent) => {
      const target = event.target as Node;
      if (refs.some((r) => r.current?.contains(target))) return;
      handlerRef.current(event);
    };
    document.addEventListener('pointerdown', listener);
    return () => document.removeEventListener('pointerdown', listener);
  }, [active, refs]);
}
