import { useLayoutEffect, useMemo, useRef, useState, type ChangeEvent, type FocusEvent, type InputHTMLAttributes, type Ref } from 'react';
import { useControllableState } from '../../hooks/useControllableState';
import { applyMask, compileMask } from '../../utils/mask';
import { cx } from '../../utils/cx';
import type { Size } from '../../types';
import { useFieldControl } from '../Field/Field';

export interface InputMaskProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'value' | 'defaultValue' | 'onChange' | 'size' | 'type'> {
  /** `9` digit, `a` letter, `*` alphanumeric, `?` makes the rest optional, anything else is a literal. */
  mask: string;
  slotChar?: string;
  value?: string;
  defaultValue?: string;
  onChange?: (value: string, event?: ChangeEvent<HTMLInputElement>) => void;
  /** Emit the raw value without literals. */
  unmask?: boolean;
  /** Clear an incomplete value on blur. */
  autoClear?: boolean;
  onComplete?: (value: string) => void;
  size?: Size;
  invalid?: boolean;
  ref?: Ref<HTMLInputElement>;
}

interface InputChange {
  start: number;
  removedEnd: number;
  inserted: string;
}

/** Work out what the user changed using the caret as the anchor (resolves repeated characters). */
function diffChange(prev: string, next: string, caret: number): InputChange {
  const suffixLength = Math.min(Math.max(next.length - caret, 0), prev.length);
  const removedEnd = prev.length - suffixLength;
  let prefix = 0;
  const max = Math.min(prev.length, next.length);
  while (prefix < max && prev[prefix] === next[prefix]) prefix++;
  const start = Math.min(prefix, removedEnd);
  return { start, removedEnd, inserted: next.slice(start, Math.max(caret, start)) };
}

export function InputMask({
  mask,
  slotChar = '_',
  value: valueProp,
  defaultValue = '',
  onChange,
  unmask = false,
  autoClear = true,
  onComplete,
  size = 'md',
  invalid: invalidProp,
  className,
  id: idProp,
  required: requiredProp,
  onFocus,
  onBlur,
  ref,
  ...rest
}: InputMaskProps) {
  const control = useFieldControl({ id: idProp, invalid: invalidProp, required: requiredProp, 'aria-describedby': rest['aria-describedby'] });
  const slots = useMemo(() => compileMask(mask), [mask]);
  const slotIndexes = useMemo(() => slots.flatMap((slot, i) => (slot.test ? [i] : [])), [slots]);
  const [value, setValue] = useControllableState<string>(valueProp, defaultValue);
  const [focused, setFocused] = useState(false);
  const [, setTick] = useState(0);
  const innerRef = useRef<HTMLInputElement | null>(null);
  const pendingCaret = useRef<number | null>(null);

  const setRefs = (node: HTMLInputElement | null) => {
    innerRef.current = node;
    if (typeof ref === 'function') ref(node);
    else if (ref) ref.current = node;
  };

  const current = applyMask(value, slots, slotChar);
  const displayed = focused || current.raw ? current.masked : '';

  /** Caret index just after the k-th filled slot (or at the first slot for k = 0). */
  const caretFor = (k: number) => (k <= 0 ? (slotIndexes[0] ?? 0) : (slotIndexes[Math.min(k, slotIndexes.length) - 1] ?? 0) + 1);

  useLayoutEffect(() => {
    const el = innerRef.current;
    const caret = pendingCaret.current;
    if (!el || caret === null) return;
    pendingCaret.current = null;
    if (document.activeElement === el) el.setSelectionRange(caret, caret);
  });

  const emitFor = (raw: string) => {
    const result = applyMask(raw, slots, slotChar);
    return { result, text: unmask ? result.raw : result.masked.slice(0, result.filled) };
  };

  const commit = (raw: string, event?: ChangeEvent<HTMLInputElement>) => {
    const { result, text } = emitFor(raw);
    if (text !== value) {
      setValue(text);
      onChange?.(text, event);
      if (result.complete && result.raw.length > 0) onComplete?.(text);
    }
    return result;
  };

  const handleChange = (event: ChangeEvent<HTMLInputElement>) => {
    const el = event.target;
    const { start, removedEnd, inserted } = diffChange(displayed, el.value, el.selectionStart ?? el.value.length);
    const raw = current.raw;
    const countSlots = (end: number) => slotIndexes.filter((i) => i < end).length;
    const head = Math.min(countSlots(start), raw.length);
    let tailFrom = Math.min(countSlots(removedEnd), raw.length);
    let headRaw = raw.slice(0, head);
    let caretK: number;

    const inputType = (event.nativeEvent as InputEvent).inputType;
    if (inserted === '' && tailFrom === head && start !== removedEnd) {
      // Only literals were deleted: remove the neighbouring slot character instead (never the literal).
      const before = slotIndexes.filter((i) => i < start).length - 1;
      const after = slotIndexes.filter((i) => i < removedEnd).length;
      const target = inputType === 'deleteContentForward' ? after : before;
      if (target >= 0 && target < raw.length) {
        headRaw = raw.slice(0, target);
        tailFrom = target + 1;
        caretK = target;
      } else {
        caretK = head;
      }
    } else {
      const accepted = Math.max(0, applyMask(headRaw + inserted, slots, slotChar).raw.length - headRaw.length);
      headRaw += inserted;
      caretK = head + accepted;
    }

    const next = headRaw + raw.slice(tailFrom);
    commit(next, event);
    pendingCaret.current = caretFor(Math.min(caretK, applyMask(next, slots, slotChar).raw.length));
    setTick((t) => t + 1);
  };

  const handleFocus = (event: FocusEvent<HTMLInputElement>) => {
    setFocused(true);
    // Empty field: park the caret on the first slot. Otherwise leave the user's caret alone.
    if (current.raw.length === 0) pendingCaret.current = caretFor(0);
    onFocus?.(event);
  };

  const handleBlur = (event: FocusEvent<HTMLInputElement>) => {
    setFocused(false);
    if (autoClear && current.raw.length > 0 && !current.complete) {
      setValue('');
      onChange?.('');
    }
    onBlur?.(event);
  };

  const numeric = !/[a*]/.test(mask);

  return (
    <input
      ref={setRefs}
      id={control.id}
      type="text"
      inputMode={numeric ? 'numeric' : undefined}
      autoComplete="off"
      value={displayed}
      onChange={handleChange}
      onFocus={handleFocus}
      onBlur={handleBlur}
      required={control.required || undefined}
      aria-invalid={control.invalid || undefined}
      {...rest}
      aria-describedby={control.describedBy}
      className={cx('form-control ui-input-mask', size === 'sm' && 'form-control-sm', size === 'lg' && 'form-control-lg', control.invalid && 'is-invalid', className)}
    />
  );
}
