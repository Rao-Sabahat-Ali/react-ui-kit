import type { KanbanAssignee, KanbanCardData, KanbanColumnDef, KanbanLabel, KanbanLane, KanbanMove } from './types';

/** A card's lane: its own when it exists, otherwise the first lane. `undefined` on boards without lanes. */
export function laneOf(card: KanbanCardData, lanes: KanbanLane[] | undefined): string | undefined {
  if (!lanes || lanes.length === 0) return undefined;
  return lanes.some((l) => l.id === card.laneId) ? card.laneId : lanes[0]!.id;
}

/** Where a card sits: a column inside a lane (`laneId` is undefined without lanes). */
export interface Cell {
  columnId: string;
  laneId?: string;
}

export const sameCell = (a: Cell, b: Cell): boolean => a.columnId === b.columnId && a.laneId === b.laneId;

export const cellOf = (card: KanbanCardData, lanes: KanbanLane[] | undefined): Cell => ({ columnId: card.columnId, laneId: laneOf(card, lanes) });

/** Cards of one cell in array order. */
export function cellCards(cards: KanbanCardData[], cell: Cell, lanes: KanbanLane[] | undefined): KanbanCardData[] {
  return cards.filter((c) => sameCell(cellOf(c, lanes), cell));
}

/** Every card of a column, across lanes. */
export const columnCards = (cards: KanbanCardData[], columnId: string): KanbanCardData[] => cards.filter((c) => c.columnId === columnId);

/** How many cards a column holds in total (filtered ones still occupy WIP). */
export const columnCount = (cards: KanbanCardData[], columnId: string): number => cards.filter((c) => c.columnId === columnId).length;

/**
 * Move a card to a cell at a position among that cell's cards (the card itself excluded). Pure and idempotent:
 * applying the same placement twice gives the same array.
 */
export function moveToCell(cards: KanbanCardData[], cardId: string, to: Cell, index: number, lanes: KanbanLane[] | undefined): KanbanCardData[] {
  const card = cards.find((c) => c.id === cardId);
  if (!card) return cards;
  const rest = cards.filter((c) => c.id !== cardId);
  const target = cellCards(rest, to, lanes);
  const moved: KanbanCardData = { ...card, columnId: to.columnId, ...(lanes && lanes.length > 0 ? { laneId: to.laneId } : {}) };
  let at: number;
  if (index < target.length) at = rest.indexOf(target[Math.max(0, index)]!);
  else at = target.length > 0 ? rest.indexOf(target[target.length - 1]!) + 1 : rest.length;
  return [...rest.slice(0, at), moved, ...rest.slice(at)];
}

/**
 * Convert a position among the *visible* cards of a cell into a position among all its cards, so a filter never
 * changes where a card lands relative to the cards that stay hidden.
 */
export function fullIndex(rest: KanbanCardData[], to: Cell, visibleIndex: number, visible: (card: KanbanCardData) => boolean, lanes: KanbanLane[] | undefined): number {
  const cell = cellCards(rest, to, lanes);
  const shown = cell.filter(visible);
  if (visibleIndex < shown.length) return cell.indexOf(shown[Math.max(0, visibleIndex)]!);
  return shown.length > 0 ? cell.indexOf(shown[shown.length - 1]!) + 1 : cell.length;
}

/** Place by visible position (the position keyboard and pointer users see). */
export function placeCard(cards: KanbanCardData[], cardId: string, to: Cell, visibleIndex: number, visible: (card: KanbanCardData) => boolean, lanes: KanbanLane[] | undefined): KanbanCardData[] {
  const rest = cards.filter((c) => c.id !== cardId);
  return moveToCell(cards, cardId, to, fullIndex(rest, to, visibleIndex, visible, lanes), lanes);
}

/** Apply a `KanbanMove` reported by `onMove` to a card array (what a controlled parent does in its handler). */
export function applyKanbanMove<T extends KanbanCardData>(cards: T[], move: KanbanMove, lanes?: KanbanLane[]): T[] {
  return moveToCell(cards, move.cardId, { columnId: move.toColumnId, laneId: move.laneId }, move.toIndex, lanes) as T[];
}

export function indexInCell(cards: KanbanCardData[], cardId: string, lanes: KanbanLane[] | undefined): number {
  const card = cards.find((c) => c.id === cardId);
  return card ? cellCards(cards, cellOf(card, lanes), lanes).findIndex((c) => c.id === cardId) : -1;
}

/** The `KanbanMove` that turns `before` into `after` for one card, or null when nothing changed. */
export function describeMove(before: KanbanCardData[], after: KanbanCardData[], cardId: string, lanes: KanbanLane[] | undefined): KanbanMove | null {
  const from = before.find((c) => c.id === cardId);
  const to = after.find((c) => c.id === cardId);
  if (!from || !to) return null;
  const fromCell = cellOf(from, lanes);
  const toCell = cellOf(to, lanes);
  const fromIndex = indexInCell(before, cardId, lanes);
  const toIndex = indexInCell(after, cardId, lanes);
  if (sameCell(fromCell, toCell) && fromIndex === toIndex) return null;
  return { cardId, fromColumnId: fromCell.columnId, toColumnId: toCell.columnId, fromIndex, toIndex, ...(toCell.laneId !== undefined ? { laneId: toCell.laneId } : {}) };
}

export const labelText = (label: KanbanLabel): string => (typeof label === 'string' ? label : label.text);
export const assigneeName = (a: KanbanAssignee): string => (typeof a === 'string' ? a : a.name);

/** Case-insensitive filter over title, labels and assignees. */
export function matchesFilter(card: KanbanCardData, filter: string): boolean {
  const q = filter.trim().toLocaleLowerCase();
  if (!q) return true;
  const haystack = [card.title, ...(card.labels ?? []).map(labelText), ...(card.assignees ?? []).map(assigneeName)];
  return haystack.some((text) => text.toLocaleLowerCase().includes(q));
}

export function isThenable(value: unknown): value is PromiseLike<unknown> {
  return typeof value === 'object' && value !== null && typeof (value as { then?: unknown }).then === 'function';
}

export const columnById = (columns: KanbanColumnDef[], id: string): KanbanColumnDef | undefined => columns.find((c) => c.id === id);

/** Over its limit, at its limit, or free. Counts are all cards of the column (filtered ones still occupy WIP). */
export function wipState(column: KanbanColumnDef, total: number): 'over' | 'full' | 'ok' {
  if (column.wipLimit === undefined) return 'ok';
  if (total > column.wipLimit) return 'over';
  return total === column.wipLimit ? 'full' : 'ok';
}
