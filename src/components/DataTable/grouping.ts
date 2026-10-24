import { getByPath } from '../../utils/object';
import type { SortMeta } from './sort';

export interface RowGroup<T> {
  key: string;
  value: unknown;
  rows: T[];
}

const groupKey = (v: unknown) => (v instanceof Date ? v.toISOString() : v === null || v === undefined ? '' : String(v));

/** Consecutive rows sharing the `field` value (rows are sorted by the group field first). */
export function groupRows<T>(rows: T[], field: string): RowGroup<T>[] {
  const groups: RowGroup<T>[] = [];
  for (const row of rows) {
    const value = getByPath(row, field);
    const key = groupKey(value);
    const last = groups[groups.length - 1];
    if (last && last.key === key) last.rows.push(row);
    else groups.push({ key, value, rows: [row] });
  }
  return groups;
}

/** Keeps the group field as the primary sort key (its direction follows an explicit sort on it). */
export function groupedSort(sort: SortMeta[], field: string): SortMeta[] {
  const own = sort.find((s) => s.field === field);
  return [{ field, order: own?.order ?? 1 }, ...sort.filter((s) => s.field !== field)];
}
