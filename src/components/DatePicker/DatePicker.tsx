import { useEffect, useId, useLayoutEffect, useMemo, useRef, useState, type CSSProperties, type KeyboardEvent, type Ref, type RefObject } from 'react';
import { useClickOutside } from '../../hooks/useClickOutside';
import { useControllableState } from '../../hooks/useControllableState';
import { useFloating } from '../../hooks/useFloating';
import { useFocusTrap } from '../../hooks/useFocusTrap';
import { useLocale } from '../../locale/LocaleProvider';
import { cx } from '../../utils/cx';
import {
  addDays,
  addMonths,
  addYears,
  compareDays,
  firstDayOfWeek as localeFirstDay,
  isBetween,
  isSameDay,
  monthGrid,
  monthNames,
  parseDate,
  startOfDay,
  startOfWeek,
  toIsoDate,
  weekdayNames,
} from '../../utils/date';
import type { Size } from '../../types';
import { useFieldControl } from '../Field/Field';
import { Icon } from '../Icon/Icon';
import { Portal } from '../Portal/Portal';

/** Local English defaults until locale keys exist (`previousYears`, `nextYears`, `am`, `pm`, `clearDate`, `presets`). */
const DEFAULT_LABELS = { previousYears: 'Previous 12 years', nextYears: 'Next 12 years', am: 'AM', pm: 'PM', presets: 'Presets', period: 'AM/PM' };

export type DateRange = [Date, Date | null];
export type DatePickerValue = Date | DateRange | Date[] | null;
export type DatePickerView = 'date' | 'month' | 'year';

export interface DatePreset<V> {
  label: string;
  value: V | (() => V);
}

