import type { Intent } from '../../types';
import { addDays, firstDayOfWeek, startOfDay } from '../../utils/date';

export interface SchedulerEvent {
  id: string;
  title: string;
  /** Inclusive start. ISO strings are parsed; date-only strings are calendar days. */
  start: Date | string;
  /** Exclusive end. */
  end: Date | string;
  allDay?: boolean;
  variant?: Intent;
  description?: string;
}

export interface NormalizedEvent {
  event: SchedulerEvent;
  /** Wall-clock start/end in the display time zone (local Date fields hold the wall time). */
  start: Date;
  end: Date;
  allDay: boolean;
  multiDay: boolean;
}

const formatters = new Map<string, Intl.DateTimeFormat>();

/** Convert an instant to a Date whose local fields are the wall-clock time in `timeZone`. */
export function toZoned(date: Date, timeZone: string | undefined): Date {
  if (!timeZone) return date;
  let fmt = formatters.get(timeZone);
  if (!fmt) {
    fmt = new Intl.DateTimeFormat('en-US', { timeZone, hourCycle: 'h23', year: 'numeric', month: 'numeric', day: 'numeric', hour: 'numeric', minute: 'numeric', second: 'numeric' });
    formatters.set(timeZone, fmt);
  }
  const p: Record<string, number> = {};
  for (const part of fmt.formatToParts(date)) if (part.type !== 'literal') p[part.type] = Number(part.value);
  return new Date(p.year!, p.month! - 1, p.day!, p.hour! % 24, p.minute!, p.second!);
}

const DATE_ONLY = /^(\d{4})-(\d{2})-(\d{2})$/;
const HAS_OFFSET = /(Z|[+-]\d{2}:?\d{2})$/i;

/** `wall` values are calendar/wall-clock times that must not be time-zone converted. */
function parseValue(value: Date | string): { date: Date; wall: boolean } {
  if (value instanceof Date) return { date: new Date(value.getTime()), wall: false };
  const dateOnly = DATE_ONLY.exec(value);
  if (dateOnly) return { date: new Date(Number(dateOnly[1]), Number(dateOnly[2]) - 1, Number(dateOnly[3])), wall: true };
  return { date: new Date(value), wall: !HAS_OFFSET.test(value) };
}

export function normalizeEvents(events: SchedulerEvent[], timeZone: string | undefined, onInvalid: (event: SchedulerEvent) => void): NormalizedEvent[] {
  const result: NormalizedEvent[] = [];
  for (const event of events) {
    const s = parseValue(event.start);
    const e = parseValue(event.end);
    if (isNaN(s.date.getTime()) || isNaN(e.date.getTime())) {
      onInvalid(event);
      continue;
    }
    const allDay = Boolean(event.allDay);
    let start = allDay || s.wall ? s.date : toZoned(s.date, timeZone);
    let end = allDay || e.wall ? e.date : toZoned(e.date, timeZone);
    if (allDay) start = startOfDay(start);
    if (end.getTime() <= start.getTime()) end = allDay ? addDays(startOfDay(start), 1) : new Date(start.getTime() + 60_000);
    const lastDay = startOfDay(new Date(end.getTime() - 1));
    result.push({ event, start, end, allDay, multiDay: lastDay.getTime() > startOfDay(start).getTime() });
  }
  return result;
}

export const dayStart = (d: Date) => startOfDay(d);
export const dayEnd = (d: Date) => addDays(startOfDay(d), 1);
export const overlapsDay = (e: NormalizedEvent, day: Date) => e.start.getTime() < dayEnd(day).getTime() && e.end.getTime() > dayStart(day).getTime();

export function sortDayEvents(list: NormalizedEvent[]): NormalizedEvent[] {
  return [...list].sort((a, b) => {
    const aw = a.allDay || a.multiDay ? 0 : 1;
    const bw = b.allDay || b.multiDay ? 0 : 1;
    return aw - bw || a.start.getTime() - b.start.getTime() || a.event.title.localeCompare(b.event.title);
  });
}

export interface Lane<T> {
  item: T;
  lane: number;
  lanes: number;
}

/** Side-by-side lanes for overlapping time ranges. */
export function assignLanes<T extends { start: Date; end: Date }>(items: T[]): Lane<T>[] {
  const sorted = [...items].sort((a, b) => a.start.getTime() - b.start.getTime() || b.end.getTime() - a.end.getTime());
  const out: Lane<T>[] = [];
  let cluster: Lane<T>[] = [];
  let laneEnds: number[] = [];
  let clusterEnd = -Infinity;
  const close = () => {
    for (const entry of cluster) entry.lanes = laneEnds.length;
    cluster = [];
    laneEnds = [];
  };
  for (const item of sorted) {
    if (item.start.getTime() >= clusterEnd) close();
    let lane = laneEnds.findIndex((end) => end <= item.start.getTime());
    if (lane === -1) lane = laneEnds.length;
    laneEnds[lane] = item.end.getTime();
    clusterEnd = Math.max(cluster.length ? clusterEnd : -Infinity, item.end.getTime());
    const entry: Lane<T> = { item, lane, lanes: 1 };
    cluster.push(entry);
    out.push(entry);
  }
  close();
  return out;
}

export function defaultFirstDay(locale: string): number {
  try {
    return firstDayOfWeek(new Intl.Locale(locale).maximize().toString());
  } catch {
    return firstDayOfWeek(locale);
  }
}

export const minutesOf = (d: Date) => d.getHours() * 60 + d.getMinutes();

export function parseIsoDay(value: string): Date {
  const [y, m, d] = value.split('-').map(Number);
  return new Date(y!, m! - 1, d!);
}
