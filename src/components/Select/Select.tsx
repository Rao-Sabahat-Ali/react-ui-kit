import { useEffect, useId, useMemo, useRef, useState, type KeyboardEvent, type ReactNode, type Ref } from 'react';
import { useClickOutside } from '../../hooks/useClickOutside';
import { useControllableState } from '../../hooks/useControllableState';
import { useFloating } from '../../hooks/useFloating';
import { useLocale } from '../../locale/LocaleProvider';
import { cx } from '../../utils/cx';
import type { Size } from '../../types';
import { useFieldControl } from '../Field/Field';
import { Icon } from '../Icon/Icon';
import { Portal } from '../Portal/Portal';

export interface Option<T> {
  label: string;
  value: T;
  disabled?: boolean;
}

export interface OptionGroup<T> {
  label: string;
  options: Option<T>[];
}

export interface SelectProps<T> {
  options: (Option<T> | OptionGroup<T>)[];
  value?: T | null;
  defaultValue?: T | null;
  onChange?: (value: T | null) => void;
  placeholder?: string;
  native?: boolean;
  filter?: boolean;
  clearable?: boolean;
  optionTemplate?: (option: Option<T>) => ReactNode;
  emptyMessage?: ReactNode;
  size?: Size;
  disabled?: boolean;
  invalid?: boolean;
  required?: boolean;
  id?: string;
  className?: string;
  'aria-label'?: string;
  'aria-describedby'?: string;
  ref?: Ref<HTMLButtonElement | HTMLSelectElement>;
}

interface FlatOption<T> extends Option<T> {
  group?: string;
}

const isGroup = <T,>(item: Option<T> | OptionGroup<T>): item is OptionGroup<T> => 'options' in item;

function flatten<T>(items: (Option<T> | OptionGroup<T>)[]): FlatOption<T>[] {
  return items.flatMap((item) => (isGroup(item) ? item.options.map((o) => ({ ...o, group: item.label })) : [item]));
}

const TYPEAHEAD_RESET_MS = 500;

export function Select<T>(props: SelectProps<T>) {
  const { options, value: valueProp, defaultValue = null, onChange, native = false, size = 'md', disabled = false, className, ref } = props;
  const { t } = useLocale();
  const control = useFieldControl({ id: props.id, invalid: props.invalid, required: props.required, 'aria-describedby': props['aria-describedby'] });
  const [value, setValue] = useControllableState<T | null>(valueProp, defaultValue, onChange);
  const all = useMemo(() => flatten(options), [options]);

  const sizeClass = size === 'sm' ? 'form-select-sm' : size === 'lg' ? 'form-select-lg' : undefined;

  if (native) {
    const selectedIndex = all.findIndex((o) => o.value === value);
    const groups = options;
    let index = -1;
    return (
      <select
        ref={ref as Ref<HTMLSelectElement>}
        id={control.id}
        className={cx('form-select ui-select ui-select--native', sizeClass, control.invalid && 'is-invalid', className)}
        value={selectedIndex === -1 ? '' : String(selectedIndex)}
        onChange={(e) => setValue(e.target.value === '' ? null : (all[Number(e.target.value)]?.value ?? null))}
        disabled={disabled}
        required={control.required || undefined}
        aria-invalid={control.invalid || undefined}
        aria-describedby={control.describedBy}
        aria-label={props['aria-label']}
      >
        <option value="" disabled={control.required}>
          {props.placeholder ?? t('select')}
        </option>
        {groups.map((item) =>
          isGroup(item) ? (
            <optgroup key={item.label} label={item.label}>
              {item.options.map((o) => {
                index++;
                return (
                  <option key={index} value={index} disabled={o.disabled}>
                    {o.label}
                  </option>
                );
              })}
            </optgroup>
          ) : (
            (() => {
              index++;
              return (
                <option key={index} value={index} disabled={item.disabled}>
                  {item.label}
                </option>
              );
            })()
          ),
        )}
      </select>
    );
  }

  return <CustomSelect {...props} control={control} value={value} setValue={setValue} all={all} sizeClass={sizeClass} />;
}

