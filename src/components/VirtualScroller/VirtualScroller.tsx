import { useCallback, useEffect, useImperativeHandle, useLayoutEffect, useRef, useState, type CSSProperties, type HTMLAttributes, type ReactNode, type Ref } from 'react';
import { cx } from '../../utils/cx';

export interface VirtualRange {
  first: number;
  last: number;
}

export interface VirtualScrollerHandle {
  /** Scroll so the item at `index` is at the start of the viewport. */
  scrollToIndex: (index: number, behavior?: ScrollBehavior) => void;
  /** The scroll viewport element. */
  element: HTMLDivElement | null;
}

export interface VirtualScrollerProps<T> extends Omit<HTMLAttributes<HTMLDivElement>, 'children'> {
  items: T[];
  /** Pixels. A number for vertical/horizontal, `[width, height]` for `orientation="both"` (grid). */
  itemSize: number | [number, number];
  orientation?: 'vertical' | 'horizontal' | 'both';
  /** CSS size of the viewport (height, or width for horizontal). */
  height?: string;
  /** Extra items rendered before and after the visible window. */
  overscan?: number;
  itemTemplate: (item: T, ctx: { index: number }) => ReactNode;
  /** Fixed column count for `orientation="both"`; derived from the viewport width when omitted. */
  columns?: number;
  /** Fires with the rendered range whenever it changes (and on mount). */
  lazy?: boolean;
  onLazyLoad?: (range: VirtualRange) => void;
  itemRole?: string;
  contentRole?: string;
  ref?: Ref<VirtualScrollerHandle>;
}

export function VirtualScroller<T>({
  items,
  itemSize,
  orientation = 'vertical',
  height,
  overscan = 5,
  itemTemplate,
  columns: columnsProp,
  lazy = false,
  onLazyLoad,
  itemRole = 'listitem',
  contentRole = 'list',
  className,
  style,
  ref,
  ...rest
}: VirtualScrollerProps<T>) {
  const viewportRef = useRef<HTMLDivElement | null>(null);
  const [scroll, setScroll] = useState({ top: 0, left: 0 });
  const [size, setSize] = useState({ width: 0, height: 0 });
  const frame = useRef(0);

  const [itemW, itemH] = Array.isArray(itemSize) ? itemSize : orientation === 'horizontal' ? [itemSize, 0] : [0, itemSize];
  const horizontal = orientation === 'horizontal';
  const grid = orientation === 'both';
  const columns = grid ? Math.max(1, columnsProp ?? Math.floor((size.width || itemW) / itemW)) : 1;
  const unit = horizontal ? itemW : itemH;
  const lines = grid ? Math.ceil(items.length / columns) : items.length;
  const total = lines * unit;
  const viewport = horizontal ? size.width : size.height;
  const position = horizontal ? scroll.left : scroll.top;

  const firstLine = Math.max(0, Math.floor(position / unit) - overscan);
  const lastLine = Math.min(lines - 1, Math.ceil((position + viewport) / unit) + overscan - 1);
  const first = firstLine * columns;
  const last = Math.min(items.length - 1, (lastLine + 1) * columns - 1);

  const measure = useCallback(() => {
    const el = viewportRef.current;
    if (!el) return;
    setSize((prev) => (prev.width === el.clientWidth && prev.height === el.clientHeight ? prev : { width: el.clientWidth, height: el.clientHeight }));
  }, []);

  useLayoutEffect(() => {
    measure();
    const el = viewportRef.current;
    if (!el || typeof ResizeObserver === 'undefined') return;
    const observer = new ResizeObserver(measure);
    observer.observe(el);
    return () => observer.disconnect();
  }, [measure]);

  useEffect(() => () => cancelAnimationFrame(frame.current), []);

  // rAF-throttled scroll handler: at most one state update per frame.
  const handleScroll = () => {
    if (frame.current) return;
    frame.current = requestAnimationFrame(() => {
      frame.current = 0;
      const el = viewportRef.current;
      if (el) setScroll({ top: el.scrollTop, left: el.scrollLeft });
    });
  };

  useImperativeHandle(
    ref,
    () => ({
      get element() {
        return viewportRef.current;
      },
      scrollToIndex(index, behavior = 'auto') {
        const el = viewportRef.current;
        if (!el || items.length === 0) return;
        const clamped = Math.min(Math.max(0, index), items.length - 1);
        const offset = Math.floor(clamped / columns) * unit;
        const max = Math.max(0, total - viewport);
        const target = Math.min(offset, max);
        if (horizontal) {
          el.scrollLeft = target;
          el.scrollTo?.({ left: target, behavior });
        } else {
          el.scrollTop = target;
          el.scrollTo?.({ top: target, behavior });
        }
        setScroll({ top: el.scrollTop, left: el.scrollLeft });
      },
    }),
    [items.length, columns, unit, total, viewport, horizontal],
  );

  const onLazyLoadRef = useRef(onLazyLoad);
  onLazyLoadRef.current = onLazyLoad;
  useEffect(() => {
    if (lazy && last >= first) onLazyLoadRef.current?.({ first, last });
  }, [lazy, first, last]);

  const visible: ReactNode[] = [];
  for (let index = first; index <= last; index++) {
    visible.push(
      <div
        key={index}
        role={itemRole}
        aria-setsize={items.length}
        aria-posinset={index + 1}
        className="ui-virtual-scroller__item"
        style={{ width: horizontal || grid ? itemW : undefined, height: horizontal ? undefined : itemH }}
      >
        {itemTemplate(items[index]!, { index })}
      </div>,
    );
  }

  const offset = firstLine * unit;
  const spacer: CSSProperties = horizontal ? { width: total, height: '100%' } : { height: total, width: grid ? columns * itemW : undefined };
  const content: CSSProperties = {
    transform: horizontal ? `translate3d(${offset}px, 0, 0)` : `translate3d(0, ${offset}px, 0)`,
    display: horizontal ? 'flex' : grid ? 'grid' : 'block',
    gridTemplateColumns: grid ? `repeat(${columns}, ${itemW}px)` : undefined,
  };

  return (
    <div
      ref={viewportRef}
      // A scrollable region must be keyboard reachable (WCAG 2.1.1).
      tabIndex={0}
      role="region"
      className={cx('ui-virtual-scroller', `ui-virtual-scroller--${orientation}`, className)}
      style={{ ...(horizontal ? { width: height } : { height }), ...style }}
      onScroll={handleScroll}
      {...rest}
    >
      <div className="ui-virtual-scroller__spacer" style={spacer}>
        <div className="ui-virtual-scroller__content" role={contentRole} style={content}>
          {visible}
        </div>
      </div>
    </div>
  );
}
