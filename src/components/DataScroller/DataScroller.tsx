import { useEffect, useRef, useState, type CSSProperties, type HTMLAttributes, type ReactNode, type Ref } from 'react';
import { useLocale } from '../../locale/LocaleProvider';
import { cx } from '../../utils/cx';
import { getByPath } from '../../utils/object';
import { Button } from '../Button/Button';
import { EmptyState } from '../EmptyState/EmptyState';
import { Skeleton } from '../Skeleton/Skeleton';

export interface DataScrollerProps<T> extends Omit<HTMLAttributes<HTMLDivElement>, 'children' | 'onError'> {
  /** Everything loaded so far. */
  items: T[];
  itemTemplate: (item: T, index: number) => ReactNode;
  /** Request the next chunk. Never called while a previous call is pending. */
  loadMore: () => void | Promise<void>;
  /** More data exists; `false` ends the list. */
  hasMore?: boolean;
  /** Overrides the loading state; omitted, it follows the promise returned by `loadMore`. */
  loading?: boolean;
  /** Overrides the error state; `true` shows the locale message. Omitted, a rejected promise sets it. */
  error?: ReactNode | boolean;
  scrollTarget?: 'inline' | 'window';
  /** Scroll box height (inline only). */
  height?: string | number;
  /** `auto` loads when the end nears the viewport; `manual` only on the button. */
  loadMode?: 'auto' | 'manual';
  rootMargin?: string;
  dataKey?: keyof T & string;
  /** Skeleton rows while loading. */
  loadingItems?: number;
  emptyMessage?: ReactNode;
  header?: ReactNode;
  ref?: Ref<HTMLDivElement>;
}

