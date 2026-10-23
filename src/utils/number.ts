/** Locale-aware number parsing/formatting helpers (Intl only). */
export function separators(locale: string): { group: string; decimal: string } {
  const parts = new Intl.NumberFormat(locale).formatToParts(12345.6);
  return { group: parts.find((p) => p.type === 'group')?.value ?? ',', decimal: parts.find((p) => p.type === 'decimal')?.value ?? '.' };
}

/** Parse user input like "1 234,5" (sv) or "1,234.5" (en). Returns null for empty/invalid. */
export function parseNumber(text: string, locale: string): number | null {
  const { group, decimal } = separators(locale);
  let t = text.trim().replace(/[\s\u00a0\u202f]/g, '');
  if (!t) return null;
  if (group.trim()) t = t.split(group).join('');
  t = t.replace(decimal, '.').replace(/[^\d.\-+eE]/g, '');
  if (!t || t === '-' || t === '.') return null;
  const n = Number(t);
  return Number.isFinite(n) ? n : null;
}

/** Round away binary float noise from stepping (0.1 + 0.2 → 0.3). */
export function roundToStep(value: number, step: number): number {
  const decimals = (String(step).split('.')[1] ?? '').length;
  return Number(value.toFixed(decimals));
}

export const clamp = (n: number, min = -Infinity, max = Infinity) => Math.min(Math.max(n, min), max);