interface DatePickerBaseProps {
  view?: DatePickerView;
  minDate?: Date;
  maxDate?: Date;
  disabledDates?: Date[] | ((date: Date) => boolean);
  showTime?: boolean;
  hourFormat?: '12' | '24';
  inline?: boolean;
  numberOfMonths?: number;
  firstDayOfWeek?: 0 | 1 | 2 | 3 | 4 | 5 | 6;
  locale?: string;
  format?: Intl.DateTimeFormatOptions;
  showButtonBar?: boolean;
  placeholder?: string;
  labels?: Partial<typeof DEFAULT_LABELS>;
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

export interface DatePickerSingleProps extends DatePickerBaseProps {
  selectionMode?: 'single';
  value?: Date | null;
  defaultValue?: Date | null;
  onChange?: (value: Date | null) => void;
  presets?: DatePreset<Date>[];
}

export interface DatePickerRangeProps extends DatePickerBaseProps {
  selectionMode: 'range';
  value?: DateRange | null;
  defaultValue?: DateRange | null;
  onChange?: (value: DateRange | null) => void;
  presets?: DatePreset<DateRange>[];
}

export interface DatePickerMultipleProps extends DatePickerBaseProps {
  selectionMode: 'multiple';
  value?: Date[];
  defaultValue?: Date[];
  onChange?: (value: Date[]) => void;
  presets?: DatePreset<Date[]>[];
}

export type DatePickerProps = DatePickerSingleProps | DatePickerRangeProps | DatePickerMultipleProps;

const startOfMonth = (d: Date) => new Date(d.getFullYear(), d.getMonth(), 1);
const withTime = (d: Date, h: number, m: number) => new Date(d.getFullYear(), d.getMonth(), d.getDate(), h, m);
/** Only meaningful when selectionMode is 'range'. */
const isRange = (v: DatePickerValue): v is DateRange => Array.isArray(v) && v.length === 2 && v[0] instanceof Date && (v[1] === null || v[1] instanceof Date);
const TIME_RE = /(\d{1,2}):(\d{2})\s*([ap]\.?\s?m\.?)?/i;
const YEAR_PAGE = 12;

function useHourCycle(locale: string, hourFormat: '12' | '24' | undefined): '12' | '24' {
  return useMemo(() => {
    if (hourFormat) return hourFormat;
    const cycle = new Intl.DateTimeFormat(locale, { hour: 'numeric' }).resolvedOptions().hourCycle;
    return cycle === 'h11' || cycle === 'h12' ? '12' : '24';
  }, [locale, hourFormat]);
}

export function DatePicker(props: DatePickerProps) {
  const {
    view = 'date',
    minDate,
    maxDate,
    disabledDates,
    showTime = false,
    inline = false,
    numberOfMonths = 1,
    format,
    showButtonBar = false,
    placeholder,
    labels: labelsProp,
    size = 'md',
    disabled = false,
    className,
    style,
    ref,
  } = props;
  const mode = props.selectionMode ?? 'single';
  const ctx = useLocale();
  const { t } = ctx;
  const locale = props.locale ?? ctx.locale;
  const labels = { ...DEFAULT_LABELS, ...labelsProp };
  const firstDay = props.firstDayOfWeek ?? localeFirstDay(locale);
  const hourCycle = useHourCycle(locale, props.hourFormat);
  const control = useFieldControl({ id: props.id, invalid: props.invalid, required: props.required, 'aria-describedby': props['aria-describedby'] });
  const baseId = useId();
  const dialogId = `${baseId}-dialog`;

  const emit = (next: DatePickerValue) => (props.onChange as ((v: DatePickerValue) => void) | undefined)?.(next);
  const [value, setValue] = useControllableState<DatePickerValue>(props.value, props.defaultValue ?? (mode === 'multiple' ? [] : null), emit);

  const single = mode === 'single' && value instanceof Date ? value : null;
  const range = mode === 'range' && value && isRange(value) ? value : null;
  const multi = mode === 'multiple' && Array.isArray(value) ? (value as Date[]) : [];
  const anchorDate = single ?? range?.[0] ?? multi[0] ?? null;

  const [open, setOpen] = useState(false);
  const [panelView, setPanelView] = useState<DatePickerView>(view);
  const [focused, setFocused] = useState<Date>(() => startOfDay(anchorDate ?? new Date()));
  const [viewMonth, setViewMonth] = useState<Date>(() => startOfMonth(anchorDate ?? new Date()));
  const [hover, setHover] = useState<Date | null>(null);
  const [textInvalid, setTextInvalid] = useState(false);
  const wantFocus = useRef(false);

  const inputRef = useRef<HTMLInputElement | null>(null);
  const anchorRef = useRef<HTMLDivElement | null>(null);
  const popupRef = useRef<HTMLDivElement | null>(null);
  const calendarRef = useRef<HTMLDivElement | null>(null);
  const position = useFloating(anchorRef, popupRef, { open: open && !inline, placement: 'bottom-start' });
  // The trap's initial focus is the roving grid item (selected date or today), per APG.
  const initialFocus = useMemo<RefObject<HTMLElement | null>>(
    () => ({
      get current() {
        return calendarRef.current?.querySelector<HTMLElement>('[data-roving="true"]') ?? null;
      },
    }),
    [],
  );
  useFocusTrap(popupRef, { active: open && !inline, restoreFocus: false, initialFocus });

  // ---------- formatting ----------
  const dateFormat = useMemo<Intl.DateTimeFormatOptions>(() => {
    if (format) return format;
    if (view === 'month') return { year: 'numeric', month: 'long' };
    if (view === 'year') return { year: 'numeric' };
    return { year: 'numeric', month: 'numeric', day: 'numeric' };
  }, [format, view]);
  const fmt = useMemo(
    () => new Intl.DateTimeFormat(locale, showTime && view === 'date' ? { ...dateFormat, hour: '2-digit', minute: '2-digit', hourCycle: hourCycle === '12' ? 'h12' : 'h23' } : dateFormat),
    [locale, dateFormat, showTime, view, hourCycle],
  );
  const dayLabel = useMemo(() => new Intl.DateTimeFormat(locale, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }), [locale]);
  const monthYearFmt = useMemo(() => new Intl.DateTimeFormat(locale, { year: 'numeric', month: 'long' }), [locale]);
  const months = useMemo(() => monthNames(locale, 'long'), [locale]);
  const shortMonths = useMemo(() => monthNames(locale, 'short'), [locale]);
  const weekdaysShort = useMemo(() => weekdayNames(locale, firstDay, 'short'), [locale, firstDay]);
  const weekdaysLong = useMemo(() => weekdayNames(locale, firstDay, 'long'), [locale, firstDay]);

  const formatValue = (v: DatePickerValue): string => {
    if (!v) return '';
    if (v instanceof Date) return fmt.format(v);
    if (mode === 'range' && isRange(v)) return `${fmt.format(v[0])} – ${v[1] ? fmt.format(v[1]) : ''}`.trimEnd();
    return (v as Date[]).map((d) => fmt.format(d)).join(', ');
  };
  const formatted = formatValue(value);
  const [text, setText] = useState(formatted);
  useEffect(() => {
    setText(formatted);
    setTextInvalid(false);
  }, [formatted]);

