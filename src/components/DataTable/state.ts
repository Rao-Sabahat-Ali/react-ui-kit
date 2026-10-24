import type { SortMeta } from './sort';
import type { FilterMeta, MatchMode, RowKey } from './types';

export const STATE_VERSION = 1;

export interface PersistedState {
  sort?: SortMeta[];
  filters?: FilterMeta;
  globalFilter?: string;
  page?: number;
  pageSize?: number;
  columnOrder?: string[];
  columnWidths?: Record<string, number>;
  hiddenColumns?: string[];
  expandedRows?: RowKey[];
}

type StorageKind = 'local' | 'session';

function getStorage(kind: StorageKind): Storage | null {
  try {
    if (typeof window === 'undefined') return null;
    return kind === 'local' ? window.localStorage : window.sessionStorage;
  } catch {
    return null;
  }
}

const DATE_TAG = '$date';
const MATCH_MODES = new Set<MatchMode>(['contains', 'startsWith', 'endsWith', 'equals', 'notEquals', 'lt', 'lte', 'gt', 'gte', 'between', 'dateIs', 'dateIsNot', 'dateBefore', 'dateAfter', 'in']);

const isRecord = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v);
const isKey = (v: unknown): v is RowKey => typeof v === 'string' || (typeof v === 'number' && Number.isFinite(v));
const isCount = (v: unknown): v is number => typeof v === 'number' && Number.isInteger(v) && v >= 0;

function reviveDates(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(reviveDates);
  if (isRecord(value) && typeof value[DATE_TAG] === 'string' && Object.keys(value).length === 1) {
    const d = new Date(value[DATE_TAG]);
    return Number.isNaN(d.getTime()) ? null : d;
  }
  return value;
}

/** Validate untrusted stored JSON field by field; anything malformed or for unknown columns is dropped. */
export function validateState(raw: unknown, columnIds: string[]): PersistedState {
  if (!isRecord(raw) || raw.v !== STATE_VERSION) return {};
  const ids = new Set(columnIds);
  const out: PersistedState = {};
  if (Array.isArray(raw.sort)) {
    out.sort = raw.sort
      .filter((s): s is SortMeta => isRecord(s) && typeof s.field === 'string' && ids.has(s.field) && (s.order === 1 || s.order === -1))
      .map((s) => ({ field: s.field, order: s.order }));
  }
  if (isRecord(raw.filters)) {
    const filters: FilterMeta = {};
    for (const [id, c] of Object.entries(raw.filters)) {
      if (ids.has(id) && isRecord(c) && typeof c.matchMode === 'string' && MATCH_MODES.has(c.matchMode as MatchMode)) {
        filters[id] = { matchMode: c.matchMode as MatchMode, value: reviveDates(c.value) };
      }
    }
    out.filters = filters;
  }
  if (typeof raw.globalFilter === 'string') out.globalFilter = raw.globalFilter;
  if (isCount(raw.page)) out.page = raw.page;
  if (isCount(raw.pageSize) && raw.pageSize > 0) out.pageSize = raw.pageSize;
  if (Array.isArray(raw.columnOrder) && raw.columnOrder.every((id) => typeof id === 'string')) {
    out.columnOrder = (raw.columnOrder as string[]).filter((id) => ids.has(id));
  }
  if (isRecord(raw.columnWidths)) {
    const widths: Record<string, number> = {};
    for (const [id, w] of Object.entries(raw.columnWidths)) if (ids.has(id) && typeof w === 'number' && Number.isFinite(w) && w > 0) widths[id] = w;
    out.columnWidths = widths;
  }
  if (Array.isArray(raw.hiddenColumns) && raw.hiddenColumns.every((id) => typeof id === 'string')) {
    out.hiddenColumns = (raw.hiddenColumns as string[]).filter((id) => ids.has(id));
  }
  if (Array.isArray(raw.expandedRows) && raw.expandedRows.every(isKey)) out.expandedRows = raw.expandedRows as RowKey[];
  return out;
}

export function readState(key: string, kind: StorageKind, columnIds: string[]): PersistedState {
  try {
    const text = getStorage(kind)?.getItem(key);
    if (!text) return {};
    return validateState(JSON.parse(text), columnIds);
  } catch {
    return {};
  }
}

export function serializeState(state: PersistedState): string {
  return JSON.stringify({ v: STATE_VERSION, ...state }, function replacer(this: Record<string, unknown>, k: string, v: unknown) {
    const original = this[k];
    return original instanceof Date ? { [DATE_TAG]: original.toISOString() } : v;
  });
}

export function writeState(key: string, kind: StorageKind, serialized: string): void {
  try {
    getStorage(kind)?.setItem(key, serialized);
  } catch {
    // Quota exceeded or storage disabled: persistence is best effort.
  }
}

export function removeState(key: string, kind: StorageKind): void {
  try {
    getStorage(kind)?.removeItem(key);
  } catch {
    // ignore
  }
}