interface CustomSelectProps<T> extends SelectProps<T> {
  control: ReturnType<typeof useFieldControl>;
  setValue: (value: T | null) => void;
  all: FlatOption<T>[];
  sizeClass: string | undefined;
}

function CustomSelect<T>({ control, value, setValue, all, sizeClass, placeholder, filter = false, clearable = false, optionTemplate, emptyMessage, disabled = false, className, ref, ...props }: CustomSelectProps<T>) {
  const { t } = useLocale();
  const listboxId = useId();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [activeIndex, setActiveIndex] = useState(-1);
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const panelRef = useRef<HTMLDivElement | null>(null);
  const filterRef = useRef<HTMLInputElement | null>(null);
  const typeahead = useRef({ buffer: '', timer: 0 });

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return q ? all.filter((o) => o.label.toLowerCase().includes(q)) : all;
  }, [all, query]);
  const selected = all.find((o) => o.value === value);
  const position = useFloating(triggerRef, panelRef, { open, placement: 'bottom-start', matchWidth: true });

  const optionId = (index: number) => `${listboxId}-opt-${index}`;
  const enabledIndexes = visible.map((o, i) => (o.disabled ? -1 : i)).filter((i) => i !== -1);

  const openPanel = (initial?: 'first' | 'last') => {
    if (disabled) return;
    setQuery('');
    const selectedIndex = all.findIndex((o) => o.value === value && !o.disabled);
    const first = all.findIndex((o) => !o.disabled);
    const last = all.length - 1 - [...all].reverse().findIndex((o) => !o.disabled);
    setActiveIndex(initial === 'last' ? last : selectedIndex !== -1 && !initial ? selectedIndex : first);
    setOpen(true);
  };

  const close = (refocus = true) => {
    setOpen(false);
    setQuery('');
    if (refocus) triggerRef.current?.focus();
  };

  const choose = (option: FlatOption<T> | undefined, refocus = true) => {
    if (!option || option.disabled) return;
    setValue(option.value);
    close(refocus);
  };

  const move = (delta: 1 | -1) => {
    if (enabledIndexes.length === 0) return;
    const pos = enabledIndexes.indexOf(activeIndex);
    const next = pos === -1 ? (delta === 1 ? 0 : enabledIndexes.length - 1) : Math.min(Math.max(pos + delta, 0), enabledIndexes.length - 1);
    setActiveIndex(enabledIndexes[next]!);
  };

  const runTypeahead = (char: string) => {
    const state = typeahead.current;
    window.clearTimeout(state.timer);
    state.buffer += char.toLowerCase();
    state.timer = window.setTimeout(() => (state.buffer = ''), TYPEAHEAD_RESET_MS);
    const match = visible.findIndex((o) => !o.disabled && o.label.toLowerCase().startsWith(state.buffer));
    if (match !== -1) setActiveIndex(match);
  };

  useClickOutside([triggerRef, panelRef], () => close(false), open);

  useEffect(() => {
    if (open && filter) filterRef.current?.focus();
  }, [open, filter]);

  useEffect(() => {
    if (!open || activeIndex < 0) return;
    document.getElementById(optionId(activeIndex))?.scrollIntoView?.({ block: 'nearest' });
    // optionId is stable for a given listboxId
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, activeIndex]);

  // Keep active option valid after filtering.
  useEffect(() => {
    if (open && !enabledIndexes.includes(activeIndex)) setActiveIndex(enabledIndexes[0] ?? -1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query]);

  const handleKeyDown = (event: KeyboardEvent<HTMLElement>) => {
    const { key, altKey } = event;
    if (!open) {
      if (['Enter', ' ', 'ArrowDown'].includes(key) || (altKey && key === 'ArrowDown')) {
        event.preventDefault();
        openPanel();
      } else if (key === 'ArrowUp') {
        event.preventDefault();
        openPanel('last');
      } else if (key.length === 1 && !event.ctrlKey && !event.metaKey) {
        openPanel();
        runTypeahead(key);
      }
      return;
    }
    switch (key) {
      case 'ArrowDown':
        event.preventDefault();
        move(1);
        break;
      case 'ArrowUp':
        event.preventDefault();
        if (altKey) choose(visible[activeIndex]);
        else move(-1);
        break;
      case 'Home':
        event.preventDefault();
        setActiveIndex(enabledIndexes[0] ?? -1);
        break;
      case 'End':
        event.preventDefault();
        setActiveIndex(enabledIndexes[enabledIndexes.length - 1] ?? -1);
        break;
      case 'Enter':
        event.preventDefault();
        choose(visible[activeIndex]);
        break;
      case 'Escape':
        event.preventDefault();
        close();
        break;
      case 'Tab':
        choose(visible[activeIndex], false);
        break;
      case ' ':
        if (!filter) {
          event.preventDefault();
          choose(visible[activeIndex]);
        }
        break;
      default:
        if (!filter && key.length === 1 && !event.ctrlKey && !event.metaKey) runTypeahead(key);
    }
  };

  const setTriggerRef = (node: HTMLButtonElement | null) => {
    triggerRef.current = node;
    if (typeof ref === 'function') ref(node);
    else if (ref) (ref as { current: unknown }).current = node;
  };

  const activeDescendant = open && activeIndex >= 0 ? optionId(activeIndex) : undefined;
  let lastGroup: string | undefined;

  return (
    <div className={cx('ui-select', disabled && 'ui-select--disabled', className)}>
      <button
        ref={setTriggerRef}
        type="button"
        id={control.id}
        role="combobox"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listboxId}
        aria-activedescendant={filter ? undefined : activeDescendant}
        aria-labelledby={control.labelId ? `${control.labelId} ${control.id}` : undefined}
        aria-label={props['aria-label']}
        aria-describedby={control.describedBy}
        aria-invalid={control.invalid || undefined}
        aria-required={control.required || undefined}
        disabled={disabled}
        className={cx('form-select ui-select__trigger', sizeClass, control.invalid && 'is-invalid')}
        onClick={() => (open ? close() : openPanel())}
        onKeyDown={handleKeyDown}
      >
        <span className={cx('ui-select__value', !selected && 'ui-select__placeholder')}>{selected ? selected.label : (placeholder ?? t('select'))}</span>
      </button>
      {clearable && selected && !disabled && (
        <button type="button" className="ui-select__clear" aria-label={t('clear')} onClick={() => setValue(null)}>
          <Icon name="x" />
        </button>
      )}
      {open && (
        <Portal>
          <div
            ref={panelRef}
            className="dropdown-menu show ui-select__panel"
            style={{ position: 'fixed', top: position.top, left: position.left, minWidth: position.minWidth }}
          >
            {filter && (
              <div className="ui-select__filter px-2 pb-2">
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
              </div>
            )}
            <ul id={listboxId} role="listbox" className="list-unstyled mb-0 ui-select__list" aria-label={props['aria-label']} aria-labelledby={control.labelId}>
              {visible.length === 0 && <li className="dropdown-item-text text-body-secondary ui-select__empty">{emptyMessage ?? t('noResults')}</li>}
              {visible.map((option, index) => {
                const header = option.group && option.group !== lastGroup ? option.group : undefined;
                lastGroup = option.group;
                const isSelected = option.value === value;
                return (
                  <li key={optionId(index)} role="presentation">
                    {header && (
                      <div className="dropdown-header ui-select__group" role="presentation">
                        {header}
                      </div>
                    )}
                    {/* Options are driven by aria-activedescendant from the focused combobox (APG); clicks are pointer-only. */}
                    {/* eslint-disable-next-line jsx-a11y/click-events-have-key-events, jsx-a11y/interactive-supports-focus */}
                    <div
                      id={optionId(index)}
                      role="option"
                      aria-selected={isSelected}
                      aria-disabled={option.disabled || undefined}
                      className={cx('dropdown-item ui-select__option', index === activeIndex && 'ui-select__option--active', isSelected && 'active', option.disabled && 'disabled')}
                      onPointerMove={() => !option.disabled && setActiveIndex(index)}
                      onClick={() => choose(option)}
                    >
                      {optionTemplate ? optionTemplate(option) : option.label}
                      {isSelected && <Icon name="check" className="ui-select__check" />}
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
