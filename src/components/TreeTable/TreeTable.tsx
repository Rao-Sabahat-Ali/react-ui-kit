import { useId, useMemo, useRef, useState, type CSSProperties, type KeyboardEvent, type MouseEvent, type ReactNode } from 'react';
import { useControllableState } from '../../hooks/useControllableState';
import { useTypeahead } from '../../hooks/useTypeahead';
import { useLocale } from '../../locale/LocaleProvider';
import { useFlip } from '../../motion/useFlip';
import { cx } from '../../utils/cx';
import { getByPath } from '../../utils/object';
import { Checkbox } from '../Checkbox/Checkbox';
import type { Column } from '../DataTable/DataTable';
import { nextSort, sortRows, type SortMeta } from '../DataTable/sort';
import { Icon } from '../Icon/Icon';
import { Paginator } from '../Paginator/Paginator';
import { Skeleton } from '../Skeleton/Skeleton';
import { Spinner } from '../Spinner/Spinner';
import {
  checkState,
  findNode,
  flattenVisible,
  isRtl,
  nextSelection,
  selectionToSet,
  useLazyChildren,
  type FlatNode,
  type TreeKey,
  type TreeNode,
  type TreeSelectionMode,
  type TreeSelectionValue,
} from '../Tree/treeUtils';

export interface TreeTableProps<T> {
  value: TreeNode<T>[];
  columns: Column<T>[];
  caption?: ReactNode;
  captionHidden?: boolean;
  'aria-label'?: string;
  expandedKeys?: Set<TreeKey>;
  defaultExpandedKeys?: Set<TreeKey>;
  onToggle?: (expandedKeys: Set<TreeKey>) => void;
  selectionMode?: TreeSelectionMode | null;
  selection?: TreeSelectionValue;
  defaultSelection?: TreeSelectionValue;
  onSelectionChange?: (selection: TreeSelectionValue) => void;
  onLoadChildren?: (node: TreeNode<T>) => Promise<TreeNode<T>[]>;
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
  loading?: boolean;
  loadingRows?: number;
  emptyMessage?: ReactNode;
  striped?: boolean;
  hover?: boolean;
  bordered?: boolean;
  size?: 'sm' | 'md';
  header?: ReactNode;
  footer?: ReactNode;
  className?: string;
}

const ALIGN = { start: 'text-start', center: 'text-center', end: 'text-end' } as const;
const EMPTY_SET: Set<TreeKey> = new Set();
const columnKey = <T,>(c: Column<T>, i: number) => c.id ?? c.field ?? String(i);

function formatCell(value: unknown): ReactNode {
  if (value === null || value === undefined) return '';
  if (value instanceof Date) return value.toLocaleDateString();
  return String(value);
}

