import { useId, useLayoutEffect, useMemo, useRef, useState, type CSSProperties, type KeyboardEvent, type MouseEvent, type ReactNode, type Ref } from 'react';
import { useControllableState } from '../../hooks/useControllableState';
import { useTypeahead } from '../../hooks/useTypeahead';
import { useLocale } from '../../locale/LocaleProvider';
import { cx } from '../../utils/cx';
import { useFieldControl } from '../Field/Field';
import { Icon } from '../Icon/Icon';
import type { Option, OptionGroup } from '../Select/Select';

export interface FlatOption<T> extends Option<T> {
  group?: string | undefined;
}

const isGroup = <T,>(item: Option<T> | OptionGroup<T>): item is OptionGroup<T> => 'options' in item;

/** Flatten options/groups into one list, keeping the group label on each option. */
export function flattenOptions<T>(items: (Option<T> | OptionGroup<T>)[]): FlatOption<T>[] {
  return items.flatMap((item) => (isGroup(item) ? item.options.map((o) => ({ ...o, group: item.label })) : [item]));
}

/** Sort selected values into option order (stable regardless of click order). */
export function orderByOptions<T>(all: FlatOption<T>[], values: T[]): T[] {
  const known = all.filter((o) => values.includes(o.value)).map((o) => o.value);
  // Keep values that are not (or no longer) among the options at the end.
  return [...known, ...values.filter((v) => !known.includes(v))];
}

