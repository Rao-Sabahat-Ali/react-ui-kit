import { useId, useRef } from 'react';
import { useSlidingMark } from '../../hooks/useSlidingMark';
import { useLocale } from '../../locale/LocaleProvider';
import { cx } from '../../utils/cx';
import type { Size } from '../../types';
import { Icon, type IconName } from '../Icon/Icon';
import { Select } from '../Select/Select';

export interface PaginatorProps {
  page: number;
  pageSize?: number;
  total: number;
  onPageChange: (page: number, pageSize: number) => void;
  pageSizeOptions?: number[];
  siblings?: number;
  showReport?: boolean;
  showFirstLast?: boolean;
  size?: Size;
  className?: string;
}

export type PageItem = number | 'ellipsis-start' | 'ellipsis-end';

/**
 * Page window with a constant number of slots (first, last, current ± siblings, ellipses),
 * so the control doesn't change width while paging. Returns 0-based pages.
 */
export function getPageItems(page: number, pageCount: number, siblings = 1): PageItem[] {
  if (pageCount <= 0) return [];
  if (pageCount <= siblings * 2 + 5) return Array.from({ length: pageCount }, (_, i) => i);
  // 1-based arithmetic with one boundary page on each side.
  const current = page + 1;
  const start = Math.max(Math.min(current - siblings, pageCount - siblings * 2 - 2), 3);
  const end = Math.min(Math.max(current + siblings, siblings * 2 + 3), pageCount - 2);
  const items: PageItem[] = [0];
  items.push(start > 3 ? 'ellipsis-start' : 1);
  for (let i = start; i <= end; i++) items.push(i - 1);
  items.push(end < pageCount - 2 ? 'ellipsis-end' : pageCount - 2);
  items.push(pageCount - 1);
  return items;
}

export function Paginator({ page, pageSize = 25, total, onPageChange, pageSizeOptions = [10, 25, 50, 100], siblings = 1, showReport = true, showFirstLast = true, size = 'md', className }: PaginatorProps) {
  const { t } = useLocale();
  const sizeLabelId = useId();
  const listRef = useRef<HTMLUListElement | null>(null);
  const pageCount = Math.max(1, Math.ceil(total / pageSize));
  const current = Math.min(Math.max(page, 0), pageCount - 1);
  const first = total === 0 ? 0 : current * pageSize + 1;
  const last = Math.min(total, (current + 1) * pageSize);
  const go = (next: number) => {
    if (next !== current && next >= 0 && next < pageCount) onPageChange(next, pageSize);
  };

  // The accent mark slides under the current page (the same mark Tabs draws).
  useSlidingMark(listRef, { target: '.ui-paginator__page[aria-current="page"]' }, [current, pageCount, siblings, showFirstLast, size]);

  const navButton = (target: number, icon: IconName, label: string, disabled: boolean) => (
    <li className={cx('page-item', disabled && 'disabled')}>
      <button type="button" className="page-link ui-paginator__nav" aria-label={label} aria-disabled={disabled || undefined} onClick={() => !disabled && go(target)}>
        <Icon name={icon} />
      </button>
    </li>
  );

  return (
    <div className={cx('ui-paginator d-flex flex-wrap align-items-center gap-3', className)}>
      {showReport && (
        <span className="ui-paginator__report text-body-secondary small">
          {t('paginationReport', { first, last, total })}
        </span>
      )}
      <nav aria-label={t('pagination')} className="ui-paginator__nav-wrapper">
        <ul ref={listRef} className={cx('pagination mb-0 ui-paginator__list', size === 'sm' && 'pagination-sm', size === 'lg' && 'pagination-lg')}>
          {showFirstLast && navButton(0, 'chevrons-left', t('firstPage'), current === 0)}
          {navButton(current - 1, 'chevron-left', t('previousPage'), current === 0)}
          {getPageItems(current, pageCount, siblings).map((item) =>
            typeof item === 'number' ? (
              <li key={item} className={cx('page-item', item === current && 'active')}>
                <button
                  type="button"
                  className="page-link ui-paginator__page"
                  aria-label={t('page', { page: item + 1 })}
                  aria-current={item === current ? 'page' : undefined}
                  onClick={() => go(item)}
                >
                  {item + 1}
                </button>
              </li>
            ) : (
              <li key={item} className="page-item disabled" aria-hidden="true">
                <span className="page-link ui-paginator__ellipsis">…</span>
              </li>
            ),
          )}
          {navButton(current + 1, 'chevron-right', t('nextPage'), current >= pageCount - 1)}
          {showFirstLast && navButton(pageCount - 1, 'chevrons-right', t('lastPage'), current >= pageCount - 1)}
        </ul>
      </nav>
      {pageSizeOptions.length > 0 && (
        <span className="ui-paginator__size d-inline-flex align-items-center gap-2">
          <span id={sizeLabelId} className="small text-body-secondary">
            {t('rowsPerPage')}
          </span>
          <span style={{ width: '5.5rem' }}>
            <Select
              native
              size="sm"
              aria-label={t('rowsPerPage')}
              options={pageSizeOptions.map((n) => ({ label: String(n), value: n }))}
              value={pageSize}
              onChange={(next) => next !== null && onPageChange(0, next)}
              required
            />
          </span>
        </span>
      )}
    </div>
  );
}
