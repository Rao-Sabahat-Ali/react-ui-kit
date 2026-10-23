import { useId, useMemo, useRef, useState, type CSSProperties, type KeyboardEvent, type Ref } from 'react';
import { useClickOutside } from '../../hooks/useClickOutside';
import { useControllableState } from '../../hooks/useControllableState';
import { useFloating } from '../../hooks/useFloating';
import { useLocale } from '../../locale/LocaleProvider';
import { cx } from '../../utils/cx';
import type { Size } from '../../types';
import { useFieldControl } from '../Field/Field';
import { Icon } from '../Icon/Icon';
import { Portal } from '../Portal/Portal';

export interface CascadeOption<T> {
  label: string;
  /** Required on leaves. */
  value?: T;
  children?: CascadeOption<T>[];
  disabled?: boolean;
}

export interface CascadeSelectProps<T> {
  options: CascadeOption<T>[];
  value?: NoInfer<T> | null;
  defaultValue?: NoInfer<T> | null;
  onChange?: (value: NoInfer<T> | null) => void;
  getOptionLabel?: (option: CascadeOption<T>) => string;
  placeholder?: string;
  size?: Size;
  disabled?: boolean;
  invalid?: boolean;
  required?: boolean;
  id?: string;
  className?: string;
  style?: CSSProperties;
  'aria-label'?: string;
  'aria-describedby'?: string;
  ref?: Ref<HTMLButtonElement>;
}

const isGroup = <T,>(o: CascadeOption<T> | undefined) => Boolean(o?.children && o.children.length > 0);

function findPath<T>(options: CascadeOption<T>[], value: T | null): number[] | null {
  if (value === null) return null;
  for (let i = 0; i < options.length; i++) {
    const o = options[i]!;
    if (isGroup(o)) {
      const sub = findPath(o.children!, value);
      if (sub) return [i, ...sub];
    } else if (o.value === value) return [i];
  }
  return null;
}

function levelAt<T>(options: CascadeOption<T>[], path: number[], depth: number): CascadeOption<T>[] {
  let level = options;
  for (let d = 0; d < depth; d++) level = level[path[d]!]?.children ?? [];
  return level;
}

const firstEnabled = <T,>(items: CascadeOption<T>[]) => items.findIndex((o) => !o.disabled);

