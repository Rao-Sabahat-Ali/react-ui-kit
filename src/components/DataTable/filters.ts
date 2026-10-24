import { startOfDay } from '../../utils/date';
import { getByPath } from '../../utils/object';
import type { Column, FilterConstraint, FilterMeta, FilterType, MatchMode } from './types';

/** Allowed match modes per filter type; the first one is the default. */
export const MATCH_MODES: Record<FilterType, MatchMode[]> = {
  text: ['contains', 'startsWith', 'endsWith', 'equals', 'notEquals'],
  number: ['equals', 'notEquals', 'lt', 'lte', 'gt', 'gte', 'between'],
  date: ['dateIs', 'dateIsNot', 'dateBefore', 'dateAfter', 'between'],
  select: ['in', 'equals'],
};

export const columnId = <T>(c: Pick<Column<T>, 'id' | 'field'>, index: number): string => c.id ?? c.field ?? String(index);

export function matchModesOf<T>(column: Column<T>): MatchMode[] {
  return column.filterMatchModes?.length ? column.filterMatchModes : MATCH_MODES[column.filterType ?? 'text'];
}

export const defaultMatchMode = <T>(column: Column<T>): MatchMode => matchModesOf(column)[0]!;

const toNumber = (v: unknown): number | null => {
  if (typeof v === 'number') return Number.isFinite(v) ? v : null;
  if (typeof v === 'string' && v.trim() !== '') {
    const n = Number(v);
    return Number.isFinite(n) ? n : null;
  }
  return null;
};

const toDate = (v: unknown): Date | null => {
  if (v instanceof Date) return Number.isNaN(v.getTime()) ? null : v;
  if (typeof v === 'string' || typeof v === 'number') {
    const d = new Date(v);
    return Number.isNaN(d.getTime()) ? null : d;
  }
  return null;
};

const dayOf = (d: Date) => startOfDay(d).getTime();

/** Whether a constraint actually restricts rows (empty / unparsable values are ignored). */
export function isFilterActive(constraint: FilterConstraint | undefined, type: FilterType = 'text'): boolean {
  if (!constraint) return false;
  const { value, matchMode } = constraint;
  if (value === null || value === undefined || value === '') return false;
  if (matchMode === 'in') return Array.isArray(value) && value.length > 0;
  if (matchMode === 'between') {
    if (!Array.isArray(value)) return false;
    const parse = type === 'date' ? toDate : toNumber;
    return value.some((v) => parse(v) !== null);
  }
  if (type === 'number') return toNumber(value) !== null;
  if (type === 'date') return toDate(value) !== null;
  return true;
}

/** Built-in predicate for one cell value. Assumes `isFilterActive`. */
export function matchValue(cell: unknown, constraint: FilterConstraint, type: FilterType, locale?: string): boolean {
  const { matchMode, value } = constraint;
  if (type === 'number') {
    const n = toNumber(cell);
    if (matchMode === 'between') {
      const [lo, hi] = (value as unknown[]).map(toNumber);
      if (n === null) return false;
      return (lo === null || lo === undefined || n >= lo) && (hi === null || hi === undefined || n <= hi);
    }
    const f = toNumber(value)!;
    if (matchMode === 'notEquals') return n !== f;
    if (n === null) return false;
    switch (matchMode) {
      case 'equals':
        return n === f;
      case 'lt':
        return n < f;
      case 'lte':
        return n <= f;
      case 'gt':
        return n > f;
      case 'gte':
        return n >= f;
      default:
        return true;
    }
  }
  if (type === 'date') {
    const d = toDate(cell);
    if (matchMode === 'between') {
      const [from, to] = (value as unknown[]).map(toDate);
      if (!d) return false;
      return (!from || dayOf(d) >= dayOf(from)) && (!to || dayOf(d) <= dayOf(to));
    }
    const f = dayOf(toDate(value)!);
    if (matchMode === 'dateIsNot') return !d || dayOf(d) !== f;
    if (!d) return false;
    if (matchMode === 'dateBefore') return dayOf(d) < f;
    if (matchMode === 'dateAfter') return dayOf(d) > f;
    return dayOf(d) === f;
  }
  if (matchMode === 'in') return (value as unknown[]).some((v) => looseEqual(cell, v));
  if (type === 'select' && (matchMode === 'equals' || matchMode === 'notEquals')) return looseEqual(cell, value) === (matchMode === 'equals');

  const text = cell === null || cell === undefined ? '' : String(cell).toLocaleLowerCase(locale);
  const needle = String(value).toLocaleLowerCase(locale);
  switch (matchMode) {
    case 'startsWith':
      return text.startsWith(needle);
    case 'endsWith':
      return text.endsWith(needle);
    case 'equals':
      return text === needle;
    case 'notEquals':
      return text !== needle;
    default:
      return text.includes(needle);
  }
}