  // ---------- constraints ----------
  const isDisabledDay = (d: Date) => {
    if (minDate && compareDays(d, minDate) < 0) return true;
    if (maxDate && compareDays(d, maxDate) > 0) return true;
    if (typeof disabledDates === 'function') return disabledDates(d);
    return Boolean(disabledDates?.some((x) => isSameDay(x, d)));
  };
  const isDisabledMonth = (y: number, m: number) => {
    const first = new Date(y, m, 1);
    const last = new Date(y, m + 1, 0);
    return Boolean((minDate && compareDays(last, minDate) < 0) || (maxDate && compareDays(first, maxDate) > 0));
  };
  const isDisabledYear = (y: number) => Boolean((minDate && y < minDate.getFullYear()) || (maxDate && y > maxDate.getFullYear()));

  // ---------- open / close ----------
  const resetView = () => {
    const base = startOfDay(anchorDate ?? new Date());
    setFocused(base);
    setViewMonth(startOfMonth(base));
    setPanelView(view);
    setHover(null);
  };

  const openPopup = () => {
    if (disabled) return;
    resetView();
    wantFocus.current = true;
    setOpen(true);
  };

  const close = (focusInput = true) => {
    setOpen(false);
    setHover(null);
    if (focusInput) inputRef.current?.focus();
  };

  useClickOutside([anchorRef, popupRef], () => close(false), open && !inline);

  // Move DOM focus to the roving item after keyboard navigation / opening.
  useLayoutEffect(() => {
    if (!wantFocus.current) return;
    if (!inline && !open) return;
    const target = calendarRef.current?.querySelector<HTMLElement>('[data-roving="true"]');
    if (target) {
      target.focus();
      wantFocus.current = false;
    }
  });

  // ---------- selection ----------
  const timeSource = single ?? new Date(new Date().setSeconds(0, 0));
  const commitSingle = (d: Date | null, keepOpen = false) => {
    setValue(d);
    if (!inline && !keepOpen) close();
  };

  const selectDay = (d: Date) => {
    if (isDisabledDay(d)) return;
    if (mode === 'single') {
      commitSingle(showTime ? withTime(d, timeSource.getHours(), timeSource.getMinutes()) : startOfDay(d), showTime);
    } else if (mode === 'range') {
      if (!range || range[1] !== null) {
        setValue([startOfDay(d), null]);
        setHover(d);
      } else {
        const start = range[0];
        setValue(compareDays(d, start) < 0 ? [startOfDay(d), start] : [start, startOfDay(d)]);
        setHover(null);
        if (!inline) close();
      }
    } else {
      const exists = multi.some((x) => isSameDay(x, d));
      const next = exists ? multi.filter((x) => !isSameDay(x, d)) : [...multi, startOfDay(d)];
      setValue(next.sort((a, b) => a.getTime() - b.getTime()));
    }
  };

  const selectPeriod = (d: Date) => {
    // Month / year granularity.
    if (mode === 'single') commitSingle(d);
    else if (mode === 'range') {
      if (!range || range[1] !== null) setValue([d, null]);
      else {
        setValue(d < range[0] ? [d, range[0]] : [range[0], d]);
        if (!inline) close();
      }
    } else {
      const same = (x: Date) => x.getFullYear() === d.getFullYear() && (view === 'year' || x.getMonth() === d.getMonth());
      const next = multi.some(same) ? multi.filter((x) => !same(x)) : [...multi, d];
      setValue(next.sort((a, b) => a.getTime() - b.getTime()));
    }
  };

  // ---------- navigation ----------
  const lastVisibleMonth = addMonths(viewMonth, numberOfMonths - 1);
  const moveFocus = (d: Date) => {
    setFocused(d);
    if (panelView === 'date') {
      if (compareDays(d, viewMonth) < 0) setViewMonth(startOfMonth(d));
      else if (compareDays(d, new Date(lastVisibleMonth.getFullYear(), lastVisibleMonth.getMonth() + 1, 0)) > 0) setViewMonth(addMonths(startOfMonth(d), -(numberOfMonths - 1)));
      if (range && range[1] === null) setHover(d);
    } else {
      setViewMonth(startOfMonth(d));
    }
    wantFocus.current = true;
  };

  const shiftView = (delta: number, unit: 'month' | 'year') => {
    const by = (d: Date) => (unit === 'month' ? addMonths(d, delta) : addYears(d, delta));
    setViewMonth(startOfMonth(by(viewMonth)));
    setFocused(by(focused));
  };

  const prevNext = (dir: 1 | -1) => {
    if (panelView === 'date') shiftView(dir, 'month');
    else if (panelView === 'month') shiftView(dir, 'year');
    else shiftView(dir * YEAR_PAGE, 'year');
  };

