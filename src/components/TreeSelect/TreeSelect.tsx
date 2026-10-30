import { useEffect, useId, useMemo, useRef, useState, type KeyboardEvent, type Ref } from 'react';
import { useClickOutside } from '../../hooks/useClickOutside';
import { useControllableState } from '../../hooks/useControllableState';
import { useFloating } from '../../hooks/useFloating';
import { useLocale } from '../../locale/LocaleProvider';
import { cx } from '../../utils/cx';
import type { Size } from '../../types';
import { useFieldControl } from '../Field/Field';
import { Icon } from '../Icon/Icon';
import { usePresence } from '../../motion/usePresence';
import { Portal } from '../Portal/Portal';
import { Tree } from '../Tree/Tree';
import { ancestorKeys, checkState, findNode, nextSelection, resolveChecks, type TreeKey, type TreeNode, type TreeSelectionValue } from '../Tree/treeUtils';

export type TreeSelectValue = TreeKey | TreeKey[] | null;

export interface TreeSelectProps<T = unknown> {
  nodes: TreeNode<T>[];
  value?: TreeSelectValue;
  defaultValue?: TreeSelectValue;
  onChange?: (value: TreeSelectValue) => void;
  selectionMode?: 'single' | 'multiple' | 'checkbox';
  filter?: boolean;
  display?: 'comma' | 'chips';
  placeholder?: string;
  clearable?: boolean;
  size?: Size;
  disabled?: boolean;
  invalid?: boolean;
  required?: boolean;
  id?: string;
  className?: string;
  emptyMessage?: string;
  'aria-label'?: string;
  'aria-describedby'?: string;
  ref?: Ref<HTMLDivElement>;
}

const childrenOf = <T,>(node: TreeNode<T>) => node.children;