export function DataScroller<T>({
  items,
  itemTemplate,
  loadMore,
  hasMore = true,
  loading: loadingProp,
  error: errorProp,
  scrollTarget = 'inline',
  height = '24rem',
  loadMode = 'auto',
  rootMargin = '200px',
  dataKey,
  loadingItems = 3,
  emptyMessage,
  header,
  className,
  ref,
  'aria-label': ariaLabel,
  ...rest
}: DataScrollerProps<T>) {
  const { t, tp } = useLocale();
  const inline = scrollTarget === 'inline';
  const [internalLoading, setInternalLoading] = useState(false);
  const [internalError, setInternalError] = useState(false);
  const loading = loadingProp ?? internalLoading;
  const error: ReactNode | boolean = errorProp !== undefined ? errorProp : internalError;
  const hasError = Boolean(error);

  const viewportRef = useRef<HTMLDivElement | null>(null);
  const sentinelRef = useRef<HTMLDivElement | null>(null);
  const buttonFocused = useRef(false);
  // Items present on first render sit still; items appended later slide in.
  const initialCount = useRef(items.length);
  const inFlight = useRef(false);
  const latest = useRef({ loading, hasMore, loadMore });
  latest.current = { loading, hasMore, loadMore };
  const mounted = useRef(true);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  const request = () => {
    const current = latest.current;
    if (inFlight.current || current.loading || !current.hasMore) return;
    inFlight.current = true;
    setInternalError(false);
    const done = (failed: boolean) => {
      inFlight.current = false;
      if (!mounted.current) return;
      setInternalLoading(false);
      if (failed) setInternalError(true);
    };
    let result: void | Promise<void>;
    try {
      result = current.loadMore();
    } catch {
      done(true);
      return;
    }
    if (result && typeof result.then === 'function') {
      setInternalLoading(true);
      result.then(
        () => done(false),
        () => done(true),
      );
    } else {
      inFlight.current = false;
    }
  };
  const requestRef = useRef(request);
  requestRef.current = request;

  // Auto mode: load when the end sentinel nears the viewport. Re-observing after each state change
  // re-checks a sentinel that is still visible (short chunk, tall viewport).
  useEffect(() => {
    if (loadMode !== 'auto' || !hasMore || loading || hasError || typeof IntersectionObserver === 'undefined') return;
    const sentinel = sentinelRef.current;
    if (!sentinel) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) requestRef.current();
      },
      { root: inline ? viewportRef.current : null, rootMargin },
    );
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [loadMode, hasMore, loading, hasError, inline, rootMargin, items.length]);

  // Live-region announcements.
  const [announcement, setAnnouncement] = useState({ text: '', n: 0 });
  const previous = useRef({ length: items.length, hasMore });
  useEffect(() => {
    const before = previous.current;
    const parts: string[] = [];
    if (items.length > before.length) parts.push(tp('itemsLoaded', items.length - before.length));
    if (before.hasMore && !hasMore && items.length > 0) parts.push(t('endOfList'));
    previous.current = { length: items.length, hasMore };
    if (parts.length) setAnnouncement((a) => ({ text: parts.join('. '), n: a.n + 1 }));
    if (before.hasMore && !hasMore && buttonFocused.current) {
      buttonFocused.current = false;
      viewportRef.current?.focus();
    }
  }, [items.length, hasMore, t, tp]);

  const keyOf = (item: T, index: number) => {
    const key = dataKey ? getByPath(item, dataKey) : undefined;
    return key === undefined || key === null ? index : String(key);
  };

  const skeletons = (
    <>
      {Array.from({ length: loadingItems }, (_, i) => (
        <li key={`sk-${i}`} className="ui-data-scroller__item ui-data-scroller__skeleton" aria-hidden="true">
          <Skeleton lines={2} />
        </li>
      ))}
    </>
  );

  const empty = !loading && !hasError && items.length === 0 && !hasMore;
  const showInitialSkeleton = loading && items.length === 0;
  const viewportStyle: CSSProperties | undefined = inline ? { height } : undefined;

  return (
    <div ref={ref} className={cx('ui-data-scroller', `ui-data-scroller--${scrollTarget}`, className)} {...rest}>
      {header && <div className="ui-data-scroller__header">{header}</div>}
      <div
        ref={(node) => {
          viewportRef.current = node;
        }}
        role="region"
        aria-label={ariaLabel}
        aria-busy={loading || undefined}
        tabIndex={inline ? 0 : -1}
        className="ui-data-scroller__viewport"
        style={viewportStyle}
      >
        {empty ? (
          <div className="ui-data-scroller__empty">{emptyMessage ?? <EmptyState size="sm" variant="empty" title={t('noRecords')} />}</div>
        ) : (
          // eslint-disable-next-line jsx-a11y/no-redundant-roles -- restores list semantics removed by list-style: none in Safari
          <ul className="ui-data-scroller__items list-unstyled mb-0" role="list">
            {items.map((item, index) => (
              <li key={keyOf(item, index)} className={cx('ui-data-scroller__item', index >= initialCount.current && 'ui-data-scroller__item--new')}>
                {itemTemplate(item, index)}
              </li>
            ))}
            {showInitialSkeleton && skeletons}
          </ul>
        )}
        <div ref={sentinelRef} className="ui-data-scroller__sentinel" aria-hidden="true" />
        <div className="ui-data-scroller__footer">
          {hasError ? (
            <div role="alert" className="ui-data-scroller__error">
              <span>{error === true ? t('loadFailed') : error}</span>
              <Button size="sm" appearance="outline" variant="secondary" onClick={() => request()}>
                {t('retry')}
              </Button>
            </div>
          ) : hasMore ? (
            <>
              {loading && items.length > 0 && (
                <ul className="list-unstyled mb-0 w-100" aria-hidden="true">
                  {skeletons}
                </ul>
              )}
              <button type="button"
                className="btn btn-outline-secondary btn-sm ui-data-scroller__more"
                aria-disabled={loading || undefined}
                onFocus={() => (buttonFocused.current = true)}
                onBlur={() => (buttonFocused.current = false)}
                onClick={() => request()}
              >
                {loading ? t('loadingMore') : t('loadMore')}
              </button>
            </>
          ) : (
            items.length > 0 && <p className="ui-data-scroller__end mb-0">{t('endOfList')}</p>
          )}
        </div>
      </div>
      <span role="status" className="visually-hidden">
        <span key={announcement.n}>{announcement.text}</span>
      </span>
    </div>
  );
}
