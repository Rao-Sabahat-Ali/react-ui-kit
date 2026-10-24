import { useLayoutEffect, useRef, useState, type KeyboardEvent, type PointerEvent } from 'react';
import { isRtl } from '../Tooltip/shared';
import { measureWidth, RESIZE_STEP, RESIZE_STEP_LARGE } from './useColumnResize';

interface ResizeHandleProps {
  label: string;
  width: number | undefined;
  minWidth: number;
  onDragStart: (clientX: number, rtl: boolean) => void;
  onResizeBy: (delta: number) => void;
  onResizeTo: (width: number | 'auto') => void;
}

/** Focusable `role="separator"` (APG window splitter, simplified) at the inline end of a header cell. */
export function ResizeHandle({ label, width, minWidth, onDragStart, onResizeBy, onResizeTo }: ResizeHandleProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [measured, setMeasured] = useState(0);

  useLayoutEffect(() => {
    if (width !== undefined) return;
    const w = measureWidth(ref.current?.parentElement ?? null);
    if (w !== measured) setMeasured(w);
  }, [width, measured]);

  const onPointerDown = (e: PointerEvent<HTMLDivElement>) => {
    if (e.button !== 0) return;
    e.preventDefault();
    e.stopPropagation();
    ref.current?.focus();
    onDragStart(e.clientX, isRtl(ref.current));
  };

  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    const step = e.shiftKey ? RESIZE_STEP_LARGE : RESIZE_STEP;
    const rtl = isRtl(ref.current);
    let handled = true;
    if (e.key === 'ArrowRight') onResizeBy(rtl ? -step : step);
    else if (e.key === 'ArrowLeft') onResizeBy(rtl ? step : -step);
    else if (e.key === 'Home') onResizeTo(minWidth);
    else if (e.key === 'End') onResizeTo('auto');
    else handled = false;
    if (handled) {
      e.preventDefault();
      e.stopPropagation();
    }
  };

  return (
    // APG window splitter: a focusable separator that is operated with the keyboard and pointer.
    // eslint-disable-next-line jsx-a11y/no-noninteractive-element-interactions
    <div
      ref={ref}
      role="separator"
      aria-orientation="vertical"
      aria-label={label}
      aria-valuenow={Math.max(minWidth, Math.round(width ?? measured))}
      aria-valuemin={minWidth}
      tabIndex={0}
      className="ui-data-table__resizer"
      onPointerDown={onPointerDown}
      onKeyDown={onKeyDown}
      onClick={(e) => e.stopPropagation()}
    />
  );
}
