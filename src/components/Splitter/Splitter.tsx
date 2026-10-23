import { Children, Fragment, isValidElement, useEffect, useId, useRef, useState, type CSSProperties, type HTMLAttributes, type KeyboardEvent, type PointerEvent, type ReactElement, type ReactNode, type Ref } from 'react';
import { useLocale } from '../../locale/LocaleProvider';
import { cx } from '../../utils/cx';

export interface SplitterPanelProps {
  /** Initial size in percent; panels without a size share the remainder equally. */
  size?: number;
  /** Minimum size in percent (default 0). */
  minSize?: number;
  className?: string;
  children?: ReactNode;
}

/** Declarative pane; the parent Splitter reads its props and renders the pane element. */
export function SplitterPanel(_props: SplitterPanelProps): null {
  return null;
}

export interface SplitterProps extends Omit<HTMLAttributes<HTMLDivElement>, 'children'> {
  layout?: 'horizontal' | 'vertical';
  onResizeEnd?: (sizes: number[]) => void;
  /** Persist sizes in localStorage under `ui:splitter:<stateKey>`. */
  stateKey?: string;
  children?: ReactNode;
  ref?: Ref<HTMLDivElement>;
}

const storageKey = (key: string) => (key.startsWith('ui:') ? key : `ui:splitter:${key}`);

function loadSizes(key: string | undefined, count: number): number[] | null {
  if (!key) return null;
  try {
    const raw = localStorage.getItem(storageKey(key));
    if (!raw) return null;
    const parsed: unknown = JSON.parse(raw);
    if (Array.isArray(parsed) && parsed.length === count && parsed.every((n) => typeof n === 'number' && Number.isFinite(n) && n >= 0)) return parsed as number[];
  } catch {
    // storage unavailable or corrupt: ignore
  }
  return null;
}

function saveSizes(key: string | undefined, sizes: number[]) {
  if (!key) return;
  try {
    localStorage.setItem(storageKey(key), JSON.stringify(sizes.map((n) => Math.round(n * 100) / 100)));
  } catch {
    // ignore (private mode, quota)
  }
}

function initialSizes(panels: SplitterPanelProps[]): number[] {
  const fixed = panels.reduce((sum, p) => sum + (p.size ?? 0), 0);
  const free = panels.filter((p) => p.size === undefined).length;
  const each = free ? Math.max(0, 100 - fixed) / free : 0;
  const raw = panels.map((p) => p.size ?? each);
  const total = raw.reduce((a, b) => a + b, 0) || 1;
  return raw.map((n) => (n / total) * 100);
}

