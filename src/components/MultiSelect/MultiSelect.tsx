import { useEffect, useId, useMemo, useRef, useState, type CSSProperties, type KeyboardEvent, type ReactNode, type Ref } from 'react';
import { useClickOutside } from '../../hooks/useClickOutside';
import { useControllableState } from '../../hooks/useControllableState';
import { useFloating } from '../../hooks/useFloating';
import { useLocale, interpolate } from '../../locale/LocaleProvider';
import { cx } from '../../utils/cx';
import type { Size } from '../../types';
import { useFieldControl } from '../Field/Field';
import { Icon } from '../Icon/Icon';
import { flattenOptions, orderByOptions, type FlatOption } from '../ListBox/ListBox';
import { Portal } from '../Portal/Portal';
import type { Option, OptionGroup } from '../Select/Select';

/** Local English defaults until locale keys exist (`multiSelectAll`, `selectedCount`). */
export type MultiSelectLabels = Record<'selectAll' | 'selectedCount', string>;

export interface MultiSelectProps<T> {
  options: (Option<T> | OptionGroup<T>)[];
  value?: NoInfer<T>[];
  defaultValue?: NoInfer<T>[];
  onChange?: (value: NoInfer<T>[]) => void;
  display?: 'comma' | 'chips';
  maxSelectedLabels?: number;
  selectAll?: boolean;
  filter?: boolean;
  selectionLimit?: number;
  placeholder?: string;
  optionTemplate?: (option: Option<T>) => ReactNode;
  emptyMessage?: ReactNode;
  labels?: Partial<MultiSelectLabels>;
  size?: Size;
  disabled?: boolean;
  invalid?: boolean;
  required?: boolean;
  id?: string;
  className?: string;
  style?: CSSProperties;
  'aria-label'?: string;
  'aria-describedby'?: string;
  ref?: Ref<HTMLDivElement>;
}

