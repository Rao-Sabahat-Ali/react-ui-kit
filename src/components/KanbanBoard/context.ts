import { createContext, useContext, type KeyboardEvent as ReactKeyboardEvent, type PointerEvent as ReactPointerEvent, type ReactNode } from 'react';
import type { LocaleContextValue } from '../../locale/LocaleProvider';
import type { Cell } from './model';
import type { KanbanCardData, KanbanColumnDef, KanbanLane, KanbanRenderCard } from './types';

export interface DropTarget {
  cell: Cell;
  /** Position among the visible cards of the cell, the dragged card excluded. */
  index: number;
  blocked: boolean;
}

export interface DragState {
  cardId: string;
  width: number;
  height: number;
  over: DropTarget | null;
}

export type Row = { kind: 'card'; card: KanbanCardData; index: number } | { kind: 'placeholder' };

export interface KanbanContextValue {
  t: LocaleContextValue['t'];
  tp: LocaleContextValue['tp'];
  locale: string;
  columns: KanbanColumnDef[];
  lanes?: KanbanLane[];
  density: 'comfortable' | 'compact';
  readOnly: boolean;
  filter: string;
  headingLevel: 2 | 3 | 4 | 5;
  tabStopId: string | null;
  grabId: string | null;
  drag: DragState | null;
  pendingIds: Set<string>;
  renameId: string | null;
  addColumnId: string | null;
  /** The card whose button must stay rendered inside a windowed list (focus, pick-up, drag, rename). */
  keepId: string | null;
  canAdd: boolean;
  canRename: boolean;
  renderCard?: KanbanRenderCard;
  virtualize: boolean | number | undefined;
  instructionsId: string;
  baseId: string;
  isCollapsed: (column: KanbanColumnDef) => boolean;
  /** Visible cards of one cell, and how many cards the whole column holds (filter ignored). */
  cellInfo: (cell: Cell) => { shown: KanbanCardData[]; columnTotal: number };
  columnCount: (columnId: string) => number;
  rowsFor: (cell: Cell) => Row[];
  placeName: (cell: Cell) => string;
  onCardKeyDown: (event: ReactKeyboardEvent<HTMLElement>, card: KanbanCardData) => void;
  onCardKeyUp: (event: ReactKeyboardEvent<HTMLElement>) => void;
  onCardPointerDown: (event: ReactPointerEvent<HTMLElement>, card: KanbanCardData) => void;
  onCardClick: (card: KanbanCardData) => void;
  onCardBlur: (card: KanbanCardData) => void;
  onCardFocus: (card: KanbanCardData) => void;
  onCardContextMenu: (event: MouseEvent | { preventDefault: () => void; clientX: number; clientY: number; target: EventTarget | null }, card: KanbanCardData) => void;
  openCardMenu: (button: HTMLElement, card: KanbanCardData) => void;
  commitRename: (card: KanbanCardData, title: string) => void;
  cancelRename: (card: KanbanCardData, refocus: boolean) => void;
  openAdd: (columnId: string) => void;
  closeAdd: (columnId: string) => void;
  submitAdd: (columnId: string, title: string) => void;
  toggleColumn: (column: KanbanColumnDef) => void;
}

export const KanbanContext = createContext<KanbanContextValue | null>(null);

export function useKanban(): KanbanContextValue {
  const ctx = useContext(KanbanContext);
  if (!ctx) throw new Error('Kanban parts must be rendered inside <KanbanBoard>.');
  return ctx;
}

export type { ReactNode };