export function TreeSelect<T = unknown>({
  nodes,
  value: valueProp,
  defaultValue,
  onChange,
  selectionMode = 'single',
  filter = false,
  display = 'comma',
  placeholder,
  clearable = false,
  size = 'md',
  disabled = false,
  className,
  emptyMessage,
  ref,
  ...props
}: TreeSelectProps<T>) {
  const { t } = useLocale();
  const control = useFieldControl({ id: props.id, invalid: props.invalid, required: props.required, 'aria-describedby': props['aria-describedby'] });
  const popupId = useId();
  const [value, setValue] = useControllableState<TreeSelectValue>(valueProp, defaultValue ?? (selectionMode === 'single' ? null : []), onChange);
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLDivElement | null>(null);
  const panelRef = useRef<HTMLDivElement | null>(null);
  const position = useFloating(triggerRef, panelRef, { open, placement: 'bottom-start', matchWidth: true });
  const presence = usePresence(open);

  const selection = useMemo<TreeSelectionValue>(() => {
    if (selectionMode === 'checkbox') {
      const { checked, partial } = checkState(nodes, value as TreeKey[] | null, childrenOf);
      return { checked: [...checked], partial: [...partial] };
    }
    return value;
  }, [nodes, value, selectionMode]);

  // Selected entries shown in the trigger (checkbox mode: outermost checked nodes).
  const selected = useMemo(() => {
    const out: TreeNode<T>[] = [];
    if (selectionMode === 'single') {
      const node = value === null || value === undefined || Array.isArray(value) ? undefined : findNode(nodes, value, childrenOf);
      if (node) out.push(node);
    } else if (selectionMode === 'multiple') {
      for (const key of Array.isArray(value) ? value : []) {
        const node = findNode(nodes, key, childrenOf);
        if (node) out.push(node);
      }
    } else {
      const { checked } = resolveChecks(nodes, Array.isArray(value) ? value : [], childrenOf);
      const walk = (list: TreeNode<T>[]) => {
        for (const node of list) {
          if (checked.has(node.key)) out.push(node);
          else if (node.children) walk(node.children);
        }
      };
      walk(nodes);
    }
    return out;
  }, [nodes, value, selectionMode]);

  const initialExpanded = useMemo(() => {
    const keys = new Set<TreeKey>();
    for (const node of selected) for (const key of ancestorKeys(nodes, node.key, childrenOf) ?? []) keys.add(key);
    return keys;
    // Recomputed only when the popup opens.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const close = (refocus = true) => {
    setOpen(false);
    if (refocus) triggerRef.current?.focus();
  };

  useClickOutside([triggerRef, panelRef], () => close(false), open);

  useEffect(() => {
    if (!open) return;
    const panel = panelRef.current;
    const target = panel?.querySelector<HTMLElement>('input[type="search"]') ?? panel?.querySelector<HTMLElement>('[role="treeitem"][tabindex="0"]');
    target?.focus();
  }, [open]);

  const handleTreeChange = (next: TreeSelectionValue) => {
    if (selectionMode === 'single') {
      // Re-selecting the current node keeps it selected.
      if (next !== null && !Array.isArray(next) && typeof next !== 'object') setValue(next);
      close();
    } else if (selectionMode === 'multiple') {
      setValue(next as TreeKey[]);
    } else {
      setValue((next as { checked: TreeKey[] }).checked);
    }
  };

  const removeNode = (node: TreeNode<T>) => {
    if (disabled) return;
    if (selectionMode === 'multiple') setValue((Array.isArray(value) ? value : []).filter((k) => k !== node.key));
    else if (selectionMode === 'checkbox') setValue((nextSelection('checkbox', selection, node, nodes, childrenOf) as { checked: TreeKey[] }).checked);
    else setValue(null);
  };

  const clearAll = () => setValue(selectionMode === 'single' ? null : []);

  const handleTriggerKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (disabled || event.target !== event.currentTarget) return;
    if (['Enter', ' ', 'ArrowDown'].includes(event.key)) {
      event.preventDefault();
      setOpen(true);
    } else if (event.key === 'Escape' && open) {
      event.preventDefault();
      close();
    }
  };

  const handlePanelKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === 'Escape') {
      event.preventDefault();
      event.stopPropagation();
      close();
    } else if (event.key === 'Tab') {
      close();
    }
  };

  const setTriggerRef = (node: HTMLDivElement | null) => {
    triggerRef.current = node;
    if (typeof ref === 'function') ref(node);
    else if (ref) (ref as { current: HTMLDivElement | null }).current = node;
  };

  const sizeClass = size === 'sm' ? 'form-select-sm' : size === 'lg' ? 'form-select-lg' : undefined;
  const showChips = display === 'chips' && selectionMode !== 'single' && selected.length > 0;

  return (
    <div className={cx('ui-tree-select', disabled && 'ui-tree-select--disabled', className)}>
      {/* The trigger holds chip remove buttons, so it cannot itself be a <button>. */}
      <div
        ref={setTriggerRef}
        id={control.id}
        role="combobox"
        tabIndex={disabled ? -1 : 0}
        aria-haspopup="tree"
        aria-expanded={open}
        aria-controls={open ? popupId : undefined}
        aria-labelledby={control.labelId ? `${control.labelId} ${control.id}` : undefined}
        aria-label={props['aria-label']}
        aria-describedby={control.describedBy}
        aria-invalid={control.invalid || undefined}
        aria-required={control.required || undefined}
        aria-disabled={disabled || undefined}
        className={cx('form-select ui-tree-select__trigger', sizeClass, control.invalid && 'is-invalid')}
        onClick={() => !disabled && setOpen((o) => !o)}
        onKeyDown={handleTriggerKeyDown}
      >
        {selected.length === 0 ? (
          <span className="ui-tree-select__placeholder">{placeholder ?? t('select')}</span>
        ) : showChips ? (
          <span className="ui-tree-select__chips">
            {selected.map((node) => (
              <span key={node.key} className="badge ui-tree-select__chip">
                {node.label}
                <button
                  type="button"
                  tabIndex={-1}
                  className="ui-tree-select__chip-remove"
                  aria-label={t('removeChip', { label: node.label })}
                  disabled={disabled}
                  onClick={(e) => {
                    e.stopPropagation();
                    removeNode(node);
                  }}
                >
                  <Icon name="x" size="sm" />
                </button>
              </span>
            ))}
          </span>
        ) : (
          <span className="ui-tree-select__value">{selected.map((n) => n.label).join(', ')}</span>
        )}
      </div>
      {clearable && selected.length > 0 && !disabled && (
        <button type="button" className="ui-tree-select__clear" aria-label={t('clear')} onClick={clearAll}>
          <Icon name="x" />
        </button>
      )}
      {presence.present && (
        <Portal>
          {/* Escape/Tab bubble from the tree inside the popup. */}
          {/* eslint-disable-next-line jsx-a11y/no-static-element-interactions */}
          <div
            ref={panelRef}
            id={popupId}
            data-state={presence.state}
            inert={presence.exiting || undefined}
            className="dropdown-menu show ui-tree-select__panel"
            style={{ position: 'fixed', top: position.top, left: position.left, minWidth: position.minWidth }}
            onKeyDown={handlePanelKeyDown}
          >
            <Tree<T>
              aria-label={props['aria-label']}
              aria-labelledby={control.labelId}
              value={nodes}
              selectionMode={selectionMode}
              selection={selection}
              onSelectionChange={handleTreeChange}
              defaultExpandedKeys={initialExpanded}
              filter={filter}
              emptyMessage={emptyMessage}
            />
          </div>
        </Portal>
      )}
    </div>
  );
}
