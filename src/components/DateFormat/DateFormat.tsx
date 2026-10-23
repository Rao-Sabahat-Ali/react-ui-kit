import { useEffect, useState, type HTMLAttributes, type ReactNode, type Ref } from 'react';
import { useLocale } from '../../locale/LocaleProvider';
import { cx } from '../../utils/cx';

type Style = 'full' | 'long' | 'medium' | 'short';
export type DateFormatKind = 'date' | 'time' | 'datetime' | 'relative' | 'auto';
export type DateInput = Date | string | number | null | undefined;

const SECOND = 1000;
const MINUTE = 60 * SECOND;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;
const MONTH = 30.4375 * DAY;
const YEAR = 365.25 * DAY;

/** Coerce a Date, ISO string or epoch ms to a valid Date, otherwise null. */
export function toDate(value: DateInput): Date | null {
  if (value === null || value === undefined || value === '') return null;
  const d = value instanceof Date ? value : new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}

const dtfCache = new Map<string, Intl.DateTimeFormat>();
function getDtf(locale: string, options: Intl.DateTimeFormatOptions): Intl.DateTimeFormat {
  const key = `${locale}|${JSON.stringify(options, Object.keys(options).sort())}`;
  let f = dtfCache.get(key);
  if (!f) {
    f = new Intl.DateTimeFormat(locale, options);
    dtfCache.set(key, f);
  }
  return f;
}

export interface FormatDateOptions {
  format?: 'date' | 'time' | 'datetime';
  dateStyle?: Style;
  timeStyle?: Style;
  options?: Intl.DateTimeFormatOptions;
  timeZone?: string;
  locale?: string;
}

export function formatDate(value: DateInput, { format = 'date', dateStyle = 'medium', timeStyle = 'short', options, timeZone, locale = 'en' }: FormatDateOptions = {}): string {
  const d = toDate(value);
  if (!d) return '';
  const base: Intl.DateTimeFormatOptions = options ?? {
    ...(format !== 'time' ? { dateStyle } : {}),
    ...(format !== 'date' ? { timeStyle } : {}),
  };
  return getDtf(locale, { ...base, ...(timeZone ? { timeZone } : {}) }).format(d);
}

export interface FormatRelativeOptions {
  locale?: string;
  numeric?: 'always' | 'auto';
  /** Use weeks for 7–26 days (default off). */
  weeks?: boolean;
}

const rtfCache = new Map<string, Intl.RelativeTimeFormat>();

export function formatRelative(value: DateInput, now: Date | number = Date.now(), { locale = 'en', numeric = 'auto', weeks = false }: FormatRelativeOptions = {}): string {
  const d = toDate(value);
  if (!d) return '';
  const diff = d.getTime() - (typeof now === 'number' ? now : now.getTime());
  const abs = Math.abs(diff);
  let unit: Intl.RelativeTimeFormatUnit;
  let amount: number;
  if (abs < 45 * SECOND) [unit, amount] = ['second', diff / SECOND];
  else if (abs < 45 * MINUTE) [unit, amount] = ['minute', diff / MINUTE];
  else if (abs < 22 * HOUR) [unit, amount] = ['hour', diff / HOUR];
  else if (abs < 26 * DAY) [unit, amount] = weeks && abs >= 7 * DAY ? ['week', diff / (7 * DAY)] : ['day', diff / DAY];
  else if (abs < 11 * MONTH) [unit, amount] = ['month', diff / MONTH];
  else [unit, amount] = ['year', diff / YEAR];
  const key = `${locale}|${numeric}`;
  let rtf = rtfCache.get(key);
  if (!rtf) {
    rtf = new Intl.RelativeTimeFormat(locale, { numeric });
    rtfCache.set(key, rtf);
  }
  const rounded = Math.round(amount);
  return rtf.format(rounded === 0 ? 0 : rounded, unit);
}

export interface DateFormatProps extends Omit<HTMLAttributes<HTMLTimeElement>, 'title'> {
  value: DateInput;
  format?: DateFormatKind;
  dateStyle?: Style;
  timeStyle?: Style;
  options?: Intl.DateTimeFormatOptions;
  timeZone?: string;
  locale?: string;
  now?: Date | number;
  relativeThreshold?: number;
  numeric?: 'always' | 'auto';
  live?: boolean | number;
  title?: boolean | string;
  fallback?: ReactNode;
  weeks?: boolean;
  muted?: boolean;
  ref?: Ref<HTMLTimeElement>;
}

function adaptiveInterval(diff: number): number {
  const abs = Math.abs(diff);
  return abs < MINUTE ? SECOND : abs < HOUR ? 30 * SECOND : 5 * MINUTE;
}

export function DateFormat({
  value,
  format = 'date',
  dateStyle,
  timeStyle,
  options,
  timeZone,
  locale,
  now,
  relativeThreshold = 7 * DAY,
  numeric = 'auto',
  live = false,
  title = true,
  fallback = '—',
  weeks,
  muted = false,
  className,
  ref,
  ...rest
}: DateFormatProps) {
  const ctx = useLocale().locale;
  const loc = locale ?? ctx;
  const [, setTick] = useState(0);
  const date = toDate(value);

  const nowMs = now === undefined ? Date.now() : typeof now === 'number' ? now : now.getTime();
  const diff = date ? date.getTime() - nowMs : 0;
  const isRelative = format === 'relative' || (format === 'auto' && Math.abs(diff) < relativeThreshold);
  const period = live === false ? 0 : live === true ? adaptiveInterval(diff) : live;

  useEffect(() => {
    if (!period || !isRelative || !date) return;
    const id = setInterval(() => setTick((n) => n + 1), period);
    return () => clearInterval(id);
  }, [period, isRelative, date]);

  if (!date) return <span className={cx('ui-date-format ui-date-format--empty', className)}>{fallback}</span>;

  const text = isRelative
    ? formatRelative(date, nowMs, { locale: loc, numeric, weeks })
    : formatDate(date, { format: format === 'time' || format === 'datetime' ? format : 'date', dateStyle, timeStyle, options, timeZone, locale: loc });
  const titleText = typeof title === 'string' ? title : title ? formatDate(date, { options: { dateStyle: 'full', timeStyle: 'long' }, timeZone, locale: loc }) : undefined;

  return (
    <time ref={ref} dateTime={date.toISOString()} title={titleText} className={cx('ui-date-format', isRelative && 'ui-date-format--relative', muted && 'ui-date-format--muted', className)} {...rest}>
      {text}
    </time>
  );
}
