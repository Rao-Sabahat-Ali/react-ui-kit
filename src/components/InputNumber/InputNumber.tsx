import { useEffect, useMemo, useRef, useState, type ChangeEvent, type InputHTMLAttributes, type KeyboardEvent, type Ref } from 'react';
import { useControllableState } from '../../hooks/useControllableState';
import { useLocale } from '../../locale/LocaleProvider';
import { clamp, parseNumber, roundToStep } from '../../utils/number';
import { cx } from '../../utils/cx';
import type { Size } from '../../types';
import { useFieldControl } from '../Field/Field';
import { Icon } from '../Icon/Icon';

export interface InputNumberProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'value' | 'defaultValue' | 'onChange' | 'size' | 'type' | 'min' | 'max' | 'step'> {
  value?: number | null;
  defaultValue?: number | null;
  /** Fires on blur/commit and stepping; `onValueInput` fires on each keystroke. */
  onChange?: (value: number | null) => void;
  onValueInput?: (value: number | null) => void;
  min?: number;
  max?: number;
  step?: number;
  mode?: 'decimal' | 'currency' | 'percent';
  /** ISO 4217 code, required for currency mode. */
  currency?: string;
  minFractionDigits?: number;
  maxFractionDigits?: number;
  useGrouping?: boolean;
  showButtons?: boolean;
  buttonLayout?: 'stacked' | 'horizontal';
  allowEmpty?: boolean;
  size?: Size;
  invalid?: boolean;
  ref?: Ref<HTMLInputElement>;
}

const REPEAT_DELAY = 400;
const REPEAT_INTERVAL = 60;