export function MultiSelect<T>({
  options,
  value: valueProp,
  defaultValue = [],
  onChange,
  display = 'comma',
  maxSelectedLabels = 3,
  selectAll = true,
  filter = false,
  selectionLimit,
  placeholder,
  optionTemplate,
  emptyMessage,
  labels: labelsProp,
  size = 'md',
  disabled = false,
  className,
  style,
  ref,
  ...props
}: MultiSelectProps<T>) {
  const { t } = useLocale();
  const labels = { selectAll: t('selectAllOptions'), selectedCount: t('selectedCount'), ...labelsProp };
  const control = useFieldControl({ id: props.id, invalid: props.invalid, required: props.required, 'aria-describedby': props['aria-describedby'] });
  const [value, setValue] = useControllableState<T[]>(valueProp, defaultValue, onChange);
  const all = useMemo(() => flattenOptions(options), [options]);
  const listboxId = useId();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [activeIndex, setActiveIndex] = useState(-1);
  const triggerRef = useRef<HTMLDivElement | null>(null);
  const comboRef = useRef<HTMLDivElement | null>(null);
  const panelRef = useRef<HTMLDivElement | null>(null);
  const filterRef = useRef<HTMLInputElement | null>(null);
  const position = useFloating(triggerRef, panelRef, { open, placement: 'bottom-start', matchWidth: true });

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return q ? all.filter((o) => o.label.toLowerCase().includes(q)) : all;
  }, [all, query]);

  const isSelected = (o: FlatOption<T>) => value.includes(o.value);
  const limitReached = selectionLimit !== undefined && value.length >= selectionLimit;
  const isDisabled = (o: FlatOption<T>) => Boolean(o.disabled) || (limitReached && !isSelected(o));
  const enabled = visible.map((o, i) => (isDisabled(o) ? -1 : i)).filter((i) => i !== -1);
  const selectable = visible.filter((o) => !o.disabled);
  const selectedCount = selectable.filter(isSelected).length;
  const allChecked = selectable.length > 0 && selectedCount === selectable.length;
  const someChecked = selectedCount > 0 && !allChecked;
  const optionId = (i: number) => `${listboxId}-opt-${i}`;

  const commit = (next: T[]) => setValue(orderByOptions(all, next));

  const toggle = (option: FlatOption<T> | undefined) => {
    if (!option || isDisabled(option)) return;
    commit(isSelected(option) ? value.filter((v) => v !== option.value) : [...value, option.value]);
  };

  const toggleAll = () => {
    const values = selectable.map((o) => o.value);
    if (allChecked) {
      commit(value.filter((v) => !values.includes(v)));
      return;
    }
    let additions = values.filter((v) => !value.includes(v));
    if (selectionLimit !== undefined) additions = additions.slice(0, Math.max(0, selectionLimit - value.length));
    commit([...value, ...additions]);
  };

  const openPanel = () => {
    if (disabled) return;
    setQuery('');
    const first = all.findIndex((o) => !o.disabled);
    const sel = all.findIndex((o) => !o.disabled && value.includes(o.value));
    setActiveIndex(sel !== -1 ? sel : first);
    setOpen(true);
  };

  const close = (refocus = true) => {
    setOpen(false);
    setQuery('');
    if (refocus) comboRef.current?.focus();
  };

  const move = (delta: 1 | -1) => {
    if (enabled.length === 0) return;
    const pos = enabled.indexOf(activeIndex);
    const next = pos === -1 ? (delta === 1 ? 0 : enabled.length - 1) : Math.min(Math.max(pos + delta, 0), enabled.length - 1);
    setActiveIndex(enabled[next]!);
  };

  useClickOutside([triggerRef, panelRef], () => close(false), open);

  useEffect(() => {
    if (open && filter) filterRef.current?.focus();
  }, [open, filter]);

  useEffect(() => {
    if (open && !enabled.includes(activeIndex)) setActiveIndex(enabled[0] ?? -1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query]);

  useEffect(() => {
    if (open && activeIndex >= 0) document.getElementById(optionId(activeIndex))?.scrollIntoView?.({ block: 'nearest' });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, activeIndex]);

  const handleKeyDown = (event: KeyboardEvent<HTMLElement>) => {
    if (disabled) return;
    const { key } = event;
    const fromInput = event.currentTarget.tagName === 'INPUT';
    const mod = event.ctrlKey || event.metaKey;
    if (!open) {
      if (['Enter', ' ', 'ArrowDown', 'ArrowUp'].includes(key)) {
        event.preventDefault();
        openPanel();
      }
      return;
    }
    if (mod && key.toLowerCase() === 'a') {
      event.preventDefault();
      toggleAll();
      return;
    }
    switch (key) {
      case 'ArrowDown':
      case 'ArrowUp':
        event.preventDefault();
        if (event.altKey && key === 'ArrowUp') close();
        else move(key === 'ArrowDown' ? 1 : -1);
        break;
      case 'Home':
      case 'End':
        if (fromInput) return;
        event.preventDefault();
        setActiveIndex((key === 'Home' ? enabled[0] : enabled[enabled.length - 1]) ?? -1);
        break;
      case 'Enter':
        event.preventDefault();
        toggle(visible[activeIndex]);
        break;
      case ' ':
        if (fromInput) return;
        event.preventDefault();
        toggle(visible[activeIndex]);
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

  const setComboRef = (node: HTMLDivElement | null) => {
    comboRef.current = node;
    if (typeof ref === 'function') ref(node);
    else if (ref) (ref as { current: unknown }).current = node;
  };

  const selectedOptions = all.filter((o) => value.includes(o.value));
  const summary =
    selectedOptions.length === 0
      ? (placeholder ?? t('select'))
      : selectedOptions.length > maxSelectedLabels
        ? interpolate(labels.selectedCount, { count: selectedOptions.length })
        : selectedOptions.map((o) => o.label).join(', ');
  const sizeClass = size === 'sm' ? 'form-select-sm' : size === 'lg' ? 'form-select-lg' : undefined;
  const activeDescendant = open && activeIndex >= 0 ? optionId(activeIndex) : undefined;
  const showChips = display === 'chips' && selectedOptions.length > 0;
  let lastGroup: string | undefined;

  return (
    <div className={cx('ui-multi-select', disabled && 'ui-multi-select--disabled', className)} style={style}>
      {/* Pointer convenience; keyboard handled by the focused control (aria-activedescendant / roving focus, covered by AC tests). */}
      {/* eslint-disable-next-line jsx-a11y/click-events-have-key-events, jsx-a11y/no-static-element-interactions */}
      <div
        ref={triggerRef}
        className={cx('form-select ui-multi-select__trigger', sizeClass, control.invalid && 'is-invalid', disabled && 'disabled')}
        onClick={(e) => {
          if ((e.target as HTMLElement).closest('.ui-multi-select__chip-remove')) return;
          if (open) close();
          else {
            openPanel();
            if (!filter) comboRef.current?.focus();
          }
        }}
      >
        {showChips && (
          <ul className="list-unstyled mb-0 ui-multi-select__chips">
            {selectedOptions.map((o) => (
              <li key={String(o.value)} className="badge ui-multi-select__chip">
                <span>{o.label}</span>
                {!disabled && (
                  <button
                    type="button"
                    className="ui-multi-select__chip-remove"
                    aria-label={t('removeChip', { label: o.label })}
                    onClick={() => commit(value.filter((v) => v !== o.value))}
                  >
                    <Icon name="x" />
                  </button>
                )}
              </li>
            ))}
          </ul>
        )}
        <div
          ref={setComboRef}
          id={control.id}
          role="combobox"
          tabIndex={disabled ? -1 : 0}
          aria-haspopup="listbox"
          aria-expanded={open}
          aria-controls={listboxId}
          aria-activedescendant={filter ? undefined : activeDescendant}
          aria-labelledby={control.labelId ? `${control.labelId} ${control.id}` : undefined}
          aria-label={props['aria-label']}
          aria-describedby={control.describedBy}
          aria-invalid={control.invalid || undefined}
          aria-required={control.required || undefined}
          aria-disabled={disabled || undefined}
          className={cx('ui-multi-select__value', selectedOptions.length === 0 && 'ui-multi-select__placeholder', showChips && 'visually-hidden')}
          onKeyDown={handleKeyDown}
        >
          {summary}
        </div>
      </div>
      {open && (
        <Portal>
          <div ref={panelRef} className="dropdown-menu show ui-multi-select__panel" style={{ position: 'fixed', top: position.top, left: position.left, minWidth: position.minWidth }}>
            {(filter || selectAll) && (
              <div className="ui-multi-select__header">
                {selectAll && (
                  <input
                    type="checkbox"
                    className="form-check-input ui-multi-select__select-all"
                    aria-label={labels.selectAll}
                    checked={allChecked}
                    ref={(node) => {
                      if (node) node.indeterminate = someChecked;
                    }}
                    onPointerDown={(e) => !filter && e.preventDefault()}
                    onChange={toggleAll}
                  />
                )}
                {filter && (
                  <input
                    ref={filterRef}
                    type="text"
                    className="form-control form-control-sm"
                    aria-label={t('filter')}
                    role="combobox"
                    aria-expanded="true"
                    aria-controls={listboxId}
                    aria-activedescendant={activeDescendant}
                    aria-autocomplete="list"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    onKeyDown={handleKeyDown}
                  />
                )}
              </div>
            )}
            <ul id={listboxId} role="listbox" aria-multiselectable="true" className="list-unstyled mb-0 ui-multi-select__list" aria-label={props['aria-label']} aria-labelledby={control.labelId}>
              {visible.length === 0 && <li className="dropdown-item-text text-body-secondary ui-multi-select__empty">{emptyMessage ?? t('noResults')}</li>}
              {visible.map((option, index) => {
                const header = option.group && option.group !== lastGroup ? option.group : undefined;
                lastGroup = option.group;
                const sel = isSelected(option);
                const dis = isDisabled(option);
                return (
                  <li key={optionId(index)} role="presentation">
                    {header && (
                      <div className="dropdown-header ui-multi-select__group" role="presentation">
                        {header}
                      </div>
                    )}
                    {/* Pointer convenience; keyboard handled by the focused control (aria-activedescendant / roving focus, covered by AC tests). */}
                    {/* eslint-disable-next-line jsx-a11y/click-events-have-key-events, jsx-a11y/interactive-supports-focus */}
                    <div
                      id={optionId(index)}
                      role="option"
                      aria-selected={sel}
                      aria-disabled={dis || undefined}
                      className={cx('dropdown-item ui-multi-select__option', index === activeIndex && 'ui-multi-select__option--active', dis && 'disabled')}
                      onPointerDown={(e) => e.preventDefault()}
                      onPointerMove={() => !dis && setActiveIndex(index)}
                      onClick={() => {
                        setActiveIndex(index);
                        toggle(option);
                      }}
                    >
                      <span className={cx('form-check-input ui-multi-select__check', sel && 'ui-multi-select__check--on')} aria-hidden="true">
                        {sel && <Icon name="check" />}
                      </span>
                      <span className="ui-multi-select__label">{optionTemplate ? optionTemplate(option) : option.label}</span>
                    </div>
                  </li>
                );
              })}
            </ul>
          </div>
        </Portal>
      )}
    </div>
  );
}
