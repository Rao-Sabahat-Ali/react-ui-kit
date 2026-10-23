import { compareValues, isEmptyValue } from '../../utils/compare';
import { getByPath } from '../../utils/object';

export interface SortMeta {
  field: string;
  order: 1 | -1;
}

export interface SortableColumn<T> {
  field?: string;
  id?: string;
  sortFn?: (a: T, b: T) => number;
}

/** Stable multi-column sort. Empty values always sort last regardless of direction. */
export function sortRows<T>(rows: T[], sort: SortMeta[], columns: SortableColumn<T>[], locale?: string): T[] {
  if (sort.length === 0) return rows;
  const byKey = new Map(columns.map((c) => [c.id ?? c.field, c]));
  return rows
    .map((row, index) => ({ row, index }))
    .sort((a, b) => {
      for (const { field, order } of sort) {
        const column = byKey.get(field);
        if (column?.sortFn) {
          const result = column.sortFn(a.row, b.row);
          if (result !== 0) return result * order;
          continue;
        }
        const path = column?.field ?? field;
        const va = getByPath(a.row, path);
        const vb = getByPath(b.row, path);
        const ea = isEmptyValue(va);
        const eb = isEmptyValue(vb);
        if (ea || eb) {
          if (ea && eb) continue;
          return ea ? 1 : -1;
        }
        const result = compareValues(va, vb, locale);
        if (result !== 0) return result * order;
      }
      return a.index - b.index;
    })
    .map((entry) => entry.row);
}

/** none → asc → desc → none, for single or (with additive) multiple sort. */
export function nextSort(current: SortMeta[], field: string, additive: boolean): SortMeta[] {
  const existing = current.find((s) => s.field === field);
  const cycled: SortMeta | null = !existing ? { field, order: 1 } : existing.order === 1 ? { field, order: -1 } : null;
  if (!additive) return cycled ? [cycled] : [];
  const others = current.filter((s) => s.field !== field);
  if (!cycled) return others;
  return existing ? current.map((s) => (s.field === field ? cycled : s)) : [...others, cycled];
}
