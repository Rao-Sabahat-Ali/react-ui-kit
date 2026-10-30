import { useEffect, useId, useRef, useState, type KeyboardEvent, type ReactNode } from 'react';
import { useControllableState } from '../../hooks/useControllableState';
import { useReveal } from '../../motion/useReveal';
import { cx } from '../../utils/cx';
import { Icon } from '../Icon/Icon';
import { flattenVisible, isRtl, type TreeKey, type TreeNode } from '../Tree/treeUtils';

export interface OrganizationChartProps<T = unknown> {
  value: TreeNode<T>[];
  nodeTemplate?: (node: TreeNode<T>) => ReactNode;
  selectionMode?: 'single' | 'multiple' | null;
  selection?: TreeKey | TreeKey[] | null;
  defaultSelection?: TreeKey | TreeKey[] | null;
  onSelectionChange?: (selection: TreeKey | TreeKey[] | null) => void;
  collapsible?: boolean;
  collapsedKeys?: Set<TreeKey>;
  defaultCollapsedKeys?: Set<TreeKey>;
  onToggle?: (collapsedKeys: Set<TreeKey>) => void;
  className?: string;
  'aria-label'?: string;
  'aria-labelledby'?: string;
}

const EMPTY: Set<TreeKey> = new Set();
const childrenOf = <T,>(node: TreeNode<T>) => node.children;

