import { useEffect, useId, useRef, useState, type ClipboardEvent, type CSSProperties, type KeyboardEvent, type ReactNode, type Ref } from 'react';
import { useControllableState } from '../../hooks/useControllableState';
import { useLocale } from '../../locale/LocaleProvider';
import { cx } from '../../utils/cx';
import type { Size } from '../../types';
import { canAnimate, prefersReducedMotion } from '../../motion/env';
import { readMotionMs } from '../../motion/tokens';
import { useFlip } from '../../motion/useFlip';
import { useFieldControl } from '../Field/Field';
import { Icon } from '../Icon/Icon';

/** Local English default until a locale key exists (`invalidValue`). */

export interface ChipsProps {
  value?: string[];
  defaultValue?: string[];
  onChange?: (values: string[]) => void;
  /** Key names (`Enter`, `Tab`) or characters (`,`, `;`) that commit a chip; paste splits on them. */
  separators?: string[];
  allowDuplicate?: boolean;
  max?: number;
  /** Return `false` or an error message to reject a value. */
  validate?: (value: string) => boolean | string;
  chipTemplate?: (value: string) => ReactNode;
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

const sameList = (a: string[], b: string[]) => a.length === b.length && a.every((x, i) => x === b[i]);

interface Ghost {
  id: number;
  label: string;
  at: number;
}

interface Track {
  values: string[];
  ids: number[];
  ghosts: Ghost[];
}

const escapeRegExp = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

export function Chips({
  value: valueProp,
  defaultValue = [],
  onChange,
  separators = ['Enter', ','],
  allowDuplicate = false,
  max,
  validate,
  chipTemplate,
  placeholder,
  size = 'md',
  disabled = false,
  className,
  style,
  ref,
  ...props
}: ChipsProps) {
  const { t } = useLocale();
  const errorId = useId();
  const [value, setValue] = useControllableState<string[]>(valueProp, defaultValue, onChange);
  const [text, setText] = useState('');
  const [error, setError] = useState<string | null>(null);
  const control = useFieldControl({
    id: props.id,
    invalid: props.invalid || Boolean(error) || undefined,
    required: props.required,
    'aria-describedby': [props['aria-describedby'], error ? errorId : undefined].filter(Boolean).join(' ') || undefined,
  });
  const inputRef = useRef<HTMLInputElement | null>(null);
  const listRef = useRef<HTMLUListElement | null>(null);
  const controlRef = useRef<HTMLDivElement | null>(null);
  const nextId = useRef(0);
  const initialCount = useRef(value.length);
  const [track, setTrack] = useState<Track>(() => ({ values: value, ids: value.map(() => nextId.current++), ghosts: [] }));
  // Stable identity per chip so FLIP and the enter/leave animations follow the chip, not its index (derived state).
  if (!sameList(track.values, value)) {
    const prev = track.values;
    let start = 0;
    while (start < prev.length && start < value.length && prev[start] === value[start]) start++;
    let endPrev = prev.length;
    let endNext = value.length;
    while (endPrev > start && endNext > start && prev[endPrev - 1] === value[endNext - 1]) {
      endPrev--;
      endNext--;
    }
    const ids = [...track.ids.slice(0, start), ...value.slice(start, endNext).map(() => nextId.current++), ...track.ids.slice(endPrev)];
    const leaving: Ghost[] = canAnimate() && !prefersReducedMotion() ? prev.slice(start, endPrev).map((label, k) => ({ id: track.ids[start + k]!, label, at: start })) : [];
    setTrack({ values: value, ids, ghosts: [...track.ghosts, ...leaving] });
  }
  useEffect(() => {
    if (track.ghosts.length === 0) return;
    const ms = Math.round(readMotionMs(controlRef.current, 'part') * 0.7);
    const timer = window.setTimeout(() => setTrack((t) => ({ ...t, ghosts: [] })), ms);
    return () => window.clearTimeout(timer);
  }, [track.ghosts]);
  // Neighbours slide into the gap (transform only).
  useFlip(controlRef, [track.ids, track.ghosts], { selector: '.ui-chips__chip', duration: readMotionMs(typeof document === 'undefined' ? null : document.documentElement, 'part') });
  const full = max !== undefined && value.length >= max;
  const charSeparators = separators.filter((s) => s.length === 1);

  /** Try to add raw values; returns the list after adding and the first rejection message. */
  const add = (raw: string[]): boolean => {
    let next = [...value];
    let rejection: string | null = null;
    let rejected = false;
    for (const item of raw) {
      const v = item.trim();
      if (!v) continue;
      if (max !== undefined && next.length >= max) {
        rejected = true;
        break;
      }
      if (!allowDuplicate && next.includes(v)) {
        rejected = true;
        continue;
      }
      const result = validate?.(v) ?? true;
      if (result !== true) {
        rejected = true;
        rejection ??= typeof result === 'string' ? result : t('invalidValue');
        continue;
      }
      next = [...next, v];
    }
    setError(rejection);
    if (next.length !== value.length) setValue(next);
    return !rejected;
  };

  const commitText = () => {
    if (!text.trim()) {
      setText('');
      return;
    }
    if (add([text])) setText('');
  };

  const focusChip = (index: number) => {
    const buttons = listRef.current?.querySelectorAll<HTMLButtonElement>('.ui-chips__remove');
    if (!buttons || buttons.length === 0) return inputRef.current?.focus();
    if (index < 0 || index >= buttons.length) return inputRef.current?.focus();
    buttons[index]?.focus();
  };

  const remove = (index: number, focus: 'input' | 'previous') => {
    setValue(value.filter((_, i) => i !== index));
    setError(null);
    if (focus === 'input' || value.length <= 1) inputRef.current?.focus();
    else requestAnimationFrame(() => focusChip(Math.max(0, index - 1)));
  };

  const handleInputKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (separators.includes(event.key)) {
      if (event.key === 'Tab' && !text.trim()) return;
      event.preventDefault();
      if (!full) commitText();
      return;
    }
    const caretAtStart = event.currentTarget.selectionStart === 0 && event.currentTarget.selectionEnd === 0;
    if (event.key === 'Backspace' && text === '' && value.length > 0) {
      event.preventDefault();
      focusChip(value.length - 1);
    } else if (event.key === 'ArrowLeft' && caretAtStart && value.length > 0 && getComputedStyle(event.currentTarget).direction !== 'rtl') {
      event.preventDefault();
      focusChip(value.length - 1);
    }
  };

