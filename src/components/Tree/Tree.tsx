import { useEffect, useId, useMemo, useRef, useState, type KeyboardEvent, type MouseEvent, type PointerEvent, type ReactNode, type Ref } from 'react';
import { useControllableState } from '../../hooks/useControllableState';
import { useTypeahead } from '../../hooks/useTypeahead';
import { useLocale } from '../../locale/LocaleProvider';
import { cx } from '../../utils/cx';
import { Checkbox } from '../Checkbox/Checkbox';
import { Icon } from '../Icon/Icon';
import { Spinner } from '../Spinner/Spinner';
import {
  checkState,
  filterTree,
  findNode,
  flattenVisible,
  insertNode,
  isRtl,
  nextSelection,
  removeNode,
  selectionToSet,
  descendantKeys,
  useLazyChildren,
  type DropPosition,
  type FlatNode,
  type TreeKey,
  type TreeNode,
  type TreeSelectionMode,
  type TreeSelectionValue,
} from './treeUtils';

export interface TreeNodeDrop<T> {
  dragKey: TreeKey;
  dropKey: TreeKey;
  position: DropPosition;
  value: TreeNode<T>[];
}

export interface TreeProps<T = unknown> {
  value: TreeNode<T>[];
  expandedKeys?: Set<TreeKey>;
  defaultExpandedKeys?: Set<TreeKey>;
  onToggle?: (expandedKeys: Set<TreeKey>) => void;
  selectionMode?: TreeSelectionMode | null;
  selection?: TreeSelectionValue;
  defaultSelection?: TreeSelectionValue;
  onSelectionChange?: (selection: TreeSelectionValue) => void;
  onLoadChildren?: (node: TreeNode<T>) => Promise<TreeNode<T>[]>;
  filter?: boolean;
  nodeTemplate?: (node: TreeNode<T>) => ReactNode;
  dragdrop?: boolean;
  /** Receives the re-arranged tree after a drop. */
  onNodeDrop?: (drop: TreeNodeDrop<T>) => void;
  emptyMessage?: ReactNode;
  className?: string;
  'aria-label'?: string;
  'aria-labelledby'?: string;
  ref?: Ref<HTMLUListElement>;
}

const EMPTY_SET: Set<TreeKey> = new Set();
const DRAG_THRESHOLD = 4;