  const handleGridKey = (event: KeyboardEvent<HTMLElement>) => {
    const rtl = getComputedStyle(event.currentTarget).direction === 'rtl';
    const k = event.key;
    const horiz = k === 'ArrowRight' ? (rtl ? -1 : 1) : k === 'ArrowLeft' ? (rtl ? 1 : -1) : 0;
    let next: Date | null = null;
    if (panelView === 'date') {
      if (horiz) next = addDays(focused, horiz);
      else if (k === 'ArrowDown') next = addDays(focused, 7);
      else if (k === 'ArrowUp') next = addDays(focused, -7);
      else if (k === 'Home') next = startOfWeek(focused, firstDay);
      else if (k === 'End') next = addDays(startOfWeek(focused, firstDay), 6);
      else if (k === 'PageUp') next = event.shiftKey ? addYears(focused, -1) : addMonths(focused, -1);
      else if (k === 'PageDown') next = event.shiftKey ? addYears(focused, 1) : addMonths(focused, 1);
    } else {
      const unit = panelView === 'month' ? addMonths : (d: Date, n: number) => addYears(d, n);
      if (horiz) next = unit(focused, horiz);
      else if (k === 'ArrowDown') next = unit(focused, 3);
      else if (k === 'ArrowUp') next = unit(focused, -3);
      else if (k === 'Home') next = panelView === 'month' ? new Date(focused.getFullYear(), 0, 1) : addYears(focused, -((focused.getFullYear() % YEAR_PAGE)));
      else if (k === 'End') next = panelView === 'month' ? new Date(focused.getFullYear(), 11, 1) : addYears(focused, YEAR_PAGE - 1 - (focused.getFullYear() % YEAR_PAGE));
      else if (k === 'PageUp') next = addYears(focused, panelView === 'month' ? -1 : -YEAR_PAGE);
      else if (k === 'PageDown') next = addYears(focused, panelView === 'month' ? 1 : YEAR_PAGE);
    }
    if (next) {
      event.preventDefault();
      moveFocus(next);
      return;
    }
    if (k === 'Enter' || k === ' ') {
      event.preventDefault();
      activateFocused();
    }
  };

  const activateFocused = () => {
    if (panelView === 'date') selectDay(focused);
    else if (panelView === 'month') chooseMonth(focused.getFullYear(), focused.getMonth());
    else chooseYear(focused.getFullYear());
  };

  const chooseMonth = (y: number, m: number) => {
    if (isDisabledMonth(y, m)) return;
    if (view === 'month') {
      selectPeriod(new Date(y, m, 1));
      setFocused(new Date(y, m, 1));
      return;
    }
    const day = Math.min(focused.getDate(), new Date(y, m + 1, 0).getDate());
    setFocused(new Date(y, m, day));
    setViewMonth(new Date(y, m, 1));
    setPanelView('date');
    wantFocus.current = true;
  };

  const chooseYear = (y: number) => {
    if (isDisabledYear(y)) return;
    if (view === 'year') {
      selectPeriod(new Date(y, 0, 1));
      setFocused(new Date(y, 0, 1));
      return;
    }
    const d = new Date(y, focused.getMonth(), Math.min(focused.getDate(), new Date(y, focused.getMonth() + 1, 0).getDate()));
    setFocused(d);
    setViewMonth(startOfMonth(d));
    setPanelView('month');
    wantFocus.current = true;
  };

  // ---------- typed input ----------
  const parseOne = (raw: string): Date | null | 'invalid' => {
    const s = raw.trim();
    if (!s) return null;
    if (view === 'year') return /^\d{4}$/.test(s) && !isDisabledYear(Number(s)) ? new Date(Number(s), 0, 1) : 'invalid';
    if (view === 'month') {
      const nums = s.match(/\d+/g)?.map(Number) ?? [];
      const name = s.replace(/[\d\s,./-]+/g, ' ').trim().toLowerCase();
      let y: number | undefined;
      let m: number | undefined;
      if (nums.length === 2) {
        [y, m] = nums[0]! > 31 ? [nums[0]!, nums[1]! - 1] : [nums[1]!, nums[0]! - 1];
      } else if (nums.length === 1 && name) {
        y = nums[0];
        const idx = [...months, ...shortMonths].findIndex((mn) => mn.toLowerCase().startsWith(name) || name.startsWith(mn.toLowerCase()));
        m = idx === -1 ? undefined : idx % 12;
      }
      if (y === undefined || m === undefined || m < 0 || m > 11 || isDisabledMonth(y, m)) return 'invalid';
      return new Date(y, m, 1);
    }
    let datePart = s;
    let h: number | null = null;
    let min = 0;
    const tm = showTime ? TIME_RE.exec(s) : null;
    if (tm) {
      datePart = s.slice(0, tm.index).replace(/[,\s]+$/, '');
      h = Number(tm[1]);
      min = Number(tm[2]);
      const pm = tm[3]?.toLowerCase().startsWith('p');
      if (tm[3]) h = (h % 12) + (pm ? 12 : 0);
      if (h > 23 || min > 59) return 'invalid';
    }
    const d = parseDate(datePart, locale);
    if (!d || isDisabledDay(d)) return 'invalid';
    return h !== null ? withTime(d, h, min) : d;
  };