export function CascadeSelect<T>({
  options,
  value: valueProp,
  defaultValue = null,
  onChange,
  getOptionLabel = (o) => o.label,
  placeholder,
  size = 'md',
  disabled = false,
  className,
  style,
  ref,
  ...props
}: CascadeSelectProps<T>) {
  const { t } = useLocale();
  const control = useFieldControl({ id: props.id, invalid: props.invalid, required: props.required, 'aria-describedby': props['aria-describedby'] });
  const [value, setValue] = useControllableState<T | null>(valueProp, defaultValue, onChange);
  const treeId = useId();
  const [open, setOpen] = useState(false);
  const [path, setPath] = useState<number[]>([]);
  /** Whether the active item's own sub-panel is shown (ancestors of the active item are always expanded). */
  const [openLast, setOpenLast] = useState(false);
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const panelRef = useRef<HTMLDivElement | null>(null);
  const position = useFloating(triggerRef, panelRef, { open, placement: 'bottom-start' });

  const selectedPath = useMemo(() => findPath(options, value), [options, value]);
  const selectedLabel = selectedPath ? getOptionLabel(levelAt(options, selectedPath, selectedPath.length - 1)[selectedPath[selectedPath.length - 1]!]!) : null;

  const itemId = (p: number[]) => `${treeId}-${p.join('-')}`;
  const depth = path.length - 1;
  const level = levelAt(options, path, depth);
  const activeItem = level[path[depth] ?? -1];

  const openPanel = () => {
    if (disabled) return;
    setPath(selectedPath ?? [Math.max(0, firstEnabled(options))]);
    setOpenLast(false);
    setOpen(true);
  };

  const close = (refocus = true) => {
    setOpen(false);
    if (refocus) triggerRef.current?.focus();
  };

  const choose = (option: CascadeOption<T>) => {
    if (option.disabled || isGroup(option) || option.value === undefined) return;
    setValue(option.value);
    close();
  };

  const expand = () => {
    if (!activeItem || activeItem.disabled || !isGroup(activeItem)) return;
    const child = firstEnabled(activeItem.children!);
    if (child === -1) return;
    setPath([...path, child]);
    setOpenLast(false);
  };

  const collapse = () => {
    if (openLast) setOpenLast(false);
    else if (path.length > 1) setPath(path.slice(0, -1));
  };

  const move = (to: 'next' | 'prev' | 'first' | 'last') => {
    const enabled = level.map((o, i) => (o.disabled ? -1 : i)).filter((i) => i !== -1);
    if (enabled.length === 0) return;
    const pos = enabled.indexOf(path[depth] ?? -1);
    const next =
      to === 'first' ? 0 : to === 'last' ? enabled.length - 1 : to === 'next' ? Math.min(pos + 1, enabled.length - 1) : Math.max(pos - 1, 0);
    setPath([...path.slice(0, -1), enabled[next]!]);
    setOpenLast(false);
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLButtonElement>) => {
    const { key } = event;
    if (!open) {
      if (['Enter', ' ', 'ArrowDown', 'ArrowUp'].includes(key)) {
        event.preventDefault();
        openPanel();
      }
      return;
    }
    const rtl = getComputedStyle(event.currentTarget).direction === 'rtl';
    const forward = rtl ? 'ArrowLeft' : 'ArrowRight';
    const back = rtl ? 'ArrowRight' : 'ArrowLeft';
    switch (key) {
      case 'ArrowDown':
        event.preventDefault();
        move('next');
        break;
      case 'ArrowUp':
        event.preventDefault();
        move('prev');
        break;
      case 'Home':
        event.preventDefault();
        move('first');
        break;
      case 'End':
        event.preventDefault();
        move('last');
        break;
      case forward:
        event.preventDefault();
        expand();
        break;
      case back:
        event.preventDefault();
        collapse();
        break;
      case 'Enter':
      case ' ':
        event.preventDefault();
        if (activeItem && isGroup(activeItem)) expand();
        else if (activeItem) choose(activeItem);
        break;
      case 'Escape':
        event.preventDefault();
        close();
        break;
      case 'Tab':
        close(false);
        break;
      default:
    }
  };

  useClickOutside([triggerRef, panelRef], () => close(false), open);

  const setTriggerRef = (node: HTMLButtonElement | null) => {
    triggerRef.current = node;
    if (typeof ref === 'function') ref(node);
    else if (ref) (ref as { current: unknown }).current = node;
  };

  const isExpanded = (p: number[]) => {
    const d = p.length - 1;
    const onPath = p.every((v, i) => path[i] === v);
    if (!onPath) return false;
    return d < depth || (d === depth && openLast);
  };

  const renderLevel = (items: CascadeOption<T>[], parent: number[]) => (
    <ul
      role={parent.length === 0 ? 'tree' : 'group'}
      id={parent.length === 0 ? treeId : undefined}
      aria-label={parent.length === 0 ? props['aria-label'] : undefined}
      aria-labelledby={parent.length === 0 ? control.labelId : undefined}
      className={cx('dropdown-menu show ui-cascade-select__level', parent.length > 0 && 'ui-cascade-select__level--sub')}
    >
      {items.map((option, index) => {
        const p = [...parent, index];
        const group = isGroup(option);
        const expanded = group ? isExpanded(p) : undefined;
        const active = p.length === path.length && p.every((v, i) => path[i] === v);
        const selected = !group && option.value !== undefined && option.value === value;
        return (
          <li
            key={p.join('-')}
            id={itemId(p)}
            role="treeitem"
            aria-labelledby={`${itemId(p)}-label`}
            aria-level={p.length}
            aria-expanded={expanded}
            aria-selected={group ? undefined : selected}
            aria-disabled={option.disabled || undefined}
            className="ui-cascade-select__node"
          >
            <div
              className={cx('dropdown-item ui-cascade-select__item', active && 'ui-cascade-select__item--active', selected && 'active', option.disabled && 'disabled', expanded && 'ui-cascade-select__item--expanded')}
              onPointerDown={(e) => e.preventDefault()}
              onPointerEnter={() => {
                if (option.disabled) return;
                setPath(p);
                setOpenLast(group);
              }}
              onClick={() => {
                if (option.disabled) return;
                if (group) {
                  setPath(p);
                  setOpenLast(true);
                } else choose(option);
              }}
            >
              <span id={`${itemId(p)}-label`} className="ui-cascade-select__label">{getOptionLabel(option)}</span>
              {group && <Icon name="chevron-right" directional className="ui-cascade-select__chevron" />}
              {selected && <Icon name="check" className="ui-cascade-select__check" />}
            </div>
            {group && expanded && renderLevel(option.children!, p)}
          </li>
        );
      })}
    </ul>
  );

  const sizeClass = size === 'sm' ? 'form-select-sm' : size === 'lg' ? 'form-select-lg' : undefined;

  return (
    <div className={cx('ui-cascade-select', disabled && 'ui-cascade-select--disabled', className)} style={style}>
      <button
        ref={setTriggerRef}
        type="button"
        id={control.id}
        role="combobox"
        aria-haspopup="tree"
        aria-expanded={open}
        aria-controls={treeId}
        aria-activedescendant={open && path.length > 0 ? itemId(path) : undefined}
        aria-labelledby={control.labelId ? `${control.labelId} ${control.id}` : undefined}
        aria-label={props['aria-label']}
        aria-describedby={control.describedBy}
        aria-invalid={control.invalid || undefined}
        aria-required={control.required || undefined}
        disabled={disabled}
        className={cx('form-select ui-cascade-select__trigger', sizeClass, control.invalid && 'is-invalid')}
        onClick={() => (open ? close() : openPanel())}
        onKeyDown={handleKeyDown}
      >
        <span className={cx('ui-cascade-select__value', !selectedLabel && 'ui-cascade-select__placeholder')}>{selectedLabel ?? placeholder ?? t('select')}</span>
      </button>
      {open && (
        <Portal>
          <div ref={panelRef} className="ui-cascade-select__panel" style={{ position: 'fixed', top: position.top, left: position.left }}>
            {renderLevel(options, [])}
          </div>
        </Portal>
      )}
    </div>
  );
}