  const handleChipKeyDown = (event: KeyboardEvent<HTMLButtonElement>, index: number) => {
    const rtl = getComputedStyle(event.currentTarget).direction === 'rtl';
    const prev = rtl ? 'ArrowRight' : 'ArrowLeft';
    const next = rtl ? 'ArrowLeft' : 'ArrowRight';
    if (event.key === prev) {
      event.preventDefault();
      focusChip(Math.max(0, index - 1));
    } else if (event.key === next) {
      event.preventDefault();
      focusChip(index + 1);
    } else if (event.key === 'Delete' || event.key === 'Backspace') {
      event.preventDefault();
      remove(index, 'previous');
    } else if (event.key === 'Home') {
      event.preventDefault();
      focusChip(0);
    } else if (event.key === 'End') {
      event.preventDefault();
      inputRef.current?.focus();
    }
  };

  const handlePaste = (event: ClipboardEvent<HTMLInputElement>) => {
    const pasted = event.clipboardData.getData('text');
    const splitters = [...charSeparators, ...(separators.includes('Enter') ? ['\n', '\r'] : [])];
    if (splitters.length === 0) return;
    const pattern = new RegExp(splitters.map(escapeRegExp).join('|'));
    if (!pattern.test(pasted)) return;
    event.preventDefault();
    if (full) return;
    add((text + pasted).split(pattern));
    setText('');
  };

  const setInputRef = (node: HTMLInputElement | null) => {
    inputRef.current = node;
    if (typeof ref === 'function') ref(node);
    else if (ref) (ref as { current: unknown }).current = node;
  };

  const sizeClass = size === 'sm' ? 'form-control-sm' : size === 'lg' ? 'form-control-lg' : undefined;

  const renderChip = (chip: string, index: number) => {
    const id = track.ids[index] ?? index;
    return (
      <li key={`c-${id}`} className={cx('ui-chips__chip', id >= initialCount.current && 'ui-chips__chip--enter')}>
        <span className="ui-chips__label">{chipTemplate ? chipTemplate(chip) : chip}</span>
        {!disabled && (
          <button
            type="button"
            tabIndex={-1}
            className="ui-chips__remove"
            aria-label={t('removeChip', { label: chip })}
            onClick={() => remove(index, 'input')}
            onKeyDown={(e) => handleChipKeyDown(e, index)}
          >
            <Icon name="x" />
          </button>
        )}
      </li>
    );
  };

  return (
    <div className={cx('ui-chips', disabled && 'ui-chips--disabled', className)} style={style}>
      {/* Pointer convenience; keyboard handled by the focused control (aria-activedescendant / roving focus, covered by AC tests). */}
      {/* eslint-disable-next-line jsx-a11y/click-events-have-key-events, jsx-a11y/no-static-element-interactions */}
      <div
        ref={controlRef}
        className={cx('form-control ui-chips__control', sizeClass, control.invalid && 'is-invalid', disabled && 'disabled')}
        onClick={(e) => {
          if (e.target === e.currentTarget) inputRef.current?.focus();
        }}
      >
        {(value.length > 0 || track.ghosts.length > 0) && (
          <ul ref={listRef} className="list-unstyled mb-0 ui-chips__list">
            {Array.from({ length: value.length + 1 }, (_, position) => position).flatMap((position) => [
              ...track.ghosts
                .filter((g) => Math.min(g.at, value.length) === position)
                .map((g) => (
                  <li key={`g-${g.id}`} className="ui-chips__chip ui-chips__chip--leaving" aria-hidden="true" data-state="closed">
                    <span className="ui-chips__label">{g.label}</span>
                  </li>
                )),
              ...(position < value.length ? [renderChip(value[position]!, position)] : []),
            ])}
          </ul>
        )}
        <input
          ref={setInputRef}
          id={control.id}
          type="text"
          className="ui-chips__input"
          value={text}
          placeholder={full ? undefined : placeholder}
          disabled={disabled}
          readOnly={full}
          aria-label={props['aria-label']}
          aria-describedby={control.describedBy}
          aria-invalid={control.invalid || undefined}
          aria-required={control.required || undefined}
          onChange={(e) => {
            if (full) return;
            setError(null);
            const next = e.target.value;
            const last = next.slice(-1);
            if (charSeparators.includes(last)) {
              if (add([next.slice(0, -1)])) setText('');
              else setText(next.slice(0, -1));
            } else setText(next);
          }}
          onKeyDown={handleInputKeyDown}
          onPaste={handlePaste}
        />
      </div>
      {error && (
        <div id={errorId} className="invalid-feedback d-block ui-chips__error">
          {error}
        </div>
      )}
    </div>
  );
}
