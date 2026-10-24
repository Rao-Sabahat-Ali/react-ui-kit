import type { KeyboardEvent, MouseEvent, ReactNode, Ref, SyntheticEvent } from 'react';
import type { MenuItem } from '../Menu/types';
import type { Option } from '../Select/Select';
import type { SortMeta } from './sort';

export type RowKey = string | number;
export type SelectionValue = RowKey | RowKey[] | null;

export type MatchMode =
  | 'contains'
  | 'startsWith'
  | 'endsWith'
  | 'equals'
  | 'notEquals'
  | 'lt'
  | 'lte'
  | 'gt'
  | 'gte'
  | 'between'
  | 'dateIs'
  | 'dateIsNot'
  | 'dateBefore'
  | 'dateAfter'
  | 'in';

export type FilterType = 'text' | 'select' | 'date' | 'number';

export interface FilterConstraint {
  matchMode: MatchMode;
  /** text: string · number: number or `[min, max]` · date: Date or `[from, to]` · select: value or array (`in`). */
  value: unknown;
}

/** Column filters keyed by column id. */
export type FilterMeta = Record<string, FilterConstraint>;

export interface LazyLoadEvent {
  first: number;
  rows: number;
  sort: SortMeta[];
  filters: FilterMeta;
  globalFilter: string;
}

export interface CellEditorContext<T> {
  value: unknown;
  onChange: (value: unknown) => void;
  onCommit: () => void;
  onCancel: () => void;
  row: T;
  /** "{header}, row {n}" — spread onto the editor control. */
  'aria-label': string;
  /** True after `onCellEditComplete` rejected the value. */
  invalid: boolean;
}

export interface Column<T> {
  field?: string;
  id?: string;
  header: ReactNode;
  body?: (row: T, ctx: { rowIndex: number }) => ReactNode;
  sortable?: boolean;
  sortFn?: (a: T, b: T) => number;
  align?: 'start' | 'center' | 'end';
  width?: string;
  headerClassName?: string;
  className?: string;
  // Phase 2
  filterable?: boolean;
  filterType?: FilterType;
  filterOptions?: Option<unknown>[];
  filterMatchModes?: MatchMode[];
  filterFn?: (value: unknown, filterValue: unknown, row: T) => boolean;
  resizable?: boolean;
  /** Pixels, default 48. */
  minWidth?: number;
  reorderable?: boolean;
  frozen?: boolean;
  hideable?: boolean;
  exportable?: boolean;
  exportValue?: (row: T) => string | number | null;
  // Phase 3
  editor?: (ctx: CellEditorContext<T>) => ReactNode;
  editable?: boolean | ((row: T) => boolean);
}

export interface ExportCsvOptions {
  selectionOnly?: boolean;
  filename?: string;
  /** Default true: triggers a file download. */
  download?: boolean;
}

export interface DataTableHandle {
  exportCsv: (options?: ExportCsvOptions) => string;
  resetState: () => void;
  /** The native `<table>` (null in virtual-scroll mode, which renders an ARIA table of divs). */
  getElement: () => HTMLTableElement | null;
}

/** MenuItem whose `command` also receives the row the context menu was opened for. */
export type DataTableMenuItem<T> = Omit<MenuItem, 'command' | 'items'> & {
  command?: (e: { item: MenuItem; event: SyntheticEvent; row: T }) => void;
  items?: DataTableMenuItem<T>[];
};

export interface CellEditCompleteEvent<T> {
  row: T;
  field: string;
  value: unknown;
  newValue: unknown;
  rowIndex: number;
}

export interface DataTableProps<T> {
  data: T[];
  columns: Column<T>[];
  dataKey?: string | ((row: T) => RowKey);
  caption?: ReactNode;
  captionHidden?: boolean;
  'aria-label'?: string;
  id?: string;
  sortMode?: 'single' | 'multiple';
  sort?: SortMeta[];
  defaultSort?: SortMeta[];
  onSortChange?: (sort: SortMeta[]) => void;
  paginator?: boolean;
  page?: number;
  defaultPage?: number;
  pageSize?: number;
  defaultPageSize?: number;
  pageSizeOptions?: number[];
  onPageChange?: (page: number, pageSize: number) => void;
  selectionMode?: 'single' | 'multiple' | null;
  selection?: SelectionValue;
  defaultSelection?: SelectionValue;
  onSelectionChange?: (selection: SelectionValue) => void;
  onRowClick?: (row: T, event: MouseEvent<HTMLTableRowElement> | KeyboardEvent<HTMLTableRowElement>) => void;
  loading?: boolean;
  loadingRows?: number;
  emptyMessage?: ReactNode;
  striped?: boolean;
  hover?: boolean;
  bordered?: boolean;
  size?: 'sm' | 'md';
  stickyHeader?: boolean;
  header?: ReactNode;
  footer?: ReactNode;
  rowClassName?: (row: T) => string | undefined;
  className?: string;

  // Phase 2 — filtering
  filters?: FilterMeta;
  defaultFilters?: FilterMeta;
  onFilterChange?: (filters: FilterMeta) => void;
  filterDisplay?: 'menu' | 'row';
  globalFilter?: string;
  defaultGlobalFilter?: string;
  onGlobalFilterChange?: (value: string) => void;
  globalFilterFields?: string[];
  /** Renders a search input in the toolbar. Default: true when `globalFilterFields` is set. */
  globalFilterInput?: boolean;
  // Lazy
  lazy?: boolean;
  onLazyLoad?: (event: LazyLoadEvent) => void;
  totalRecords?: number;
  // Columns
  resizableColumns?: boolean;
  columnResizeMode?: 'fit' | 'expand';
  onColumnResize?: (e: { columnId: string; width: number }) => void;
  reorderableColumns?: boolean;
  columnOrder?: string[];
  defaultColumnOrder?: string[];
  onColumnOrderChange?: (order: string[]) => void;
  frozenFirstColumn?: boolean;
  // Expansion
  expandedRows?: RowKey[];
  defaultExpandedRows?: RowKey[];
  onRowToggle?: (expanded: RowKey[]) => void;
  rowExpansionTemplate?: (row: T) => ReactNode;
  // Visibility
  hiddenColumns?: string[];
  defaultHiddenColumns?: string[];
  onHiddenColumnsChange?: (ids: string[]) => void;
  columnToggle?: boolean;
  // Export / state
  exportFilename?: string;
  stateKey?: string;
  stateStorage?: 'local' | 'session';
  ref?: Ref<DataTableHandle>;

  // Phase 3
  editMode?: 'cell' | 'row' | null;
  onCellEditComplete?: (e: CellEditCompleteEvent<T>) => void | false;
  onCellEditCancel?: (e: { row: T; field: string }) => void;
  onRowEditSave?: (e: { row: T; newRow: T }) => void;
  onRowEditCancel?: (e: { row: T; newRow: T }) => void;
  virtualScroll?: boolean | { itemSize: number; overscan?: number };
  scrollHeight?: string;
  groupBy?: string;
  groupHeaderTemplate?: (groupValue: unknown, rows: T[]) => ReactNode;
  groupFooterTemplate?: (groupValue: unknown, rows: T[]) => ReactNode;
  expandableGroups?: boolean;
  cellNavigation?: boolean;
  contextMenu?: DataTableMenuItem<T>[] | ((row: T) => DataTableMenuItem<T>[]);
  onContextMenu?: (e: { row: T; originalEvent: SyntheticEvent | Event }) => void;
}
