import { useMemo, type KeyboardEvent, type MouseEvent, type ReactNode } from 'react';
import { useControllableState } from '../../hooks/useControllableState';
import { useLocale } from '../../locale/LocaleProvider';
import { cx } from '../../utils/cx';
import { getByPath } from '../../utils/object';
import { Checkbox } from '../Checkbox/Checkbox';
import { Icon } from '../Icon/Icon';
import { Paginator } from '../Paginator/Paginator';
import { Skeleton } from '../Skeleton/Skeleton';
import { nextSort, sortRows, type SortMeta } from './sort';

export type { SortMeta } from './sort';
export type RowKey = string | number;

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
}

type SelectionValue = RowKey | RowKey[] | null;

export interface DataTableProps<T> {
  data: T[];
  columns: Column<T>[];
  dataKey?: string | ((row: T) => RowKey);
  caption?: ReactNode;
  captionHidden?: boolean;
  'aria-label'?: string;
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
}

const ALIGN = { start: 'text-start', center: 'text-center', end: 'text-end' } as const;
const columnKey = <T,>(c: Column<T>, i: number) => c.id ?? c.field ?? String(i);

export function DataTable<T>({
  data,
  columns,
  dataKey = 'id',
  caption,
  captionHidden = false,
  sortMode = 'single',
  sort: sortProp,
  defaultSort = [],
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
  ...rest
}: DataTableProps<T>) {
  const { t, locale } = useLocale();
  const [sort, setSort] = useControllableState<SortMeta[]>(sortProp, defaultSort, onSortChange);
  const [page, setPage] = useControllableState<number>(pageProp, defaultPage);
  const [pageSize, setPageSize] = useControllableState<number>(pageSizeProp, defaultPageSize);
  const [selection, setSelection] = useControllableState<SelectionValue>(selectionProp, defaultSelection, onSelectionChange);

  const keyOf = (row: T): RowKey => (typeof dataKey === 'function' ? dataKey(row) : (getByPath(row, dataKey) as RowKey));
  const sorted = useMemo(() => sortRows(data, sort, columns, locale), [data, sort, columns, locale]);
  const pageCount = Math.max(1, Math.ceil(sorted.length / pageSize));
  const currentPage = Math.min(page, pageCount - 1);
  const rows = paginator ? sorted.slice(currentPage * pageSize, currentPage * pageSize + pageSize) : sorted;

  const selectedKeys = new Set<RowKey>(Array.isArray(selection) ? selection : selection === null || selection === undefined ? [] : [selection]);
  const pageKeys = rows.map(keyOf);
  const selectedOnPage = pageKeys.filter((k) => selectedKeys.has(k)).length;

  const handlePage = (next: number, nextSize: number) => {
    setPage(next);
    setPageSize(nextSize);
    onPageChange?.(next, nextSize);
  };

  const toggleSort = (column: Column<T>, index: number, additive: boolean) => {
    setSort(nextSort(sort, columnKey(column, index), sortMode === 'multiple' && additive));
  };

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

  const rowInteractive = Boolean(onRowClick) || selectionMode === 'single';
  const handleRowActivate = (row: T, event: MouseEvent<HTMLTableRowElement> | KeyboardEvent<HTMLTableRowElement>) => {
    if ((event.target as HTMLElement).closest('button, a, input, select, textarea, [role="checkbox"]')) return;
    if (selectionMode === 'single') toggleRow(keyOf(row));
    onRowClick?.(row, event);
  };

  const colSpan = columns.length + (selectionMode === 'multiple' ? 1 : 0);

  return (
    <div className={cx('ui-data-table', size === 'sm' && 'ui-data-table--sm', className)}>
      {header && <div className="ui-data-table__toolbar">{header}</div>}
      <div className={cx('table-responsive ui-data-table__wrapper', stickyHeader && 'ui-data-table__wrapper--sticky')}>
        <table
          className={cx('table align-middle mb-0', striped && 'table-striped', hover && 'table-hover', bordered && 'table-bordered', size === 'sm' && 'table-sm')}
          aria-busy={loading || undefined}
          aria-label={caption ? undefined : rest['aria-label']}
          aria-multiselectable={selectionMode === 'multiple' || undefined}
        >
          {caption && <caption className={cx('ui-data-table__caption', captionHidden && 'visually-hidden')}>{caption}</caption>}
          <thead className="ui-data-table__head">
            <tr>
              {selectionMode === 'multiple' && (
                <th scope="col" className="ui-data-table__select">
                  <Checkbox
                    aria-label={t('selectAll')}
                    checked={pageKeys.length > 0 && selectedOnPage === pageKeys.length}
                    indeterminate={selectedOnPage > 0 && selectedOnPage < pageKeys.length}
                    onChange={toggleAll}
                    disabled={pageKeys.length === 0}
                  />
                </th>
              )}
              {columns.map((column, index) => {
                const key = columnKey(column, index);
                const sortIndex = sort.findIndex((s) => s.field === key);
                const meta = sort[sortIndex];
                const ariaSort = column.sortable ? (meta ? (meta.order === 1 ? 'ascending' : 'descending') : 'none') : undefined;
                return (
                  <th key={key} scope="col" aria-sort={ariaSort} style={column.width ? { width: column.width } : undefined} className={cx(column.align && ALIGN[column.align], column.headerClassName)}>
                    {column.sortable ? (
                      <button
                        type="button"
                        className={cx('ui-data-table__sort', column.align === 'end' && 'flex-row-reverse', meta && 'ui-data-table__sort--active')}
                        onClick={(e) => toggleSort(column, index, e.shiftKey)}
                      >
                        <span>{column.header}</span>
                        <Icon name={meta ? (meta.order === 1 ? 'sort-up' : 'sort-down') : 'sort'} size="sm" className="ui-data-table__sort-icon" />
                        {sort.length > 1 && meta && <span className="ui-data-table__sort-rank">{sortIndex + 1}</span>}
                      </button>
                    ) : (
                      column.header
                    )}
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody className="ui-data-table__body">
            {loading &&
              Array.from({ length: loadingRows }, (_, r) => (
                <tr key={`loading-${r}`} aria-hidden="true" className="ui-data-table__loading-row">
                  {Array.from({ length: colSpan }, (_, c) => (
                    <td key={c}>
                      <Skeleton />
                    </td>
                  ))}
                </tr>
              ))}
            {!loading && rows.length === 0 && (
              <tr className="ui-data-table__empty">
                <td colSpan={colSpan} className="text-center text-body-secondary py-4">
                  {emptyMessage ?? t('noRecords')}
                </td>
              </tr>
            )}
            {!loading &&
              rows.map((row, rowIndex) => {
                const key = keyOf(row);
                const selected = selectedKeys.has(key);
                return (
                  <tr
                    key={key}
                    aria-selected={selectionMode ? selected : undefined}
                    tabIndex={rowInteractive ? 0 : undefined}
                    className={cx(selected && 'table-active ui-data-table__row--selected', rowInteractive && 'ui-data-table__row--interactive', rowClassName?.(row))}
                    onClick={rowInteractive ? (e) => handleRowActivate(row, e) : undefined}
                    onKeyDown={
                      rowInteractive
                        ? (e) => {
                            if (e.target === e.currentTarget && (e.key === 'Enter' || e.key === ' ')) {
                              e.preventDefault();
                              handleRowActivate(row, e);
                            }
                          }
                        : undefined
                    }
                  >
                    {selectionMode === 'multiple' && (
                      <td className="ui-data-table__select">
                        <Checkbox aria-label={t('selectRow', { index: currentPage * pageSize + rowIndex + 1 })} checked={selected} onChange={() => toggleRow(key)} />
                      </td>
                    )}
                    {columns.map((column, index) => (
                      <td key={columnKey(column, index)} className={cx(column.align && ALIGN[column.align], column.align === 'end' && 'ui-tabular', column.className)}>
                        {column.body ? column.body(row, { rowIndex }) : formatCell(column.field ? getByPath(row, column.field) : undefined)}
                      </td>
                    ))}
                  </tr>
                );
              })}
          </tbody>
        </table>
        {loading && (
          <span className="visually-hidden" role="status">
            {t('loading')}
          </span>
        )}
      </div>
      {(paginator || footer) && (
        <div className="ui-data-table__footer">
          {footer}
          {paginator && <Paginator page={currentPage} pageSize={pageSize} total={sorted.length} onPageChange={handlePage} pageSizeOptions={pageSizeOptions} size="sm" />}
        </div>
      )}
    </div>
  );
}

function formatCell(value: unknown): ReactNode {
  if (value === null || value === undefined) return '';
  if (value instanceof Date) return value.toLocaleDateString();
  return String(value);
}
