import { useCallback, useRef } from 'react';

/** Accumulate printable keystrokes for 500 ms and find the first label starting with the buffer. */
export function useTypeahead<T>(items: T[], getLabel: (item: T) => string, isDisabled: (item: T) => boolean = () => false) {
  const state = useRef({ buffer: '', timer: 0 });
  return useCallback(
    (key: string, from = -1): number => {
      const s = state.current;
      window.clearTimeout(s.timer);
      s.buffer += key.toLowerCase();
      s.timer = window.setTimeout(() => (s.buffer = ''), 500);
      const n = items.length;
      // Repeating the same letter cycles through matches.
      const same = s.buffer.length > 1 && [...s.buffer].every((c) => c === s.buffer[0]);
      const needle = same ? s.buffer[0]! : s.buffer;
      for (let i = 1; i <= n; i++) {
        const idx = (from + i + n) % n;
        const item = items[idx]!;
        if (!isDisabled(item) && getLabel(item).toLowerCase().startsWith(needle)) return idx;
      }
      return -1;
    },
    [items, getLabel, isDisabled],
  );
}
