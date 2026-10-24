import {
  useEffect,
  useId,
  useImperativeHandle,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type DragEvent,
  type ElementType,
  type FocusEvent,
  type KeyboardEvent,
  type MouseEvent,
  type ReactNode,
  type SyntheticEvent,
} from 'react';
import { useControllableState } from '../../hooks/useControllableState';
import { useLocale } from '../../locale/LocaleProvider';
import { cx } from '../../utils/cx';
import { getByPath } from '../../utils/object';
import { Button } from '../Button/Button';
import { Checkbox } from '../Checkbox/Checkbox';
import { ContextMenu, type ContextMenuHandle } from '../ContextMenu/ContextMenu';
import { Icon } from '../Icon/Icon';
import { InputText } from '../InputText/InputText';
import type { MenuItem } from '../Menu/types';
import { Paginator } from '../Paginator/Paginator';
import { Skeleton } from '../Skeleton/Skeleton';
import { isRtl } from '../../utils/element';
import { VirtualScroller, type VirtualRange } from '../VirtualScroller/VirtualScroller';
import { CellEditor } from './CellEditor';
import { ColumnFilterMenu, ColumnFilterRow } from './ColumnFilter';
import { ColumnToggle } from './ColumnToggle';
import { downloadCsv, nodeText, toCsv } from './csv';
import { columnId, filterRows } from './filters';
import { cellAt, cellOf, firstInteractive, nextPosition, positionOf, syncRovingTabindex, visibleRowCount, type CellPosition } from './GridNavigation';
import { groupedSort, groupRows } from './grouping';
import { createMessages } from './messages';
import { ResizeHandle } from './ResizeHandle';
import { nextSort, sortRows, type SortMeta } from './sort';
import { readState, removeState, serializeState, writeState, type PersistedState } from './state';
import type { Column, DataTableMenuItem, DataTableProps, ExportCsvOptions, FilterConstraint, FilterMeta, LazyLoadEvent, RowKey, SelectionValue } from './types';
import { DEFAULT_MIN_WIDTH, useColumnResize } from './useColumnResize';
import { useDebouncedCallback } from './useDebouncedCallback';

export type { SortMeta } from './sort';
export type {
  CellEditCompleteEvent,
  CellEditorContext,
  Column,
  DataTableHandle,
  DataTableMenuItem,
  DataTableProps,
  ExportCsvOptions,
  FilterConstraint,
  FilterMeta,
  FilterType,
  LazyLoadEvent,
  MatchMode,
  RowKey,
  SelectionValue,
} from './types';

const ALIGN = { start: 'text-start', center: 'text-center', end: 'text-end' } as const;
/** Width of the selection / expander / row-editor utility columns (matches DataTable.scss). */
const UTILITY_WIDTH = '3rem';
const EMPTY_FILTERS: FilterMeta = {};
const EMPTY_IDS: string[] = [];
const EMPTY_KEYS: RowKey[] = [];
const NO_SORT: SortMeta[] = [];
const LAZY_DEBOUNCE_MS = 300;

interface Entry<T> {
  column: Column<T>;
  id: string;
  label: string;
}

const safeId = (key: RowKey) => String(key).replace(/[^\w-]/g, '_');
const cellKey = (key: RowKey, col: string) => `${String(key)}::${col}`;

function setByPath<T>(source: T, path: string, value: unknown): T {
  const [head, ...rest] = path.split('.');
  const base = (source ?? {}) as Record<string, unknown>;
  return { ...base, [head!]: rest.length ? setByPath(base[head!], rest.join('.'), value) : value } as T;
}

function wrapMenuItems<T>(items: DataTableMenuItem<T>[], row: T): MenuItem[] {
  return items.map((item) => {
    const { command, items: sub, ...restItem } = item;
    const wrapped: MenuItem = { ...restItem };
    if (sub) wrapped.items = wrapMenuItems(sub, row);
    if (command) wrapped.command = (e) => command({ ...e, row });
    return wrapped;
  });
}

