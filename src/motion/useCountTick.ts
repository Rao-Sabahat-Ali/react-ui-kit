import { useEffect, useState } from 'react';
import { isDocumentHidden } from './env';
import { MOTION } from './tokens';
import { useReducedMotion } from './useReducedMotion';

export interface TickChar {
  /** The character now shown in this column. */
  char: string;
  /** The character it replaces while rolling; `null` when this column is at rest. */
  prev: string | null;
}

export interface CountTick {
  /** One entry per displayed character, aligned from the right (units stay under units). */
  chars: TickChar[];
  /** `1` when the count went up, `-1` when it went down, `0` at rest or for non-numeric text. */
  direction: 1 | -1 | 0;
  /** True while a roll is in flight. */
  ticking: boolean;
}

const toNumber = (text: string): number => parseFloat(text.replace(/[^\d.-]/g, ''));

/**
 * Diff the previous and next formatted text of a changing count into per-column rolls (motion "Tick"). Only the
 * columns whose character changed roll; the rest stay put. Under reduced motion, in a hidden tab, or when
 * `animate` is false the result has no rolling columns, so the new value appears at once.
 */
export function useCountTick(text: string, { animate = true, durationMs = MOTION.part }: { animate?: boolean; durationMs?: number } = {}): CountTick {
  const reduced = useReducedMotion();
  const [state, setState] = useState<{ text: string; prev: string | null }>({ text, prev: null });

  // Derived state: a new text starts a roll from the old one in the same render.
  if (state.text !== text) setState({ text, prev: state.text });

  const rolling = state.prev !== null && animate && !reduced && !isDocumentHidden();

  useEffect(() => {
    if (state.prev === null) return;
    const timer = window.setTimeout(() => setState((s) => (s.text === text ? { text, prev: null } : s)), rolling ? durationMs + 40 : 0);
    return () => window.clearTimeout(timer);
  }, [state.prev, text, rolling, durationMs]);

  const current = state.text === text ? state.text : text;
  if (!rolling || state.prev === null) {
    return { chars: Array.from(current, (char) => ({ char, prev: null })), direction: 0, ticking: false };
  }
  const before = Array.from(state.prev);
  const after = Array.from(current);
  const chars = after.map((char, i) => {
    const old = before[before.length - after.length + i];
    return { char, prev: old !== undefined && old !== char ? old : old === undefined ? ' ' : null };
  });
  const a = toNumber(state.prev);
  const b = toNumber(current);
  const direction = Number.isFinite(a) && Number.isFinite(b) && a !== b ? (b > a ? 1 : -1) : 1;
  return { chars, direction, ticking: chars.some((c) => c.prev !== null) };
}
