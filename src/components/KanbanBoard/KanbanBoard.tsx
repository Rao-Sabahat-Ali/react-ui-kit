import { useCallback, useEffect, useId, useLayoutEffect, useMemo, useRef, useState, type HTMLAttributes, type KeyboardEvent as ReactKeyboardEvent, type PointerEvent as ReactPointerEvent, type ReactNode, type Ref } from 'react';
import { useLocale } from '../../locale/LocaleProvider';
import { EASING, readMotionMs } from '../../motion/tokens';
import { safeAnimate } from '../../motion/env';
import { useAssemble } from '../../motion/useAssemble';
import { useReducedMotion } from '../../motion/useReducedMotion';
import { useOptionalTheme } from '../../theme/ThemeProvider';
import { cx } from '../../utils/cx';
import { isRtl, mergeRefs } from '../../utils/element';
import { Button } from '../Button/Button';
import { ContextMenu, type ContextMenuHandle } from '../ContextMenu/ContextMenu';
import { EmptyState } from '../EmptyState/EmptyState';
import type { MenuItem } from '../Menu/types';
import { Skeleton } from '../Skeleton/Skeleton';
import { useToast, type ToastApi } from '../Toast/Toast';
import { KanbanContext, type DragState, type DropTarget, type KanbanContextValue, type Row } from './context';
import { KanbanColumn, KanbanQty } from './KanbanColumn';
import {
  cellCards,
  cellOf,
  columnCount as countColumn,
  describeMove,
  fullIndex,
  indexInCell,
  isThenable,
  laneOf,
  matchesFilter,
  moveToCell,
  placeCard,
  sameCell,
  type Cell,
} from './model';
import type { KanbanCardData, KanbanColumnDef, KanbanLane, KanbanMove, KanbanRenderCard } from './types';

export interface KanbanBoardProps extends Omit<HTMLAttributes<HTMLDivElement>, 'onChange' | 'defaultValue' | 'children' | 'role'> {
  ref?: Ref<HTMLDivElement>;
  'aria-label': string;
  /** Stages in order. */
  columns: KanbanColumnDef[];
  /** Cards (controlled): the order inside a column is array order. */
  cards?: KanbanCardData[];
  /** Alias of `cards` for the controlled pattern. */
  value?: KanbanCardData[];
  /** Uncontrolled cards: the board keeps the order itself. */
  defaultValue?: KanbanCardData[];
  /** Called for every move. A rejected promise rolls the move back and shows a Retry toast. */
  onMove?: (move: KanbanMove) => void | Promise<void>;
  onCardOpen?: (card: KanbanCardData) => void;
  /** Enables the quick-add field in every column. */
  onCardAdd?: (columnId: string, title: string) => void | Promise<void>;
  /** Enables inline rename (F2). */
  onCardRename?: (cardId: string, title: string) => void;
  onColumnToggle?: (columnId: string, collapsed: boolean) => void;
  lanes?: KanbanLane[];
  /** Custom card body. The kit still owns the card's focus, drag handle and ARIA; return plain React nodes. */
  renderCard?: KanbanRenderCard;
  /** Text filter: non-matching cards hide and matches are marked. */
  filter?: string;
  readOnly?: boolean;
  loading?: boolean;
  /** Error state message; shows a Retry action when `onRetry` is set. */
  error?: ReactNode;
  onRetry?: () => void;
  /** `true`: always window long columns; a number: window columns with more cards than that. Default: more than 100. */
  virtualize?: boolean | number;
  /** Default: compact for the admin and dashboard profiles, comfortable otherwise. */
  density?: 'comfortable' | 'compact';
  /** Optional filter/search slot above the board. */
  toolbar?: ReactNode;
  /** Heading level of the column titles (lane titles when lanes are used). */
  headingLevel?: 2 | 3 | 4 | 5;
}

const DRAG_THRESHOLD = 4;
const TOUCH_HOLD_MS = 200;
const TOUCH_SLOP = 8;
const EDGE = 56;
const MAX_SCROLL = 18;

interface Grab {
  cardId: string;
  origin: { cell: Cell; index: number };
  cell: Cell;
  /** Position among the visible cards of `cell`, the picked-up card excluded. */
  index: number;
}

interface PendingMove {
  id: number;
  cardId: string;
  cell: Cell;
  index: number;
}

interface Press {
  cardId: string;
  pointerId: number;
  type: string;
  x0: number;
  y0: number;
  started: boolean;
  li: HTMLElement;
  offsetX: number;
  offsetY: number;
  width: number;
  height: number;
  timer?: number;
  x: number;
  y: number;
  frame?: number;
}

/** The toast API when a provider exists, otherwise null (the board then falls back to the live region alone). */
function useOptionalToast(): ToastApi | null {
  try {
    return useToast();
  } catch {
    return null;
  }
}

/**
 * A task board: cards in ordered, numbered stages that move by keyboard (Space to pick up), by a "Move to…" menu or
 * by pointer drag. Controlled with `cards`, or uncontrolled with `defaultValue`.
 */