export function Tree<T = unknown>({
  value,
  expandedKeys: expandedProp,
  defaultExpandedKeys = EMPTY_SET,
  onToggle,
  selectionMode = null,
  selection: selectionProp,
  defaultSelection = null,
  onSelectionChange,
  onLoadChildren,
  filter = false,
  nodeTemplate,
  dragdrop = false,
  onNodeDrop,
  emptyMessage,
  className,
  'aria-label': ariaLabel,
  'aria-labelledby': ariaLabelledBy,
  ref,
}: TreeProps<T>) {
  const { t } = useLocale();
  const baseId = useId();
  const [expanded, setExpanded] = useControllableState<Set<TreeKey>>(expandedProp, defaultExpandedKeys, onToggle);
  const [selection, setSelection] = useControllableState<TreeSelectionValue>(selectionProp, defaultSelection, onSelectionChange);
  const [query, setQuery] = useState('');
  const [focusedKey, setFocusedKey] = useState<TreeKey | null>(null);
  const [dropTarget, setDropTarget] = useState<{ key: TreeKey; position: DropPosition } | null>(null);
  const [draggingKey, setDraggingKey] = useState<TreeKey | null>(null);
  const rootRef = useRef<HTMLUListElement | null>(null);
  const suppressClick = useRef(false);
  const { childrenOf, needsLoad, isExpandable, load, loading } = useLazyChildren<T>(onLoadChildren);

  const filtered = useMemo(() => filterTree(value, query, childrenOf), [value, query, childrenOf]);
  const nodes = filtered.nodes;
  const filtering = query.trim() !== '';
  const isOpen = (node: TreeNode<T>) => expanded.has(node.key) || filtered.forced.has(node.key);

  const flat = useMemo(
    () => flattenVisible(nodes, (n) => expanded.has(n.key) || filtered.forced.has(n.key), childrenOf),
    [nodes, expanded, filtered.forced, childrenOf],
  );
  const activeKey = flat.some((f) => f.node.key === focusedKey) ? focusedKey : (flat[0]?.node.key ?? null);

  const itemId = (key: TreeKey) => `${baseId}-item-${key}`;
  const labelId = (key: TreeKey) => `${baseId}-label-${key}`;
  const focusItem = (key: TreeKey | undefined) => {
    if (key === undefined) return;
    setFocusedKey(key);
    document.getElementById(itemId(key))?.focus();
  };

  const checks = useMemo(() => (selectionMode === 'checkbox' ? checkState(value, selection, childrenOf) : null), [selectionMode, value, selection, childrenOf]);
  const selectedKeys = useMemo(() => (selectionMode === 'single' || selectionMode === 'multiple' ? selectionToSet(selection) : null), [selectionMode, selection]);

  const setOpen = (node: TreeNode<T>, open: boolean) => {
    const next = new Set(expanded);
    if (open) {
      next.add(node.key);
      if (needsLoad(node)) void load(node);
    } else {
      next.delete(node.key);
    }
    setExpanded(next);
  };

  const toggleNode = (node: TreeNode<T>) => {
    if (node.disabled || !isExpandable(node)) return;
    // While filtering, forced-open ancestors cannot be collapsed.
    if (filtered.forced.has(node.key)) return;
    setOpen(node, !expanded.has(node.key));
  };

  const activate = (node: TreeNode<T>) => {
    if (!selectionMode || node.disabled || node.selectable === false) return;
    const original = findNode(value, node.key, childrenOf) ?? node;
    setSelection(nextSelection(selectionMode, selection, original, value, childrenOf));
  };

  const typeahead = useTypeahead<FlatNode<T>>(flat, (f) => f.node.label);

  const handleKeyDown = (event: KeyboardEvent<HTMLUListElement>) => {
    const target = event.target as HTMLElement;
    if (target.getAttribute('role') !== 'treeitem' || event.altKey || event.ctrlKey || event.metaKey) return;
    const index = flat.findIndex((f) => f.node.key === activeKey);
    const current = flat[index];
    if (!current) return;
    const { node } = current;
    const rtl = isRtl(rootRef.current);
    const open = isExpandable(node) && isOpen(node);
    let key = event.key;
    if (rtl && key === 'ArrowRight') key = 'ArrowLeft';
    else if (rtl && key === 'ArrowLeft') key = 'ArrowRight';
    switch (key) {
      case 'ArrowDown':
        focusItem(flat[index + 1]?.node.key);
        break;
      case 'ArrowUp':
        focusItem(flat[index - 1]?.node.key);
        break;
      case 'Home':
        focusItem(flat[0]?.node.key);
        break;
      case 'End':
        focusItem(flat[flat.length - 1]?.node.key);
        break;
      case 'ArrowRight':
        if (!isExpandable(node) || node.disabled) break;
        if (!open) setOpen(node, true);
        else focusItem(flat[index + 1]?.node.key);
        break;
      case 'ArrowLeft':
        if (open && !filtered.forced.has(node.key)) setOpen(node, false);
        else if (current.parentKey !== null) focusItem(current.parentKey);
        break;
      case 'Enter':
      case ' ':
        if (selectionMode) activate(node);
        else if (event.key === 'Enter') toggleNode(node);
        break;
      case '*': {
        const next = new Set(expanded);
        for (const sibling of flat.filter((f) => f.parentKey === current.parentKey)) {
          if (isExpandable(sibling.node) && !sibling.node.disabled) {
            next.add(sibling.node.key);
            if (needsLoad(sibling.node)) void load(sibling.node);
          }
        }
        setExpanded(next);
        break;
      }
      default: {
        if (event.key.length === 1) {
          const match = typeahead(event.key, index);
          if (match !== -1) focusItem(flat[match]?.node.key);
          break;
        }
        return;
      }
    }
    event.preventDefault();
  };

  // ---- Pointer-event drag and drop (touch friendly, no HTML5 DnD) ----
  const dragState = useRef<{ key: TreeKey; x: number; y: number; active: boolean; target: { key: TreeKey; position: DropPosition } | null } | null>(null);
  const valueRef = useRef(value);
  valueRef.current = value;
  const dropRef = useRef(onNodeDrop);
  dropRef.current = onNodeDrop;
  const childrenOfRef = useRef(childrenOf);
  childrenOfRef.current = childrenOf;

  const startDrag = (event: PointerEvent<HTMLDivElement>, node: TreeNode<T>) => {
    if (!dragdrop || node.disabled || event.button !== 0) return;
    dragState.current = { key: node.key, x: event.clientX, y: event.clientY, active: false, target: null };
    const move = (e: globalThis.PointerEvent) => {
      const state = dragState.current;
      if (!state) return;
      if (!state.active) {
        if (Math.hypot(e.clientX - state.x, e.clientY - state.y) < DRAG_THRESHOLD) return;
        state.active = true;
        setDraggingKey(state.key);
      }
      const el = document.elementFromPoint?.(e.clientX, e.clientY)?.closest<HTMLElement>('[role="treeitem"]');
      const key = el?.dataset.key;
      const hovered = key === undefined ? undefined : findNodeByString(valueRef.current, key, childrenOfRef.current);
      const dragged = findNode(valueRef.current, state.key, childrenOfRef.current);
      if (!el || !hovered || !dragged || hovered.key === state.key || descendantKeys(dragged, childrenOfRef.current).includes(hovered.key)) {
        state.target = null;
        setDropTarget(null);
        return;
      }
      const rect = (el.querySelector('.ui-tree__row') ?? el).getBoundingClientRect();
      const ratio = rect.height > 0 ? (e.clientY - rect.top) / rect.height : 0.5;
      const position: DropPosition = ratio < 0.25 ? 'before' : ratio > 0.75 ? 'after' : 'inside';
      state.target = { key: hovered.key, position };
      setDropTarget(state.target);
    };
    const end = () => {
      document.removeEventListener('pointermove', move);
      document.removeEventListener('pointerup', end);
      document.removeEventListener('pointercancel', cancel);
      const state = dragState.current;
      dragState.current = null;
      setDraggingKey(null);
      setDropTarget(null);
      if (!state?.active) return;
      suppressClick.current = true;
      window.setTimeout(() => (suppressClick.current = false), 0);
      if (!state.target) return;
      const { nodes: without, removed } = removeNode(valueRef.current, state.key);
      if (!removed) return;
      const next = insertNode(without, state.target.key, state.target.position, removed);
      dropRef.current?.({ dragKey: state.key, dropKey: state.target.key, position: state.target.position, value: next });
    };
    const cancel = () => {
      dragState.current = null;
      setDraggingKey(null);
      setDropTarget(null);
      document.removeEventListener('pointermove', move);
      document.removeEventListener('pointerup', end);
      document.removeEventListener('pointercancel', cancel);
    };
    document.addEventListener('pointermove', move);
    document.addEventListener('pointerup', end);
    document.addEventListener('pointercancel', cancel);
  };

  useEffect(() => () => void (dragState.current = null), []);

  const handleRowClick = (event: MouseEvent<HTMLDivElement>, node: TreeNode<T>) => {
    if (suppressClick.current) return;
    setFocusedKey(node.key);
    const li = document.getElementById(itemId(node.key));
    if (li && document.activeElement !== li) li.focus();
    if ((event.target as HTMLElement).closest('.ui-tree__toggler')) {
      toggleNode(node);
      return;
    }
    if (selectionMode) activate(node);
  };

  const renderNodes = (list: TreeNode<T>[], level: number): ReactNode =>
    list.map((node, index) => {
      const children = childrenOf(node);
      const expandable = isExpandable(node);
      const open = expandable && isOpen(node);
      const isLoading = loading.has(node.key);
      const selectable = selectionMode !== null && node.selectable !== false && !node.disabled;
      const isChecked = checks?.checked.has(node.key) ?? false;
      const isPartial = checks?.partial.has(node.key) ?? false;
      const isSelected = selectedKeys?.has(node.key) ?? false;
      let ariaSelected: boolean | undefined;
      let ariaChecked: boolean | 'mixed' | undefined;
      if (selectionMode === 'checkbox') ariaChecked = isPartial ? 'mixed' : isChecked;
      else if (selectionMode) ariaSelected = isSelected;
      const drop = dropTarget?.key === node.key ? dropTarget.position : null;
      return (
        <li
          key={node.key}
          id={itemId(node.key)}
          role="treeitem"
          data-key={String(node.key)}
          aria-level={level}
          aria-setsize={list.length}
          aria-posinset={index + 1}
          aria-expanded={expandable ? open : undefined}
          aria-selected={ariaSelected}
          aria-checked={ariaChecked}
          aria-disabled={node.disabled || undefined}
          aria-busy={isLoading || undefined}
          aria-labelledby={labelId(node.key)}
          tabIndex={activeKey === node.key ? 0 : -1}
          className={cx('ui-tree__node', draggingKey === node.key && 'ui-tree__node--dragging')}
          onFocus={(e) => {
            if (e.target === e.currentTarget) setFocusedKey(node.key);
          }}
        >
          {/* Keyboard is handled on the tree root (APG); the row only adds pointer interaction. */}
          {/* eslint-disable-next-line jsx-a11y/click-events-have-key-events, jsx-a11y/no-static-element-interactions */}
          <div
            className={cx(
              'ui-tree__row',
              (isSelected || (selectionMode === 'checkbox' && isChecked)) && 'ui-tree__row--selected',
              node.disabled && 'ui-tree__row--disabled',
              selectable && 'ui-tree__row--selectable',
              drop && `ui-tree__row--drop-${drop}`,
            )}
            style={{ paddingInlineStart: `calc(var(--ui-tree-indent) * ${level - 1})` }}
            onClick={(e) => handleRowClick(e, node)}
            onPointerDown={(e) => startDrag(e, node)}
          >
            <span className={cx('ui-tree__toggler', !expandable && 'ui-tree__toggler--empty')} aria-hidden="true">
              {isLoading ? <Spinner size="sm" decorative /> : expandable ? <Icon name="chevron-right" directional className={cx('ui-tree__chevron', open && 'ui-tree__chevron--open')} /> : null}
            </span>
            {selectionMode === 'checkbox' && node.selectable !== false && (
              <Checkbox className="ui-tree__checkbox" aria-hidden="true" tabIndex={-1} checked={isChecked} indeterminate={isPartial} disabled={node.disabled} onChange={() => {}} />
            )}
            {node.icon && <Icon name={node.icon} className="ui-tree__icon" />}
            <span id={labelId(node.key)} className="ui-tree__label">
              {nodeTemplate ? nodeTemplate(node) : node.label}
            </span>
            {isLoading && <span className="visually-hidden">{t('loading')}</span>}
          </div>
          {open && children && children.length > 0 && (
            <ul role="group" className="ui-tree__group list-unstyled mb-0">
              {renderNodes(children, level + 1)}
            </ul>
          )}
        </li>
      );
    });

  const setRootRef = (node: HTMLUListElement | null) => {
    rootRef.current = node;
    if (typeof ref === 'function') ref(node);
    else if (ref) (ref as { current: HTMLUListElement | null }).current = node;
  };

  return (
    <div className={cx('ui-tree', className)}>
      {filter && (
        <div className="ui-tree__filter">
          <input type="search" className="form-control form-control-sm" aria-label={t('filter')} placeholder={t('filter')} value={query} onChange={(e) => setQuery(e.target.value)} />
        </div>
      )}
      <ul
        ref={setRootRef}
        role="tree"
        className="ui-tree__root list-unstyled mb-0"
        aria-label={ariaLabel}
        aria-labelledby={ariaLabelledBy}
        aria-multiselectable={selectionMode === 'multiple' || selectionMode === 'checkbox' || undefined}
        onKeyDown={handleKeyDown}
      >
        {renderNodes(nodes, 1)}
      </ul>
      {nodes.length === 0 && <div className="ui-tree__empty text-body-secondary">{emptyMessage ?? (filtering ? t('noResults') : t('noRecords'))}</div>}
    </div>
  );
}

function findNodeByString<T>(nodes: TreeNode<T>[], key: string, childrenOf: (n: TreeNode<T>) => TreeNode<T>[] | undefined): TreeNode<T> | undefined {
  for (const node of nodes) {
    if (String(node.key) === key) return node;
    const found = findNodeByString(childrenOf(node) ?? [], key, childrenOf);
    if (found) return found;
  }
  return undefined;
}
