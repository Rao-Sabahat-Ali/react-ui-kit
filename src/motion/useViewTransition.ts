import { useCallback, useMemo } from 'react';
import { flushSync } from 'react-dom';
import { canUseDOM } from '../utils/dom';
import { isDocumentHidden, prefersReducedMotion } from './env';

interface ViewTransitionLike {
  finished: Promise<void>;
  ready: Promise<void>;
  skipTransition?: () => void;
}
type StartViewTransition = (callback: (() => void | Promise<void>) | { update: () => void | Promise<void>; types?: string[] }) => ViewTransitionLike;

export interface ViewTransitionRunOptions {
  /** Transition types for `:active-view-transition-type()` CSS (ignored where unsupported). */
  types?: string[];
}

export interface ViewTransitionApi {
  /** True when the browser can run view transitions (and motion is allowed right now). */
  supported: boolean;
  /**
   * Run a state update inside a view transition ("Turn": the old sheet leaves and the new one arrives along the
   * reading direction). Without View Transitions, with reduced motion or in a hidden tab, `update` simply runs.
   * Resolves when the transition has finished (immediately in the fallback).
   */
  run: (update: () => void | Promise<void>, options?: ViewTransitionRunOptions) => Promise<void>;
}

const starter = (): StartViewTransition | null => {
  if (!canUseDOM) return null;
  const fn = (document as unknown as { startViewTransition?: StartViewTransition }).startViewTransition;
  return typeof fn === 'function' ? fn.bind(document) : null;
};

/** `document.startViewTransition` wrapper with a graceful fallback. Flushes React updates synchronously inside the transition. */
export function useViewTransition(): ViewTransitionApi {
  const run = useCallback(async (update: () => void | Promise<void>, options: ViewTransitionRunOptions = {}) => {
    const start = starter();
    if (!start || prefersReducedMotion() || isDocumentHidden()) {
      await update();
      return;
    }
    let ran = false;
    const callback = () => {
      ran = true;
      let result: void | Promise<void> = undefined;
      flushSync(() => {
        result = update();
      });
      return result;
    };
    try {
      const transition = options.types ? start({ update: callback, types: options.types }) : start(callback);
      await transition.finished;
    } catch {
      // A skipped transition has still applied the update; if the browser threw before running it, apply it now.
      if (!ran) await update();
    }
  }, []);
  return useMemo(() => ({ supported: starter() !== null && !prefersReducedMotion(), run }), [run]);
}