export function DataTable<T>(props: DataTableProps<T>) {
  const {
    data,
    columns,
    dataKey = 'id',
    caption,
    captionHidden = false,
    id: idProp,
    sortMode = 'single',
    sort: sortProp,
    defaultSort = NO_SORT,
    onSortChange,
    paginator = false,
    page: pageProp,
    defaultPage = 0,
    pageSize: pageSizeProp,
    defaultPageSize = 25,
    pageSizeOptions,
    onPageChange,
    selectionMode = null,
    selection: selectionProp,
    defaultSelection = null,
    onSelectionChange,
    onRowClick,
    loading = false,
    loadingRows = 5,
    emptyMessage,
    striped = false,
    hover = true,
    bordered = false,
    size = 'md',
    stickyHeader = false,
    header,
    footer,
    rowClassName,
    className,
    filters: filtersProp,
    defaultFilters = EMPTY_FILTERS,
    onFilterChange,
    filterDisplay = 'menu',
    globalFilter: globalFilterProp,
    defaultGlobalFilter = '',
    onGlobalFilterChange,
    globalFilterFields,
    globalFilterInput = globalFilterFields !== undefined,
    lazy = false,
    onLazyLoad,
    totalRecords,
    resizableColumns = false,
    columnResizeMode = 'fit',
    onColumnResize,
    reorderableColumns = false,
    columnOrder: columnOrderProp,
    defaultColumnOrder = EMPTY_IDS,
    onColumnOrderChange,
    frozenFirstColumn = false,
    expandedRows: expandedProp,
    defaultExpandedRows = EMPTY_KEYS,
    onRowToggle,
    rowExpansionTemplate,
    hiddenColumns: hiddenProp,
    defaultHiddenColumns = EMPTY_IDS,
    onHiddenColumnsChange,
    columnToggle = false,
    exportFilename = 'export',
    stateKey,
    stateStorage = 'session',
    ref,
    editMode = null,
    onCellEditComplete,
    onCellEditCancel,
    onRowEditSave,
    onRowEditCancel,
    virtualScroll = false,
    scrollHeight,
    groupBy,
    groupHeaderTemplate,
    groupFooterTemplate,
    expandableGroups = false,
    cellNavigation = false,
    contextMenu,
    onContextMenu,
  } = props;

  const localeCtx = useLocale();
  const { t, locale } = localeCtx;
  const msg = useMemo(() => createMessages(localeCtx), [localeCtx]);
  const generatedId = useId();
  const baseId = idProp ?? `dt${generatedId.replace(/:/g, '')}`;
  const virtual = virtualScroll ? (typeof virtualScroll === 'object' ? virtualScroll : { itemSize: 40 }) : null;
  const isVirtual = Boolean(virtual);
  const paginate = paginator && !virtual;

  // ── Columns ────────────────────────────────────────────────────────────────
  const entries = useMemo<Entry<T>[]>(() => columns.map((column, index) => ({ column, id: columnId(column, index), label: nodeText(column.header) || columnId(column, index) })), [columns]);
  const allIds = entries.map((e) => e.id);

  // ── State (+ persistence) ──────────────────────────────────────────────────
  const [stored] = useState<PersistedState>(() => (stateKey ? readState(stateKey, stateStorage, allIds) : {}));
  const [sort, setSort] = useControllableState<SortMeta[]>(sortProp, stored.sort ?? defaultSort, onSortChange);
  const [page, setPage] = useControllableState<number>(pageProp, stored.page ?? defaultPage);
  const [pageSize, setPageSize] = useControllableState<number>(pageSizeProp, stored.pageSize ?? defaultPageSize);
  const [selection, setSelection] = useControllableState<SelectionValue>(selectionProp, defaultSelection, onSelectionChange);
  const [filters, setFilters] = useControllableState<FilterMeta>(filtersProp, stored.filters ?? defaultFilters, onFilterChange);
  const [globalFilter, setGlobalFilter] = useControllableState<string>(globalFilterProp, stored.globalFilter ?? defaultGlobalFilter, onGlobalFilterChange);
  const [columnOrder, setColumnOrder] = useControllableState<string[]>(columnOrderProp, stored.columnOrder ?? defaultColumnOrder, onColumnOrderChange);
  const [hidden, setHidden] = useControllableState<string[]>(hiddenProp, stored.hiddenColumns ?? defaultHiddenColumns, onHiddenColumnsChange);
  const [expanded, setExpanded] = useControllableState<RowKey[]>(expandedProp, stored.expandedRows ?? defaultExpandedRows, onRowToggle);
  const [widths, setWidths] = useState<Record<string, number>>(stored.columnWidths ?? {});

  const ordered = useMemo(() => {
    const byId = new Map(entries.map((e) => [e.id, e]));
    const seen = new Set<string>();
    const out: Entry<T>[] = [];
    for (const id of columnOrder) {
      const e = byId.get(id);
      if (e && !seen.has(id)) {
        out.push(e);
        seen.add(id);
      }
    }
    for (const e of entries) if (!seen.has(e.id)) out.push(e);
    return out;
  }, [entries, columnOrder]);
  const hiddenSet = new Set(hidden);
  let visible = ordered.filter((e) => !hiddenSet.has(e.id) || e.column.hideable === false);
  if (visible.length === 0 && ordered.length > 0) visible = [ordered[0]!];

  // ── Data pipeline ──────────────────────────────────────────────────────────
  const keyOf = (row: T): RowKey => (typeof dataKey === 'function' ? dataKey(row) : (getByPath(row, dataKey) as RowKey));
  const effectiveSort = useMemo(() => (groupBy ? groupedSort(sort, groupBy) : sort), [groupBy, sort]);
  const processed = useMemo(
    () => (lazy ? data : sortRows(filterRows(data, { filters, columns, globalFilter, globalFilterFields, locale }), effectiveSort, columns, locale)),
    [lazy, data, filters, columns, globalFilter, globalFilterFields, locale, effectiveSort],
  );
  const total = lazy ? (totalRecords ?? data.length) : processed.length;
  const pageCount = Math.max(1, Math.ceil(total / pageSize));
  const currentPage = Math.min(page, pageCount - 1);
  const rows = paginate && !lazy ? processed.slice(currentPage * pageSize, currentPage * pageSize + pageSize) : processed;
  const rowsByKey = new Map<string, T>();
  for (const row of rows) rowsByKey.set(String(keyOf(row)), row);

  const selectedKeys = new Set<RowKey>(Array.isArray(selection) ? selection : selection === null || selection === undefined ? [] : [selection]);
  const pageKeys = rows.map(keyOf);
  const selectedOnPage = pageKeys.filter((k) => selectedKeys.has(k)).length;
  const expandedSet = new Set(expanded);

  // ── Persistence write ──────────────────────────────────────────────────────
  const snapshotOf = (s: PersistedState) => serializeState(s);
  const snapshot = stateKey
    ? snapshotOf({ sort, filters, globalFilter, page, pageSize, columnOrder: ordered.map((e) => e.id), columnWidths: widths, hiddenColumns: hidden, expandedRows: expanded })
    : '';
  const lastWritten = useRef(snapshot);
  useEffect(() => {
    if (!stateKey || snapshot === lastWritten.current) return;
    lastWritten.current = snapshot;
    writeState(stateKey, stateStorage, snapshot);
  }, [stateKey, stateStorage, snapshot]);

  // ── Lazy loading ───────────────────────────────────────────────────────────
  const onLazyLoadRef = useRef(onLazyLoad);
  onLazyLoadRef.current = onLazyLoad;
  const lazyFirst = paginate ? page * pageSize : 0;
  const lazyQuery = JSON.stringify({ sort: effectiveSort, filters, globalFilter });
  useEffect(() => {
    if (!lazy || virtual) return;
    const event: LazyLoadEvent = { first: lazyFirst, rows: pageSize, sort: effectiveSort, filters, globalFilter };
    onLazyLoadRef.current?.(event);
    // `lazyQuery` stands for sort/filters/globalFilter by value.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lazy, isVirtual, lazyFirst, pageSize, lazyQuery]);

  const [range, setRange] = useState<VirtualRange | null>(null);
  useEffect(() => {
    if (!lazy || !virtual || !range) return;
    onLazyLoadRef.current?.({ first: range.first, rows: range.last - range.first + 1, sort: effectiveSort, filters, globalFilter });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lazy, isVirtual, range?.first, range?.last, lazyQuery]);

  useEffect(() => {
    if (isVirtual && paginator) console.warn('[react-ui-kit] DataTable: `virtualScroll` cannot be combined with `paginator`; the paginator is ignored.');
  }, [isVirtual, paginator]);

  // ── Handlers ───────────────────────────────────────────────────────────────
  const resetPage = () => {
    if (page !== 0) {
      setPage(0);
      onPageChange?.(0, pageSize);
    }
  };

  const handlePage = (next: number, nextSize: number) => {
    setPage(next);
    setPageSize(nextSize);
    onPageChange?.(next, nextSize);
  };

  const toggleSort = (id: string, additive: boolean) => {
    setSort(nextSort(sort, id, sortMode === 'multiple' && additive));
    if (lazy) resetPage();
  };

  const setColumnFilter = (id: string, constraint: FilterConstraint | undefined) => {
    const next = { ...filters };
    if (constraint) next[id] = constraint;
    else delete next[id];
    setFilters(next);
    resetPage();
  };

  const applyGlobal = (value: string) => {
    setGlobalFilter(value);
    resetPage();
  };
  const debouncedGlobal = useDebouncedCallback(applyGlobal, lazy ? LAZY_DEBOUNCE_MS : 0);
  const [globalDraft, setGlobalDraft] = useState(globalFilter);
  const [globalSynced, setGlobalSynced] = useState(globalFilter);
  if (globalFilter !== globalSynced) {
    setGlobalSynced(globalFilter);
    setGlobalDraft(globalFilter);
  }

  const toggleRow = (key: RowKey) => {
    if (selectionMode === 'single') {
      setSelection(selection === key ? null : key);
    } else if (selectionMode === 'multiple') {
      const next = new Set(selectedKeys);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      setSelection([...next]);
    }
  };

  const toggleAll = (on: boolean) => {
    const next = new Set(selectedKeys);
    for (const k of pageKeys) {
      if (on) next.add(k);
      else next.delete(k);
    }
    setSelection([...next]);
  };

  const toggleExpanded = (key: RowKey) => setExpanded(expandedSet.has(key) ? expanded.filter((k) => k !== key) : [...expanded, key]);

  // ── Column reorder ─────────────────────────────────────────────────────────
  const [announcement, setAnnouncement] = useState('');
  const dragId = useRef<string | null>(null);
  const focusHeader = useRef<string | null>(null);
  const canReorder = (e: Entry<T>) => reorderableColumns && e.column.reorderable !== false;

  const moveColumn = (id: string, targetId: string) => {
    const ids = ordered.map((e) => e.id);
    const from = ids.indexOf(id);
    const to = ids.indexOf(targetId);
    if (from === -1 || to === -1 || from === to) return false;
    ids.splice(from, 1);
    ids.splice(to, 0, id);
    setColumnOrder(ids);
    return true;
  };

  const moveByKeyboard = (entry: Entry<T>, direction: 1 | -1) => {
    const index = visible.indexOf(entry);
    const target = visible[index + direction];
    if (!target || !moveColumn(entry.id, target.id)) return;
    focusHeader.current = entry.id;
    setAnnouncement(t('columnMoved', { header: entry.label, position: index + direction + 1, total: visible.length }));
  };

  // ── Column resize ──────────────────────────────────────────────────────────
  const tableRef = useRef<HTMLElement | null>(null);
  const resize = useColumnResize({
    columns: visible.map((e) => ({ id: e.id, minWidth: e.column.minWidth ?? DEFAULT_MIN_WIDTH })),
    widths,
    setWidths,
    mode: columnResizeMode,
    tableRef,
    onColumnResize,
  });

  // ── Frozen columns ─────────────────────────────────────────────────────────
  const isFrozen = (e: Entry<T>, index: number) => Boolean(e.column.frozen) || (frozenFirstColumn && index === 0);
  const anyFrozen = visible.some(isFrozen);
  const utilityCols: ('select' | 'expander')[] = [];
  if (selectionMode === 'multiple') utilityCols.push('select');
  if (rowExpansionTemplate) utilityCols.push('expander');
  const utilityOffset = (i: number) => (i === 0 ? '0px' : `calc(${UTILITY_WIDTH} * ${i})`);
  const frozenOffsets = new Map<string, string>();
  {
    const parts: string[] = utilityCols.length ? [`${UTILITY_WIDTH} * ${utilityCols.length}`] : [];
    visible.forEach((e, i) => {
      if (!isFrozen(e, i)) return;
      frozenOffsets.set(e.id, parts.length ? `calc(${parts.join(' + ')})` : '0px');
      const w = widths[e.id] !== undefined ? `${widths[e.id]}px` : (e.column.width ?? `${e.column.minWidth ?? DEFAULT_MIN_WIDTH}px`);
      parts.push(w);
    });
  }
  const frozenStyle = (offset: string | undefined): CSSProperties | undefined => (offset === undefined ? undefined : ({ '--ui-data-table-frozen-offset': offset } as CSSProperties));

  // ── Editing ────────────────────────────────────────────────────────────────
  const [editing, setEditing] = useState<{ key: RowKey; col: string } | null>(null);
  const [rowDrafts, setRowDrafts] = useState<Map<RowKey, T>>(() => new Map());
  const focusCell = useRef<string | null>(null);
  const isEditable = (column: Column<T>, row: T) =>
    Boolean(editMode && column.editor) && (typeof column.editable === 'function' ? column.editable(row) : column.editable !== false);

  const closeEditor = (key: RowKey, col: string) => {
    setEditing(null);
    focusCell.current = cellKey(key, col);
  };

  const commitCell = (row: T, entry: Entry<T>, rowIndex: number, newValue: unknown): boolean => {
    const field = entry.column.field ?? entry.id;
    const value = entry.column.field ? getByPath(row, entry.column.field) : undefined;
    if (onCellEditComplete?.({ row, field, value, newValue, rowIndex }) === false) return false;
    closeEditor(keyOf(row), entry.id);
    return true;
  };

  const tabCell = (row: T, entry: Entry<T>, rowIndex: number, newValue: unknown, backwards: boolean): boolean => {
    if (!commitCell(row, entry, rowIndex, newValue)) return false;
    const cells: { row: T; col: string }[] = [];
    for (const r of rows) for (const e of visible) if (isEditable(e.column, r)) cells.push({ row: r, col: e.id });
    const index = cells.findIndex((c) => c.row === row && c.col === entry.id);
    const next = cells[index + (backwards ? -1 : 1)];
    if (next) {
      focusCell.current = null;
      setEditing({ key: keyOf(next.row), col: next.col });
    }
    return true;
  };

  const startRowEdit = (row: T) => setRowDrafts(new Map(rowDrafts).set(keyOf(row), row));
  const endRowEdit = (row: T, save: boolean) => {
    const key = keyOf(row);
    const newRow = rowDrafts.get(key) ?? row;
    const next = new Map(rowDrafts);
    next.delete(key);
    setRowDrafts(next);
    if (save) onRowEditSave?.({ row, newRow });
    else onRowEditCancel?.({ row, newRow });
  };
  const setDraftField = (row: T, field: string, value: unknown) => {
    const key = keyOf(row);
    setRowDrafts((prev) => new Map(prev).set(key, setByPath(prev.get(key) ?? row, field, value)));
  };

  // ── Context menu ───────────────────────────────────────────────────────────
  const menuRef = useRef<ContextMenuHandle>(null);
  const [menuRow, setMenuRow] = useState<{ key: RowKey; row: T } | null>(null);
  const menuItems = menuRow && contextMenu ? wrapMenuItems(typeof contextMenu === 'function' ? contextMenu(menuRow.row) : contextMenu, menuRow.row) : [];

  const openContextMenu = (row: T, originalEvent: SyntheticEvent | Event, show: () => void) => {
    setMenuRow({ key: keyOf(row), row });
    onContextMenu?.({ row, originalEvent });
    show();
  };

  // ── Grid navigation ────────────────────────────────────────────────────────
  const active = useRef<CellPosition>({ row: 0, col: 0 });
  const entered = useRef<HTMLElement | null>(null);
  const viewportRef = useRef<HTMLElement | null>(null);

  const findCell = (id: string): HTMLElement | null =>
    Array.from(tableRef.current?.querySelectorAll<HTMLElement>('[data-cell]') ?? []).find((el) => el.dataset.cell === id) ?? null;

  const sync = () => {
    const root = tableRef.current;
    if (!cellNavigation || !root) return;
    const editingCell = editing ? findCell(cellKey(editing.key, editing.col)) : null;
    syncRovingTabindex(root, active.current, editingCell ?? (entered.current?.isConnected ? entered.current : null));
  };

  useLayoutEffect(() => {
    sync();
    if (focusHeader.current) {
      const th = Array.from(tableRef.current?.querySelectorAll<HTMLElement>('[data-column-header]') ?? []).find((el) => el.dataset.columnHeader === focusHeader.current);
      focusHeader.current = null;
      th?.querySelector<HTMLElement>('.ui-data-table__sort, .ui-data-table__header-button')?.focus();
    }
    if (focusCell.current) {
      const cell = findCell(focusCell.current);
      focusCell.current = null;
      if (cell && tableRef.current) {
        const pos = positionOf(tableRef.current, cell);
        if (pos) active.current = pos;
        entered.current = null;
        sync();
        cell.focus();
      }
    }
  });

  const focusPosition = (pos: CellPosition) => {
    const root = tableRef.current;
    if (!root) return;
    active.current = pos;
    entered.current = null;
    syncRovingTabindex(root, pos, null);
    const cell = cellAt(root, pos);
    cell?.focus();
    cell?.scrollIntoView?.({ block: 'nearest', inline: 'nearest' });
  };

  const onGridFocus = (e: FocusEvent<HTMLElement>) => {
    const root = tableRef.current;
    if (!cellNavigation || !root) return;
    const cell = cellOf(root, e.target);
    if (!cell) return;
    const pos = positionOf(root, cell);
    if (pos && (pos.row !== active.current.row || pos.col !== active.current.col)) {
      active.current = pos;
      if (e.target !== cell) entered.current = cell;
      syncRovingTabindex(root, pos, e.target === cell ? null : cell);
    }
  };

  const onGridKeyDown = (e: KeyboardEvent<HTMLElement>) => {
    const root = tableRef.current;
    if (!cellNavigation || !root) return;
    const target = e.target as HTMLElement;
    const cell = cellOf(root, target);
    if (!cell) return;
    if (target !== cell) {
      if (e.key === 'Escape') {
        e.preventDefault();
        entered.current = null;
        const pos = positionOf(root, cell);
        if (pos) focusPosition(pos);
      }
      return;
    }
    const pos = positionOf(root, cell) ?? active.current;
    const next = nextPosition(root, pos, { key: e.key, ctrl: e.ctrlKey || e.metaKey, rtl: isRtl(root), pageRows: visibleRowCount(viewportRef.current, cell.parentElement) });
    if (next) {
      e.preventDefault();
      focusPosition(next);
      return;
    }
    const rowKey = cell.parentElement?.dataset.rowKey;
    const row = rowKey === undefined ? undefined : rowsByKey.get(rowKey);
    if (e.key === 'Enter' || e.key === 'F2') {
      e.preventDefault();
      const col = cell.dataset.col;
      const entry = visible.find((v) => v.id === col);
      if (row !== undefined && entry && editMode === 'cell' && isEditable(entry.column, row)) {
        setEditing({ key: keyOf(row), col: entry.id });
        return;
      }
      const child = firstInteractive(cell);
      if (child) {
        entered.current = cell;
        syncRovingTabindex(root, pos, cell);
        child.focus();
      }
    } else if (e.key === ' ' && row !== undefined && selectionMode) {
      e.preventDefault();
      toggleRow(keyOf(row));
    }
  };

  // ── Imperative handle ──────────────────────────────────────────────────────
  const exportCsv = ({ selectionOnly = false, filename, download = true }: ExportCsvOptions = {}) => {
    const source = selectionOnly ? processed.filter((r) => selectedKeys.has(keyOf(r))) : processed;
    const cols = visible.map((e) => e.column);
    const csv = toCsv(source, cols, visible.map((e) => e.label));
    if (download) downloadCsv(csv, filename ?? exportFilename);
    return csv;
  };

  const resetState = () => {
    if (stateKey) removeState(stateKey, stateStorage);
    setSort(defaultSort);
    setPage(defaultPage);
    setPageSize(defaultPageSize);
    setFilters(defaultFilters);
    setGlobalFilter(defaultGlobalFilter);
    setColumnOrder(defaultColumnOrder);
    setHidden(defaultHiddenColumns);
    setExpanded(defaultExpandedRows);
    setWidths({});
    const byId = new Map(entries.map((e) => [e.id, e]));
    const defaultOrder = [...defaultColumnOrder.filter((id) => byId.has(id)), ...entries.map((e) => e.id).filter((id) => !defaultColumnOrder.includes(id))];
    lastWritten.current = snapshotOf({
      sort: sortProp ?? defaultSort,
      filters: filtersProp ?? defaultFilters,
      globalFilter: globalFilterProp ?? defaultGlobalFilter,
      page: pageProp ?? defaultPage,
      pageSize: pageSizeProp ?? defaultPageSize,
      columnOrder: columnOrderProp ? ordered.map((e) => e.id) : defaultOrder,
      columnWidths: {},
      hiddenColumns: hiddenProp ?? defaultHiddenColumns,
      expandedRows: expandedProp ?? defaultExpandedRows,
    });
  };

  useImperativeHandle(ref, () => ({
    exportCsv,
    resetState,
    getElement: () => (tableRef.current instanceof HTMLTableElement ? tableRef.current : null),
  }));

  // ── Rendering ──────────────────────────────────────────────────────────────
  const Row: ElementType = virtual ? 'div' : 'tr';
  const Cell: ElementType = virtual ? 'div' : 'td';
  const Head: ElementType = virtual ? 'div' : 'th';
  const rowRole = virtual ? 'row' : undefined;
  const cellRole = cellNavigation ? 'gridcell' : virtual ? 'cell' : undefined;
  const headRole = virtual ? 'columnheader' : undefined;
  const rowEditCol = editMode === 'row' && columns.some((c) => c.editor);
  const colCount = utilityCols.length + visible.length + (rowEditCol ? 1 : 0);
  const spanProps = virtual ? { style: { gridColumn: '1 / -1' } } : { colSpan: colCount };
  const showFilterRow = filterDisplay === 'row' && visible.some((e) => e.column.filterable);
  const headerRows = showFilterRow ? 2 : 1;
  const rowFocusable = (Boolean(onRowClick) || selectionMode === 'single' || Boolean(contextMenu)) && !cellNavigation;
  const rowInteractive = Boolean(onRowClick) || selectionMode === 'single';
  const captionId = `${baseId}-caption`;
  const filterDelay = lazy ? LAZY_DEBOUNCE_MS : 0;

  const handleRowActivate = (row: T, event: MouseEvent<HTMLTableRowElement> | KeyboardEvent<HTMLTableRowElement>) => {
    if ((event.target as HTMLElement).closest('button, a, input, select, textarea, [role="checkbox"], .ui-data-table__editor')) return;
    if (selectionMode === 'single') toggleRow(keyOf(row));
    onRowClick?.(row, event);
  };

  const utilityHeader = (kind: 'select' | 'expander', i: number) => {
    const sticky = anyFrozen ? { className: 'ui-data-table__cell--frozen', style: frozenStyle(utilityOffset(i)) } : { className: undefined, style: undefined };
    if (kind === 'select')
      return (
        <Head key="select" scope={virtual ? undefined : 'col'} role={headRole} data-utility-column="" className={cx('ui-data-table__select', sticky.className)} style={sticky.style}>
          <Checkbox
            aria-label={t('selectAll')}
            checked={pageKeys.length > 0 && selectedOnPage === pageKeys.length}
            indeterminate={selectedOnPage > 0 && selectedOnPage < pageKeys.length}
            onChange={toggleAll}
            disabled={pageKeys.length === 0}
          />
        </Head>
      );
    return (
      <Head key="expander" scope={virtual ? undefined : 'col'} role={headRole} data-utility-column="" className={cx('ui-data-table__expander', sticky.className)} style={sticky.style}>
        <span className="visually-hidden">{t('expand')}</span>
      </Head>
    );
  };

  const renderHeaderCell = (entry: Entry<T>) => {
    const { column, id, label } = entry;
    const sortIndex = sort.findIndex((s) => s.field === id);
    const meta = sort[sortIndex];
    const ariaSort = column.sortable ? (meta ? (meta.order === 1 ? 'ascending' : 'descending') : 'none') : undefined;
    const reorderable = canReorder(entry);
    const resizable = resizableColumns && column.resizable !== false;
    const offset = frozenOffsets.get(id);
    const width = widths[id];
    const onHeaderKeyDown = (e: KeyboardEvent<HTMLButtonElement>) => {
      if (reorderable && e.altKey && e.shiftKey && (e.key === 'ArrowLeft' || e.key === 'ArrowRight')) {
        e.preventDefault();
        const rtl = isRtl(e.currentTarget);
        moveByKeyboard(entry, (e.key === 'ArrowRight') !== rtl ? 1 : -1);
      }
    };
    const content = column.sortable ? (
      <button
        type="button"
        className={cx('ui-data-table__sort', column.align === 'end' && 'flex-row-reverse', meta && 'ui-data-table__sort--active')}
        onClick={(e) => toggleSort(id, e.shiftKey)}
        onKeyDown={onHeaderKeyDown}
      >
        <span>{column.header}</span>
        <Icon name={meta ? (meta.order === 1 ? 'sort-up' : 'sort-down') : 'sort'} size="sm" className="ui-data-table__sort-icon" />
        {sort.length > 1 && meta && <span className="ui-data-table__sort-rank">{sortIndex + 1}</span>}
      </button>
    ) : reorderable ? (
      <button type="button" className="ui-data-table__header-button" onKeyDown={onHeaderKeyDown}>
        {column.header}
      </button>
    ) : (
      column.header
    );
    return (
      <Head
        key={id}
        scope={virtual ? undefined : 'col'}
        role={headRole}
        aria-sort={ariaSort}
        data-column-header={id}
        draggable={reorderable || undefined}
        onDragStart={
          reorderable
            ? (e: DragEvent<HTMLElement>) => {
                // A pointer resize in progress must not start a header drag.
                if (document.body.classList.contains('ui-data-table--resizing')) {
                  e.preventDefault();
                  return;
                }
                dragId.current = id;
                e.dataTransfer?.setData('text/plain', id);
                if (e.dataTransfer) e.dataTransfer.effectAllowed = 'move';
              }
            : undefined
        }
        onDragOver={reorderableColumns ? (e: DragEvent<HTMLElement>) => dragId.current && e.preventDefault() : undefined}
        onDrop={
          reorderableColumns
            ? (e: DragEvent<HTMLElement>) => {
                e.preventDefault();
                const from = dragId.current;
                dragId.current = null;
                if (from && from !== id && column.reorderable !== false && moveColumn(from, id)) {
                  const target = visible.findIndex((v) => v.id === id);
                  const moved = visible.find((v) => v.id === from);
                  if (moved) setAnnouncement(t('columnMoved', { header: moved.label, position: target + 1, total: visible.length }));
                }
              }
            : undefined
        }
        onDragEnd={reorderableColumns ? () => (dragId.current = null) : undefined}
        style={{ ...(width !== undefined ? { width } : column.width ? { width: column.width } : undefined), ...frozenStyle(offset) }}
        className={cx(column.align && ALIGN[column.align], offset !== undefined && 'ui-data-table__cell--frozen', resizable && 'ui-data-table__th--resizable', column.headerClassName)}
      >
        <div className={cx('ui-data-table__th-content', column.align === 'end' && 'flex-row-reverse')}>
          {content}
          {column.filterable && filterDisplay === 'menu' && (
            <ColumnFilterMenu column={column} label={label} constraint={filters[id]} onChange={(c) => setColumnFilter(id, c)} msg={msg} locale={locale} />
          )}
        </div>
        {resizable && (
          <ResizeHandle
            label={t('resizeColumn', { header: label })}
            width={width}
            minWidth={column.minWidth ?? DEFAULT_MIN_WIDTH}
            onDragStart={(x, rtl) => resize.startDrag(id, x, rtl)}
            onResizeBy={(d) => resize.resizeBy(id, d)}
            onResizeTo={(w) => resize.resizeTo(id, w)}
          />
        )}
      </Head>
    );
  };

  const renderCell = (row: T, entry: Entry<T>, rowIndex: number, absIndex: number) => {
    const { column, id, label } = entry;
    const key = keyOf(row);
    const editable = isEditable(column, row);
    const offset = frozenOffsets.get(id);
    const draft = rowDrafts.get(key);
    const cellEditing = editMode === 'cell' && editing !== null && editing.key === key && editing.col === id && editable;
    const editorLabel = msg('editorLabel', { header: label, index: absIndex + 1 });
    let content: ReactNode;
    if (cellEditing) {
      content = (
        <CellEditor
          row={row}
          label={editorLabel}
          initialValue={column.field ? getByPath(row, column.field) : undefined}
          render={column.editor!}
          onCommit={(v) => commitCell(row, entry, rowIndex, v)}
          onCancel={() => {
            onCellEditCancel?.({ row, field: column.field ?? id });
            closeEditor(key, id);
          }}
          onTab={(v, back) => tabCell(row, entry, rowIndex, v, back)}
        />
      );
    } else if (editMode === 'row' && draft !== undefined && editable) {
      const field = column.field ?? id;
      content = column.editor!({
        value: getByPath(draft, field),
        onChange: (v) => setDraftField(row, field, v),
        onCommit: () => endRowEdit(row, true),
        onCancel: () => endRowEdit(row, false),
        row,
        'aria-label': editorLabel,
        invalid: false,
      });
    } else {
      content = column.body ? column.body(row, { rowIndex }) : formatCell(column.field ? getByPath(row, column.field) : undefined);
    }
    const cellEditable = editMode === 'cell' && editable && !cellEditing;
    return (
      <Cell
        key={id}
        role={cellRole}
        data-cell={cellKey(key, id)}
        data-col={id}
        aria-readonly={cellNavigation && editable ? false : undefined}
        tabIndex={cellEditable && !cellNavigation ? 0 : undefined}
        onClick={cellEditable ? () => setEditing({ key, col: id }) : undefined}
        onKeyDown={
          cellEditable && !cellNavigation
            ? (e: KeyboardEvent<HTMLElement>) => {
                if (e.target === e.currentTarget && (e.key === 'Enter' || e.key === 'F2')) {
                  e.preventDefault();
                  e.stopPropagation();
                  setEditing({ key, col: id });
                }
              }
            : undefined
        }
        style={frozenStyle(offset)}
        className={cx(
          column.align && ALIGN[column.align],
          column.align === 'end' && 'ui-tabular',
          offset !== undefined && 'ui-data-table__cell--frozen',
          editable && editMode === 'cell' && 'ui-data-table__cell--editable',
          cellEditing && 'ui-data-table__cell--editing',
          column.className,
        )}
      >
        {content}
      </Cell>
    );
  };

  const renderRow = (row: T, rowIndex: number, absIndex: number): ReactNode[] => {
    const key = keyOf(row);
    const selected = selectedKeys.has(key);
    const isExpanded = Boolean(rowExpansionTemplate) && expandedSet.has(key);
    const expansionId = `${baseId}-expansion-${safeId(key)}`;
    const sticky = (i: number) => (anyFrozen ? { className: 'ui-data-table__cell--frozen', style: frozenStyle(utilityOffset(i)) } : { className: undefined, style: undefined });
    const out: ReactNode[] = [
      <Row
        key={key}
        role={rowRole}
        data-row-key={String(key)}
        aria-rowindex={virtual ? headerRows + absIndex + 1 : undefined}
        aria-selected={selectionMode ? selected : undefined}
        tabIndex={rowFocusable ? 0 : undefined}
        className={cx(
          selected && 'table-active ui-data-table__row--selected',
          rowInteractive && 'ui-data-table__row--interactive',
          menuRow !== null && menuRow.key === key && 'ui-data-table__row--context',
          rowClassName?.(row),
        )}
        onClick={rowInteractive ? (e: MouseEvent<HTMLTableRowElement>) => handleRowActivate(row, e) : undefined}
        onKeyDown={(e: KeyboardEvent<HTMLTableRowElement>) => {
          if (contextMenu && ((e.shiftKey && e.key === 'F10') || e.key === 'ContextMenu')) {
            e.preventDefault();
            e.stopPropagation();
            const native = e.nativeEvent;
            openContextMenu(row, e, () => menuRef.current?.show(native));
            return;
          }
          if (rowInteractive && !cellNavigation && e.target === e.currentTarget && (e.key === 'Enter' || e.key === ' ')) {
            e.preventDefault();
            handleRowActivate(row, e);
          }
        }}
        onContextMenu={
          contextMenu
            ? (e: MouseEvent<HTMLElement>) => {
                e.preventDefault();
                const root = tableRef.current;
                let origin: HTMLElement = e.currentTarget;
                if (cellNavigation && root) {
                  const cell = cellOf(root, e.target as Element);
                  const pos = cell && positionOf(root, cell);
                  if (cell && pos) {
                    focusPosition(pos);
                    origin = cell;
                  }
                } else if (rowFocusable) {
                  e.currentTarget.focus();
                }
                const point = { clientX: e.clientX, clientY: e.clientY, target: origin };
                openContextMenu(row, e, () => menuRef.current?.show(point));
              }
            : undefined
        }
      >
        {utilityCols.map((kind, i) =>
          kind === 'select' ? (
            <Cell key="select" role={cellRole} data-utility-column="" className={cx('ui-data-table__select', sticky(i).className)} style={sticky(i).style}>
              <Checkbox aria-label={t('selectRow', { index: absIndex + 1 })} checked={selected} onChange={() => toggleRow(key)} />
            </Cell>
          ) : (
            <Cell key="expander" role={cellRole} data-utility-column="" className={cx('ui-data-table__expander', sticky(i).className)} style={sticky(i).style}>
              <button
                type="button"
                className="ui-data-table__expander-button"
                aria-expanded={isExpanded}
                aria-controls={isExpanded ? expansionId : undefined}
                aria-label={t(isExpanded ? 'collapseRow' : 'expandRow', { index: absIndex + 1 })}
                onClick={() => toggleExpanded(key)}
              >
                <Icon name="chevron-right" size="sm" className="ui-data-table__expander-icon" />
              </button>
            </Cell>
          ),
        )}
        {visible.map((entry) => renderCell(row, entry, rowIndex, absIndex))}
        {rowEditCol && (
          <Cell role={cellRole} className="ui-data-table__row-editor text-end">
            {rowDrafts.has(key) ? (
              <span className="ui-data-table__row-editor-buttons">
                <Button size="sm" appearance="text" icon="check" aria-label={msg('saveRowN', { index: absIndex + 1 })} onClick={() => endRowEdit(row, true)} />
                <Button size="sm" appearance="text" variant="secondary" icon="x" aria-label={msg('cancelEditN', { index: absIndex + 1 })} onClick={() => endRowEdit(row, false)} />
              </span>
            ) : (
              <Button size="sm" appearance="text" variant="secondary" icon="edit" aria-label={msg('editRowN', { index: absIndex + 1 })} onClick={() => startRowEdit(row)} />
            )}
          </Cell>
        )}
      </Row>,
    ];
    if (isExpanded && !virtual) {
      out.push(
        <tr key={`${String(key)}-expansion`} id={expansionId} className="ui-data-table__expansion">
          <td colSpan={colCount}>{rowExpansionTemplate!(row)}</td>
        </tr>,
      );
    }
    return out;
  };

  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(() => new Set());
  const renderBody = (): ReactNode[] => {
    const offset = paginate ? currentPage * pageSize : 0;
    if (!groupBy) return rows.flatMap((row, i) => renderRow(row, i, offset + i));
    const out: ReactNode[] = [];
    let index = 0;
    for (const group of groupRows(rows, groupBy)) {
      const collapsed = expandableGroups && collapsedGroups.has(group.key);
      const headerContent = groupHeaderTemplate ? groupHeaderTemplate(group.value, group.rows) : formatCell(group.value);
      out.push(
        <tr key={`group-${group.key}`} className="ui-data-table__group-header">
          <th scope="rowgroup" colSpan={colCount} role={cellNavigation ? 'rowheader' : undefined}>
            {expandableGroups ? (
              <button
                type="button"
                className="ui-data-table__group-toggle"
                aria-expanded={!collapsed}
                onClick={() => {
                  const next = new Set(collapsedGroups);
                  if (collapsed) next.delete(group.key);
                  else next.add(group.key);
                  setCollapsedGroups(next);
                }}
              >
                <Icon name={collapsed ? 'chevron-right' : 'chevron-down'} size="sm" />
                <span>{headerContent}</span>
              </button>
            ) : (
              headerContent
            )}
          </th>
        </tr>,
      );
      if (!collapsed) {
        for (const row of group.rows) {
          out.push(...renderRow(row, index, offset + index));
          index++;
        }
        if (groupFooterTemplate)
          out.push(
            <tr key={`group-footer-${group.key}`} className="ui-data-table__group-footer">
              <td colSpan={colCount}>{groupFooterTemplate(group.value, group.rows)}</td>
            </tr>,
          );
      } else index += group.rows.length;
    }
    return out;
  };

  const headerRow = (
    <Row role={rowRole} aria-rowindex={virtual ? 1 : undefined}>
      {utilityCols.map((kind, i) => utilityHeader(kind, i))}
      {visible.map((entry) => renderHeaderCell(entry))}
      {rowEditCol && (
        <Head scope={virtual ? undefined : 'col'} role={headRole} className="ui-data-table__row-editor">
          <span className="visually-hidden">{msg('rowActions')}</span>
        </Head>
      )}
    </Row>
  );

  const filterRow = showFilterRow && (
    <Row role={rowRole} aria-rowindex={virtual ? 2 : undefined} className="ui-data-table__filter-row">
      {utilityCols.map((kind) => (
        <Cell key={kind} role={cellRole ?? (virtual ? 'cell' : undefined)} data-utility-column="" />
      ))}
      {visible.map(({ column, id, label }) => (
        <Cell key={id} role={cellRole} style={frozenStyle(frozenOffsets.get(id))} className={cx(frozenOffsets.has(id) && 'ui-data-table__cell--frozen')}>
          {column.filterable && <ColumnFilterRow column={column} label={label} constraint={filters[id]} onChange={(c) => setColumnFilter(id, c)} msg={msg} locale={locale} delay={filterDelay} />}
        </Cell>
      ))}
      {rowEditCol && <Cell role={cellRole} />}
    </Row>
  );

  const loadingRowsEl =
    loading &&
    Array.from({ length: loadingRows }, (_, r) => (
      <Row key={`loading-${r}`} role={rowRole} aria-hidden="true" className="ui-data-table__loading-row">
        {Array.from({ length: colCount }, (_, c) => (
          <Cell key={c} role={cellRole}>
            <Skeleton />
          </Cell>
        ))}
      </Row>
    ));

  const emptyRow = !loading && rows.length === 0 && (
    <Row role={rowRole} className="ui-data-table__empty">
      <Cell role={cellRole} {...spanProps} className="text-center text-body-secondary py-4">
        {emptyMessage ?? t('noRecords')}
      </Cell>
    </Row>
  );

  const tableClass = cx('table align-middle mb-0', striped && 'table-striped', hover && 'table-hover', bordered && 'table-bordered', size === 'sm' && 'table-sm', resize.sized && 'ui-data-table__table--fixed');
  const gridProps = {
    ref: (node: HTMLElement | null) => {
      tableRef.current = node;
    },
    role: cellNavigation ? 'grid' : virtual ? 'table' : undefined,
    'aria-busy': loading || undefined,
    'aria-label': caption ? undefined : props['aria-label'],
    'aria-multiselectable': selectionMode === 'multiple' || undefined,
    'aria-rowcount': virtual ? total + headerRows : undefined,
    'aria-colcount': virtual ? colCount : undefined,
    onKeyDown: cellNavigation ? onGridKeyDown : undefined,
    onFocus: cellNavigation ? onGridFocus : undefined,
  };

  const showToolbar = Boolean(header) || columnToggle || globalFilterInput;
  const virtualItems: (T | undefined)[] = virtual ? (lazy ? Array.from({ length: total }, (_, i) => data[i]) : rows) : [];
  const gridTemplate = [...utilityCols.map(() => UTILITY_WIDTH), ...visible.map((e) => (widths[e.id] !== undefined ? `${widths[e.id]}px` : (e.column.width ?? `minmax(${e.column.minWidth ?? DEFAULT_MIN_WIDTH}px, 1fr)`))), ...(rowEditCol ? ['6rem'] : [])].join(' ');

  return (
    <div
      id={idProp}
      className={cx('ui-data-table', size === 'sm' && 'ui-data-table--sm', virtual && 'ui-data-table--virtual', className)}
      style={virtual ? ({ '--ui-data-table-columns': gridTemplate } as CSSProperties) : undefined}
    >
      {showToolbar && (
        <div className="ui-data-table__toolbar">
          {header}
          {(globalFilterInput || columnToggle) && (
            <div className="ui-data-table__toolbar-end">
              {globalFilterInput && (
                <InputText
                  type="search"
                  size="sm"
                  className="ui-data-table__global-filter"
                  aria-label={t('globalSearch')}
                  placeholder={t('globalSearch')}
                  prefix={<Icon name="search" size="sm" />}
                  value={globalDraft}
                  onChange={(v) => {
                    setGlobalDraft(v);
                    debouncedGlobal(v);
                  }}
                />
              )}
              {columnToggle && (
                <ColumnToggle
                  label={t('columns')}
                  columns={ordered.map((e) => ({ id: e.id, label: e.label, hideable: e.column.hideable !== false }))}
                  hidden={hidden.filter((id) => ordered.some((e) => e.id === id && e.column.hideable !== false))}
                  onChange={setHidden}
                />
              )}
            </div>
          )}
        </div>
      )}
      {virtual ? (
        <div className="ui-data-table__wrapper ui-data-table__wrapper--virtual">
          {caption && (
            <div id={captionId} className={cx('ui-data-table__caption', captionHidden && 'visually-hidden')}>
              {caption}
            </div>
          )}
          <div {...gridProps} aria-labelledby={caption ? captionId : undefined} className={cx(tableClass, 'ui-data-table__grid')}>
            <div role="rowgroup" className="ui-data-table__head">
              {headerRow}
              {filterRow}
            </div>
            {loading ? (
              <div role="rowgroup" className="ui-data-table__body">
                {loadingRowsEl}
              </div>
            ) : rows.length === 0 && !lazy ? (
              <div role="rowgroup" className="ui-data-table__body">
                {emptyRow}
              </div>
            ) : (
              <VirtualScroller<T | undefined>
                ref={(handle) => {
                  viewportRef.current = handle?.element ?? null;
                }}
                role="rowgroup"
                tabIndex={cellNavigation ? -1 : 0}
                aria-label={caption ? undefined : props['aria-label']}
                className="ui-data-table__body ui-data-table__viewport"
                contentRole="presentation"
                itemRole="presentation"
                items={virtualItems}
                itemSize={virtual.itemSize}
                overscan={virtual.overscan}
                height={scrollHeight ?? '400px'}
                lazy={lazy}
                onLazyLoad={setRange}
                itemTemplate={(row, { index }) =>
                  row === undefined ? (
                    <div role="row" aria-rowindex={headerRows + index + 1} className="ui-data-table__loading-row">
                      {Array.from({ length: colCount }, (_, c) => (
                        <div key={c} role={cellRole ?? 'cell'}>
                          <Skeleton />
                        </div>
                      ))}
                    </div>
                  ) : (
                    renderRow(row, index, index)
                  )
                }
              />
            )}
          </div>
        </div>
      ) : (
        <div
          ref={(node) => {
            viewportRef.current = node;
          }}
          className={cx('table-responsive ui-data-table__wrapper', (stickyHeader || scrollHeight) && 'ui-data-table__wrapper--sticky')}
          style={scrollHeight ? { maxHeight: scrollHeight } : undefined}
        >
          <table {...gridProps} className={tableClass} style={resize.tableWidth !== undefined ? { width: resize.tableWidth } : undefined}>
            {caption && <caption className={cx('ui-data-table__caption', captionHidden && 'visually-hidden')}>{caption}</caption>}
            <thead className="ui-data-table__head">
              {headerRow}
              {filterRow}
            </thead>
            <tbody className="ui-data-table__body">
              {loadingRowsEl}
              {emptyRow}
              {!loading && renderBody()}
            </tbody>
          </table>
        </div>
      )}
      {loading && (
        <span className="visually-hidden" role="status">
          {t('loading')}
        </span>
      )}
      <div className="visually-hidden" aria-live="polite" aria-atomic="true">
        {announcement}
      </div>
      {(paginate || footer) && (
        <div className="ui-data-table__footer">
          {footer}
          {paginate && <Paginator page={currentPage} pageSize={pageSize} total={total} onPageChange={handlePage} pageSizeOptions={pageSizeOptions} size="sm" />}
        </div>
      )}
      {contextMenu && <ContextMenu ref={menuRef} items={menuItems} ariaLabel={msg('rowMenu')} onHide={() => setMenuRow(null)} />}
    </div>
  );
}

function formatCell(value: unknown): ReactNode {
  if (value === null || value === undefined) return '';
  if (value instanceof Date) return value.toLocaleDateString();
  return String(value);
}
