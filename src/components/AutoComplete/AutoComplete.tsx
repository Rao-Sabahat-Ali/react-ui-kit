import { useEffect, useId, useRef, useState, type CSSProperties, type KeyboardEvent, type ReactNode, type Ref } from 'react';
import { useClickOutside } from '../../hooks/useClickOutside';
import { useControllableState } from '../../hooks/useControllableState';
import { useFloating } from '../../hooks/useFloating';
import { useLocale } from '../../locale/LocaleProvider';
import { cx } from '../../utils/cx';
import type { Size } from '../../types';
import { useFieldControl } from '../Field/Field';
import { Icon } from '../Icon/Icon';
import { Portal } from '../Portal/Portal';
import { Spinner } from '../Spinner/Spinner';

/** Local English default until a locale key exists (`showSuggestions`). */

interface AutoCompleteBaseProps<T> {
  suggestions: T[];
  onSearch?: (query: string, signal: AbortSignal) => void | Promise<void>;
  getOptionLabel?: (item: T) => string;
  minLength?: number;
  delay?: number;
  forceSelection?: boolean;
  loading?: boolean;
  itemTemplate?: (item: T) => ReactNode;
  emptyMessage?: ReactNode;
  dropdown?: boolean;
  dropdownLabel?: string;
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
  ref?: Ref<HTMLInputElement>;
}

export interface AutoCompleteSingleProps<T> extends AutoCompleteBaseProps<T> {
  multiple?: false;
  value?: NoInfer<T> | null;
  defaultValue?: NoInfer<T> | null;
  onChange?: (value: NoInfer<T> | null) => void;
}

export interface AutoCompleteMultipleProps<T> extends AutoCompleteBaseProps<T> {
  multiple: true;
  value?: NoInfer<T>[];
  defaultValue?: NoInfer<T>[];
  onChange?: (value: NoInfer<T>[]) => void;
}

export type AutoCompleteProps<T> = AutoCompleteSingleProps<T> | AutoCompleteMultipleProps<T>;

const isAbort = (error: unknown) => error instanceof DOMException && error.name === 'AbortError';