function looseEqual(a: unknown, b: unknown): boolean {
  if (a instanceof Date && b instanceof Date) return a.getTime() === b.getTime();
  return a === b || (a !== null && a !== undefined && b !== null && b !== undefined && String(a) === String(b));
}

const collators = new Map<string, Intl.Collator>();
function baseCollator(locale?: string): Intl.Collator {
  const key = locale ?? '';
  let c = collators.get(key);
  if (!c) {
    c = new Intl.Collator(locale, { sensitivity: 'base', usage: 'search' });
    collators.set(key, c);
  }
  return c;
}

/** Case- and accent-insensitive substring test (Intl.Collator, sensitivity `base`). */
export function containsBase(haystack: string, needle: string, locale?: string): boolean {
  if (needle === '') return true;
  const hay = haystack.normalize('NFC');
  const ndl = needle.normalize('NFC');
  if (hay.toLocaleLowerCase(locale).includes(ndl.toLocaleLowerCase(locale))) return true;
  const collator = baseCollator(locale);
  for (let i = 0; i + ndl.length <= hay.length; i++) {
    if (collator.compare(hay.slice(i, i + ndl.length), ndl) === 0) return true;
  }
  return false;
}

export interface FilterRowsOptions<T> {
  filters: FilterMeta;
  columns: Column<T>[];
  globalFilter: string;
  globalFilterFields?: string[];
  locale?: string;
}

/** Fields searched by the global filter: explicit list, else filterable fields, else every field. */
export function globalFields<T>(columns: Column<T>[], explicit?: string[]): string[] {
  if (explicit) return explicit;
  const filterable = columns.filter((c) => c.filterable && c.field).map((c) => c.field!);
  return filterable.length > 0 ? filterable : columns.filter((c) => c.field).map((c) => c.field!);
}

/** Column filters (AND) combined with the global filter (AND). */
export function filterRows<T>(rows: T[], { filters, columns, globalFilter, globalFilterFields, locale }: FilterRowsOptions<T>): T[] {
  const active = columns
    .map((column, index) => ({ column, constraint: filters[columnId(column, index)] }))
    .filter(({ column, constraint }) => (column.filterFn ? constraint !== undefined && constraint.value !== undefined : isFilterActive(constraint, column.filterType)));
  const query = globalFilter.trim();
  const fields = query ? globalFields(columns, globalFilterFields) : [];
  if (active.length === 0 && !query) return rows;
  return rows.filter((row) => {
    for (const { column, constraint } of active) {
      const cell = column.field ? getByPath(row, column.field) : undefined;
      const ok = column.filterFn ? column.filterFn(cell, constraint!.value, row) : matchValue(cell, constraint!, column.filterType ?? 'text', locale);
      if (!ok) return false;
    }
    if (query) {
      return fields.some((field) => {
        const v = getByPath(row, field);
        if (v === null || v === undefined) return false;
        return containsBase(v instanceof Date ? v.toLocaleDateString(locale) : String(v), query, locale);
      });
    }
    return true;
  });
}
