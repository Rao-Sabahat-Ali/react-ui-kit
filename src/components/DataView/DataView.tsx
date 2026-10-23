import { useMemo, type ReactNode } from 'react';
import { useControllableState } from '../../hooks/useControllableState';
import { useLocale } from '../../locale/LocaleProvider';
import { cx } from '../../utils/cx';
import { getByPath } from '../../utils/object';
import { sortRows } from '../DataTable/sort';
import { EmptyState } from '../EmptyState/EmptyState';
import { Paginator } from '../Paginator/Paginator';
import { Skeleton } from '../Skeleton/Skeleton';

export type DataViewLayout = 'list' | 'grid';

export interface DataViewColumns {
  xs?: number;
  sm?: number;
  md?: number;
  lg?: number;
  xl?: number;
}

export interface DataViewProps<T> {
  data: T[];
  layout?: DataViewLayout;
  itemTemplate: (item: T, layout: DataViewLayout) => ReactNode;
  gridColumns?: DataViewColumns;
  dataKey?: keyof T & string;
  paginator?: boolean;
  page?: number;
  defaultPage?: number;
  pageSize?: number;
  defaultPageSize?: number;
  pageSizeOptions?: number[];
  onPageChange?: (page: number, pageSize: number) => void;
  sortField?: string;
  sortOrder?: 1 | -1;
  loading?: boolean;
  /** Number of skeleton cards while loading. */
  loadingItems?: number;
  emptyMessage?: ReactNode;
  header?: ReactNode;
  className?: string;
  'aria-label'?: string;
}

const DEFAULT_COLUMNS: DataViewColumns = { xs: 1, sm: 2, lg: 3, xl: 4 };

function gridClasses(columns: DataViewColumns): string[] {
  return (Object.entries(columns) as [keyof DataViewColumns, number | undefined][])
    .filter(([, n]) => n !== undefined)
    .map(([bp, n]) => (bp === 'xs' ? `row-cols-${n}` : `row-cols-${bp}-${n}`));
}

export function DataView<T>({
  data,
  layout = 'grid',
  itemTemplate,
  gridColumns = DEFAULT_COLUMNS,
  dataKey = 'id' as keyof T & string,
  paginator = false,
  page: pageProp,
  defaultPage = 0,
  pageSize: pageSizeProp,
  defaultPageSize = 12,
  pageSizeOptions,
  onPageChange,
  sortField,
  sortOrder = 1,
  loading = false,
  loadingItems = 6,
  emptyMessage,
  header,
  className,
  ...rest
}: DataViewProps<T>) {
  const { t, locale } = useLocale();
  const [page, setPage] = useControllableState<number>(pageProp, defaultPage);
  const [pageSize, setPageSize] = useControllableState<number>(pageSizeProp, defaultPageSize);

  const sorted = useMemo(() => (sortField ? sortRows(data, [{ field: sortField, order: sortOrder }], [], locale) : data), [data, sortField, sortOrder, locale]);
  const pageCount = Math.max(1, Math.ceil(sorted.length / pageSize));
  const currentPage = Math.min(page, pageCount - 1);
  const items = paginator ? sorted.slice(currentPage * pageSize, (currentPage + 1) * pageSize) : sorted;

  const handlePage = (next: number, nextSize: number) => {
    setPage(next);
    setPageSize(nextSize);
    onPageChange?.(next, nextSize);
  };

  const listClass = cx('ui-data-view__items list-unstyled mb-0', layout === 'grid' ? cx('row g-3', ...gridClasses(gridColumns)) : 'd-flex flex-column gap-3');
  const cellClass = layout === 'grid' ? 'col ui-data-view__item' : 'ui-data-view__item';

  return (
    <div className={cx('ui-data-view', `ui-data-view--${layout}`, className)}>
      {header && <div className="ui-data-view__header">{header}</div>}
      {loading ? (
        <>
          {/* role="list" restores list semantics removed by list-style: none in Safari (spec). */}
          {/* eslint-disable-next-line jsx-a11y/no-redundant-roles */}
          <ul className={listClass} role="list" aria-busy="true" aria-label={rest['aria-label']}>
            {Array.from({ length: loadingItems }, (_, i) => (
              <li key={i} className={cx(cellClass, 'ui-data-view__skeleton')} aria-hidden="true">
                <div className="card p-3">
                  <Skeleton shape="rect" height="6rem" className="mb-2 d-block" />
                  <Skeleton lines={2} />
                </div>
              </li>
            ))}
          </ul>
          <span className="visually-hidden" role="status">
            {t('loading')}
          </span>
        </>
      ) : items.length === 0 ? (
        <div className="ui-data-view__empty">{emptyMessage ?? <EmptyState size="sm" variant="empty" title={t('noRecords')} />}</div>
      ) : (
        // eslint-disable-next-line jsx-a11y/no-redundant-roles -- restores list semantics removed by list-style: none in Safari
        <ul className={listClass} role="list" aria-label={rest['aria-label']}>
          {items.map((item, index) => (
            <li key={String(getByPath(item, dataKey) ?? index)} className={cellClass}>
              {itemTemplate(item, layout)}
            </li>
          ))}
        </ul>
      )}
      {paginator && !loading && sorted.length > 0 && (
        <div className="ui-data-view__footer">
          <Paginator page={currentPage} pageSize={pageSize} total={sorted.length} onPageChange={handlePage} pageSizeOptions={pageSizeOptions} size="sm" />
        </div>
      )}
    </div>
  );
}