  const commitText = () => {
    if (text === formatted) return;
    const fail = () => setTextInvalid(true);
    if (mode === 'single') {
      const d = parseOne(text);
      if (d === 'invalid') return fail();
      setTextInvalid(false);
      setValue(d);
    } else if (mode === 'range') {
      const parts = text.split(/\s+[–—-]\s+|\s*[–—]\s*/).filter((p) => p.trim());
      if (parts.length === 0) {
        setTextInvalid(false);
        return setValue(null);
      }
      const ds = parts.map(parseOne);
      if (parts.length > 2 || ds.some((d) => d === 'invalid' || d === null)) return fail();
      const [a, b] = ds as Date[];
      setTextInvalid(false);
      setValue(b ? (a! <= b ? [a!, b] : [b, a!]) : [a!, null]);
    } else {
      const parts = text.split(/\s*[;,]\s*/).filter(Boolean);
      const ds = parts.map(parseOne);
      if (ds.some((d) => d === 'invalid')) return fail();
      setTextInvalid(false);
      setValue((ds as Date[]).filter(Boolean).sort((x, y) => x.getTime() - y.getTime()));
    }
  };

  // ---------- time ----------
  const setTime = (h: number, m: number) => {
    const base = single ?? new Date();
    setValue(withTime(base, h, m));
  };

  // ---------- render ----------
  const today = new Date();
  const selectedDays = mode === 'single' ? (single ? [single] : []) : mode === 'multiple' ? multi : range ? ([range[0], range[1]].filter(Boolean) as Date[]) : [];
  const isSelectedDay = (d: Date) => selectedDays.some((x) => isSameDay(x, d));
  const previewEnd = range && range[1] === null ? hover : null;
  const inRange = (d: Date) => {
    if (!range) return false;
    const end = range[1] ?? previewEnd;
    if (!end) return false;
    const [a, b] = compareDays(range[0], end) <= 0 ? [range[0], end] : [end, range[0]];
    return isBetween(d, a, b);
  };

