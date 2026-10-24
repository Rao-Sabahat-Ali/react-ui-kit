import { useCallback, useEffect, useRef } from 'react';

/** Returns a stable function that calls the latest `fn` after `delay` ms of silence (`delay` 0 → immediate). */
export function useDebouncedCallback<A extends unknown[]>(fn: (...args: A) => void, delay: number): (...args: A) => void {
  const fnRef = useRef(fn);
  fnRef.current = fn;
  const timer = useRef<number | undefined>(undefined);
  useEffect(() => () => window.clearTimeout(timer.current), []);
  return useCallback(
    (...args: A) => {
      window.clearTimeout(timer.current);
      if (delay <= 0) fnRef.current(...args);
      else timer.current = window.setTimeout(() => fnRef.current(...args), delay);
    },
    [delay],
  );
}