export function OrganizationChart<T = unknown>({
  value,
  nodeTemplate,
  selectionMode = null,
  selection: selectionProp,
  defaultSelection = null,
  onSelectionChange,
  collapsible = false,
  collapsedKeys: collapsedProp,
  defaultCollapsedKeys = EMPTY,
  onToggle,
  className,
  'aria-label': ariaLabel,
  'aria-labelledby': ariaLabelledBy,
}: OrganizationChartProps<T>) {
  const baseId = useId();
  const [selection, setSelection] = useControllableState<TreeKey | TreeKey[] | null>(selectionProp, defaultSelection, onSelectionChange);
  const [collapsed, setCollapsed] = useControllableState<Set<TreeKey>>(collapsedProp, defaultCollapsedKeys, onToggle);
  const [focusedKey, setFocusedKey] = useState<TreeKey | null>(null);
  const rootRef = useRef<HTMLUListElement | null>(null);
  // Branches open at the first paint stay still; branches toggled or mounted afterwards reveal (clip-path + opacity).
  const mounted = useRef(false);
  useEffect(() => {
    mounted.current = true;
  }, []);

  const isOpen = (node: TreeNode<T>) => !collapsible || !collapsed.has(node.key);
  const flat = flattenVisible(value, isOpen, childrenOf);
  const activeKey = flat.some((f) => f.node.key === focusedKey) ? focusedKey : (flat[0]?.node.key ?? null);
  const selectedKeys = new Set<TreeKey>(Array.isArray(selection) ? selection : selection === null || selection === undefined ? [] : [selection]);

  const itemId = (key: TreeKey) => `${baseId}-item-${key}`;
  const labelId = (key: TreeKey) => `${baseId}-label-${key}`;
  const focusItem = (key: TreeKey | undefined) => {
    if (key === undefined) return;
    setFocusedKey(key);
    document.getElementById(itemId(key))?.focus();
  };

  const toggle = (node: TreeNode<T>) => {
    if (!collapsible || !node.children?.length) return;
    const next = new Set(collapsed);
    if (next.has(node.key)) next.delete(node.key);
    else next.add(node.key);
    setCollapsed(next);
  };

  const select = (node: TreeNode<T>) => {
    if (!selectionMode || node.disabled || node.selectable === false) return;
    if (selectionMode === 'single') {
      setSelection(selectedKeys.has(node.key) ? null : node.key);
    } else {
      const next = new Set(selectedKeys);
      if (next.has(node.key)) next.delete(node.key);
      else next.add(node.key);
      setSelection([...next]);
    }
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLUListElement>) => {
    if ((event.target as HTMLElement).getAttribute('role') !== 'treeitem' || event.altKey || event.ctrlKey || event.metaKey) return;
    const index = flat.findIndex((f) => f.node.key === activeKey);
    const current = flat[index];
    if (!current) return;
    const siblings = flat.filter((f) => f.parentKey === current.parentKey);
    const position = siblings.findIndex((f) => f.node.key === current.node.key);
    const rtl = isRtl(rootRef.current);
    switch (event.key) {
      case 'ArrowDown':
        if (flat[index + 1] && flat[index + 1]!.level === current.level + 1) focusItem(flat[index + 1]!.node.key);
        break;
      case 'ArrowUp':
        if (current.parentKey !== null) focusItem(current.parentKey);
        break;
      case 'ArrowLeft':
      case 'ArrowRight': {
        const forward = (event.key === 'ArrowRight') !== rtl;
        focusItem(siblings[position + (forward ? 1 : -1)]?.node.key);
        break;
      }
      case 'Home':
        focusItem(siblings[0]?.node.key);
        break;
      case 'End':
        focusItem(siblings[siblings.length - 1]?.node.key);
        break;
      case 'Enter':
        select(current.node);
        break;
      case ' ':
        toggle(current.node);
        break;
      default:
        return;
    }
    event.preventDefault();
  };

  const renderNodes = (nodes: TreeNode<T>[], level: number): ReactNode =>
    nodes.map((node, index) => {
      const hasChildren = (node.children?.length ?? 0) > 0;
      const open = hasChildren && isOpen(node);
      const isSelected = selectedKeys.has(node.key);
      const selectable = selectionMode !== null && !node.disabled && node.selectable !== false;
      return (
        <li
          key={node.key}
          id={itemId(node.key)}
          role="treeitem"
          aria-level={level}
          aria-setsize={nodes.length}
          aria-posinset={index + 1}
          aria-expanded={hasChildren && collapsible ? open : undefined}
          aria-selected={selectionMode ? isSelected : undefined}
          aria-disabled={node.disabled || undefined}
          aria-labelledby={labelId(node.key)}
          tabIndex={activeKey === node.key ? 0 : -1}
          className="ui-org-chart__item"
          onFocus={(e) => {
            if (e.target === e.currentTarget) setFocusedKey(node.key);
          }}
        >
          {/* Keyboard handled on the tree root; this adds pointer interaction. */}
          {/* eslint-disable-next-line jsx-a11y/click-events-have-key-events, jsx-a11y/no-static-element-interactions */}
          <div
            className={cx('card ui-org-chart__node', isSelected && 'ui-org-chart__node--selected', selectable && 'ui-org-chart__node--selectable', node.disabled && 'ui-org-chart__node--disabled')}
            onClick={(e) => {
              setFocusedKey(node.key);
              if ((e.target as HTMLElement).closest('.ui-org-chart__toggler')) toggle(node);
              else select(node);
            }}
          >
            <span id={labelId(node.key)} className="ui-org-chart__label">
              {nodeTemplate ? nodeTemplate(node) : node.label}
            </span>
            {collapsible && hasChildren && (
              <span className="ui-org-chart__toggler" aria-hidden="true">
                <Icon name={open ? 'chevron-up' : 'chevron-down'} size="sm" />
              </span>
            )}
          </div>
          {hasChildren && (
            <OrgChartChildren open={open} animateEnter={mounted.current}>
              {renderNodes(node.children!, level + 1)}
            </OrgChartChildren>
          )}
        </li>
      );
    });

  return (
    <div className={cx('ui-org-chart', className)}>
      <ul
        ref={rootRef}
        role="tree"
        aria-label={ariaLabel}
        aria-labelledby={ariaLabelledBy}
        aria-multiselectable={selectionMode === 'multiple' || undefined}
        className="ui-org-chart__tree"
        onKeyDown={handleKeyDown}
      >
        {renderNodes(value, 1)}
      </ul>
    </div>
  );
}

/** The children of a node: stay mounted (inert, data-state="closed") while the reveal plays backwards. */
function OrgChartChildren({ open, animateEnter, children }: { open: boolean; animateEnter: boolean; children: ReactNode }) {
  const { present, state, exiting } = useReveal(open, animateEnter);
  if (!present) return null;
  return (
    <ul role="group" className="ui-org-chart__children" data-state={state} inert={exiting || undefined}>
      {children}
    </ul>
  );
}
