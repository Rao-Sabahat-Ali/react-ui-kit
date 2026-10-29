import { usePrefersReducedMotion } from '../hooks/useMediaQuery';

/** True while `prefers-reduced-motion: reduce` matches; re-renders when the preference changes. */
export function useReducedMotion(): boolean {
  return usePrefersReducedMotion();
}