  const renderMonth = (month: Date, index: number) => {
    const days = monthGrid(month.getFullYear(), month.getMonth(), firstDay);
    const headingId = `${baseId}-heading-${index}`;
    return (
      <div key={toIsoDate(month)} className="ui-date-picker__month">
        {numberOfMonths > 1 && (
          <div className="ui-date-picker__month-title" aria-hidden="true">
            {monthYearFmt.format(month)}
          </div>
        )}
        <span id={headingId} className="visually-hidden" aria-live="polite">
          {monthYearFmt.format(month)}
        </span>
        <table role="grid" aria-labelledby={headingId} className="ui-date-picker__grid" onKeyDown={handleGridKey}>
          <thead>
            <tr>
              {weekdaysShort.map((w, i) => (
                <th key={w + i} scope="col" abbr={weekdaysLong[i]} className="ui-date-picker__weekday">
                  {w}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {Array.from({ length: 6 }, (_, row) => (
              <tr key={row}>
                {days.slice(row * 7, row * 7 + 7).map((d) => {
                  const outside = d.getMonth() !== month.getMonth();
                  if (outside && numberOfMonths > 1) return <td key={toIsoDate(d)} role="gridcell" className="ui-date-picker__cell" />;
                  const sel = isSelectedDay(d);
                  const dis = isDisabledDay(d);
                  const roving = isSameDay(d, focused);
                  const rangeEdge = range && (isSameDay(d, range[0]) || isSameDay(d, range[1] ?? previewEnd));
                  return (
                    <td key={toIsoDate(d)} role="gridcell" aria-selected={sel} className="ui-date-picker__cell">
                      <button
                        type="button"
                        tabIndex={roving ? 0 : -1}
                        data-roving={roving || undefined}
                        data-date={toIsoDate(d)}
                        aria-label={dayLabel.format(d)}
                        aria-current={isSameDay(d, today) ? 'date' : undefined}
                        aria-disabled={dis || undefined}
                        className={cx(
                          'btn btn-sm ui-date-picker__day',
                          sel && 'ui-date-picker__day--selected',
                          outside && 'ui-date-picker__day--outside',
                          dis && 'ui-date-picker__day--disabled',
                          inRange(d) && 'ui-date-picker__day--in-range',
                          range && range[1] === null && previewEnd && inRange(d) && 'ui-date-picker__day--preview',
                          rangeEdge && 'ui-date-picker__day--range-edge',
                          isSameDay(d, today) && 'ui-date-picker__day--today',
                        )}
                        onClick={() => {
                          setFocused(d);
                          selectDay(d);
                        }}
                        onPointerEnter={() => range && range[1] === null && setHover(d)}
                        onFocus={() => !isSameDay(d, focused) && setFocused(d)}
                      >
                        {d.getDate()}
                      </button>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  };

  const renderPeriodGrid = (kind: 'month' | 'year') => {
    const year = focused.getFullYear();
    const startYear = year - (year % YEAR_PAGE);
    const items =
      kind === 'month'
        ? months.map((name, m) => ({ key: m, label: name, date: new Date(year, m, 1), disabled: isDisabledMonth(year, m) }))
        : Array.from({ length: YEAR_PAGE }, (_, i) => ({ key: startYear + i, label: String(startYear + i), date: new Date(startYear + i, 0, 1), disabled: isDisabledYear(startYear + i) }));
    const isSel = (d: Date) =>
      selectedDays.some((x) => x.getFullYear() === d.getFullYear() && (kind === 'year' || x.getMonth() === d.getMonth()));
    const isFocus = (d: Date) => d.getFullYear() === year && (kind === 'year' || d.getMonth() === focused.getMonth());
    const headingId = `${baseId}-heading-${kind}`;
    return (
      <div className="ui-date-picker__month">
        <span id={headingId} className="visually-hidden" aria-live="polite">
          {kind === 'month' ? `${t('chooseMonth')}, ${year}` : `${t('chooseYear')}, ${startYear} – ${startYear + YEAR_PAGE - 1}`}
        </span>
        <table role="grid" aria-labelledby={headingId} className={cx('ui-date-picker__grid', 'ui-date-picker__grid--period')} onKeyDown={handleGridKey}>
          <tbody>
            {Array.from({ length: 4 }, (_, row) => (
              <tr key={row}>
                {items.slice(row * 3, row * 3 + 3).map((item) => (
                  <td key={item.key} role="gridcell" aria-selected={isSel(item.date)} className="ui-date-picker__cell">
                    <button
                      type="button"
                      tabIndex={isFocus(item.date) ? 0 : -1}
                      data-roving={isFocus(item.date) || undefined}
                      aria-disabled={item.disabled || undefined}
                      aria-current={(kind === 'year' ? today.getFullYear() === item.date.getFullYear() : today.getFullYear() === year && today.getMonth() === item.date.getMonth()) ? 'date' : undefined}
                      className={cx('btn btn-sm ui-date-picker__period', isSel(item.date) && 'ui-date-picker__day--selected', item.disabled && 'ui-date-picker__day--disabled')}
                      onClick={() => {
                        setFocused(item.date);
                        if (kind === 'month') chooseMonth(year, item.date.getMonth());
                        else chooseYear(item.date.getFullYear());
                      }}
                    >
                      {kind === 'month' ? shortMonths[item.date.getMonth()] : item.label}
                    </button>
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  };

  const year = (panelView === 'date' ? viewMonth : focused).getFullYear();
  const startYear = year - (year % YEAR_PAGE);
  const prevLabel = panelView === 'date' ? t('previousMonth') : panelView === 'month' ? t('previousYear') : labels.previousYears;
  const nextLabel = panelView === 'date' ? t('nextMonth') : panelView === 'month' ? t('nextYear') : labels.nextYears;

  const header = (
    <div className="ui-date-picker__header">
      {panelView === 'date' && (
        <button type="button" className="btn btn-sm ui-date-picker__nav" aria-label={t('previousYear')} onClick={() => shiftView(-1, 'year')}>
          <Icon name="chevrons-left" directional />
        </button>
      )}
      <button type="button" className="btn btn-sm ui-date-picker__nav" aria-label={prevLabel} onClick={() => prevNext(-1)}>
        <Icon name="chevron-left" directional />
      </button>
      <div className="ui-date-picker__title">
        {panelView === 'date' && (
          <button type="button" className="btn btn-sm ui-date-picker__title-btn" aria-label={`${t('chooseMonth')}, ${months[viewMonth.getMonth()]}`} onClick={() => setPanelView('month')}>
            {months[viewMonth.getMonth()]}
          </button>
        )}
        {panelView !== 'year' ? (
          <button type="button" className="btn btn-sm ui-date-picker__title-btn" aria-label={`${t('chooseYear')}, ${year}`} onClick={() => setPanelView('year')}>
            {year}
          </button>
        ) : (
          <span className="ui-date-picker__title-text">
            {startYear} – {startYear + YEAR_PAGE - 1}
          </span>
        )}
      </div>
      <button type="button" className="btn btn-sm ui-date-picker__nav" aria-label={nextLabel} onClick={() => prevNext(1)}>
        <Icon name="chevron-right" directional />
      </button>
      {panelView === 'date' && (
        <button type="button" className="btn btn-sm ui-date-picker__nav" aria-label={t('nextYear')} onClick={() => shiftView(1, 'year')}>
          <Icon name="chevrons-right" directional />
        </button>
      )}
    </div>
  );

  const hours = timeSource.getHours();
  const minutes = timeSource.getMinutes();
  const timePicker = showTime && mode === 'single' && view === 'date' && (
    <div className="ui-date-picker__time">
      <TimeSpin
        label={t('hours')}
        value={hourCycle === '12' ? hours % 12 || 12 : hours}
        min={hourCycle === '12' ? 1 : 0}
        max={hourCycle === '12' ? 12 : 23}
        valueText={hourCycle === '12' ? `${hours % 12 || 12} ${hours < 12 ? labels.am : labels.pm}` : undefined}
        onChange={(h) => setTime(hourCycle === '12' ? (h % 12) + (hours >= 12 ? 12 : 0) : h, minutes)}
      />
      <span aria-hidden="true">:</span>
      <TimeSpin label={t('minutes')} value={minutes} min={0} max={59} onChange={(m) => setTime(hours, m)} />
      {hourCycle === '12' && (
        <button type="button" className="btn btn-sm btn-outline-secondary ui-date-picker__period-toggle" aria-label={`${labels.period}, ${hours < 12 ? labels.am : labels.pm}`} onClick={() => setTime((hours + 12) % 24, minutes)}>
          {hours < 12 ? labels.am : labels.pm}
        </button>
      )}
    </div>
  );

  const resolvePreset = <V,>(p: DatePreset<V>): V => (typeof p.value === 'function' ? (p.value as () => V)() : p.value);
  const presets = props.presets as DatePreset<DatePickerValue>[] | undefined;

  const calendar = (
    <div ref={calendarRef} className={cx('ui-date-picker__calendar', presets && presets.length > 0 && 'ui-date-picker__calendar--presets')}>
      {presets && presets.length > 0 && (
        <ul className="list-unstyled mb-0 ui-date-picker__presets" aria-label={labels.presets}>
          {presets.map((p) => (
            <li key={p.label}>
              <button
                type="button"
                className="btn btn-sm btn-link ui-date-picker__preset"
                onClick={() => {
                  const v = resolvePreset(p);
                  setValue(v);
                  const first = v instanceof Date ? v : Array.isArray(v) ? v[0] : null;
                  if (first) {
                    setFocused(startOfDay(first));
                    setViewMonth(startOfMonth(first));
                  }
                  if (!inline) close();
                }}
              >
                {p.label}
              </button>
            </li>
          ))}
        </ul>
      )}
      <div className="ui-date-picker__main">
        {header}
        <div className="ui-date-picker__months">
          {panelView === 'date' ? Array.from({ length: numberOfMonths }, (_, i) => renderMonth(addMonths(viewMonth, i), i)) : renderPeriodGrid(panelView)}
        </div>
        {timePicker}
        {showButtonBar && (
          <div className="ui-date-picker__buttonbar">
            <button
              type="button"
              className="btn btn-sm btn-outline-secondary"
              onClick={() => {
                const now = startOfDay(new Date());
                setFocused(now);
                setViewMonth(startOfMonth(now));
                setPanelView(view);
                if (view === 'date') selectDay(now);
                else selectPeriod(view === 'month' ? startOfMonth(now) : new Date(now.getFullYear(), 0, 1));
              }}
            >
              {t('today')}
            </button>
            <button
              type="button"
              className="btn btn-sm btn-outline-secondary"
              onClick={() => {
                setValue(mode === 'multiple' ? [] : null);
                if (!inline) close();
              }}
            >
              {t('clear')}
            </button>
          </div>
        )}
      </div>
    </div>
  );

  if (inline) {
    return (
      <div
        id={control.id}
        role="group"
        aria-label={props['aria-label'] ?? (control.labelId ? undefined : t('chooseDate'))}
        aria-labelledby={control.labelId}
        aria-describedby={control.describedBy}
        className={cx('ui-date-picker ui-date-picker--inline', disabled && 'ui-date-picker--disabled', className)}
        style={style}
        onFocus={() => (wantFocus.current = false)}
      >
        {calendar}
      </div>
    );
  }

  const setInputRef = (node: HTMLInputElement | null) => {
    inputRef.current = node;
    if (typeof ref === 'function') ref(node);
    else if (ref) (ref as { current: unknown }).current = node;
  };
  const invalid = control.invalid || textInvalid;
  const sizeClass = size === 'sm' ? 'input-group-sm' : size === 'lg' ? 'input-group-lg' : undefined;

  return (
    <div className={cx('ui-date-picker', disabled && 'ui-date-picker--disabled', className)} style={style}>
      <div ref={anchorRef} className={cx('input-group ui-date-picker__control', sizeClass, invalid && 'has-validation')}>
        <input
          ref={setInputRef}
          id={control.id}
          type="text"
          inputMode="numeric"
          autoComplete="off"
          className={cx('form-control ui-date-picker__input', invalid && 'is-invalid')}
          placeholder={placeholder}
          value={text}
          disabled={disabled}
          aria-label={props['aria-label']}
          aria-describedby={control.describedBy}
          aria-invalid={invalid || undefined}
          aria-required={control.required || undefined}
          onChange={(e) => {
            setText(e.target.value);
            if (textInvalid) setTextInvalid(false);
          }}
          onBlur={commitText}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              commitText();
            } else if (e.key === 'ArrowDown' && e.altKey) {
              e.preventDefault();
              openPopup();
            }
          }}
        />
        <button
          type="button"
          className="btn btn-outline-secondary ui-date-picker__toggle"
          aria-label={t('chooseDate')}
          aria-haspopup="dialog"
          aria-expanded={open}
          aria-controls={open ? dialogId : undefined}
          disabled={disabled}
          onClick={() => (open ? close() : openPopup())}
        >
          <Icon name="calendar" />
        </button>
      </div>
      {open && (
        <Portal>
          <div
            ref={popupRef}
            id={dialogId}
            role="dialog"
            aria-modal="true"
            aria-label={t('chooseDate')}
            className="dropdown-menu show ui-date-picker__popup"
            style={{ position: 'fixed', top: position.top, left: position.left }}
            onKeyDown={(e) => {
              if (e.key === 'Escape') {
                e.preventDefault();
                e.stopPropagation();
                close();
              }
            }}
          >
            {calendar}
          </div>
        </Portal>
      )}
    </div>
  );
}

interface TimeSpinProps {
  label: string;
  value: number;
  min: number;
  max: number;
  valueText?: string | undefined;
  onChange: (value: number) => void;
}

/** Hour / minute spinbutton (APG Spinbutton): Up/Down ±1 wrapping, PageUp/PageDown ±10, Home/End min/max, digits type. */
function TimeSpin({ label, value, min, max, valueText, onChange }: TimeSpinProps) {
  const typed = useRef({ buffer: '', timer: 0 });
  const span = max - min + 1;
  const wrap = (n: number) => ((((n - min) % span) + span) % span) + min;
  const handleKey = (event: KeyboardEvent<HTMLDivElement>) => {
    const k = event.key;
    let next: number | null = null;
    if (k === 'ArrowUp') next = wrap(value + 1);
    else if (k === 'ArrowDown') next = wrap(value - 1);
    else if (k === 'PageUp') next = wrap(value + 10);
    else if (k === 'PageDown') next = wrap(value - 10);
    else if (k === 'Home') next = min;
    else if (k === 'End') next = max;
    else if (/^\d$/.test(k)) {
      const s = typed.current;
      window.clearTimeout(s.timer);
      s.buffer = (s.buffer + k).slice(-2);
      s.timer = window.setTimeout(() => (s.buffer = ''), 1000);
      const n = Number(s.buffer);
      next = n >= min && n <= max ? n : Number(k) >= min ? Number(k) : null;
    }
    if (next === null) return;
    event.preventDefault();
    onChange(next);
  };
  return (
    <div
      role="spinbutton"
      tabIndex={0}
      aria-label={label}
      aria-valuenow={value}
      aria-valuemin={min}
      aria-valuemax={max}
      aria-valuetext={valueText}
      className="form-control form-control-sm ui-date-picker__spin"
      onKeyDown={handleKey}
    >
      {String(value).padStart(2, '0')}
    </div>
  );
}

