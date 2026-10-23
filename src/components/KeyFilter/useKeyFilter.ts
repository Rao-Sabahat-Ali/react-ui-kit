import { useMemo, type ClipboardEvent, type KeyboardEvent } from 'react';
import { KEY_FILTER_PRESETS, type KeyFilterPattern } from './patterns';

type TextControl = HTMLInputElement | HTMLTextAreaElement;

export interface KeyFilterProps {
  onKeyDown: (event: KeyboardEvent<TextControl>) => void;
  onPaste: (event: ClipboardEvent<TextControl>) => void;
}

export interface UseKeyFilterResult {
  /** Spread onto the input; empty when no pattern is given. */
  props: Partial<KeyFilterProps>;
  /** Test one character. Always true without a pattern. */
  test: (char: string) => boolean;
  /** Remove disallowed characters from a string (used for pasted / programmatic input). */
  filter: (text: string) => string;
}

function toTester(pattern: KeyFilterPattern | undefined): ((char: string) => boolean) | undefined {
  if (!pattern) return undefined;
  const source = typeof pattern === 'string' ? KEY_FILTER_PRESETS[pattern] : pattern;
  // Drop global/sticky so `test` has no lastIndex state between characters.
  const regex = new RegExp(source.source, source.flags.replace(/[gy]/g, ''));
  return (char) => regex.test(char);
}

/**
 * Restrict characters typed or pasted into an input. Control keys, shortcuts and IME composition
 * are never blocked. Spec: key-filter.md.
 */
export function useKeyFilter(pattern: KeyFilterPattern | undefined): UseKeyFilterResult {
  return useMemo(() => {
    const test = toTester(pattern);
    if (!test) return { props: {}, test: () => true, filter: (text: string) => text };
    const filter = (text: string) => [...text].filter(test).join('');
    return {
      test,
      filter,
      props: {
        onKeyDown: (event) => {
          // Composition (IME): keyCode 229 / isComposing must never be blocked.
          if (event.nativeEvent.isComposing || event.keyCode === 229) return;
          if (event.ctrlKey || event.metaKey || event.altKey) return;
          // Named keys (Arrow*, Backspace, Tab, Enter, F-keys…) have multi-character `key` values.
          if (event.key.length !== 1) return;
          if (!test(event.key)) event.preventDefault();
        },
        onPaste: (event) => {
          const el = event.currentTarget;
          if (el.readOnly || el.disabled) return;
          const text = event.clipboardData.getData('text');
          const filtered = filter(text);
          if (filtered === text) return;
          event.preventDefault();
          if (!filtered) return;
          el.setRangeText(filtered, el.selectionStart ?? el.value.length, el.selectionEnd ?? el.value.length, 'end');
          el.dispatchEvent(new Event('input', { bubbles: true }));
        },
      },
    };
  }, [pattern]);
}
