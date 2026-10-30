import { useState } from 'react';
import { usePresence, type PresenceResult } from './usePresence';

export interface RevealResult extends Omit<PresenceResult, 'state'> {
  /** Put this on the region as `data-state`; `undefined` while it is still settled (no entrance plays). */
  state: PresenceResult['state'] | undefined;
}

/**
 * Presence for a collapsible region that reveals with clip-path + opacity (`panels.reveal`, never height). Regions that are
 * already open when their parent first paints stay settled: they carry no `data-state` (so no entrance plays) until the
 * first time they are toggled, after which they behave like any presence. Regions mounted later (a parent expanding
 * its already-expanded children) animate from the start.
 */
export function useReveal(open: boolean, animateEnter: boolean): RevealResult {
  const presence = usePresence(open);
  const [initialOpen] = useState(open);
  const [armed, setArmed] = useState(animateEnter);
  if (!armed && open !== initialOpen) setArmed(true);
  return armed ? presence : { ...presence, state: undefined };
}
