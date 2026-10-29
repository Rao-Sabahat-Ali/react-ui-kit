import type { ReactNode } from 'react';
import type { Intent } from '../../types';

export type KanbanWipMode = 'warn' | 'block';
export type KanbanPriority = 'low' | 'medium' | 'high' | 'urgent';

export interface KanbanColumnDef {
  id: string;
  title: string;
  /** Work-in-progress limit for the whole column (all lanes together). */
  wipLimit?: number;
  /** `warn` (default) marks the column over its limit; `block` refuses drops into a full column. */
  wipMode?: KanbanWipMode;
  collapsed?: boolean;
  /** Reserved for a stage colour; the identity keeps stages in ink, so it is exposed as `data-color` only. */
  color?: string;
}

export type KanbanLabel = string | { text: string; severity?: Intent };
export type KanbanAssignee = string | { name: string; image?: string };

export interface KanbanCardData {
  id: string;
  columnId: string;
  title: string;
  labels?: KanbanLabel[];
  assignees?: KanbanAssignee[];
  /** ISO date (`2026-11-03`) or a `Date`. */
  due?: string | Date;
  priority?: KanbanPriority;
  checklist?: { done: number; total: number };
  comments?: number;
  laneId?: string;
}

export interface KanbanLane {
  id: string;
  title: string;
}

export interface KanbanMove {
  cardId: string;
  fromColumnId: string;
  toColumnId: string;
  /** Position in the column (inside its lane) before the move, counting every card, filtered or not. */
  fromIndex: number;
  /** Position in the column (inside its lane) after the move. */
  toIndex: number;
  /** Destination lane when the board has lanes. */
  laneId?: string;
}

/** What `renderCard` knows about the card it draws. */
export interface KanbanCardState {
  columnId: string;
  laneId?: string;
  /** Position among the visible cards of its column, 1-based. */
  position: number;
  total: number;
  /** Picked up with the keyboard. */
  grabbed: boolean;
  /** Being dragged with the pointer. */
  dragging: boolean;
  /** The active text filter, so a custom body can highlight its own text. */
  filter: string;
  density: 'comfortable' | 'compact';
}

export type KanbanRenderCard = (card: KanbanCardData, state: KanbanCardState) => ReactNode;
