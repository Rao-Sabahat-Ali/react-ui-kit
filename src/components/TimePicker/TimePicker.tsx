import { useEffect, useMemo, useRef, type HTMLAttributes, type KeyboardEvent, type Ref } from 'react';
import { useControllableState } from '../../hooks/useControllableState';
import { useLocale } from '../../locale/LocaleProvider';
import type { MessageKey } from '../../locale/en';
import { cx } from '../../utils/cx';
import type { Size } from '../../types';
import { useFieldControl } from '../Field/Field';

export interface TimePickerProps extends Omit<HTMLAttributes<HTMLDivElement>, 'onChange' | 'defaultValue'> {
  /** `'HH:mm'` (or `'HH:mm:ss'` with `showSeconds`), always 24-hour. `null` = empty. */
  value?: string | null;
  defaultValue?: string | null;
  onChange?: (value: string | null) => void;
  /** Display only; the value stays 24-hour. Defaults to the locale's cycle. */
  hourFormat?: '12' | '24';
  showSeconds?: boolean;
  /** Minute (and second) increment for arrow keys. */
  step?: number;
  /** `'HH:mm'` bounds. */
  min?: string;
  max?: string;
  /** Renders a hidden input carrying the value for native forms. */
  name?: string;
  size?: Size;
  invalid?: boolean;
  disabled?: boolean;
  readOnly?: boolean;
  locale?: string;
  ref?: Ref<HTMLDivElement>;
}

type SegmentKind = 'hours' | 'minutes' | 'seconds' | 'period';
interface Parts {
  h: number | null;
  m: number | null;
  s: number | null;
}

const pad = (n: number) => String(n).padStart(2, '0');

/** Parses `'HH:mm'` / `'HH:mm:ss'` into total seconds; `null` for anything else. */
function toSeconds(text: string | null | undefined): number | null {
  if (!text) return null;
  const match = /^(\d{1,2}):(\d{2})(?::(\d{2}))?$/.exec(text.trim());
  if (!match) return null;
  const h = Number(match[1]);
  const m = Number(match[2]);
  const s = Number(match[3] ?? 0);
  return h > 23 || m > 59 || s > 59 ? null : h * 3600 + m * 60 + s;
}

function toParts(text: string | null | undefined): Parts {
  const total = toSeconds(text);
  if (total === null) return { h: null, m: null, s: null };
  return { h: Math.floor(total / 3600), m: Math.floor((total % 3600) / 60), s: total % 60 };
}

function format(parts: Parts, showSeconds: boolean): string {
  const base = `${pad(parts.h ?? 0)}:${pad(parts.m ?? 0)}`;
  return showSeconds ? `${base}:${pad(parts.s ?? 0)}` : base;
}

function useHourCycle(locale: string, hourFormat: '12' | '24' | undefined): '12' | '24' {
  return useMemo(() => {
    if (hourFormat) return hourFormat;
    try {
      const cycle = new Intl.DateTimeFormat(locale, { hour: 'numeric' }).resolvedOptions().hourCycle;
      return cycle === 'h11' || cycle === 'h12' ? '12' : '24';
    } catch {
      return '24';
    }
  }, [locale, hourFormat]);
}