export function TreeTable<T>({
  value,
  columns,
  caption,
  captionHidden = false,
  expandedKeys: expandedProp,
  defaultExpandedKeys = EMPTY_SET,
  onToggle,
  selectionMode = null,
  selection: selectionProp,
  defaultSelection = null,
  onSelectionChange,
  onLoadChildren,
  sortMode = 'single',
  sort: sortProp,
  defaultSort = [],
  onSortChange,
  paginator = false,
  page: pageProp,
  defaultPage = 0,
  pageSize: pageSizeProp,
  defaultPageSize = 10,
  pageSizeOptions,
  onPageChange,
  loading = false,
  loadingRows = 5,
  emptyMessage,
  striped = false,
  hover = true,
  bordered = false,
  size = 'md',
  header,
  footer,
  className,
  ...rest
}: TreeTableProps<T>) {
  const { t, locale } = useLocale();
  const baseId = useId();
  const [expanded, setExpanded] = useControllableState<Set<TreeKey>>(expandedProp, defaultExpandedKeys, onToggle);
  const [selection, setSelection] = useControllableState<TreeSelectionValue>(selectionProp, defaultSelection, onSelectionChange);
  const [sort, setSort] = useControllableState<SortMeta[]>(sortProp, defaultSort, onSortChange);
  const [page, setPage] = useControllableState<number>(pageProp, defaultPage);
  const [pageSize, setPageSize] = useControllableState<number>(pageSizeProp, defaultPageSize);
  const [focusedKey, setFocusedKey] = useState<TreeKey | null>(null);
  const lazy = useLazyChildren<T>(onLoadChildren);

  // Sorting applies within siblings: each level is sorted independently.
  const sortableColumns = useMemo(
    () =>
      columns.map((c, i) => ({
        id: columnKey(c, i),
        field: c.field ? `data.${c.field}` : undefined,
        sortFn: c.sortFn ? (a: TreeNode<T>, b: TreeNode<T>) => c.sortFn!(a.data as T, b.data as T) : undefined,
      })),
    [columns],
  );
  const sortLevel = (nodes: TreeNode<T>[]) => sortRows(nodes, sort, sortableColumns, locale);
  const childrenOf = (node: TreeNode<T>) => {
    const kids = lazy.childrenOf(node);
    return kids ? sortLevel(kids) : undefined;
  };

  const sortedRoots = useMemo(() => sortLevel(value), [value, sort, sortableColumns, locale]); // eslint-disable-line react-hooks/exhaustive-deps
  const pageCount = Math.max(1, Math.ceil(sortedRoots.length / pageSize));
  const currentPage = Math.min(page, pageCount - 1);
  const roots = paginator ? sortedRoots.slice(currentPage * pageSize, (currentPage + 1) * pageSize) : sortedRoots;
  // Root-level pagination metadata so aria-posinset reflects the whole level.
  const rootOffset = paginator ? currentPage * pageSize : 0;

  const isOpen = (node: TreeNode<T>) => expanded.has(node.key);
  const flat = flattenVisible(roots, isOpen, childrenOf).map((f) =>
    f.level === 1 ? { ...f, setSize: sortedRoots.length, posInSet: f.posInSet + rootOffset } : f,
  );
  const activeKey = flat.some((f) => f.node.key === focusedKey) ? focusedKey : (flat[0]?.node.key ?? null);

  const checks = selectionMode === 'checkbox' ? checkState(value, selection, lazy.childrenOf) : null;
  const selectedKeys = selectionMode === 'single' || selectionMode === 'multiple' ? selectionToSet(selection) : null;

  const rowId = (key: TreeKey) => `${baseId}-row-${key}`;
  const focusRow = (key: TreeKey | undefined) => {
    if (key === undefined) return;
    setFocusedKey(key);
    document.getElementById(rowId(key))?.focus();
  };

  const setOpen = (node: TreeNode<T>, open: boolean) => {
    const next = new Set(expanded);
    if (open) {
      next.add(node.key);
      if (lazy.needsLoad(node)) void lazy.load(node);
    } else {
      next.delete(node.key);
    }
    setExpanded(next);
  };

  const activate = (node: TreeNode<T>) => {
    if (!selectionMode || node.disabled || node.selectable === false) return;
    const original = findNode(value, node.key, lazy.childrenOf) ?? node;
    setSelection(nextSelection(selectionMode, selection, original, value, lazy.childrenOf));
  };

  const typeahead = useTypeahead<FlatNode<T>>(flat, (f) => f.node.label);

  const handleKeyDown = (event: KeyboardEvent<HTMLTableSectionElement>) => {
    const target = event.target as HTMLElement;
    if (target.getAttribute('role') !== 'row' || event.altKey || event.ctrlKey || event.metaKey) return;
    const index = flat.findIndex((f) => f.node.key === activeKey);
    const current = flat[index];
    if (!current) return;
    const { node } = current;
    const open = lazy.isExpandable(node) && isOpen(node);
    const rtl = isRtl(target);
    let key = event.key;
    if (rtl && key === 'ArrowRight') key = 'ArrowLeft';
    else if (rtl && key === 'ArrowLeft') key = 'ArrowRight';
    switch (key) {
      case 'ArrowDown':
        focusRow(flat[index + 1]?.node.key);
        break;
      case 'ArrowUp':
        focusRow(flat[index - 1]?.node.key);
        break;
      case 'Home':
        focusRow(flat[0]?.node.key);
        break;
      case 'End':
        focusRow(flat[flat.length - 1]?.node.key);
        break;
      case 'ArrowRight':
        if (!lazy.isExpandable(node) || node.disabled) break;
        if (!open) setOpen(node, true);
        else focusRow(flat[index + 1]?.node.key);
        break;
      case 'ArrowLeft':
        if (open) setOpen(node, false);
        else if (current.parentKey !== null) focusRow(current.parentKey);
        break;
      case 'Enter':
      case ' ':
        if (selectionMode) activate(node);
        else if (event.key === 'Enter' && lazy.isExpandable(node) && !node.disabled) setOpen(node, !open);
        break;
      default: {
        if (event.key.length === 1) {
          const match = typeahead(event.key, index);
          if (match !== -1) focusRow(flat[match]?.node.key);
          break;
        }
        return;
      }
    }
    event.preventDefault();
  };

  const handleRowClick = (event: MouseEvent<HTMLTableRowElement>, node: TreeNode<T>) => {
    setFocusedKey(node.key);
    if ((event.target as HTMLElement).closest('.ui-tree-table__toggler')) {
      if (lazy.isExpandable(node) && !node.disabled) setOpen(node, !isOpen(node));
      return;
    }
    if ((event.target as HTMLElement).closest('button, a, input, select, textarea')) return;
    activate(node);
  };

  const handlePage = (next: number, nextSize: number) => {
    setPage(next);
    setPageSize(nextSize);
    onPageChange?.(next, nextSize);
  };

  const hasData = flat.length > 0;
  // Expanding or sorting moves rows with FLIP; rows that appear fade in (transform/opacity only, at most 8 rows).
  const bodyRef = useRef<HTMLTableSectionElement | null>(null);
  useFlip(bodyRef, [flat.map((f) => String(f.node.key)).join('\u0001')], { selector: 'tr.ui-tree-table__row' });

  return (
    <div className={cx('ui-data-table ui-tree-table', size === 'sm' && 'ui-data-table--sm', className)}>
      {header && <div className="ui-data-table__toolbar">{header}</div>}
      <div className="table-responsive ui-data-table__wrapper">
        <table
          // eslint-disable-next-line jsx-a11y/no-noninteractive-element-to-interactive-role -- APG treegrid
          role="treegrid"
          className={cx('table align-middle mb-0', striped && 'table-striped', hover && 'table-hover', bordered && 'table-bordered', size === 'sm' && 'table-sm')}
          aria-busy={loading || undefined}
          aria-label={caption ? undefined : rest['aria-label']}
          aria-multiselectable={selectionMode === 'multiple' || selectionMode === 'checkbox' || undefined}
        >
          {caption && <caption className={cx('ui-data-table__caption', captionHidden && 'visually-hidden')}>{caption}</caption>}
          <thead className="ui-data-table__head">
            <tr role="row">
              {columns.map((column, index) => {
                const key = columnKey(column, index);
                const sortIndex = sort.findIndex((s) => s.field === key);
                const meta = sort[sortIndex];
                const ariaSort = column.sortable ? (meta ? (meta.order === 1 ? 'ascending' : 'descending') : 'none') : undefined;
                return (
                  <th key={key} role="columnheader" scope="col" aria-sort={ariaSort} style={column.width ? { width: column.width } : undefined} className={cx(column.align && ALIGN[column.align], column.headerClassName)}>
                    {column.sortable ? (
                      <button
                        type="button"
                        className={cx('ui-data-table__sort', column.align === 'end' && 'flex-row-reverse', meta && 'ui-data-table__sort--active')}
                        onClick={(e) => setSort(nextSort(sort, key, sortMode === 'multiple' && e.shiftKey))}
                      >
                        <span>{column.header}</span>
                        <Icon name={meta ? (meta.order === 1 ? 'chevron-up' : 'chevron-down') : 'sort'} size="sm" className="ui-data-table__sort-icon" />
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
          {/* Row keyboard handling (APG treegrid) lives on the rowgroup. */}
          {/* eslint-disable-next-line jsx-a11y/no-noninteractive-element-interactions */}
          <tbody ref={bodyRef} className="ui-data-table__body" onKeyDown={handleKeyDown}>
            {loading &&
              Array.from({ length: loadingRows }, (_, r) => (
                <tr key={`loading-${r}`} role="row" aria-hidden="true">
                  {columns.map((c, i) => (
                    <td key={columnKey(c, i)} role="gridcell">
                      <Skeleton />
                    </td>
                  ))}
                </tr>
              ))}
            {!loading && !hasData && (
              <tr role="row" className="ui-data-table__empty">
                <td role="gridcell" colSpan={columns.length} className="text-center text-body-secondary py-4">
                  {emptyMessage ?? t('noRecords')}
                </td>
              </tr>
            )}
            {!loading &&
              flat.map(({ node, level, setSize, posInSet }, rowIndex) => {
                const expandable = lazy.isExpandable(node);
                const open = expandable && isOpen(node);
                const isLoading = lazy.loading.has(node.key);
                const isChecked = checks?.checked.has(node.key) ?? false;
                const isPartial = checks?.partial.has(node.key) ?? false;
                const isSelected = selectedKeys?.has(node.key) ?? false;
                const highlighted = isSelected || (selectionMode === 'checkbox' && isChecked);
                return (
                  <tr
                    key={node.key}
                    id={rowId(node.key)}
                    role="row"
                    aria-level={level}
                    aria-setsize={setSize}
                    aria-posinset={posInSet}
                    aria-expanded={expandable ? open : undefined}
                    aria-selected={selectionMode && selectionMode !== 'checkbox' ? isSelected : undefined}
                    aria-checked={selectionMode === 'checkbox' ? (isPartial ? 'mixed' : isChecked) : undefined}
                    aria-disabled={node.disabled || undefined}
                    aria-busy={isLoading || undefined}
                    tabIndex={activeKey === node.key ? 0 : -1}
                    style={{ '--ui-tree-level': level } as CSSProperties}
                    className={cx('ui-tree-table__row', highlighted && 'table-active ui-data-table__row--selected', selectionMode && 'ui-tree-table__row--selectable')}
                    onFocus={(e) => {
                      if (e.target === e.currentTarget) setFocusedKey(node.key);
                    }}
                    onClick={(e) => handleRowClick(e, node)}
                  >
                    {columns.map((column, index) => (
                      <td key={columnKey(column, index)} role="gridcell" className={cx(column.align && ALIGN[column.align], column.align === 'end' && 'ui-tabular', column.className)}>
                        {index === 0 && (
                          <span className="ui-tree-table__cell-start" style={{ paddingInlineStart: `calc(var(--ui-tree-table-indent) * ${level - 1})` }}>
                            <span className={cx('ui-tree-table__toggler', !expandable && 'ui-tree-table__toggler--empty')} aria-hidden="true">
                              {isLoading ? <Spinner size="sm" decorative /> : expandable ? <Icon name="chevron-right" directional className={cx('ui-tree-table__chevron', open && 'ui-tree-table__chevron--open')} /> : null}
                            </span>
                            {selectionMode === 'checkbox' && node.selectable !== false && (
                              <Checkbox aria-label={node.label} tabIndex={-1} checked={isChecked} indeterminate={isPartial} disabled={node.disabled} onChange={() => activate(node)} />
                            )}
                          </span>
                        )}
                        {column.body ? column.body(node.data as T, { rowIndex }) : formatCell(column.field && node.data !== undefined ? getByPath(node.data, column.field) : index === 0 ? node.label : undefined)}
                        {index === 0 && isLoading && <span className="visually-hidden">{t('loading')}</span>}
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
          {paginator && <Paginator page={currentPage} pageSize={pageSize} total={sortedRoots.length} onPageChange={handlePage} pageSizeOptions={pageSizeOptions} size="sm" />}
        </div>
      )}
    </div>
  );
}
