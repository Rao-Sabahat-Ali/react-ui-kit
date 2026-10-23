import { useRef, type ChangeEvent, type ClipboardEvent, type HTMLAttributes, type KeyboardEvent, type Ref } from 'react';
import { useControllableState } from '../../hooks/useControllableState';
import { useLocale } from '../../locale/LocaleProvider';
import { cx } from '../../utils/cx';
import type { Size } from '../../types';
import { useFieldControl } from '../Field/Field';

export interface InputOtpProps extends Omit<HTMLAttributes<HTMLDivElement>, 'defaultValue' | 'onChange' | 'dir'> {
  length?: number;
  value?: string;
  defaultValue?: string;
  onChange?: (value: string) => void;
  /** Only accept digits. */
  integerOnly?: boolean;
  /** Show dots instead of characters (PIN). */
  mask?: boolean;
  onComplete?: (code: string) => void;
  size?: Size;
  invalid?: boolean;
  disabled?: boolean;
  readOnly?: boolean;
  /** Focus the first box on mount. */
  autoFocus?: boolean;
  ref?: Ref<HTMLDivElement>;
}

export function InputOtp({
  length = 6,
  value: valueProp,
  defaultValue = '',
  onChange,
  integerOnly = true,
  mask = false,
  onComplete,
  size = 'md',
  invalid: invalidProp,
  disabled,
  readOnly,
  autoFocus,
  className,
  id: idProp,
  ref,
  ...rest
}: InputOtpProps) {
  const { t } = useLocale();
  const control = useFieldControl({ id: idProp, invalid: invalidProp, 'aria-describedby': rest['aria-describedby'] });
  const [stored, setStored] = useControllableState<string>(valueProp, defaultValue);
  const value = stored.slice(0, length);
  const boxes = useRef<(HTMLInputElement | null)[]>([]);
  const groupRef = useRef<HTMLDivElement | null>(null);

  const setRefs = (node: HTMLDivElement | null) => {
    groupRef.current = node;
    if (typeof ref === 'function') ref(node);
    else if (ref) ref.current = node;
  };

  const sanitize = (text: string) => (integerOnly ? text.replace(/\D/g, '') : text.replace(/\s/g, ''));
  const focusBox = (index: number) => boxes.current[Math.max(0, Math.min(index, length - 1))]?.focus();

  const commit = (next: string) => {
    const trimmed = next.slice(0, length);
    if (trimmed === value) return;
    setStored(trimmed);
    onChange?.(trimmed);
    if (trimmed.length === length) onComplete?.(trimmed);
  };

  /** Insert `text` at box `index` (replacing from there), returning the index to focus next. */
  const insertAt = (index: number, text: string, replaceCount: number) => {
    const at = Math.min(index, value.length);
    const next = value.slice(0, at) + text + value.slice(at + replaceCount);
    commit(next);
    focusBox(Math.min(at + text.length, length - 1));
  };

  const handleChange = (index: number, event: ChangeEvent<HTMLInputElement>) => {
    if (readOnly) return;
    const old = value[index] ?? '';
    const typed = event.target.value;
    // Typing over a filled box can yield two characters; keep the new one.
    const raw = sanitize(old && typed.length > 1 ? typed.replace(old, '') || typed : typed);
    if (raw === '') {
      if (typed === '' && old) {
        commit(value.slice(0, index) + value.slice(index + 1));
      }
      return;
    }
    insertAt(index, raw, raw.length > 1 ? value.length - Math.min(index, value.length) : old ? 1 : 0);
  };

  const handleKeyDown = (index: number, event: KeyboardEvent<HTMLInputElement>) => {
    const rtl = groupRef.current ? getComputedStyle(groupRef.current).direction === 'rtl' : false;
    switch (event.key) {
      case 'Backspace': {
        event.preventDefault();
        if (readOnly) return;
        const target = value[index] ? index : index - 1;
        if (target >= 0) commit(value.slice(0, target) + value.slice(target + 1));
        focusBox(index - 1);
        break;
      }
      case 'Delete':
        event.preventDefault();
        if (!readOnly && value[index]) commit(value.slice(0, index) + value.slice(index + 1));
        break;
      case 'ArrowLeft':
        event.preventDefault();
        focusBox(rtl ? index + 1 : index - 1);
        break;
      case 'ArrowRight':
        event.preventDefault();
        focusBox(rtl ? index - 1 : index + 1);
        break;
      case 'Home':
        event.preventDefault();
        focusBox(0);
        break;
      case 'End':
        event.preventDefault();
        focusBox(length - 1);
        break;
      default:
        // Block disallowed printable characters before they reach the box.
        if (event.key.length === 1 && !event.ctrlKey && !event.metaKey && !event.altKey && sanitize(event.key) === '') event.preventDefault();
    }
  };

  const handlePaste = (index: number, event: ClipboardEvent<HTMLInputElement>) => {
    event.preventDefault();
    if (readOnly) return;
    const text = sanitize(event.clipboardData.getData('text')).slice(0, length);
    if (!text) return;
    // A full-length code replaces everything; shorter pastes fill from the focused box.
    if (text.length === length) {
      commit(text);
      focusBox(length - 1);
    } else {
      insertAt(index, text, Math.min(text.length, Math.max(value.length - index, 0)));
    }
  };

  return (
    <div
      ref={setRefs}
      role="group"
      aria-labelledby={rest['aria-label'] ? undefined : control.labelId}
      aria-describedby={control.describedBy}
      className={cx('ui-input-otp', size === 'sm' && 'ui-input-otp--sm', size === 'lg' && 'ui-input-otp--lg', className)}
      {...rest}
    >
      {Array.from({ length }, (_, index) => (
        <input
          key={index}
          ref={(node) => {
            boxes.current[index] = node;
          }}
          id={index === 0 ? control.id : undefined}
          type={mask ? 'password' : 'text'}
          inputMode={integerOnly ? 'numeric' : 'text'}
          autoComplete={index === 0 ? 'one-time-code' : 'off'}
          autoCapitalize="off"
          autoCorrect="off"
          spellCheck={false}
          // eslint-disable-next-line jsx-a11y/no-autofocus
          autoFocus={autoFocus && index === 0}
          value={value[index] ?? ''}
          disabled={disabled}
          readOnly={readOnly}
          aria-label={t('otpDigit', { index: index + 1, total: length })}
          aria-invalid={control.invalid || undefined}
          className={cx('form-control ui-input-otp__box', control.invalid && 'is-invalid')}
          onChange={(event) => handleChange(index, event)}
          onKeyDown={(event) => handleKeyDown(index, event)}
          onPaste={(event) => handlePaste(index, event)}
          onFocus={(event) => event.currentTarget.select()}
        />
      ))}
    </div>
  );
}
