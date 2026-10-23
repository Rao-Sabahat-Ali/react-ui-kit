import { getByPath } from '../../utils/object';

export type ListKey = string | number;
export type MoveAction = 'up' | 'down' | 'top' | 'bottom';

export function makeKeyOf<T>(dataKey: string | undefined) {
  return (item: T, index = 0): ListKey => {
    if (item !== null && typeof item === 'object') {
      const key = getByPath(item, dataKey ?? 'id');
      return (key as ListKey | undefined) ?? index;
    }
    return item as unknown as ListKey;
  };
}

export function makeLabelOf<T>(itemLabel?: (item: T) => string) {
  return (item: T): string => {
    if (itemLabel) return itemLabel(item);
    if (item !== null && typeof item === 'object') {
      const record = item as Record<string, unknown>;
      for (const field of ['label', 'name', 'title']) if (typeof record[field] === 'string') return record[field] as string;
      return '';
    }
    return String(item);
  };
}

/** Move the items at `selected` indexes. Blocks stay contiguous and stop at the list edge. */
export function moveSelected<T>(items: T[], selected: Set<number>, action: MoveAction): T[] {
  const next = [...items];
  const sel = new Set(selected);
  const n = next.length;
  if (action === 'up') {
    for (let i = 1; i < n; i++) {
      if (sel.has(i) && !sel.has(i - 1)) {
        [next[i - 1], next[i]] = [next[i]!, next[i - 1]!];
        sel.delete(i);
        sel.add(i - 1);
      }
    }
    return next;
  }
  if (action === 'down') {
    for (let i = n - 2; i >= 0; i--) {
      if (sel.has(i) && !sel.has(i + 1)) {
        [next[i + 1], next[i]] = [next[i]!, next[i + 1]!];
        sel.delete(i);
        sel.add(i + 1);
      }
    }
    return next;
  }
  const picked = items.filter((_, i) => selected.has(i));
  const rest = items.filter((_, i) => !selected.has(i));
  return action === 'top' ? [...picked, ...rest] : [...rest, ...picked];
}

/** Move one item from `from` to `to` (index in the resulting list). */
export function moveItem<T>(items: T[], from: number, to: number): T[] {
  if (from === to || from < 0 || to < 0 || from >= items.length || to >= items.length) return items;
  const next = [...items];
  const [moved] = next.splice(from, 1);
  next.splice(to, 0, moved!);
  return next;
}