interface ListBoxBaseProps<T> {
  options: (Option<T> | OptionGroup<T>)[];
  filter?: boolean;
  optionTemplate?: (option: Option<T>) => ReactNode;
  /** Render only visible rows; each row (option or group header) is `itemHeight` px tall. */
  virtual?: { itemHeight: number };
  listHeight?: string;
  emptyMessage?: ReactNode;
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

export interface ListBoxSingleProps<T> extends ListBoxBaseProps<T> {
  multiple?: false;
  value?: NoInfer<T> | null;
  defaultValue?: NoInfer<T> | null;
  onChange?: (value: NoInfer<T> | null) => void;
}

export interface ListBoxMultipleProps<T> extends ListBoxBaseProps<T> {
  multiple: true;
  value?: NoInfer<T>[];
  defaultValue?: NoInfer<T>[];
  onChange?: (value: NoInfer<T>[]) => void;
}

export type ListBoxProps<T> = ListBoxSingleProps<T> | ListBoxMultipleProps<T>;

type Row<T> = { kind: 'header'; label: string; key: string } | { kind: 'option'; option: FlatOption<T>; index: number; key: string };

const OVERSCAN = 3;

function cssLengthToPx(value: string): number {
  const n = parseFloat(value);
  if (Number.isNaN(n)) return 224;
  if (value.endsWith('rem') || value.endsWith('em')) return n * 16;
  return n;
}

export function ListBox<T>(props: ListBoxProps<T>) {
  const { options, filter = false, optionTemplate, virtual, listHeight = '14rem', emptyMessage, disabled = false, className, style, ref } = props;
  const multiple = props.multiple === true;
  const { t } = useLocale();
  const control = useFieldControl({ id: props.id, invalid: props.invalid, required: props.required, 'aria-describedby': props['aria-describedby'] });
  const baseId = useId();
  const listId = control.id;

  const toArray = (v: T | T[] | null | undefined): T[] | undefined => (v === undefined ? undefined : v === null ? [] : multiple ? (v as T[]) : [v as T]);
  const emit = (next: T[]) => {
    if (props.multiple === true) props.onChange?.(next);
    else props.onChange?.(next[0] ?? null);
  };
  const [selected, setSelected] = useControllableState<T[]>(toArray(props.value), toArray(props.defaultValue) ?? [], emit);

  const all = useMemo(() => flattenOptions(options), [options]);
  const [query, setQuery] = useState('');
  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return q ? all.filter((o) => o.label.toLowerCase().includes(q)) : all;
  }, [all, query]);
  const [activeIndex, setActiveIndex] = useState(-1);
  const anchor = useRef(-1);
  const listRef = useRef<HTMLDivElement | null>(null);
  const [scrollTop, setScrollTop] = useState(0);
  const typeahead = useTypeahead(visible, (o) => o.label, (o) => Boolean(o.disabled));

  const enabled = visible.map((o, i) => (o.disabled ? -1 : i)).filter((i) => i !== -1);
  const validActive = enabled.includes(activeIndex) ? activeIndex : -1;
  const isSelected = (o: FlatOption<T>) => selected.includes(o.value);

  const rows = useMemo(() => {
    const out: Row<T>[] = [];
    let lastGroup: string | undefined;
    visible.forEach((option, index) => {
      if (option.group && option.group !== lastGroup) out.push({ kind: 'header', label: option.group, key: `h-${index}` });
      lastGroup = option.group;
      out.push({ kind: 'option', option, index, key: `o-${index}` });
    });
    return out;
  }, [visible]);
  const rowOf = (index: number) => rows.findIndex((r) => r.kind === 'option' && r.index === index);

  const viewport = cssLengthToPx(listHeight);
  const ensureVisible = (index: number) => {
    if (!virtual || index < 0) return;
    const top = rowOf(index) * virtual.itemHeight;
    const height = listRef.current?.clientHeight || viewport;
    if (top < scrollTop) setScrollTop(top);
    else if (top + virtual.itemHeight > scrollTop + height) setScrollTop(top + virtual.itemHeight - height);
  };

  const activate = (index: number) => {
    setActiveIndex(index);
    ensureVisible(index);
  };

  useLayoutEffect(() => {
    const el = listRef.current;
    if (virtual && el && Math.abs(el.scrollTop - scrollTop) > 1) el.scrollTop = scrollTop;
  }, [virtual, scrollTop]);

  useLayoutEffect(() => {
    if (virtual || validActive < 0) return;
    document.getElementById(`${baseId}-opt-${validActive}`)?.scrollIntoView?.({ block: 'nearest' });
  }, [virtual, validActive, baseId]);

  const commit = (next: T[]) => setSelected(orderByOptions(all, next));

  const toggle = (option: FlatOption<T> | undefined) => {
    if (!option || option.disabled || disabled) return;
    if (!multiple) {
      commit([option.value]);
      return;
    }
    commit(isSelected(option) ? selected.filter((v) => v !== option.value) : [...selected, option.value]);
  };

  const selectRange = (from: number, to: number) => {
    const [a, b] = from < to ? [from, to] : [to, from];
    const range = visible.slice(a, b + 1).filter((o) => !o.disabled).map((o) => o.value);
    commit([...selected.filter((v) => !range.includes(v)), ...range]);
  };

  const move = (delta: 1 | -1): number => {
    if (enabled.length === 0) return -1;
    const pos = enabled.indexOf(validActive);
    const next = pos === -1 ? (delta === 1 ? 0 : enabled.length - 1) : Math.min(Math.max(pos + delta, 0), enabled.length - 1);
    const index = enabled[next]!;
    activate(index);
    return index;
  };

  const handleFocus = () => {
    if (validActive !== -1) return;
    const sel = visible.findIndex((o) => !o.disabled && isSelected(o));
    activate(sel !== -1 ? sel : (enabled[0] ?? -1));
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLElement>) => {
    if (disabled) return;
    const { key, shiftKey } = event;
    const mod = event.ctrlKey || event.metaKey;
    const fromInput = event.currentTarget.tagName === 'INPUT';
    switch (key) {
      case 'ArrowDown':
      case 'ArrowUp': {
        event.preventDefault();
        const index = move(key === 'ArrowDown' ? 1 : -1);
        if (multiple && shiftKey && index !== -1 && index !== validActive) toggle(visible[index]);
        return;
      }
      case 'Home':
      case 'End': {
        if (fromInput && !mod) return;
        event.preventDefault();
        const index = key === 'Home' ? (enabled[0] ?? -1) : (enabled[enabled.length - 1] ?? -1);
        if (multiple && shiftKey && mod && validActive !== -1 && index !== -1) selectRange(validActive, index);
        activate(index);
        return;
      }
      case ' ':
        if (fromInput) return;
        event.preventDefault();
        if (multiple && shiftKey && anchor.current !== -1 && validActive !== -1) selectRange(anchor.current, validActive);
        else {
          toggle(visible[validActive]);
          anchor.current = validActive;
        }
        return;
      case 'Enter':
        event.preventDefault();
        toggle(visible[validActive]);
        anchor.current = validActive;
        return;
      default:
        if (multiple && mod && key.toLowerCase() === 'a') {
          event.preventDefault();
          const values = enabled.map((i) => visible[i]!.value);
          const allOn = values.length > 0 && values.every((v) => selected.includes(v));
          commit(allOn ? selected.filter((v) => !values.includes(v)) : [...selected, ...values.filter((v) => !selected.includes(v))]);
          return;
        }
        if (!fromInput && key.length === 1 && !mod && !event.altKey) {
          const match = typeahead(key, validActive);
          if (match !== -1) activate(match);
        }
    }
  };

  const handleClick = (event: MouseEvent, option: FlatOption<T>, index: number) => {
    if (option.disabled || disabled) return;
    activate(index);
    if (multiple && event.shiftKey && anchor.current !== -1) selectRange(anchor.current, index);
    else {
      toggle(option);
      anchor.current = index;
    }
  };

  const setRefs = (node: HTMLDivElement | null) => {
    listRef.current = node;
    if (typeof ref === 'function') ref(node);
    else if (ref) (ref as { current: unknown }).current = node;
  };

  const optionId = (index: number) => `${baseId}-opt-${index}`;
  const total = visible.length;

  const renderOption = (option: FlatOption<T>, index: number, extra?: CSSProperties) => {
    const sel = isSelected(option);
    return (
      <div
        key={optionId(index)}
        id={optionId(index)}
        role="option"
        aria-selected={sel}
        aria-disabled={option.disabled || undefined}
        aria-setsize={virtual ? total : undefined}
        aria-posinset={virtual ? index + 1 : undefined}
        className={cx(
          'list-group-item list-group-item-action ui-list-box__option',
          index === validActive && 'ui-list-box__option--focused',
          sel && 'active',
          option.disabled && 'disabled',
        )}
        style={extra}
        onPointerDown={(e) => e.preventDefault()}
        onClick={(e) => {
          listRef.current?.focus();
          handleClick(e, option, index);
        }}
      >
        {multiple && <span className={cx('ui-list-box__check', sel && 'ui-list-box__check--on')} aria-hidden="true">{sel && <Icon name="check" />}</span>}
        <span className="ui-list-box__label">{optionTemplate ? optionTemplate(option) : option.label}</span>
      </div>
    );
  };

  let body: ReactNode;
  if (visible.length === 0) {
    body = <div className="list-group-item ui-list-box__empty text-body-secondary">{emptyMessage ?? t('noResults')}</div>;
  } else if (virtual) {
    const h = virtual.itemHeight;
    const height = listRef.current?.clientHeight || viewport;
    const start = Math.max(0, Math.floor(scrollTop / h) - OVERSCAN);
    const end = Math.min(rows.length, Math.ceil((scrollTop + height) / h) + OVERSCAN);
    body = (
      <div className="ui-list-box__spacer" style={{ blockSize: rows.length * h, position: 'relative' }}>
        {rows.slice(start, end).map((row, i) => {
          const pos: CSSProperties = { position: 'absolute', insetInline: 0, insetBlockStart: (start + i) * h, blockSize: h };
          return row.kind === 'header' ? (
            <div key={row.key} role="presentation" className="list-group-item ui-list-box__group" style={pos}>
              {row.label}
            </div>
          ) : (
            renderOption(row.option, row.index, pos)
          );
        })}
      </div>
    );
  } else {
    const chunks: { group?: string; items: { option: FlatOption<T>; index: number }[] }[] = [];
    visible.forEach((option, index) => {
      const last = chunks[chunks.length - 1];
      if (last && last.group === option.group) last.items.push({ option, index });
      else chunks.push({ group: option.group, items: [{ option, index }] });
    });
    body = chunks.map((chunk, ci) =>
      chunk.group ? (
        <div key={`g-${ci}`} role="group" aria-labelledby={`${baseId}-g-${ci}`} className="ui-list-box__group-wrap">
          <div id={`${baseId}-g-${ci}`} role="presentation" className="list-group-item ui-list-box__group">
            {chunk.group}
          </div>
          {chunk.items.map(({ option, index }) => renderOption(option, index))}
        </div>
      ) : (
        chunk.items.map(({ option, index }) => renderOption(option, index))
      ),
    );
  }

  const activeDescendant = validActive >= 0 ? optionId(validActive) : undefined;

  return (
    <div className={cx('ui-list-box', disabled && 'ui-list-box--disabled', control.invalid && 'ui-list-box--invalid', className)} style={style}>
      {filter && (
        <div className="ui-list-box__filter">
          <input
            type="text"
            role="combobox"
            aria-expanded="true"
            aria-controls={listId}
            aria-autocomplete="list"
            aria-activedescendant={activeDescendant}
            aria-label={t('filter')}
            className="form-control form-control-sm"
            value={query}
            disabled={disabled}
            onChange={(e) => {
              setQuery(e.target.value);
              setActiveIndex(-1);
              setScrollTop(0);
            }}
            onKeyDown={handleKeyDown}
          />
        </div>
      )}
      <div
        ref={setRefs}
        id={listId}
        role="listbox"
        tabIndex={disabled ? -1 : 0}
        aria-multiselectable={multiple || undefined}
        aria-activedescendant={activeDescendant}
        aria-label={props['aria-label']}
        aria-labelledby={control.labelId}
        aria-describedby={control.describedBy}
        aria-invalid={control.invalid || undefined}
        aria-required={control.required || undefined}
        aria-disabled={disabled || undefined}
        className={cx('list-group ui-list-box__list', control.invalid && 'is-invalid')}
        style={{ maxBlockSize: listHeight, blockSize: virtual ? listHeight : undefined }}
        onFocus={handleFocus}
        onKeyDown={handleKeyDown}
        onScroll={virtual ? (e) => setScrollTop(e.currentTarget.scrollTop) : undefined}
      >
        {body}
      </div>
    </div>
  );
}