export function AutoComplete<T>(props: AutoCompleteProps<T>) {
  const {
    suggestions,
    onSearch,
    getOptionLabel = String,
    minLength = 1,
    delay = 250,
    forceSelection = false,
    loading = false,
    itemTemplate,
    emptyMessage,
    dropdown = false,
    dropdownLabel: dropdownLabelProp,
    placeholder,
    size = 'md',
    disabled = false,
    className,
    style,
    ref,
  } = props;
  const multiple = props.multiple === true;
  const { t, tp } = useLocale();
  const dropdownLabel = dropdownLabelProp ?? t('showSuggestions');
  const control = useFieldControl({ id: props.id, invalid: props.invalid, required: props.required, 'aria-describedby': props['aria-describedby'] });
  const listboxId = useId();

  const toArray = (v: T | T[] | null | undefined): T[] | undefined => (v === undefined ? undefined : v === null ? [] : multiple ? (v as T[]) : [v as T]);
  const emit = (next: T[]) => {
    if (props.multiple === true) props.onChange?.(next);
    else props.onChange?.(next[0] ?? null);
  };
  const [selected, setSelected] = useControllableState<T[]>(toArray(props.value), toArray(props.defaultValue) ?? [], emit);
  const single = multiple ? null : (selected[0] ?? null);

  const [query, setQuery] = useState(() => (single !== null ? getOptionLabel(single) : ''));
  const [open, setOpen] = useState(false);
  const [searched, setSearched] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const anchorRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const panelRef = useRef<HTMLDivElement | null>(null);
  const timer = useRef<number>(0);
  const controller = useRef<AbortController | null>(null);
  const position = useFloating(anchorRef, panelRef, { open, placement: 'bottom-start', matchWidth: true });

  // Mirror the selected label into the input in single mode.
  const singleLabel = single !== null ? getOptionLabel(single) : '';
  useEffect(() => {
    if (!multiple) setQuery(singleLabel);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [single]);

  // New suggestions: no option is active until the user arrows (APG list autocomplete, no auto-select).
  const suggestionKey = suggestions.map(getOptionLabel).join('\u0000');
  useEffect(() => setActiveIndex(-1), [suggestionKey]);

  const cancel = () => {
    window.clearTimeout(timer.current);
    controller.current?.abort();
    controller.current = null;
  };
  useEffect(() => cancel, []);

  const runSearch = (q: string) => {
    cancel();
    const ctrl = new AbortController();
    controller.current = ctrl;
    setSearched(true);
    try {
      const result = onSearch?.(q, ctrl.signal);
      if (result instanceof Promise) result.catch((error: unknown) => {
        if (!isAbort(error)) console.error(error);
      });
    } catch (error) {
      if (!isAbort(error)) throw error;
    }
  };

  const scheduleSearch = (q: string) => {
    cancel();
    if (q.trim().length < minLength) {
      setOpen(false);
      setSearched(false);
      return;
    }
    setOpen(true);
    timer.current = window.setTimeout(() => runSearch(q), delay);
  };

  const close = () => {
    setOpen(false);
    setActiveIndex(-1);
  };

  const choose = (item: T | undefined) => {
    if (item === undefined) return;
    if (multiple) {
      if (!selected.includes(item)) setSelected([...selected, item]);
      setQuery('');
    } else {
      setSelected([item]);
      setQuery(getOptionLabel(item));
    }
    cancel();
    close();
    inputRef.current?.focus();
  };

  const removeChip = (item: T) => {
    setSelected(selected.filter((v) => v !== item));
    inputRef.current?.focus();
  };

  const showPanel = open && (suggestions.length > 0 || loading || searched);

  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    switch (event.key) {
      case 'ArrowDown':
      case 'ArrowUp': {
        event.preventDefault();
        if (!showPanel) {
          if (suggestions.length > 0) {
            setOpen(true);
            setActiveIndex(event.key === 'ArrowDown' ? 0 : suggestions.length - 1);
          }
          return;
        }
        const n = suggestions.length;
        if (n === 0) return;
        setActiveIndex((i) => (event.key === 'ArrowDown' ? (i + 1) % n : i <= 0 ? n - 1 : i - 1));
        return;
      }
      case 'Enter':
        if (showPanel && activeIndex >= 0) {
          event.preventDefault();
          choose(suggestions[activeIndex]);
        }
        return;
      case 'Escape':
        event.preventDefault();
        if (showPanel) {
          cancel();
          close();
        } else {
          setQuery('');
          if (!multiple && single !== null) setSelected([]);
        }
        return;
      case 'Backspace':
        if (multiple && query === '' && selected.length > 0) {
          event.preventDefault();
          setSelected(selected.slice(0, -1));
        }
        return;
      case 'Tab':
        close();
        return;
      default:
    }
  };

  const handleBlur = () => {
    if (!forceSelection) return;
    // Focus moving into the panel (option click) is handled by choose().
    window.setTimeout(() => {
      if (anchorRef.current?.contains(document.activeElement) || panelRef.current?.contains(document.activeElement)) return;
      const text = inputRef.current?.value ?? '';
      if (multiple) {
        if (text) setQuery('');
        return;
      }
      if (text === singleLabel) return;
      const match = suggestions.find((s) => getOptionLabel(s).toLowerCase() === text.trim().toLowerCase());
      if (match !== undefined && text.trim()) {
        setSelected([match]);
        setQuery(getOptionLabel(match));
        return;
      }
      setQuery('');
      if (single !== null) setSelected([]);
    }, 0);
  };

  useClickOutside([anchorRef, panelRef], () => close(), showPanel);

  const setInputRef = (node: HTMLInputElement | null) => {
    inputRef.current = node;
    if (typeof ref === 'function') ref(node);
    else if (ref) (ref as { current: unknown }).current = node;
  };

  const optionId = (i: number) => `${listboxId}-opt-${i}`;
  const status = !showPanel ? '' : loading ? t('searching') : tp('resultsCount', suggestions.length);
  const sizeClass = size === 'sm' ? 'form-control-sm' : size === 'lg' ? 'form-control-lg' : undefined;

  return (
    <div className={cx('ui-auto-complete', multiple && 'ui-auto-complete--multiple', disabled && 'ui-auto-complete--disabled', className)} style={style}>
      <div ref={anchorRef} className={cx('ui-auto-complete__control', multiple && 'form-control', multiple && sizeClass, multiple && control.invalid && 'is-invalid', dropdown && 'input-group')}>
        {multiple && selected.length > 0 && (
          <ul className="list-unstyled mb-0 ui-auto-complete__chips">
            {selected.map((item, i) => {
              const label = getOptionLabel(item);
              return (
                <li key={`${label}-${i}`} className="badge ui-auto-complete__chip">
                  <span>{label}</span>
                  {!disabled && (
                    <button type="button" className="ui-auto-complete__chip-remove" aria-label={t('removeChip', { label })} onClick={() => removeChip(item)}>
                      <Icon name="x" />
                    </button>
                  )}
                </li>
              );
            })}
          </ul>
        )}
        <input
          ref={setInputRef}
          id={control.id}
          type="text"
          role="combobox"
          autoComplete="off"
          aria-autocomplete="list"
          aria-expanded={showPanel}
          aria-controls={listboxId}
          aria-activedescendant={showPanel && activeIndex >= 0 ? optionId(activeIndex) : undefined}
          aria-label={props['aria-label']}
          aria-describedby={control.describedBy}
          aria-invalid={control.invalid || undefined}
          aria-required={control.required || undefined}
          aria-busy={loading || undefined}
          placeholder={placeholder}
          disabled={disabled}
          className={cx(multiple ? 'ui-auto-complete__input--bare' : 'form-control', !multiple && sizeClass, !multiple && control.invalid && 'is-invalid', 'ui-auto-complete__input')}
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            scheduleSearch(e.target.value);
          }}
          onKeyDown={handleKeyDown}
          onBlur={handleBlur}
        />
        {loading && <Spinner size="sm" decorative className="ui-auto-complete__spinner" />}
        {dropdown && (
          <button
            type="button"
            className="btn btn-outline-secondary ui-auto-complete__dropdown"
            aria-label={dropdownLabel}
            tabIndex={-1}
            disabled={disabled}
            onClick={() => {
              if (showPanel) {
                close();
                return;
              }
              setOpen(true);
              runSearch('');
              inputRef.current?.focus();
            }}
          >
            <Icon name="chevron-down" />
          </button>
        )}
      </div>
      <div role="status" aria-live="polite" className="visually-hidden">
        {status}
      </div>
      {showPanel && (
        <Portal>
          <div ref={panelRef} className="dropdown-menu show ui-auto-complete__panel" style={{ position: 'fixed', top: position.top, left: position.left, minWidth: position.minWidth }}>
            <ul id={listboxId} role="listbox" className="list-unstyled mb-0 ui-auto-complete__list" aria-label={props['aria-label']} aria-labelledby={control.labelId}>
              {suggestions.map((item, index) => (
                // Pointer convenience; keyboard handled by the focused control (aria-activedescendant / roving focus, covered by AC tests).
                // eslint-disable-next-line jsx-a11y/click-events-have-key-events
                <li
                  key={optionId(index)}
                  id={optionId(index)}
                  role="option"
                  aria-selected={index === activeIndex}
                  className={cx('dropdown-item ui-auto-complete__option', index === activeIndex && 'active')}
                  onPointerDown={(e) => e.preventDefault()}
                  onPointerMove={() => setActiveIndex(index)}
                  onClick={() => choose(item)}
                >
                  {itemTemplate ? itemTemplate(item) : getOptionLabel(item)}
                </li>
              ))}
            </ul>
            {loading && suggestions.length === 0 && <div className="dropdown-item-text text-body-secondary ui-auto-complete__loading">{t('searching')}</div>}
            {!loading && searched && suggestions.length === 0 && <div className="dropdown-item-text text-body-secondary ui-auto-complete__empty">{emptyMessage ?? t('noResults')}</div>}
          </div>
        </Portal>
      )}
    </div>
  );
}
