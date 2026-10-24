import { useRef, type RefObject } from 'react';

export const DEFAULT_MIN_WIDTH = 48;
export const RESIZE_STEP = 16;
export const RESIZE_STEP_LARGE = 64;

export interface ResizeColumn {
  id: string;
  minWidth: number;
}

interface Options {
  /** Visible data columns in display order. */
  columns: ResizeColumn[];
  widths: Record<string, number>;
  setWidths: (widths: Record<string, number>) => void;
  mode: 'fit' | 'expand';
  tableRef: RefObject<HTMLElement | null>;
  onColumnResize?: (e: { columnId: string; width: number }) => void;
}

const headerOf = (table: HTMLElement | null, id: string): HTMLElement | null =>
  Array.from(table?.querySelectorAll<HTMLElement>('[data-column-header]') ?? []).find((el) => el.dataset.columnHeader === id) ?? null;
export const measureWidth = (el: Element | null): number => (el ? Math.round(el.getBoundingClientRect().width) : 0);

/**
 * Column widths in px. The first resize "freezes" every visible column at its rendered width so the
 * table can switch to `table-layout: fixed`; `fit` keeps the total by shrinking the right-hand neighbour,
 * `expand` lets the table grow.
 */
export function useColumnResize({ columns, widths, setWidths, mode, tableRef, onColumnResize }: Options) {
  const utilityWidth = useRef(0);

  const currentWidth = (id: string): number => widths[id] ?? measureWidth(headerOf(tableRef.current, id));

  const frozenWidths = (): Record<string, number> => {
    const next: Record<string, number> = { ...widths };
    for (const c of columns) if (next[c.id] === undefined) next[c.id] = Math.max(c.minWidth, measureWidth(headerOf(tableRef.current, c.id)));
    const table = tableRef.current;
    if (table) {
      const utility = Array.from(table.querySelectorAll<HTMLElement>('[data-utility-column]'));
      utilityWidth.current = utility.reduce((sum, el) => sum + measureWidth(el), 0);
    }
    return next;
  };

  /** Apply an absolute width to `id` starting from `base` widths; returns the width actually applied. */
  const apply = (id: string, target: number, base: Record<string, number>): number => {
    const index = columns.findIndex((c) => c.id === id);
    const column = columns[index];
    if (!column) return 0;
    const start = base[id] ?? 0;
    let width = Math.max(column.minWidth, Math.round(target));
    const next = { ...base };
    if (mode === 'fit') {
      const neighbour = columns[index + 1];
      if (neighbour) {
        const nStart = base[neighbour.id] ?? 0;
        const room = nStart - neighbour.minWidth;
        if (width - start > room) width = start + Math.max(0, room);
        next[neighbour.id] = nStart - (width - start);
      }
    }
    next[id] = width;
    setWidths(next);
    return width;
  };

  const resizeBy = (id: string, delta: number) => {
    const base = frozenWidths();
    const width = apply(id, (base[id] ?? 0) + delta, base);
    onColumnResize?.({ columnId: id, width });
  };

  const resizeTo = (id: string, width: number | 'auto') => {
    const base = frozenWidths();
    if (width === 'auto') {
      const next = { ...base };
      delete next[id];
      setWidths(next);
      onColumnResize?.({ columnId: id, width: measureWidth(headerOf(tableRef.current, id)) });
      return;
    }
    onColumnResize?.({ columnId: id, width: apply(id, width, base) });
  };

  const startDrag = (id: string, clientX: number, rtl: boolean) => {
    const base = frozenWidths();
    const startWidth = base[id] ?? 0;
    let last = startWidth;
    setWidths(base);
    const move = (e: PointerEvent) => {
      last = apply(id, startWidth + (e.clientX - clientX) * (rtl ? -1 : 1), base);
    };
    const up = () => {
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
      window.removeEventListener('pointercancel', up);
      document.body.classList.remove('ui-data-table--resizing');
      if (last !== startWidth) onColumnResize?.({ columnId: id, width: last });
    };
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
    window.addEventListener('pointercancel', up);
    document.body.classList.add('ui-data-table--resizing');
  };

  const sized = columns.some((c) => widths[c.id] !== undefined);
  const tableWidth = sized && mode === 'expand' ? columns.reduce((sum, c) => sum + (widths[c.id] ?? c.minWidth), utilityWidth.current) : undefined;

  return { currentWidth, resizeBy, resizeTo, startDrag, sized, tableWidth };
}