export function Splitter({ layout = 'horizontal', onResizeEnd, stateKey, className, children, ref, ...rest }: SplitterProps) {
  const { t } = useLocale();
  const uid = useId();
  const panels = Children.toArray(children).filter((c): c is ReactElement<SplitterPanelProps> => isValidElement(c) && c.type === SplitterPanel);
  const count = panels.length;
  const mins = panels.map((p) => p.props.minSize ?? 0);

  const [sizes, setSizes] = useState<number[]>(() => loadSizes(stateKey, count) ?? initialSizes(panels.map((p) => p.props)));
  const sizesRef = useRef(sizes);
  sizesRef.current = sizes;
  const collapsed = useRef(new Map<number, [number, number]>());
  const rootRef = useRef<HTMLDivElement | null>(null);
  const drag = useRef<{ index: number; start: number; sizes: number[]; area: number } | null>(null);
  const [dragging, setDragging] = useState<number | null>(null);

  // Keep state consistent if the number of panels changes.
  // Runs after every render on purpose (children can change); guarded against loops.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (sizes.length !== count) setSizes(initialSizes(panels.map((p) => p.props)));
  });

  const horizontal = layout === 'horizontal';
  const isRtl = () => rootRef.current !== null && getComputedStyle(rootRef.current).direction === 'rtl';

  const commit = (next: number[]) => {
    sizesRef.current = next;
    setSizes(next);
  };
  const finish = () => {
    saveSizes(stateKey, sizesRef.current);
    onResizeEnd?.(sizesRef.current);
  };

  /** Move the boundary after pane `i` so pane `i` becomes `target` percent, honouring both min sizes. */
  const setPrimary = (base: number[], i: number, target: number): number[] => {
    const pair = base[i]! + base[i + 1]!;
    const a = Math.min(Math.max(target, mins[i]!), Math.max(mins[i]!, pair - mins[i + 1]!));
    const next = base.slice();
    next[i] = a;
    next[i + 1] = pair - a;
    return next;
  };

  const handlePointerDown = (event: PointerEvent<HTMLDivElement>, i: number) => {
    if (event.button !== 0 || !rootRef.current) return;
    event.preventDefault();
    const rect = rootRef.current.getBoundingClientRect();
    const total = horizontal ? rect.width : rect.height;
    const gutters = Array.from(rootRef.current.querySelectorAll<HTMLElement>(':scope > .ui-splitter__gutter')).reduce((sum, g) => sum + (horizontal ? g.offsetWidth : g.offsetHeight), 0);
    drag.current = { index: i, start: horizontal ? event.clientX : event.clientY, sizes: sizesRef.current.slice(), area: Math.max(1, total - gutters) };
    event.currentTarget.setPointerCapture?.(event.pointerId);
    setDragging(i);
  };

  const handlePointerMove = (event: PointerEvent<HTMLDivElement>) => {
    const d = drag.current;
    if (!d) return;
    let delta = ((horizontal ? event.clientX : event.clientY) - d.start) / d.area * 100;
    if (horizontal && isRtl()) delta = -delta;
    commit(setPrimary(d.sizes, d.index, d.sizes[d.index]! + delta));
  };

  const handlePointerUp = (event: PointerEvent<HTMLDivElement>) => {
    if (!drag.current) return;
    drag.current = null;
    setDragging(null);
    event.currentTarget.releasePointerCapture?.(event.pointerId);
    finish();
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>, i: number) => {
    const current = sizesRef.current;
    const step = event.shiftKey ? 10 : 1;
    const dir = horizontal ? (isRtl() ? -1 : 1) : 1;
    const grow = horizontal ? 'ArrowRight' : 'ArrowDown';
    const shrink = horizontal ? 'ArrowLeft' : 'ArrowUp';
    let next: number[] | null = null;
    if (event.key === grow) next = setPrimary(current, i, current[i]! + step * dir);
    else if (event.key === shrink) next = setPrimary(current, i, current[i]! - step * dir);
    else if (event.key === 'Home') next = setPrimary(current, i, mins[i]!);
    else if (event.key === 'End') next = setPrimary(current, i, Infinity);
    else if (event.key === 'Enter') {
      const saved = collapsed.current.get(i);
      if (saved) {
        collapsed.current.delete(i);
        next = current.slice();
        next[i] = saved[0];
        next[i + 1] = saved[1];
      } else {
        collapsed.current.set(i, [current[i]!, current[i + 1]!]);
        next = current.slice();
        next[i + 1] = current[i]! + current[i + 1]!;
        next[i] = 0;
      }
    }
    if (!next) return;
    event.preventDefault();
    commit(next);
    finish();
  };

  const paneId = (i: number) => `${uid}-pane-${i}`;
  const safeSizes = sizes.length === count ? sizes : initialSizes(panels.map((p) => p.props));

  return (
    <div
      ref={(node) => {
        rootRef.current = node;
        if (typeof ref === 'function') ref(node);
        else if (ref) ref.current = node;
      }}
      className={cx('ui-splitter', `ui-splitter--${layout}`, dragging !== null && 'ui-splitter--dragging', className)}
      {...rest}
    >
      {panels.map((panel, i) => (
        <Fragment key={i}>
          <div id={paneId(i)} className={cx('ui-splitter__panel', panel.props.className)} style={{ flexGrow: safeSizes[i], flexBasis: 0, '--ui-splitter-size': `${safeSizes[i]}%` } as CSSProperties}>
            {panel.props.children}
          </div>
          {i < count - 1 && (
            // APG window splitter: a focusable separator with value and keyboard resizing.
            // eslint-disable-next-line jsx-a11y/no-noninteractive-element-interactions
            <div
              role="separator"
              tabIndex={0}
              aria-label={t('splitter')}
              aria-orientation={horizontal ? 'vertical' : 'horizontal'}
              aria-controls={paneId(i)}
              aria-valuenow={Math.round(safeSizes[i]!)}
              aria-valuemin={Math.round(mins[i]!)}
              aria-valuemax={Math.round(Math.max(mins[i]!, safeSizes[i]! + safeSizes[i + 1]! - mins[i + 1]!))}
              className={cx('ui-splitter__gutter', dragging === i && 'ui-splitter__gutter--active')}
              onPointerDown={(e) => handlePointerDown(e, i)}
              onPointerMove={handlePointerMove}
              onPointerUp={handlePointerUp}
              onPointerCancel={handlePointerUp}
              onKeyDown={(e) => handleKeyDown(e, i)}
            >
              <span className="ui-splitter__handle" aria-hidden="true" />
            </div>
          )}
        </Fragment>
      ))}
    </div>
  );
}

Splitter.Panel = SplitterPanel;