export function TimePicker({
  value: valueProp,
  defaultValue = null,
  onChange,
  hourFormat,
  showSeconds = false,
  step = 1,
  min,
  max,
  name,
  size = 'md',
  invalid: invalidProp,
  disabled = false,
  readOnly = false,
  locale: localeProp,
  id: idProp,
  className,
  ref,
  'aria-label': ariaLabel,
  'aria-labelledby': ariaLabelledBy,
  'aria-describedby': ariaDescribedBy,
  ...rest
}: TimePickerProps) {
  const { t, locale: contextLocale, dir } = useLocale();
  const locale = localeProp ?? contextLocale;
  const control = useFieldControl({ id: idProp, invalid: invalidProp, 'aria-describedby': ariaDescribedBy });
  const [value, setValue] = useControllableState<string | null>(valueProp, defaultValue, onChange);
  const cycle = useHourCycle(locale, hourFormat);
  const is12 = cycle === '12';
  const parts = toParts(value);
  const root = useRef<HTMLDivElement | null>(null);
  const typed = useRef({ buffer: '', timer: 0 });
  // A segment is not a labelable element, so forward clicks on the Field label to the hours segment.
  const labelId = control.labelId;
  useEffect(() => {
    const label = labelId ? document.getElementById(labelId) : null;
    if (!label || disabled) return;
    const focusHours = () => root.current?.querySelector<HTMLElement>('[role="spinbutton"]')?.focus();
    label.addEventListener('click', focusHours);
    return () => label.removeEventListener('click', focusHours);
  }, [labelId, disabled]);
  const interactive = !disabled && !readOnly;

  const minSeconds = toSeconds(min) ?? 0;
  const maxSeconds = toSeconds(max) ?? 23 * 3600 + 59 * 60 + 59;
  const isRtl = () => (root.current?.closest('[dir]')?.getAttribute('dir') ?? dir) === 'rtl';

  const commit = (next: Parts) => {
    const filled: Parts = { h: next.h ?? 0, m: next.m ?? 0, s: next.s ?? 0 };
    let total = filled.h! * 3600 + filled.m! * 60 + filled.s!;
    total = Math.min(Math.max(total, minSeconds), maxSeconds);
    const clamped = toParts(`${pad(Math.floor(total / 3600))}:${pad(Math.floor((total % 3600) / 60))}:${pad(total % 60)}`);
    const text = format(clamped, showSeconds);
    if (text !== value) setValue(text);
  };

  const wrap = (n: number, lo: number, hi: number) => {
    const span = hi - lo + 1;
    return ((((n - lo) % span) + span) % span) + lo;
  };

  const segments: SegmentKind[] = ['hours', 'minutes', ...(showSeconds ? (['seconds'] as const) : []), ...(is12 ? (['period'] as const) : [])];

  const focusSegment = (from: HTMLElement, delta: number) => {
    const nodes = Array.from(root.current?.querySelectorAll<HTMLElement>('[role="spinbutton"]') ?? []);
    const index = nodes.indexOf(from);
    nodes[index + delta]?.focus();
  };

  /** Display value of the hour segment in the current cycle. */
  const displayHour = (h24: number) => (is12 ? h24 % 12 || 12 : h24);
  const periodOf = (h24: number | null) => ((h24 ?? 0) >= 12 ? 1 : 0);

  /** Applies a new segment value (display units) to the current parts. */
  const setSegment = (kind: SegmentKind, display: number): Parts => {
    const next: Parts = { ...parts };
    if (kind === 'hours') {
      const period = periodOf(parts.h);
      next.h = is12 ? (display % 12) + period * 12 : display;
    } else if (kind === 'minutes') next.m = display;
    else if (kind === 'seconds') next.s = display;
    else next.h = ((parts.h ?? 0) % 12) + display * 12;
    return next;
  };

  const range = (kind: SegmentKind): [number, number] => {
    if (kind === 'hours') return is12 ? [1, 12] : [0, 23];
    if (kind === 'period') return [0, 1];
    return [0, 59];
  };

  const current = (kind: SegmentKind): number | null => {
    if (kind === 'hours') return parts.h === null ? null : displayHour(parts.h);
    if (kind === 'minutes') return parts.m;
    if (kind === 'seconds') return parts.s;
    return parts.h === null ? null : periodOf(parts.h);
  };

  const handleKey = (kind: SegmentKind) => (event: KeyboardEvent<HTMLDivElement>) => {
    if (!interactive) return;
    const key = event.key;
    if (event.altKey || event.ctrlKey || event.metaKey) return;
    const [lo, hi] = range(kind);
    const cur = current(kind);
    const small = kind === 'minutes' || kind === 'seconds' ? Math.max(1, step) : 1;
    const big = kind === 'hours' ? 6 : 10;

    if (key === 'ArrowLeft' || key === 'ArrowRight') {
      event.preventDefault();
      const forward = (key === 'ArrowRight') !== isRtl();
      focusSegment(event.currentTarget, forward ? 1 : -1);
      return;
    }
    if (key === 'Backspace' || key === 'Delete') {
      event.preventDefault();
      if (value !== null) setValue(null);
      return;
    }

    let next: number | null = null;
    if (key === 'ArrowUp' || key === 'ArrowDown') {
      const dirSign = key === 'ArrowUp' ? 1 : -1;
      if (kind === 'period') next = cur === null ? (dirSign === 1 ? lo : hi) : 1 - cur;
      else next = cur === null ? (dirSign === 1 ? lo : hi) : wrap(cur + dirSign * small, lo, hi);
    } else if (key === 'PageUp' || key === 'PageDown') {
      if (kind === 'period') next = cur === null ? lo : 1 - cur;
      else next = cur === null ? lo : wrap(cur + (key === 'PageUp' ? big : -big), lo, hi);
    } else if (key === 'Home') next = lo;
    else if (key === 'End') next = hi;
    else if (kind === 'period' && /^[apAP]$/.test(key)) next = key.toLowerCase() === 'a' ? 0 : 1;
    else if (kind !== 'period' && /^\d$/.test(key)) {
      event.preventDefault();
      const s = typed.current;
      window.clearTimeout(s.timer);
      const candidate = s.buffer + key;
      const n = Number(candidate);
      const useBuffer = candidate.length <= 2 && n >= lo && n <= hi;
      const digit = Number(key);
      s.buffer = useBuffer ? candidate : '';
      const entered = useBuffer ? n : digit >= lo && digit <= hi ? digit : null;
      if (entered === null) return;
      if (!useBuffer) s.buffer = String(entered);
      s.timer = window.setTimeout(() => (s.buffer = ''), 1500);
      commit(setSegment(kind, entered));
      // Complete when no further digit could keep the number in range.
      if (s.buffer.length >= 2 || entered * 10 > hi) {
        s.buffer = '';
        focusSegment(event.currentTarget, 1);
      }
      return;
    }
    if (next === null) return;
    event.preventDefault();
    typed.current.buffer = '';
    commit(setSegment(kind, next));
  };

  const labels: Record<SegmentKind, MessageKey> = { hours: 'hours', minutes: 'minutes', seconds: 'seconds', period: 'amPm' };
  const groupName = ariaLabel === undefined && ariaLabelledBy === undefined ? control.labelId : ariaLabelledBy;

  return (
    <div
      ref={(node) => {
        root.current = node;
        if (typeof ref === 'function') ref(node);
        else if (ref) ref.current = node;
      }}
      role="group"
      aria-label={ariaLabel}
      aria-labelledby={groupName}
      aria-describedby={control.describedBy}
      className={cx(
        'form-control ui-time-picker',
        size !== 'md' && `ui-time-picker--${size}`,
        control.invalid && 'is-invalid ui-time-picker--invalid',
        disabled && 'ui-time-picker--disabled',
        readOnly && 'ui-time-picker--readonly',
        className,
      )}
      {...rest}
    >
      {segments.map((kind, index) => {
        const cur = current(kind);
        const [lo, hi] = range(kind);
        const empty = cur === null;
        const text = empty ? '––' : kind === 'period' ? t(cur === 0 ? 'am' : 'pm') : kind === 'hours' && !is12 ? pad(cur) : kind === 'hours' ? String(cur) : pad(cur);
        const valueText = empty ? t('emptyValue') : kind === 'period' ? t(cur === 0 ? 'am' : 'pm') : text;
        return (
          <span key={kind} className="ui-time-picker__part">
            {index > 0 && kind !== 'period' && (
              <span className="ui-time-picker__separator" aria-hidden="true">
                :
              </span>
            )}
            <span
              role="spinbutton"
              id={index === 0 ? control.id : undefined}
              tabIndex={disabled ? -1 : 0}
              aria-label={t(labels[kind])}
              aria-valuemin={lo}
              aria-valuemax={hi}
              aria-valuenow={empty ? undefined : cur}
              aria-valuetext={valueText}
              aria-invalid={control.invalid || undefined}
              aria-disabled={disabled || undefined}
              aria-readonly={readOnly || undefined}
              className={cx('ui-time-picker__segment', kind === 'period' && 'ui-time-picker__segment--period', empty && 'ui-time-picker__segment--empty')}
              onKeyDown={handleKey(kind)}
              onBlur={() => (typed.current.buffer = '')}
            >
              {text}
            </span>
          </span>
        );
      })}
      {name && <input type="hidden" name={name} value={value ?? ''} disabled={disabled} />}
    </div>
  );
}
