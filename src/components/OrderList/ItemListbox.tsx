import { useLayoutEffect, useRef, useState, type KeyboardEvent, type MouseEvent, type PointerEvent, type ReactNode, type Ref } from 'react';
import { useTypeahead } from '../../hooks/useTypeahead';
import { cx } from '../../utils/cx';
import type { ListKey } from './reorder';

export interface ItemListboxProps<T> {
  items: T[];
  keyOf: (item: T, index: number) => ListKey;
  labelOf: (item: T) => string;
  selected: Set<ListKey>;
  onSelectedChange: (next: Set<ListKey>) => void;
  itemTemplate?: (item: T) => ReactNode;
  id?: string;
  'aria-label'?: string;
  'aria-labelledby'?: string;
  height?: string;
  disabled?: boolean;
  emptyMessage?: ReactNode;
  /** Double-click or Enter on an item. */
  onActivate?: (item: T, index: number) => void;
  /** Alt+ArrowUp / Alt+ArrowDown on the listbox. */
  onMoveSelected?: (delta: -1 | 1) => void;
  dragdrop?: boolean;
  onDrop?: (fromIndex: number, toIndex: number) => void;
  className?: string;
  ref?: Ref<HTMLUListElement>;
}

const DRAG_THRESHOLD = 4;

/** Multi-select listbox with roving focus, shared by OrderList and PickList. */
export function ItemListbox<T>({
  items,
  keyOf,
  labelOf,
  selected,
  onSelectedChange,
  itemTemplate,
  id,
  height,
  disabled = false,
  emptyMessage,
  onActivate,
  onMoveSelected,
  dragdrop = false,
  onDrop,
  className,
  ref,
  ...aria
}: ItemListboxProps<T>) {
  const [focusedKey, setFocusedKey] = useState<ListKey | null>(null);
  const [anchorKey, setAnchorKey] = useState<ListKey | null>(null);
  const [drag, setDrag] = useState<{ from: number; to: number | null } | null>(null);
  const rootRef = useRef<HTMLUListElement | null>(null);
  const pendingFocus = useRef<ListKey | null>(null);
  const suppressClick = useRef(false);
  const keys = items.map((item, i) => keyOf(item, i));
  const firstSelected = keys.find((k) => selected.has(k));
  const activeKey = focusedKey !== null && keys.includes(focusedKey) ? focusedKey : (firstSelected ?? keys[0] ?? null);
  const typeahead = useTypeahead<T>(items, labelOf);

  const baseId = useRef(id ?? `ui-listbox-${Math.random().toString(36).slice(2)}`).current;
  const optionId = (key: ListKey) => `${baseId}-opt-${key}`;

  // Moving items re-orders DOM nodes, which can drop focus: restore it.
  useLayoutEffect(() => {
    if (pendingFocus.current === null) return;
    document.getElementById(optionId(pendingFocus.current))?.focus();
    pendingFocus.current = null;
  });

  const focusKey = (key: ListKey | undefined) => {
    if (key === undefined) return;
    setFocusedKey(key);
    document.getElementById(optionId(key))?.focus();
  };

  const selectRange = (to: ListKey) => {
    const a = keys.indexOf(anchorKey ?? activeKey ?? to);
    const b = keys.indexOf(to);
    const [lo, hi] = a < b ? [a, b] : [b, a];
    onSelectedChange(new Set(keys.slice(lo, hi + 1)));
  };

  const handleClick = (event: MouseEvent, key: ListKey) => {
    if (disabled || suppressClick.current) return;
    setFocusedKey(key);
    if (event.shiftKey) {
      selectRange(key);
      return;
    }
    setAnchorKey(key);
    if (event.ctrlKey || event.metaKey) {
      const next = new Set(selected);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      onSelectedChange(next);
    } else {
      onSelectedChange(selected.size === 1 && selected.has(key) ? new Set() : new Set([key]));
    }
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLUListElement>) => {
    if (disabled || (event.target as HTMLElement).getAttribute('role') !== 'option') return;
    const index = keys.indexOf(activeKey as ListKey);
    if (index === -1) return;
    const { key } = event;
    if (event.altKey && (key === 'ArrowUp' || key === 'ArrowDown')) {
      if (!onMoveSelected) return;
      event.preventDefault();
      pendingFocus.current = activeKey;
      onMoveSelected(key === 'ArrowUp' ? -1 : 1);
      return;
    }
    if (event.ctrlKey || event.metaKey || event.altKey) {
      if ((event.ctrlKey || event.metaKey) && key.toLowerCase() === 'a') {
        event.preventDefault();
        onSelectedChange(new Set(keys));
      }
      return;
    }
    switch (key) {
      case 'ArrowDown':
      case 'ArrowUp': {
        const target = keys[index + (key === 'ArrowDown' ? 1 : -1)];
        if (target === undefined) break;
        focusKey(target);
        if (event.shiftKey) selectRange(target);
        break;
      }
      case 'Home':
        focusKey(keys[0]);
        break;
      case 'End':
        focusKey(keys[keys.length - 1]);
        break;
      case ' ': {
        const next = new Set(selected);
        if (next.has(activeKey as ListKey)) next.delete(activeKey as ListKey);
        else next.add(activeKey as ListKey);
        setAnchorKey(activeKey);
        onSelectedChange(next);
        break;
      }
      case 'Enter':
        if (!onActivate) return;
        onActivate(items[index]!, index);
        break;
      default: {
        if (key.length === 1 && !event.shiftKey) {
          const match = typeahead(key, index);
          if (match !== -1) focusKey(keys[match]);
          break;
        }
        return;
      }
    }
    event.preventDefault();
  };

  // Pointer-event drag and drop (works with touch; no HTML5 DnD).
  const startDrag = (event: PointerEvent<HTMLLIElement>, index: number) => {
    if (!dragdrop || disabled || event.button !== 0) return;
    const origin = { x: event.clientX, y: event.clientY };
    let active = false;
    let target: number | null = null;
    const cleanup = () => {
      document.removeEventListener('pointermove', move);
      document.removeEventListener('pointerup', end);
      document.removeEventListener('pointercancel', cancel);
    };
    const move = (e: globalThis.PointerEvent) => {
      if (!active) {
        if (Math.hypot(e.clientX - origin.x, e.clientY - origin.y) < DRAG_THRESHOLD) return;
        active = true;
      }
      const el = document.elementFromPoint?.(e.clientX, e.clientY)?.closest<HTMLElement>('[role="option"]');
      const hovered = el && rootRef.current?.contains(el) ? Number(el.dataset.index) : NaN;
      target = Number.isNaN(hovered) ? null : hovered;
      setDrag({ from: index, to: target });
    };
    const end = () => {
      cleanup();
      setDrag(null);
      if (!active) return;
      suppressClick.current = true;
      window.setTimeout(() => (suppressClick.current = false), 0);
      if (target !== null && target !== index) {
        pendingFocus.current = keys[index] ?? null;
        onDrop?.(index, target);
      }
    };
    const cancel = () => {
      cleanup();
      setDrag(null);
    };
    document.addEventListener('pointermove', move);
    document.addEventListener('pointerup', end);
    document.addEventListener('pointercancel', cancel);
  };

  const setRootRef = (node: HTMLUListElement | null) => {
    rootRef.current = node;
    if (typeof ref === 'function') ref(node);
    else if (ref) (ref as { current: HTMLUListElement | null }).current = node;
  };

  return (
    <div className={cx('ui-item-listbox', disabled && 'ui-item-listbox--disabled', className)} style={height ? { height } : undefined}>
      <ul
        ref={setRootRef}
        role="listbox"
        aria-multiselectable="true"
        aria-disabled={disabled || undefined}
        aria-label={aria['aria-label']}
        aria-labelledby={aria['aria-labelledby']}
        className="list-group ui-item-listbox__list"
        onKeyDown={handleKeyDown}
      >
        {items.map((item, index) => {
          const key = keys[index]!;
          const isSelected = selected.has(key);
          return (
            // Keyboard handled on the listbox; pointer interaction here.
            // eslint-disable-next-line jsx-a11y/click-events-have-key-events
            <li
              key={key}
              id={optionId(key)}
              role="option"
              aria-selected={isSelected}
              data-index={index}
              tabIndex={disabled ? -1 : activeKey === key ? 0 : -1}
              className={cx(
                'list-group-item list-group-item-action ui-item-listbox__option',
                isSelected && 'active ui-item-listbox__option--selected',
                drag && drag.to === index && drag.from !== index && (drag.from < index ? 'ui-item-listbox__option--drop-after' : 'ui-item-listbox__option--drop-before'),
                drag?.from === index && 'ui-item-listbox__option--dragging',
              )}
              onFocus={(e) => {
                if (e.target === e.currentTarget) setFocusedKey(key);
              }}
              onClick={(e) => handleClick(e, key)}
              onDoubleClick={() => !disabled && onActivate?.(item, index)}
              onPointerDown={(e) => startDrag(e, index)}
            >
              {itemTemplate ? itemTemplate(item) : labelOf(item)}
            </li>
          );
        })}
        {items.length === 0 && emptyMessage && (
          <li role="presentation" className="list-group-item text-body-secondary ui-item-listbox__empty">
            {emptyMessage}
          </li>
        )}
      </ul>
    </div>
  );
}
