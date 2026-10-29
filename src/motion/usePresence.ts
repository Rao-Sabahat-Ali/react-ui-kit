import { useEffect, useRef, useState } from 'react';
import { canUseDOM } from '../utils/dom';
import { canAnimate, isDocumentHidden } from './env';
import { readMotionMs } from './tokens';
import { useReducedMotion } from './useReducedMotion';

export interface PresenceOptions {
  /** How long the exit animation runs before unmounting, in ms. Defaults to 70% of the live `exit` token. */
  exitMs?: number;
  /** Which motion token the enter animation uses: `part` (menus, toasts; default) or `step` (dialogs, drawers). */
  exit?: 'part' | 'step';
  /** Called after the content has unmounted. */
  onExited?: () => void;
}

export interface PresenceResult {
  /** Render the content while this is true (it stays true during the exit animation). */
  present: boolean;
  /** Put this on the content as `data-state`; CSS animates `open` in and `closed` out. */
  state: 'open' | 'closed';
  /** True from the moment `open` becomes false until the content unmounts. */
  exiting: boolean;
}

/**
 * Mount/unmount with exit animations. The enter animation is plain CSS on `[data-state="open"]`; on close the
 * content stays mounted with `data-state="closed"` for `exitMs`, then unmounts. Under reduced motion, or while the
 * tab is hidden, it unmounts at once. Correctness never waits on `transitionend`.
 */
export function usePresence(open: boolean, { exitMs, exit = 'part', onExited }: PresenceOptions = {}): PresenceResult {
  const reduced = useReducedMotion();
  const [present, setPresent] = useState(open);
  const exitedRef = useRef(onExited);
  exitedRef.current = onExited;

  // Derived state: opening mounts during the same render so there is no frame without the content.
  if (open && !present) setPresent(true);

  useEffect(() => {
    if (open || !present) return;
    const ms = reduced || isDocumentHidden() || !canAnimate() ? 0 : (exitMs ?? Math.round(readMotionMs(canUseDOM ? document.documentElement : null, exit) * 0.7));
    const finish = () => {
      setPresent(false);
      exitedRef.current?.();
    };
    if (ms <= 0) {
      finish();
      return;
    }
    const timer = window.setTimeout(finish, ms);
    return () => window.clearTimeout(timer);
  }, [open, present, reduced, exitMs, exit]);

  return { present: open || present, state: open ? 'open' : 'closed', exiting: !open && present };
}
