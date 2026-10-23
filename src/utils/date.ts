/**
 * Calendar maths on local dates (no date library). Dates are treated as local calendar days;
 * time-of-day is preserved only where documented.
 */
export const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate());
export const addDays = (d: Date, n: number) => new Date(d.getFullYear(), d.getMonth(), d.getDate() + n, d.getHours(), d.getMinutes(), d.getSeconds());
export const daysInMonth = (year: number, month: number) => new Date(year, month + 1, 0).getDate();

/** Add months, clamping the day (31 Jan + 1 month → 28/29 Feb). */
export function addMonths(d: Date, n: number): Date {
  const target = new Date(d.getFullYear(), d.getMonth() + n, 1, d.getHours(), d.getMinutes(), d.getSeconds());
  target.setDate(Math.min(d.getDate(), daysInMonth(target.getFullYear(), target.getMonth())));
  return target;
}

export const addYears = (d: Date, n: number) => addMonths(d, n * 12);
export const isSameDay = (a: Date | null | undefined, b: Date | null | undefined) =>
  Boolean(a && b && a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate());
export const isSameMonth = (a: Date, b: Date) => a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth();
export const compareDays = (a: Date, b: Date) => startOfDay(a).getTime() - startOfDay(b).getTime();
export const isBetween = (d: Date, from: Date, to: Date) => compareDays(d, from) >= 0 && compareDays(d, to) <= 0;

/** First day of week for a locale (0 = Sunday … 6 = Saturday), via Intl.Locale weekInfo when available. */
export function firstDayOfWeek(locale: string): number {
  try {
    const info = (new Intl.Locale(locale) as Intl.Locale & { weekInfo?: { firstDay: number }; getWeekInfo?: () => { firstDay: number } });
    const firstDay = info.getWeekInfo?.().firstDay ?? info.weekInfo?.firstDay;
    if (firstDay) return firstDay % 7;
  } catch {
    // fall through
  }
  return /^en-(US|CA)|^(ja|ko|zh|he|ar|pt-BR)/.test(locale) ? 0 : 1;
}

export const startOfWeek = (d: Date, firstDay: number) => addDays(startOfDay(d), -((d.getDay() - firstDay + 7) % 7));

/** 6×7 grid of days covering the month (stable height). */
export function monthGrid(year: number, month: number, firstDay: number): Date[] {
  const start = startOfWeek(new Date(year, month, 1), firstDay);
  return Array.from({ length: 42 }, (_, i) => addDays(start, i));
}

export function weekdayNames(locale: string, firstDay: number, format: 'narrow' | 'short' | 'long' = 'short'): string[] {
  const fmt = new Intl.DateTimeFormat(locale, { weekday: format });
  const sunday = new Date(2023, 0, 1); // a Sunday
  return Array.from({ length: 7 }, (_, i) => fmt.format(addDays(sunday, (firstDay + i) % 7)));
}

export function monthNames(locale: string, format: 'short' | 'long' = 'long'): string[] {
  const fmt = new Intl.DateTimeFormat(locale, { month: format });
  return Array.from({ length: 12 }, (_, m) => fmt.format(new Date(2023, m, 1)));
}

/** ISO calendar date (YYYY-MM-DD) in local time. */
export function toIsoDate(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

/**
 * Lenient parse of a typed date in the locale's short numeric order (e.g. 23/10/2026, 10/23/2026,
 * 2026-10-23). Returns null when invalid.
 */
export function parseDate(text: string, locale: string): Date | null {
  const t = text.trim();
  if (!t) return null;
  const iso = /^(\d{4})-(\d{1,2})-(\d{1,2})$/.exec(t);
  const parts = iso ? null : t.split(/[^\d]+/).filter(Boolean).map(Number);
  let y: number, m: number, d: number;
  if (iso) {
    [y, m, d] = [Number(iso[1]), Number(iso[2]), Number(iso[3])];
  } else {
    if (!parts || parts.length !== 3) return null;
    const order = new Intl.DateTimeFormat(locale, { year: 'numeric', month: '2-digit', day: '2-digit' })
      .formatToParts(new Date(2000, 10, 22))
      .filter((p) => p.type === 'year' || p.type === 'month' || p.type === 'day')
      .map((p) => p.type);
    const map: Record<string, number> = {};
    order.forEach((type, i) => (map[type] = parts[i]!));
    [y, m, d] = [map.year!, map.month!, map.day!];
    if (y < 100) y += 2000;
  }
  const date = new Date(y, m - 1, d);
  return date.getFullYear() === y && date.getMonth() === m - 1 && date.getDate() === d ? date : null;
}
