import { useRef, useState, type KeyboardEvent } from 'react';
import { cx } from '../../utils/cx';
import { Button } from '../Button/Button';
import { Checkbox } from '../Checkbox/Checkbox';
import { DatePicker, type DateRange } from '../DatePicker/DatePicker';
import { Icon } from '../Icon/Icon';
import { InputNumber } from '../InputNumber/InputNumber';
import { InputText } from '../InputText/InputText';
import { Popover } from '../Popover/Popover';
import { Select } from '../Select/Select';
import { defaultMatchMode, isFilterActive, matchModesOf } from './filters';
import { MATCH_MODE_KEY, type Messages } from './messages';
import type { Column, FilterConstraint, MatchMode } from './types';
import { useDebouncedCallback } from './useDebouncedCallback';

interface FilterProps<T> {
  column: Column<T>;
  /** Plain-text header used in accessible names. */
  label: string;
  constraint: FilterConstraint | undefined;
  onChange: (constraint: FilterConstraint | undefined) => void;
  msg: Messages;
  locale: string;
}

const asArray = (v: unknown): unknown[] => (Array.isArray(v) ? v : v === null || v === undefined ? [] : [v]);
const asNumber = (v: unknown): number | null => (typeof v === 'number' && Number.isFinite(v) ? v : null);
const asDate = (v: unknown): Date | null => (v instanceof Date && !Number.isNaN(v.getTime()) ? v : null);

/** Header filter button + Popover filter menu (filterDisplay="menu"). */
export function ColumnFilterMenu<T>({ column, label, constraint, onChange, msg, locale }: FilterProps<T>) {
  const [open, setOpen] = useState(false);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const editorRef = useRef<HTMLElement | null>(null);
  const active = isFilterActive(constraint, column.filterType) || (Boolean(column.filterFn) && constraint !== undefined);

  const finish = (next: FilterConstraint | undefined) => {
    onChange(next);
    setOpen(false);
    buttonRef.current?.focus();
  };

  return (
    <Popover
      open={open}
      onOpenChange={setOpen}
      ariaLabel={msg('filterColumn', { header: label })}
      placement="bottom-start"
      arrow={false}
      className="ui-data-table__filter-menu"
      initialFocus={editorRef}
      trigger={
        <button
          ref={buttonRef}
          type="button"
          className={cx('ui-data-table__filter-button', active && 'ui-data-table__filter--active')}
          aria-label={msg(active ? 'filterActive' : 'filterColumn', { header: label })}
        >
          <Icon name="filter" size="sm" />
        </button>
      }
    >
      <FilterMenuContent column={column} label={label} constraint={constraint} msg={msg} locale={locale} onApply={finish} editorRef={editorRef} />
    </Popover>
  );
}

const FOCUSABLE = 'input:not([disabled]), select:not([disabled]), button:not([disabled]):not([tabindex="-1"]), [tabindex="0"]';

function FilterMenuContent<T>({
  column,
  label,
  constraint,
  msg,
  locale,
  onApply,
  editorRef,
}: Omit<FilterProps<T>, 'onChange'> & { onApply: (c: FilterConstraint | undefined) => void; editorRef: { current: HTMLElement | null } }) {
  const modes = matchModesOf(column);
  const [matchMode, setMatchMode] = useState<MatchMode>(constraint && modes.includes(constraint.matchMode) ? constraint.matchMode : defaultMatchMode(column));
  const [value, setValue] = useState<unknown>(constraint?.value ?? null);
  const type = column.filterType ?? 'text';

  const apply = () => {
    const next = { matchMode, value };
    onApply(isFilterActive(next, type) || column.filterFn ? next : undefined);
  };

  const changeMode = (mode: MatchMode | null) => {
    if (!mode) return;
    // Value shapes differ between single and range/list modes.
    if ((mode === 'between') !== (matchMode === 'between') || (mode === 'in') !== (matchMode === 'in')) setValue(null);
    setMatchMode(mode);
  };

  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key === 'Enter' && (e.target as HTMLElement).tagName === 'INPUT' && (e.target as HTMLInputElement).type !== 'checkbox') {
      e.preventDefault();
      apply();
    }
  };

  return (
    // Enter in a text field applies the filter (keyboard shortcut for the Apply button).
    // eslint-disable-next-line jsx-a11y/no-static-element-interactions
    <div className="ui-data-table__filter-form" onKeyDown={onKeyDown}>
      {modes.length > 1 && (
        <Select<MatchMode>
          native
          size="sm"
          aria-label={msg('matchMode')}
          options={modes.map((m) => ({ value: m, label: msg(MATCH_MODE_KEY[m]) }))}
          value={matchMode}
          onChange={changeMode}
        />
      )}
      <div
        className="ui-data-table__filter-value"
        ref={(node) => {
          // Popover moves initial focus to the value editor rather than the match-mode select.
          editorRef.current = node?.querySelector<HTMLElement>(FOCUSABLE) ?? null;
        }}
      >
        <FilterEditor column={column} label={label} matchMode={matchMode} value={value} onValue={setValue} msg={msg} locale={locale} inline />
      </div>
      <div className="ui-data-table__filter-actions">
        <Button size="sm" variant="secondary" appearance="outline" onClick={() => onApply(undefined)}>
          {msg('clear')}
        </Button>
        <Button size="sm" onClick={apply}>
          {msg('apply')}
        </Button>
      </div>
    </div>
  );
}

