import { useSyncExternalStore } from 'react';
import { canUseDOM } from '../utils/dom';

/** Subscribe to a media query (SSR-safe; returns `serverValue` on the server). */
export function useMediaQuery(query: string, serverValue = false): boolean {
  return useSyncExternalStore(
    (notify) => {
      if (!canUseDOM) return () => {};
      const mql = window.matchMedia(query);
      mql.addEventListener('change', notify);
      return () => mql.removeEventListener('change', notify);
    },
    () => (canUseDOM ? window.matchMedia(query).matches : serverValue),
    () => serverValue,
  );
}

export const usePrefersReducedMotion = () => useMediaQuery('(prefers-reduced-motion: reduce)');
