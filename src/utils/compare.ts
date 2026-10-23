const collators = new Map<string, Intl.Collator>();

function collator(locale?: string): Intl.Collator {
  const key = locale ?? '';
  let c = collators.get(key);
  if (!c) {
    c = new Intl.Collator(locale, { numeric: true, sensitivity: 'base' });
    collators.set(key, c);
  }
  return c;
}

/**
 * Compare two cell values for sorting: numbers numerically, dates by time,
 * strings with locale-aware numeric collation, null/undefined always last
 * (regardless of direction — callers apply direction before calling isEmpty checks).
 */
export function compareValues(a: unknown, b: unknown, locale?: string): number {
  if (typeof a === 'number' && typeof b === 'number') return a - b;
  if (a instanceof Date && b instanceof Date) return a.getTime() - b.getTime();
  if (typeof a === 'boolean' && typeof b === 'boolean') return Number(a) - Number(b);
  return collator(locale).compare(String(a), String(b));
}

export const isEmptyValue = (v: unknown): boolean => v === null || v === undefined || v === '';
