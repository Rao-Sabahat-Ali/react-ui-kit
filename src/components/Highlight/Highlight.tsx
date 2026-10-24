import { Fragment, useMemo, type HTMLAttributes, type ReactNode, type Ref } from 'react';
import { cx } from '../../utils/cx';

export interface HighlightProps extends Omit<HTMLAttributes<HTMLSpanElement>, 'children'> {
  /** The text. Always rendered as text, never as HTML. */
  children: string;
  /** One or more search terms; empty ones are ignored. */
  query?: string | string[];
  caseSensitive?: boolean;
  /** When false (default) `cafe` matches `café`. */
  diacriticSensitive?: boolean;
  wholeWord?: boolean;
  /** Only the first `maxLength` characters are scanned. */
  maxLength?: number;
  /** Stops marking after this many matches. */
  maxMatches?: number;
  ref?: Ref<HTMLSpanElement>;
}

const MAX_TERMS = 20;
const escapeRegExp = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

interface Folded {
  text: string;
  /** For each folded UTF-16 unit: where the source character starts and ends. */
  start: number[];
  end: number[];
}

function fold(source: string, caseSensitive: boolean, diacriticSensitive: boolean): Folded {
  let text = '';
  const start: number[] = [];
  const end: number[] = [];
  let index = 0;
  for (const ch of source) {
    let piece = ch;
    if (!diacriticSensitive) piece = piece.normalize('NFD').replace(/\p{M}/gu, '');
    if (!caseSensitive) piece = piece.toLowerCase();
    if (piece === '') {
      // A combining mark: it belongs to the previous character.
      if (end.length) end[end.length - 1] = index + ch.length;
    } else {
      for (let k = 0; k < piece.length; k++) {
        start.push(index);
        end.push(index + ch.length);
      }
      text += piece;
    }
    index += ch.length;
  }
  return { text, start, end };
}

/** Ranges [start, end) of the matches in the original string. */
export function findMatches(source: string, query: string | string[] | undefined, { caseSensitive = false, diacriticSensitive = false, wholeWord = false, maxLength = 10000, maxMatches = 500 } = {}): [number, number][] {
  const raw = (Array.isArray(query) ? query : [query ?? '']).map((t) => t.trim()).filter(Boolean);
  const terms = Array.from(new Set(raw.map((t) => fold(t, caseSensitive, diacriticSensitive).text).filter(Boolean)))
    .slice(0, MAX_TERMS)
    .sort((a, b) => b.length - a.length);
  if (terms.length === 0 || !source) return [];
  const scanned = fold(source.slice(0, Math.max(0, maxLength)), caseSensitive, diacriticSensitive);
  const body = terms.map(escapeRegExp).join('|');
  const pattern = wholeWord ? `(?<![\\p{L}\\p{N}_])(?:${body})(?![\\p{L}\\p{N}_])` : body;
  const regex = new RegExp(pattern, 'gu');
  const ranges: [number, number][] = [];
  let count = 0;
  for (const m of scanned.text.matchAll(regex)) {
    if (count++ >= maxMatches) break;
    const from = scanned.start[m.index]!;
    const to = scanned.end[m.index + m[0].length - 1]!;
    const last = ranges[ranges.length - 1];
    if (last && from <= last[1]) last[1] = Math.max(last[1], to);
    else ranges.push([from, to]);
  }
  return ranges;
}

export function Highlight({ children, query, caseSensitive = false, diacriticSensitive = false, wholeWord = false, maxLength = 10000, maxMatches = 500, className, ref, ...rest }: HighlightProps) {
  const text = typeof children === 'string' ? children : String(children ?? '');
  const queryKey = Array.isArray(query) ? query.join('\u0000') : (query ?? '');
  const ranges = useMemo(
    () => findMatches(text, queryKey.split('\u0000'), { caseSensitive, diacriticSensitive, wholeWord, maxLength, maxMatches }),
    [text, queryKey, caseSensitive, diacriticSensitive, wholeWord, maxLength, maxMatches],
  );

  const parts: ReactNode[] = [];
  let cursor = 0;
  ranges.forEach(([from, to], i) => {
    if (from > cursor) parts.push(<Fragment key={`t${i}`}>{text.slice(cursor, from)}</Fragment>);
    parts.push(
      <mark key={`m${i}`} className="ui-highlight__mark">
        {text.slice(from, to)}
      </mark>,
    );
    cursor = to;
  });
  if (cursor < text.length) parts.push(<Fragment key="rest">{text.slice(cursor)}</Fragment>);

  return (
    <span ref={ref} className={cx('ui-highlight', className)} {...rest}>
      {ranges.length === 0 ? text : parts}
    </span>
  );
}