export function InputNumber({
  value: valueProp,
  defaultValue = null,
  onChange,
  onValueInput,
  min,
  max,
  step = 1,
  mode = 'decimal',
  currency,
  minFractionDigits,
  maxFractionDigits,
  useGrouping = true,
  showButtons = false,
  buttonLayout = 'stacked',
  allowEmpty = true,
  size = 'md',
  invalid: invalidProp,
  className,
  id: idProp,
  required: requiredProp,
  disabled,
  readOnly,
  ref,
  onBlur,
  onFocus,
  onKeyDown,
  ...rest
}: InputNumberProps) {
  const { t, locale } = useLocale();
  const control = useFieldControl({ id: idProp, invalid: invalidProp, required: requiredProp, 'aria-describedby': rest['aria-describedby'] });
  const [value, setValue] = useControllableState<number | null>(valueProp, defaultValue);
  const [draft, setDraft] = useState<string | null>(null);

  const formatter = useMemo(() => {
    const style = mode === 'currency' && currency ? 'currency' : mode === 'percent' ? 'percent' : 'decimal';
    const options: Intl.NumberFormatOptions = { style, useGrouping };
    if (style === 'currency') options.currency = currency!;
    if (minFractionDigits !== undefined || maxFractionDigits !== undefined) {
      options.minimumFractionDigits = minFractionDigits ?? 0;
      options.maximumFractionDigits = Math.max(maxFractionDigits ?? minFractionDigits ?? 0, minFractionDigits ?? 0);
    }
    return new Intl.NumberFormat(locale, options);
  }, [locale, mode, currency, useGrouping, minFractionDigits, maxFractionDigits]);

  const format = (n: number | null) => (n === null ? '' : formatter.format(n));
  const parse = (text: string): number | null => {
    const n = parseNumber(text, locale);
    if (n === null) return null;
    return mode === 'percent' ? Number((n / 100).toPrecision(12)) : n;
  };
  const constrain = (n: number) => clamp(n, min, max);

  const valueRef = useRef(value);
  valueRef.current = value;
  const innerRef = useRef<HTMLInputElement | null>(null);
  const setRefs = (node: HTMLInputElement | null) => {
    innerRef.current = node;
    if (typeof ref === 'function') ref(node);
    else if (ref) ref.current = node;
  };

  const commit = (next: number | null) => {
    if (next === null && !allowEmpty) return;
    const changed = next !== valueRef.current;
    valueRef.current = next;
    if (changed) {
      setValue(next);
      onChange?.(next);
    }
  };

  const stepBy = (direction: 1 | -1, multiplier = 1) => {
    if (disabled || readOnly) return;
    const current = draft !== null ? parse(draft) ?? valueRef.current : valueRef.current;
    const base = current ?? (direction === 1 ? min ?? 0 : max ?? 0);
    const next = constrain(roundToStep(base + direction * step * multiplier, step));
    setDraft(null);
    commit(next);
  };

  const handleInput = (event: ChangeEvent<HTMLInputElement>) => {
    setDraft(event.target.value);
    onValueInput?.(parse(event.target.value));
  };

  const handleBlur: InputNumberProps['onBlur'] = (event) => {
    if (draft !== null) {
      const parsed = parse(draft);
      if (parsed === null) commit(draft.trim() === '' ? null : valueRef.current);
      else commit(constrain(parsed));
      setDraft(null);
    }
    onBlur?.(event);
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    onKeyDown?.(event);
    if (event.defaultPrevented || readOnly) return;
    if (event.key === 'ArrowUp' || event.key === 'ArrowDown') {
      event.preventDefault();
      stepBy(event.key === 'ArrowUp' ? 1 : -1, event.shiftKey ? 10 : 1);
    } else if (event.key === 'Home' && min !== undefined) {
      event.preventDefault();
      setDraft(null);
      commit(min);
    } else if (event.key === 'End' && max !== undefined) {
      event.preventDefault();
      setDraft(null);
      commit(max);
    } else if (event.key === 'Enter' && draft !== null) {
      const parsed = parse(draft);
      setDraft(null);
      commit(parsed === null ? (draft.trim() === '' ? null : valueRef.current) : constrain(parsed));
    }
  };

  // Press-and-hold repeat for the stepper buttons.
  const timers = useRef<{ delay?: ReturnType<typeof setTimeout>; interval?: ReturnType<typeof setInterval> }>({});
  const pointerHandled = useRef(false);
  const stepRef = useRef(stepBy);
  stepRef.current = stepBy;
  const stopRepeat = () => {
    clearTimeout(timers.current.delay);
    clearInterval(timers.current.interval);
    timers.current = {};
  };
  useEffect(() => stopRepeat, []);
  const startRepeat = (direction: 1 | -1) => {
    pointerHandled.current = true;
    stepRef.current(direction);
    stopRepeat();
    timers.current.delay = setTimeout(() => {
      timers.current.interval = setInterval(() => stepRef.current(direction), REPEAT_INTERVAL);
    }, REPEAT_DELAY);
  };

  const stepButton = (direction: 1 | -1) => {
    const atLimit = direction === 1 ? max !== undefined && value !== null && value >= max : min !== undefined && value !== null && value <= min;
    return (
      <button
        type="button"
        tabIndex={-1}
        className={cx('btn ui-input-number__button', direction === 1 ? 'ui-input-number__button--up' : 'ui-input-number__button--down')}
        aria-label={direction === 1 ? t('increment') : t('decrement')}
        disabled={disabled || readOnly || atLimit}
        onPointerDown={(event) => {
          if (event.button !== 0) return;
          event.preventDefault();
          innerRef.current?.focus({ preventScroll: true });
          startRepeat(direction);
        }}
        onPointerUp={stopRepeat}
        onPointerLeave={stopRepeat}
        onPointerCancel={stopRepeat}
        onClick={() => {
          // Pointer presses already stepped; this handles keyboard / assistive activation.
          if (pointerHandled.current) pointerHandled.current = false;
          else stepBy(direction);
        }}
      >
        <Icon name={direction === 1 ? 'chevron-up' : 'chevron-down'} size="sm" />
      </button>
    );
  };

  const text = draft ?? format(value);
  const input = (
    <input
      ref={setRefs}
      id={control.id}
      type="text"
      inputMode={maxFractionDigits === 0 ? 'numeric' : 'decimal'}
      role="spinbutton"
      autoComplete="off"
      value={text}
      disabled={disabled}
      readOnly={readOnly}
      required={control.required || undefined}
      aria-invalid={control.invalid || undefined}
      aria-valuenow={value ?? undefined}
      aria-valuemin={min}
      aria-valuemax={max}
      aria-valuetext={value === null ? undefined : format(value)}
      onChange={handleInput}
      onBlur={handleBlur}
      onFocus={onFocus}
      onKeyDown={handleKeyDown}
      {...rest}
      aria-describedby={control.describedBy}
      className={cx('form-control ui-input-number__input', size === 'sm' && 'form-control-sm', size === 'lg' && 'form-control-lg', control.invalid && 'is-invalid')}
    />
  );

  if (!showButtons) return <div className={cx('ui-input-number', className)}>{input}</div>;

  const groupClasses = cx('input-group ui-input-number ui-input-number__group', `ui-input-number--${buttonLayout}`, size === 'sm' && 'input-group-sm', size === 'lg' && 'input-group-lg', control.invalid && 'has-validation', className);

  if (buttonLayout === 'horizontal') {
    return (
      <div className={groupClasses}>
        {stepButton(-1)}
        {input}
        {stepButton(1)}
      </div>
    );
  }
  return (
    <div className={groupClasses}>
      {input}
      <span className="ui-input-number__stack">
        {stepButton(1)}
        {stepButton(-1)}
      </span>
    </div>
  );
}
