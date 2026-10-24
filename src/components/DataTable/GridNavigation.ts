/**
 * DOM helpers for the `cellNavigation` grid mode (APG Grid, roving tabindex).
 * Works for the native `<table>` and for the ARIA div table used by virtual scrolling.
 */

const CELL_ROLES = new Set(['gridcell', 'columnheader', 'rowheader', 'cell']);
const INTERACTIVE = 'a[href], button, input, select, textarea, [tabindex], [contenteditable="true"]';
const SAVED = 'data-dt-tabindex';

export interface CellPosition {
  row: number;
  col: number;
}

const ownerGrid = (el: Element) => el.closest('table, [role="grid"], [role="table"]');

export function gridRows(root: HTMLElement): HTMLElement[] {
  return Array.from(root.querySelectorAll<HTMLElement>('tr, [role="row"]')).filter(
    (row) => ownerGrid(row) === root && row.getAttribute('aria-hidden') !== 'true' && rowCells(row).length > 0,
  );
}

export function rowCells(row: HTMLElement): HTMLElement[] {
  return Array.from(row.children).filter(
    (el): el is HTMLElement => el instanceof HTMLElement && (el.tagName === 'TD' || el.tagName === 'TH' || CELL_ROLES.has(el.getAttribute('role') ?? '')),
  );
}

export function cellAt(root: HTMLElement, pos: CellPosition): HTMLElement | null {
  const rows = gridRows(root);
  if (rows.length === 0) return null;
  const row = rows[Math.min(Math.max(0, pos.row), rows.length - 1)]!;
  const cells = rowCells(row);
  return cells[Math.min(Math.max(0, pos.col), cells.length - 1)] ?? null;
}

/** The grid cell that is `el` or contains it. */
export function cellOf(root: HTMLElement, el: Element | null): HTMLElement | null {
  let node: Element | null = el;
  while (node && node !== root) {
    if (node instanceof HTMLElement && node.parentElement && rowCells(node.parentElement).includes(node) && ownerGrid(node) === root) return node;
    node = node.parentElement;
  }
  return null;
}

export function positionOf(root: HTMLElement, cell: HTMLElement): CellPosition | null {
  const rows = gridRows(root);
  const row = rows.findIndex((r) => r.contains(cell));
  if (row === -1) return null;
  const col = rowCells(rows[row]!).indexOf(cell);
  return col === -1 ? null : { row, col };
}

/**
 * Roving tabindex: the active cell gets 0, every other cell -1; interactive content gets -1 unless
 * it sits in the `entered` cell. Original tabindex values are saved and restored.
 */
export function syncRovingTabindex(root: HTMLElement, active: CellPosition, entered: HTMLElement | null): HTMLElement | null {
  const activeCell = cellAt(root, active);
  for (const row of gridRows(root)) {
    for (const cell of rowCells(row)) {
      cell.tabIndex = cell === activeCell ? 0 : -1;
      for (const el of Array.from(cell.querySelectorAll<HTMLElement>(INTERACTIVE))) {
        if (cell === entered) {
          if (el.hasAttribute(SAVED)) {
            const saved = el.getAttribute(SAVED)!;
            if (saved === '') el.removeAttribute('tabindex');
            else el.setAttribute('tabindex', saved);
            el.removeAttribute(SAVED);
          }
        } else if (!el.hasAttribute(SAVED)) {
          el.setAttribute(SAVED, el.getAttribute('tabindex') ?? '');
          el.tabIndex = -1;
        } else if (el.tabIndex !== -1) {
          el.tabIndex = -1;
        }
      }
    }
  }
  return activeCell;
}

export function firstInteractive(cell: HTMLElement): HTMLElement | null {
  return Array.from(cell.querySelectorAll<HTMLElement>(INTERACTIVE)).find((el) => !el.hasAttribute('disabled')) ?? null;
}

export interface MoveOptions {
  key: string;
  ctrl: boolean;
  rtl: boolean;
  pageRows: number;
}

/** Next position for a navigation key, or null when the key is not a navigation key. */
export function nextPosition(root: HTMLElement, pos: CellPosition, { key, ctrl, rtl, pageRows }: MoveOptions): CellPosition | null {
  const rows = gridRows(root);
  if (rows.length === 0) return null;
  const lastRow = rows.length - 1;
  const colsIn = (r: number) => rowCells(rows[Math.min(Math.max(0, r), lastRow)]!).length;
  const forward = rtl ? 'ArrowLeft' : 'ArrowRight';
  const backward = rtl ? 'ArrowRight' : 'ArrowLeft';
  switch (key) {
    case forward:
      return { row: pos.row, col: Math.min(pos.col + 1, colsIn(pos.row) - 1) };
    case backward:
      return { row: pos.row, col: Math.max(0, Math.min(pos.col, colsIn(pos.row) - 1) - 1) };
    case 'ArrowDown':
      return { row: Math.min(pos.row + 1, lastRow), col: pos.col };
    case 'ArrowUp':
      return { row: Math.max(0, pos.row - 1), col: pos.col };
    case 'Home':
      return ctrl ? { row: 0, col: 0 } : { row: pos.row, col: 0 };
    case 'End':
      return ctrl ? { row: lastRow, col: colsIn(lastRow) - 1 } : { row: pos.row, col: colsIn(pos.row) - 1 };
    case 'PageDown':
      return { row: Math.min(pos.row + pageRows, lastRow), col: pos.col };
    case 'PageUp':
      return { row: Math.max(0, pos.row - pageRows), col: pos.col };
    default:
      return null;
  }
}

/** Rows per visible page of the scroll viewport (fallback 10 when it cannot be measured). */
export function visibleRowCount(viewport: HTMLElement | null, row: HTMLElement | null): number {
  const vh = viewport?.clientHeight ?? 0;
  const rh = row?.getBoundingClientRect().height ?? 0;
  return vh > 0 && rh > 0 ? Math.max(1, Math.floor(vh / rh)) : 10;
}