export function KanbanBoard({
  columns,
  cards: cardsProp,
  value,
  defaultValue,
  onMove,
  onCardOpen,
  onCardAdd,
  onCardRename,
  onColumnToggle,
  lanes,
  renderCard,
  filter = '',
  readOnly = false,
  loading = false,
  error,
  onRetry,
  virtualize,
  density: densityProp,
  toolbar,
  headingLevel = 3,
  className,
  ref,
  ...rest
}: KanbanBoardProps) {
  const { t, tp, locale } = useLocale();
  const theme = useOptionalTheme();
  const toast = useOptionalToast();
  const reduced = useReducedMotion();
  const baseId = useId();
  const instructionsId = `${baseId}-instructions`;
  const rootRef = useRef<HTMLDivElement | null>(null);
  const menuRef = useRef<ContextMenuHandle | null>(null);
  const density = densityProp ?? (theme?.density === 'compact' ? 'compact' : 'comfortable');

  // ----- data: controlled / uncontrolled base, optimistic moves on top, the picked-up card on top of that -----
  const source = cardsProp ?? value;
  const controlled = source !== undefined;
  const [internal, setInternal] = useState<KanbanCardData[]>(defaultValue ?? []);
  const base = source ?? internal;
  const [pending, setPending] = useState<PendingMove[]>([]);
  const [grab, setGrab] = useState<Grab | null>(null);
  const [drag, setDrag] = useState<DragState | null>(null);
  const [focusedId, setFocusedId] = useState<string | null>(null);
  const [renameId, setRenameId] = useState<string | null>(null);
  const [addColumnId, setAddColumnId] = useState<string | null>(null);
  const [menuCardId, setMenuCardId] = useState<string | null>(null);
  const [toggled, setToggled] = useState<Record<string, boolean>>({});
  const [announcement, setAnnouncement] = useState({ text: '', n: 0 });
  const [, setFocusTick] = useState(0);
  const [assembling, setAssembling] = useState(true);

  const visible = useCallback((card: KanbanCardData) => matchesFilter(card, filter), [filter]);
  const withPending = useMemo(() => pending.reduce((acc, p) => moveToCell(acc, p.cardId, p.cell, p.index, lanes), base), [base, pending, lanes]);
  const view = useMemo(() => (grab ? placeCard(withPending, grab.cardId, grab.cell, grab.index, visible, lanes) : withPending), [withPending, grab, visible, lanes]);

  const isCollapsed = useCallback(
    (column: KanbanColumnDef) => (onColumnToggle && column.collapsed !== undefined ? column.collapsed : (toggled[column.id] ?? column.collapsed ?? false)),
    [onColumnToggle, toggled],
  );

  const laneList = lanes && lanes.length > 0 ? lanes : undefined;
  const cellsOf = (laneId?: string) => columns.map((c) => ({ columnId: c.id, laneId }) as Cell);

  // Latest state for handlers that outlive a render (window listeners, timers).
  const live = useRef({ view, withPending, grab, drag, columns, lanes, visible, readOnly, isCollapsed, controlled });
  live.current = { view, withPending, grab, drag, columns, lanes, visible, readOnly, isCollapsed, controlled };

  const announce = useCallback((text: string) => setAnnouncement((a) => ({ text, n: a.n + 1 })), []);

  const columnTitle = (id: string) => columns.find((c) => c.id === id)?.title ?? id;
  const placeName = (cell: Cell) => {
    const lane = laneList?.find((l) => l.id === cell.laneId);
    return lane ? `${columnTitle(cell.columnId)}, ${lane.title}` : columnTitle(cell.columnId);
  };
  const shownIn = (cards: KanbanCardData[], cell: Cell) => cellCards(cards, cell, lanes).filter(visible);

  const whereIs = (cards: KanbanCardData[], cardId: string) => {
    const card = cards.find((c) => c.id === cardId);
    if (!card) return null;
    const cell = cellOf(card, lanes);
    const list = shownIn(cards, cell);
    return { card, cell, position: Math.max(0, list.findIndex((c) => c.id === cardId)) + 1, total: list.length };
  };

  // ----- focus -----
  const focusReq = useRef<string | null>(null);
  const buttonFor = (id: string): HTMLElement | null => (rootRef.current ? (Array.from(rootRef.current.querySelectorAll<HTMLElement>('[data-card-button]')).find((el) => el.dataset.cardButton === id) ?? null) : null);
  const requestFocus = (id: string) => {
    focusReq.current = id;
    setFocusedId(id);
    setFocusTick((n) => n + 1);
  };
  useLayoutEffect(() => {
    const id = focusReq.current;
    if (id === null) return;
    if (!view.some((c) => c.id === id)) {
      focusReq.current = null;
      return;
    }
    const el = buttonFor(id);
    if (el) {
      focusReq.current = null;
      if (document.activeElement !== el) el.focus();
    }
  });

  const shownAll = useMemo(() => view.filter(visible), [view, visible]);
  const tabStopId = focusedId && shownAll.some((c) => c.id === focusedId) && !isCollapsedCard(focusedId) ? focusedId : (firstShown()?.id ?? null);
  function isCollapsedCard(id: string) {
    const card = view.find((c) => c.id === id);
    const col = card ? columns.find((c) => c.id === card.columnId) : undefined;
    return col ? isCollapsed(col) : false;
  }
  function firstShown() {
    for (const lane of laneList ? laneList.map((l) => l.id) : [undefined]) {
      for (const column of columns) {
        if (isCollapsed(column)) continue;
        const first = shownIn(view, { columnId: column.id, laneId: lane })[0];
        if (first) return first;
      }
    }
    return undefined;
  }

  // ----- committing moves -----
  const seq = useRef(0);
  const settle = useRef<{ cardId: string; left: number; top: number } | null>(null);

  const finishEntry = useCallback((entry: PendingMove) => {
    if (!live.current.controlled) setInternal((cur) => moveToCell(cur, entry.cardId, entry.cell, entry.index, live.current.lanes));
    setPending((list) => list.filter((p) => p.id !== entry.id));
  }, []);

  const rollbackEntry = useCallback((entry: PendingMove, move: KanbanMove, retry: () => void, origin: { title: string; place: string; position: number }) => {
    setPending((list) => list.filter((p) => p.id !== entry.id));
    announce(t('kanbanReturned', { title: origin.title, column: origin.place, position: origin.position }));
    toast?.error(t('kanbanMoveFailedMessage', { column: columnTitle(move.toColumnId) }), {
      title: t('kanbanMoveFailedTitle', { title: origin.title }),
      action: { label: t('retry'), onClick: retry },
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [announce, t, toast, columns]);

  /** Apply a placement to the cards, tell `onMove`, and keep it optimistic until a promise settles. Returns false when nothing changed. */
  const executeMove = useCallback(
    (cardId: string, to: Cell, fullIdx: number): boolean => {
      const { withPending: before, lanes: ls } = live.current;
      const after = moveToCell(before, cardId, to, fullIdx, ls);
      const move = describeMove(before, after, cardId, ls);
      if (!move) return false;
      const from = whereIs(before, cardId);
      const origin = { title: from?.card.title ?? cardId, place: from ? placeName(from.cell) : '', position: from?.position ?? 1 };
      const entry: PendingMove = { id: ++seq.current, cardId, cell: to, index: move.toIndex };
      let result: unknown;
      try {
        result = onMove?.(move);
      } catch (error) {
        result = Promise.reject(error);
      }
      if (isThenable(result)) {
        setPending((list) => [...list, entry]);
        const retry = () => executeMove(cardId, to, fullIdx);
        result.then(
          () => finishEntry(entry),
          () => rollbackEntry(entry, move, retry, origin),
        );
      } else {
        finishEntry(entry);
      }
      return true;
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [onMove, finishEntry, rollbackEntry],
  );

  const blockedColumn = (cards: KanbanCardData[], cardId: string, columnId: string): KanbanColumnDef | null => {
    const column = columns.find((c) => c.id === columnId);
    if (!column || column.wipMode !== 'block' || column.wipLimit === undefined) return null;
    const inside = cards.some((c) => c.id === cardId && c.columnId === columnId);
    if (inside) return null;
    return countColumn(cards, columnId) >= column.wipLimit ? column : null;
  };
  const announceLimit = (column: KanbanColumnDef) => announce(t('kanbanAtLimit', { column: column.title, limit: column.wipLimit ?? 0 }));

  const describeResult = (kind: 'kanbanMovedTo' | 'kanbanDropped', cards: KanbanCardData[], cardId: string) => {
    const w = whereIs(cards, cardId);
    if (!w) return '';
    return t(kind, { title: w.card.title, column: placeName(w.cell), position: w.position, total: w.total });
  };

  /** Move to the end of a column (menu "Move to…"), keeping the lane. */
  const moveToColumn = (card: KanbanCardData, column: KanbanColumnDef) => {
    const { withPending: cards } = live.current;
    const cell: Cell = { columnId: column.id, laneId: laneOf(card, lanes) };
    const blocker = blockedColumn(cards, card.id, column.id);
    if (blocker) return announceLimit(blocker);
    const rest = cards.filter((c) => c.id !== card.id);
    const after = moveToCell(cards, card.id, cell, cellCards(rest, cell, lanes).length, lanes);
    if (executeMove(card.id, cell, cellCards(rest, cell, lanes).length)) announce(describeResult('kanbanMovedTo', after, card.id));
    requestFocus(card.id);
  };

  const moveToLane = (card: KanbanCardData, lane: KanbanLane) => {
    const { withPending: cards } = live.current;
    const cell: Cell = { columnId: card.columnId, laneId: lane.id };
    const rest = cards.filter((c) => c.id !== card.id);
    const idx = cellCards(rest, cell, lanes).length;
    const after = moveToCell(cards, card.id, cell, idx, lanes);
    if (executeMove(card.id, cell, idx)) announce(describeResult('kanbanMovedTo', after, card.id));
    requestFocus(card.id);
  };

  const nudge = (card: KanbanCardData, delta: -1 | 1) => {
    const { withPending: cards } = live.current;
    const cell = cellOf(card, lanes);
    const list = shownIn(cards, cell);
    const at = list.findIndex((c) => c.id === card.id);
    const target = at + delta;
    if (target < 0 || target >= list.length) return;
    const rest = cards.filter((c) => c.id !== card.id);
    const idx = fullIndex(rest, cell, target, visible, lanes);
    const after = moveToCell(cards, card.id, cell, idx, lanes);
    if (executeMove(card.id, cell, idx)) announce(describeResult('kanbanMovedTo', after, card.id));
    requestFocus(card.id);
  };

  // ----- keyboard pick-up -----
  const pickUp = (card: KanbanCardData) => {
    const cell = cellOf(card, lanes);
    const list = shownIn(live.current.withPending, cell);
    const index = Math.max(0, list.findIndex((c) => c.id === card.id));
    setGrab({ cardId: card.id, origin: { cell, index }, cell, index });
    announce(t('kanbanPickedUp', { title: card.title, column: placeName(cell), position: index + 1, total: list.length }));
  };

  const cancelGrab = () => {
    const g = live.current.grab;
    if (!g) return;
    const card = live.current.withPending.find((c) => c.id === g.cardId);
    setGrab(null);
    announce(t('kanbanReturned', { title: card?.title ?? '', column: placeName(g.origin.cell), position: g.origin.index + 1 }));
    requestFocus(g.cardId);
  };

  const dropGrab = () => {
    const g = live.current.grab;
    if (!g) return;
    const after = live.current.view;
    const moved = after.find((c) => c.id === g.cardId);
    if (!moved) return setGrab(null);
    const cell = cellOf(moved, lanes);
    const idx = indexInCell(after, g.cardId, lanes);
    announce(describeResult('kanbanDropped', after, g.cardId));
    setGrab(null);
    executeMove(g.cardId, cell, idx);
    requestFocus(g.cardId);
  };

  const rtl = () => isRtl(rootRef.current);
  const navColumns = () => columns.filter((c) => !isCollapsed(c));
  const laneIds = (): (string | undefined)[] => (laneList ? laneList.map((l) => l.id) : [undefined]);

  const stepGrab = (key: string) => {
    const g = live.current.grab;
    if (!g) return;
    const cards = live.current.withPending;
    const rest = (cell: Cell) => shownIn(cards, cell).filter((c) => c.id !== g.cardId);
    const lanesIds = laneIds();
    let cell = g.cell;
    let index = g.index;
    const own = rest(cell);
    if (key === 'ArrowUp') {
      if (index > 0) index -= 1;
      else {
        const li = lanesIds.indexOf(cell.laneId);
        if (li > 0) {
          cell = { columnId: cell.columnId, laneId: lanesIds[li - 1] };
          index = rest(cell).length;
        } else return;
      }
    } else if (key === 'ArrowDown') {
      if (index < own.length) index += 1;
      else {
        const li = lanesIds.indexOf(cell.laneId);
        if (li >= 0 && li < lanesIds.length - 1) {
          cell = { columnId: cell.columnId, laneId: lanesIds[li + 1] };
          index = 0;
        } else return;
      }
    } else if (key === 'Home') index = 0;
    else if (key === 'End') index = own.length;
    else if (key === 'ArrowLeft' || key === 'ArrowRight') {
      const forward = (key === 'ArrowRight') !== rtl();
      const cols = navColumns();
      const at = cols.findIndex((c) => c.id === cell.columnId);
      const next = cols[at + (forward ? 1 : -1)];
      if (!next) return;
      const blocker = blockedColumn(cards, g.cardId, next.id);
      if (blocker) return announceLimit(blocker);
      cell = { columnId: next.id, laneId: cell.laneId };
      index = Math.min(index, rest(cell).length);
    } else return;
    if (sameCell(cell, g.cell) && index === g.index) return;
    const nextGrab = { ...g, cell, index };
    const after = placeCard(cards, g.cardId, cell, index, visible, lanes);
    setGrab(nextGrab);
    announce(describeResult('kanbanMovedTo', after, g.cardId));
    // A card that changes column is a new element: hand the focus to it.
    requestFocus(g.cardId);
  };

  // ----- keyboard roving -----
  const neighbour = (card: KanbanCardData, key: string): string | null => {
    const cell = cellOf(card, lanes);
    const list = shownIn(view, cell);
    const at = list.findIndex((c) => c.id === card.id);
    const lanesIds = laneIds();
    const li = lanesIds.indexOf(cell.laneId);
    if (key === 'ArrowDown') {
      if (list[at + 1]) return list[at + 1]!.id;
      for (let l = li + 1; l < lanesIds.length; l++) {
        const next = shownIn(view, { columnId: cell.columnId, laneId: lanesIds[l] })[0];
        if (next) return next.id;
      }
      return null;
    }
    if (key === 'ArrowUp') {
      if (list[at - 1]) return list[at - 1]!.id;
      for (let l = li - 1; l >= 0; l--) {
        const prev = shownIn(view, { columnId: cell.columnId, laneId: lanesIds[l] }).at(-1);
        if (prev) return prev.id;
      }
      return null;
    }
    if (key === 'Home') return list[0]?.id ?? null;
    if (key === 'End') return list.at(-1)?.id ?? null;
    if (key === 'ArrowLeft' || key === 'ArrowRight') {
      const forward = (key === 'ArrowRight') !== rtl();
      const cols = navColumns();
      let i = cols.findIndex((c) => c.id === cell.columnId) + (forward ? 1 : -1);
      for (; i >= 0 && i < cols.length; i += forward ? 1 : -1) {
        const target = shownIn(view, { columnId: cols[i]!.id, laneId: cell.laneId });
        if (target.length > 0) return target[Math.min(at, target.length - 1)]!.id;
      }
    }
    return null;
  };

  const onCardKeyDown = (e: ReactKeyboardEvent<HTMLElement>, card: KanbanCardData) => {
    if (e.defaultPrevented || e.altKey || e.ctrlKey || e.metaKey) return;
    const key = e.key;
    const grabbed = live.current.grab?.cardId === card.id;
    if (grabbed) {
      if (key === ' ' || key === 'Enter') {
        e.preventDefault();
        dropGrab();
      } else if (key === 'Escape') {
        e.preventDefault();
        cancelGrab();
      } else if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(key)) {
        e.preventDefault();
        stepGrab(key);
      } else if (key === 'Tab') cancelGrab();
      return;
    }
    if (live.current.drag) return;
    if ((e.shiftKey && key === 'F10') || key === 'ContextMenu') {
      e.preventDefault();
      openCardMenu(e.currentTarget, card);
      return;
    }
    if (key === ' ' && !readOnly) {
      e.preventDefault();
      pickUp(card);
      return;
    }
    if (key === 'F2' && onCardRename && !readOnly) {
      e.preventDefault();
      setRenameId(card.id);
      return;
    }
    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(key) && !e.shiftKey) {
      e.preventDefault();
      const id = neighbour(card, key);
      if (id) requestFocus(id);
    }
  };

  const onCardKeyUp = (e: ReactKeyboardEvent<HTMLElement>) => {
    // Space belongs to pick-up and drop: it must not also "click" the card.
    if (e.key === ' ' && !readOnly) e.preventDefault();
  };

  // ----- menu -----
  const menuCard = menuCardId ? view.find((c) => c.id === menuCardId) : undefined;
  const menuItems = (card: KanbanCardData): MenuItem[] => {
    const items: MenuItem[] = [];
    if (onCardOpen) items.push({ label: t('kanbanOpenCard'), command: () => onCardOpen(card) });
    if (readOnly) return items;
    if (onCardRename) items.push({ label: t('kanbanRename'), command: () => setRenameId(card.id) });
    const cell = cellOf(card, lanes);
    const list = shownIn(view, cell);
    const at = list.findIndex((c) => c.id === card.id);
    items.push({
      label: t('kanbanMoveTo'),
      items: columns.map((c) => ({ label: c.title, disabled: c.id === card.columnId, command: () => moveToColumn(card, c) })),
    });
    if (laneList) {
      items.push({
        label: t('kanbanMoveToLane'),
        items: laneList.map((l) => ({ label: l.title, disabled: l.id === cell.laneId, command: () => moveToLane(card, l) })),
      });
    }
    items.push({ label: t('kanbanMoveUp'), disabled: at <= 0, command: () => nudge(card, -1) });
    items.push({ label: t('kanbanMoveDown'), disabled: at < 0 || at >= list.length - 1, command: () => nudge(card, 1) });
    return items;
  };
  const openCardMenu = (button: HTMLElement, card: KanbanCardData) => {
    setMenuCardId(card.id);
    menuRef.current?.show({ target: button } as unknown as Event);
  };

  // ----- pointer drag -----
  const press = useRef<Press | null>(null);
  const suppressClick = useRef(false);
  const stable = useRef({
    move: (_e: PointerEvent) => {},
    up: (_e: PointerEvent) => {},
    cancel: () => {},
    key: (_e: KeyboardEvent) => {},
    touch: (_e: TouchEvent) => {},
  });
  const listeners = useRef({
    move: (e: PointerEvent) => stable.current.move(e),
    up: (e: PointerEvent) => stable.current.up(e),
    cancel: () => stable.current.cancel(),
    key: (e: KeyboardEvent) => stable.current.key(e),
    touch: (e: TouchEvent) => stable.current.touch(e),
  });

  const detach = () => {
    const p = press.current;
    if (p?.timer) window.clearTimeout(p.timer);
    if (p?.frame) cancelAnimationFrame(p.frame);
    window.removeEventListener('pointermove', listeners.current.move);
    window.removeEventListener('pointerup', listeners.current.up);
    window.removeEventListener('pointercancel', listeners.current.cancel);
    window.removeEventListener('keydown', listeners.current.key, true);
    window.removeEventListener('touchmove', listeners.current.touch);
    press.current = null;
  };
  useEffect(() => detach, []);

  const place = (p: Press) => {
    const scale = reduced ? 1 : 1.02;
    p.li.style.transform = `translate3d(${p.x - p.offsetX}px, ${p.y - p.offsetY}px, 0) scale(${scale})`;
  };

  const targetAt = (x: number, y: number, p: Press): DropTarget | null => {
    const root = rootRef.current;
    if (!root) return null;
    const sections = Array.from(root.querySelectorAll<HTMLElement>('section[data-column-id]:not([data-collapsed])'));
    const section = sections.find((s) => {
      const r = s.getBoundingClientRect();
      return x >= r.left && x <= r.right && y >= r.top && y <= r.bottom;
    });
    if (!section) return null;
    const cellEl = section.querySelector<HTMLElement>('[data-cell]');
    if (!cellEl) return null;
    const cell: Cell = { columnId: section.dataset.columnId!, laneId: section.dataset.laneId || undefined };
    const list = cellEl.querySelector<HTMLElement>('ul');
    const cards = live.current.withPending;
    const shown = shownIn(cards, cell).filter((c) => c.id !== p.cardId);
    let index = shown.length;
    if (list) {
      const top = list.getBoundingClientRect().top;
      const holder = list.querySelector<HTMLElement>(':scope > .ui-kanban__placeholder');
      const gap = parseFloat(getComputedStyle(list).rowGap) || 0;
      const shift = holder ? holder.offsetHeight + gap : 0;
      if (list.classList.contains('ui-kanban__list--virtual')) {
        const itemHeight = density === 'compact' ? 76 : 96;
        const slot = holder ? Math.round(holder.offsetTop / itemHeight) : -1;
        const local = y - top;
        const adjusted = slot >= 0 && local > (slot + 1) * itemHeight ? local - itemHeight : local;
        index = Math.min(shown.length, Math.max(0, Math.floor(adjusted / itemHeight + 0.5)));
      } else {
        const items = Array.from(list.querySelectorAll<HTMLElement>(':scope > li[data-card-id]')).filter((li) => li.dataset.cardId !== p.cardId);
        index = items.length;
        for (let i = 0; i < items.length; i += 1) {
          const li = items[i]!;
          const after = holder && li.offsetTop > holder.offsetTop;
          const mid = top + li.offsetTop - (after ? shift : 0) + li.offsetHeight / 2;
          if (y < mid) {
            index = i;
            break;
          }
        }
      }
    }
    const blocked = blockedColumn(cards, p.cardId, cell.columnId) !== null;
    return { cell, index: Math.min(index, shown.length), blocked };
  };

  const sameTarget = (a: DropTarget | null, b: DropTarget | null) => (a === b) || (!!a && !!b && sameCell(a.cell, b.cell) && a.index === b.index && a.blocked === b.blocked);

  const retarget = (p: Press) => {
    const next = targetAt(p.x, p.y, p);
    setDrag((d) => (d && !sameTarget(d.over, next) ? { ...d, over: next } : d));
  };

  const autoScroll = (p: Press) => {
    const root = rootRef.current;
    if (!root || !p.started) return;
    const ramp = (distance: number) => Math.ceil(MAX_SCROLL * Math.min(1, (EDGE - distance) / EDGE));
    let moved = false;
    const scroller = root.querySelector<HTMLElement>('.ui-kanban__scroller');
    if (scroller) {
      const r = scroller.getBoundingClientRect();
      if (p.y >= r.top && p.y <= r.bottom) {
        if (p.x - r.left < EDGE) {
          scroller.scrollLeft -= ramp(p.x - r.left);
          moved = true;
        } else if (r.right - p.x < EDGE) {
          scroller.scrollLeft += ramp(r.right - p.x);
          moved = true;
        }
      }
    }
    const scrolls = Array.from(root.querySelectorAll<HTMLElement>('.ui-kanban__column-body'));
    const body = scrolls.find((b) => {
      const r = b.getBoundingClientRect();
      return p.x >= r.left && p.x <= r.right && p.y >= r.top && p.y <= r.bottom;
    });
    const inner = body?.querySelector<HTMLElement>('.ui-kanban__scroll') ?? (body && body.scrollHeight > body.clientHeight ? body : null);
    if (inner) {
      const r = inner.getBoundingClientRect();
      if (p.y - r.top < EDGE) {
        inner.scrollTop -= ramp(p.y - r.top);
        moved = true;
      } else if (r.bottom - p.y < EDGE) {
        inner.scrollTop += ramp(r.bottom - p.y);
        moved = true;
      }
    }
    if (p.y < EDGE) {
      window.scrollBy(0, -ramp(p.y));
      moved = true;
    } else if (window.innerHeight - p.y < EDGE) {
      window.scrollBy(0, ramp(window.innerHeight - p.y));
      moved = true;
    }
    if (moved) retarget(p);
    p.frame = requestAnimationFrame(() => autoScroll(p));
  };

  const beginDrag = (p: Press) => {
    if (p.started || press.current !== p) return;
    p.started = true;
    if (p.timer) window.clearTimeout(p.timer);
    const card = live.current.withPending.find((c) => c.id === p.cardId);
    if (!card) return detach();
    const cell = cellOf(card, lanes);
    const list = shownIn(live.current.withPending, cell);
    const at = Math.max(0, list.findIndex((c) => c.id === p.cardId));
    suppressClick.current = true;
    setDrag({ cardId: p.cardId, width: p.width, height: p.height, over: { cell, index: at, blocked: false } });
    announce(t('kanbanPickedUp', { title: card.title, column: placeName(cell), position: at + 1, total: list.length }));
    try {
      buttonFor(p.cardId)?.setPointerCapture(p.pointerId);
    } catch {
      // Capture is a convenience: the window listeners carry the drag either way.
    }
    p.frame = requestAnimationFrame(() => autoScroll(p));
  };

  // The floating card needs its first position before the browser paints it fixed.
  useLayoutEffect(() => {
    const p = press.current;
    if (drag && p?.started) place(p);
  }, [drag?.cardId]); // eslint-disable-line react-hooks/exhaustive-deps

  const endDrag = (commit: boolean) => {
    const p = press.current;
    if (!p) return;
    const wasStarted = p.started;
    const card = live.current.withPending.find((c) => c.id === p.cardId);
    const over = live.current.drag?.over ?? null;
    const rect = p.li.getBoundingClientRect();
    detach();
    if (!wasStarted || !card) return;
    window.setTimeout(() => (suppressClick.current = false), 60);
    settle.current = { cardId: p.cardId, left: rect.left, top: rect.top };
    const origin = { cell: cellOf(card, lanes), index: Math.max(0, shownIn(live.current.withPending, cellOf(card, lanes)).findIndex((c) => c.id === p.cardId)) };
    setDrag(null);
    if (commit && over) {
      const blocker = over.blocked ? columns.find((c) => c.id === over.cell.columnId) : undefined;
      if (blocker) {
        announceLimit(blocker);
        return;
      }
      const rest = live.current.withPending.filter((c) => c.id !== p.cardId);
      const idx = fullIndex(rest, over.cell, over.index, visible, lanes);
      const after = moveToCell(live.current.withPending, p.cardId, over.cell, idx, lanes);
      if (executeMove(p.cardId, over.cell, idx)) {
        announce(describeResult('kanbanDropped', after, p.cardId));
        return;
      }
      announce(describeResult('kanbanDropped', after, p.cardId));
      return;
    }
    announce(t('kanbanReturned', { title: card.title, column: placeName(origin.cell), position: origin.index + 1 }));
  };

  stable.current.move = (e) => {
    const p = press.current;
    if (!p || e.pointerId !== p.pointerId) return;
    p.x = e.clientX;
    p.y = e.clientY;
    if (!p.started) {
      const dist = Math.hypot(e.clientX - p.x0, e.clientY - p.y0);
      if (p.type === 'touch') {
        if (dist > TOUCH_SLOP) detach();
        return;
      }
      if (dist < DRAG_THRESHOLD) return;
      beginDrag(p);
    }
    place(p);
    retarget(p);
  };
  stable.current.up = (e) => {
    const p = press.current;
    if (!p || e.pointerId !== p.pointerId) return;
    endDrag(true);
  };
  stable.current.cancel = () => endDrag(false);
  stable.current.key = (e) => {
    if (e.key === 'Escape' && press.current?.started) {
      e.preventDefault();
      e.stopPropagation();
      endDrag(false);
    }
  };
  stable.current.touch = (e) => {
    if (press.current?.started && e.cancelable) e.preventDefault();
  };

  const onCardPointerDown = (e: ReactPointerEvent<HTMLElement>, card: KanbanCardData) => {
    if (readOnly || !e.isPrimary || (e.pointerType === 'mouse' && e.button !== 0) || live.current.grab || renameId) return;
    detach();
    const li = e.currentTarget.closest('li');
    if (!li) return;
    const rect = li.getBoundingClientRect();
    const p: Press = {
      cardId: card.id,
      pointerId: e.pointerId,
      type: e.pointerType,
      x0: e.clientX,
      y0: e.clientY,
      x: e.clientX,
      y: e.clientY,
      started: false,
      li,
      offsetX: e.clientX - rect.left,
      offsetY: e.clientY - rect.top,
      width: rect.width,
      height: rect.height,
    };
    press.current = p;
    setFocusedId(card.id);
    window.addEventListener('pointermove', listeners.current.move);
    window.addEventListener('pointerup', listeners.current.up);
    window.addEventListener('pointercancel', listeners.current.cancel);
    window.addEventListener('keydown', listeners.current.key, true);
    if (e.pointerType === 'touch') {
      window.addEventListener('touchmove', listeners.current.touch, { passive: false });
      p.timer = window.setTimeout(() => beginDrag(p), TOUCH_HOLD_MS);
    }
  };

  // After a drop (or a cancelled drag) the card settles into its slot with the snap easing.
  useLayoutEffect(() => {
    const s = settle.current;
    if (!s) return;
    settle.current = null;
    const el = buttonFor(s.cardId)?.closest('li');
    if (!el) return;
    el.style.removeProperty('transform');
    const to = el.getBoundingClientRect();
    const dx = s.left - to.left;
    const dy = s.top - to.top;
    if (Math.abs(dx) < 1 && Math.abs(dy) < 1) return;
    safeAnimate(el, [{ transform: `translate(${dx}px, ${dy}px) scale(1.02)` }, { transform: 'translate(0, 0) scale(1)' }], {
      duration: readMotionMs(el, 'part'),
      easing: EASING.snap,
      reduced: 'skip',
    });
  });

  // ----- misc handlers -----
  const onCardClick = (card: KanbanCardData) => {
    if (suppressClick.current) return;
    setFocusedId(card.id);
    onCardOpen?.(card);
  };
  const onCardBlur = (card: KanbanCardData) => {
    if (live.current.grab?.cardId !== card.id) return;
    window.setTimeout(() => {
      const g = live.current.grab;
      if (g?.cardId === card.id && document.activeElement !== buttonFor(card.id)) cancelGrab();
    }, 0);
  };
  const onCardFocus = (card: KanbanCardData) => setFocusedId(card.id);
  const onCardContextMenu: KanbanContextValue['onCardContextMenu'] = (event, card) => {
    if (readOnly && !onCardOpen) return;
    setMenuCardId(card.id);
    menuRef.current?.show(event as Event);
  };

  const commitRename = (card: KanbanCardData, title: string) => {
    const next = title.trim();
    setRenameId(null);
    if (next && next !== card.title) {
      onCardRename?.(card.id, next);
      if (!controlled) setInternal((cur) => cur.map((c) => (c.id === card.id ? { ...c, title: next } : c)));
    }
    requestFocus(card.id);
  };
  const cancelRename = (card: KanbanCardData, refocus: boolean) => {
    setRenameId((cur) => (cur === card.id ? null : cur));
    if (refocus) requestFocus(card.id);
  };

  const submitAdd = (columnId: string, title: string) => {
    try {
      const result = onCardAdd?.(columnId, title);
      if (isThenable(result)) result.then(undefined, () => undefined);
    } catch {
      // The caller owns its errors.
    }
  };
  const closeAdd = (columnId: string) => {
    setAddColumnId(null);
    window.setTimeout(() => Array.from(rootRef.current?.querySelectorAll<HTMLElement>('[data-add-button]') ?? []).find((b) => b.dataset.addButton === columnId)?.focus(), 0);
  };
  const toggleColumn = (column: KanbanColumnDef) => {
    const next = !isCollapsed(column);
    setToggled((m) => ({ ...m, [column.id]: next }));
    onColumnToggle?.(column.id, next);
  };

  // ----- derived render data -----
  const cellInfo = useCallback(
    (cell: Cell) => ({ shown: shownIn(view, cell), columnTotal: countColumn(view, cell.columnId) }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [view, visible, lanes],
  );
  const rowsFor = (cell: Cell): Row[] => {
    const shown = shownIn(view, cell);
    const over = drag?.over;
    const holderIndex = drag && over && sameCell(over.cell, cell) ? over.index : -1;
    const rows: Row[] = [];
    let slot = 0;
    shown.forEach((card, index) => {
      const floating = drag?.cardId === card.id;
      if (!floating) {
        if (slot === holderIndex) rows.push({ kind: 'placeholder' });
        slot += 1;
      }
      rows.push({ kind: 'card', card, index });
    });
    if (holderIndex >= 0 && slot === holderIndex) rows.push({ kind: 'placeholder' });
    return rows;
  };

  const keepId = drag?.cardId ?? grab?.cardId ?? renameId ?? focusedId;
  const ctx: KanbanContextValue = {
    t,
    tp,
    locale,
    columns,
    lanes: laneList,
    density,
    readOnly,
    filter,
    headingLevel,
    tabStopId,
    grabId: grab?.cardId ?? null,
    drag,
    pendingIds: new Set(pending.map((p) => p.cardId)),
    renameId,
    addColumnId,
    keepId,
    canAdd: Boolean(onCardAdd),
    canRename: Boolean(onCardRename),
    renderCard,
    virtualize,
    instructionsId,
    baseId,
    isCollapsed,
    cellInfo,
    columnCount: (id) => countColumn(view, id),
    rowsFor,
    placeName,
    onCardKeyDown,
    onCardKeyUp,
    onCardPointerDown,
    onCardClick,
    onCardBlur,
    onCardFocus,
    onCardContextMenu,
    openCardMenu,
    commitRename,
    cancelRename,
    openAdd: (id) => setAddColumnId(id),
    closeAdd,
    submitAdd,
    toggleColumn,
  };

  // ----- motion: columns assemble in order on first render -----
  const showBoard = !loading && !error;
  useAssemble(rootRef, { parts: '[data-assemble]', axis: 'inline', enabled: showBoard && columns.length <= 8, trigger: 'first', onComplete: () => setAssembling(false) });
  useEffect(() => {
    if (showBoard && columns.length > 8) setAssembling(false);
  }, [showBoard, columns.length]);

  // ----- render -----
  let body: ReactNode;
  if (error) {
    body = (
      <EmptyState
        variant="error"
        live
        titleAs={`h${Math.min(4, headingLevel)}` as 'h2'}
        title={t('kanbanErrorTitle')}
        description={error}
        action={
          onRetry ? (
            <Button size="sm" variant="secondary" appearance="outline" onClick={onRetry}>
              {t('retry')}
            </Button>
          ) : undefined
        }
      />
    );
  } else if (loading) {
    body = (
      <div className="ui-kanban__scroller" aria-busy="true">
        <span className="visually-hidden" role="status">
          {t('kanbanLoading')}
        </span>
        <div className="ui-kanban__columns">
          {columns.map((column, i) => (
            <section key={column.id} className="ui-kanban__column ui-kanban__column--skeleton" aria-hidden="true">
              <header className="ui-kanban__column-header">
                <span className="ui-kanban__numeral ui-tabular">{i + 1}</span>
                <Skeleton shape="rect" width="6rem" height="1.25rem" animation="glow" />
              </header>
              <div className="ui-kanban__column-body">
                <ul className="ui-kanban__list">
                  {[0, 1, 2].map((n) => (
                    <li key={n} className="ui-kanban__item">
                      <div className="ui-kanban__card ui-kanban__card--skeleton">
                        <Skeleton shape="rect" width="100%" height="4.25rem" animation="glow" />
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            </section>
          ))}
        </div>
      </div>
    );
  } else {
    const renderColumns = (laneId: string | undefined, first: boolean) => (
      <div className="ui-kanban__columns">
        {cellsOf(laneId).map((cell, i) => (
          <KanbanColumn key={cell.columnId} column={columns[i]!} stage={i} cell={cell} assemble={first} />
        ))}
      </div>
    );
    body = (
      <div className="ui-kanban__scroller">
        {assembling && <span className="ui-kanban__guide" data-assemble-guide aria-hidden="true" />}
        {laneList ? (
          laneList.map((lane, i) => <LaneSection key={lane.id} lane={lane} first={i === 0} count={view.filter((c) => laneOf(c, lanes) === lane.id && visible(c)).length} level={headingLevel} content={renderColumns(lane.id, i === 0)} />)
        ) : (
          renderColumns(undefined, true)
        )}
      </div>
    );
  }

  return (
    <KanbanContext.Provider value={ctx}>
      <div
        ref={mergeRefs(rootRef, ref)}
        role="region"
        className={cx('ui-kanban', `ui-kanban--${density}`, readOnly && 'ui-kanban--readonly', drag && 'ui-kanban--dragging', className)}
        {...rest}
      >
        {toolbar && <div className="ui-kanban__toolbar">{toolbar}</div>}
        {body}
        {!readOnly && (
          <span id={instructionsId} className="visually-hidden">
            {t('kanbanInstructions')}
          </span>
        )}
        <div className="ui-kanban__live visually-hidden" role="status" aria-live="polite" aria-atomic="true">
          <span key={announcement.n}>{announcement.text}</span>
        </div>
        <ContextMenu ref={menuRef} items={menuCard ? menuItems(menuCard) : []} ariaLabel={menuCard ? t('kanbanCardActions', { title: menuCard.title }) : undefined} />
      </div>
    </KanbanContext.Provider>
  );
}

function LaneSection({ lane, first, count, level, content }: { lane: KanbanLane; first: boolean; count: number; level: number; content: ReactNode }) {
  const titleId = useId();
  const Heading = `h${Math.min(6, level)}` as 'h3';
  return (
    <section className={cx('ui-kanban__lane', first && 'is-first')} aria-labelledby={titleId}>
      <div className="ui-kanban__lane-header">
        <Heading id={titleId} className="ui-kanban__lane-title">
          {lane.title}
        </Heading>
        <KanbanQty value={count} />
      </div>
      {content}
    </section>
  );
}