interface EditorProps<T> {
  column: Column<T>;
  label: string;
  matchMode: MatchMode;
  value: unknown;
  onValue: (value: unknown) => void;
  msg: Messages;
  locale: string;
  /** Menu mode: calendars inline (no nested popup) and checkbox list for `in`. */
  inline?: boolean;
}

function FilterEditor<T>({ column, label, matchMode, value, onValue, msg, locale, inline = false }: EditorProps<T>) {
  const type = column.filterType ?? 'text';
  const name = msg('filterColumn', { header: label });

  if (type === 'number') {
    if (matchMode === 'between') {
      const [lo, hi] = asArray(value);
      return (
        <div className="ui-data-table__filter-range">
          <InputNumber size="sm" aria-label={`${name}, ${msg('filterFrom')}`} value={asNumber(lo)} onValueInput={(v) => onValue([v, hi ?? null])} onChange={(v) => onValue([v, hi ?? null])} />
          <InputNumber size="sm" aria-label={`${name}, ${msg('filterTo')}`} value={asNumber(hi)} onValueInput={(v) => onValue([lo ?? null, v])} onChange={(v) => onValue([lo ?? null, v])} />
        </div>
      );
    }
    return <InputNumber size="sm" aria-label={name} value={asNumber(value)} onValueInput={onValue} onChange={onValue} />;
  }

  if (type === 'date') {
    if (matchMode === 'between') {
      const [from, to] = asArray(value);
      const range: DateRange | null = asDate(from) ? [asDate(from)!, asDate(to)] : null;
      return <DatePicker selectionMode="range" inline={inline} size="sm" locale={locale} aria-label={name} value={range} onChange={(r) => onValue(r ? [r[0], r[1]] : null)} />;
    }
    return <DatePicker inline={inline} size="sm" locale={locale} aria-label={name} value={asDate(value)} onChange={onValue} />;
  }

  if (type === 'select') {
    const options = column.filterOptions ?? [];
    if (matchMode === 'in' && inline) {
      const selected = asArray(value);
      return (
        <fieldset className="ui-data-table__filter-options">
          <legend className="visually-hidden">{name}</legend>
          {options.map((o) => (
            <Checkbox
              key={String(o.value)}
              label={o.label}
              checked={selected.includes(o.value)}
              disabled={o.disabled}
              onChange={(on) => onValue(on ? [...selected, o.value] : selected.filter((v) => v !== o.value))}
            />
          ))}
        </fieldset>
      );
    }
    const single = matchMode === 'in' ? (asArray(value)[0] ?? null) : value;
    return <Select<unknown> native size="sm" aria-label={name} options={options} value={single} onChange={(v) => onValue(matchMode === 'in' ? (v === null ? null : [v]) : v)} />;
  }

  return <InputText size="sm" aria-label={name} value={typeof value === 'string' ? value : ''} onChange={(v) => onValue(v)} />;
}

/** Inline editor in the filter row (filterDisplay="row"); always uses the column's default match mode. */
export function ColumnFilterRow<T>({ column, label, constraint, onChange, msg, locale, delay }: FilterProps<T> & { delay: number }) {
  const debounce = useDebouncedCallback((fn: () => void) => fn(), delay);
  const matchMode = constraint?.matchMode ?? defaultMatchMode(column);
  const [draft, setDraft] = useState<unknown>(constraint?.value ?? null);
  const [synced, setSynced] = useState<unknown>(constraint?.value);
  // Follow external changes (clear, reset, controlled filters) without fighting local typing.
  if (constraint?.value !== synced) {
    setSynced(constraint?.value);
    setDraft(constraint?.value ?? null);
  }

  const update = (value: unknown) => {
    setDraft(value);
    const next = { matchMode, value };
    const text = column.filterType === undefined || column.filterType === 'text';
    const emit = () => {
      setSynced(isFilterActive(next, column.filterType) ? value : undefined);
      onChange(isFilterActive(next, column.filterType) || (column.filterFn && value !== null && value !== '') ? next : undefined);
    };
    if (text) debounce(emit);
    else emit();
  };

  return <FilterEditor column={column} label={label} matchMode={matchMode} value={draft} onValue={update} msg={msg} locale={locale} />;
}
