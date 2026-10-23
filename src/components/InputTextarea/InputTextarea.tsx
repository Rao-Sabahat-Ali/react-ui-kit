import { useId, useLayoutEffect, useRef, type ChangeEvent, type Ref, type TextareaHTMLAttributes } from 'react';
import { useControllableState } from '../../hooks/useControllableState';
import { cx } from '../../utils/cx';
import type { Size } from '../../types';
import { useFieldControl } from '../Field/Field';

export interface InputTextareaProps extends Omit<TextareaHTMLAttributes<HTMLTextAreaElement>, 'value' | 'defaultValue' | 'onChange'> {
  value?: string;
  defaultValue?: string;
  onChange?: (value: string, event?: ChangeEvent<HTMLTextAreaElement>) => void;
  rows?: number;
  /** Grow with content up to `maxRows`. */
  autoResize?: boolean;
  maxRows?: number;
  maxLength?: number;
  /** Show "length / maxLength" counter. */
  showCount?: boolean;
  size?: Size;
  invalid?: boolean;
  ref?: Ref<HTMLTextAreaElement>;
}

export function InputTextarea({
  value: valueProp,
  defaultValue = '',
  onChange,
  rows = 3,
  autoResize = false,
  maxRows,
  maxLength,
  showCount = false,
  size = 'md',
  invalid: invalidProp,
  className,
  id: idProp,
  required: requiredProp,
  ref,
  ...rest
}: InputTextareaProps) {
  const control = useFieldControl({ id: idProp, invalid: invalidProp, required: requiredProp, 'aria-describedby': rest['aria-describedby'] });
  const [value, setValue] = useControllableState<string>(valueProp, defaultValue);
  const innerRef = useRef<HTMLTextAreaElement | null>(null);
  const countId = useId();

  const setRefs = (node: HTMLTextAreaElement | null) => {
    innerRef.current = node;
    if (typeof ref === 'function') ref(node);
    else if (ref) ref.current = node;
  };

  useLayoutEffect(() => {
    const el = innerRef.current;
    if (!el || !autoResize) return;
    el.style.height = 'auto';
    let height = el.scrollHeight;
    let overflow = false;
    if (maxRows !== undefined) {
      const style = getComputedStyle(el);
      const lineHeight = parseFloat(style.lineHeight) || 24;
      const padding = (parseFloat(style.paddingTop) || 0) + (parseFloat(style.paddingBottom) || 0);
      const border = (parseFloat(style.borderTopWidth) || 0) + (parseFloat(style.borderBottomWidth) || 0);
      const max = lineHeight * maxRows + padding + border;
      if (height > max) {
        height = max;
        overflow = true;
      }
    }
    el.style.height = `${height}px`;
    el.style.overflowY = overflow ? 'auto' : 'hidden';
  }, [value, autoResize, maxRows, rows]);

  const handleChange = (event: ChangeEvent<HTMLTextAreaElement>) => {
    setValue(event.target.value);
    onChange?.(event.target.value, event);
  };

  const length = value.length;
  const nearLimit = maxLength !== undefined && maxLength > 0 && length >= Math.ceil(maxLength * 0.9);
  const describedBy = [control.describedBy, showCount ? countId : undefined].filter(Boolean).join(' ') || undefined;

  return (
    <div className={cx('ui-input-textarea', className)}>
      <textarea
        ref={setRefs}
        id={control.id}
        rows={rows}
        value={value}
        maxLength={maxLength}
        onChange={handleChange}
        required={control.required || undefined}
        aria-invalid={control.invalid || undefined}
        {...rest}
        aria-describedby={describedBy}
        className={cx(
          'form-control ui-input-textarea__control',
          size === 'sm' && 'form-control-sm',
          size === 'lg' && 'form-control-lg',
          autoResize && 'ui-input-textarea__control--auto',
          control.invalid && 'is-invalid',
        )}
      />
      {showCount && (
        <>
          <div id={countId} className={cx('form-text ui-input-textarea__count', nearLimit && 'ui-input-textarea__count--limit')}>
            {maxLength !== undefined ? `${length} / ${maxLength}` : length}
          </div>
          <span className="visually-hidden" role="status" aria-live="polite">
            {nearLimit ? `${length} / ${maxLength}` : ''}
          </span>
        </>
      )}
    </div>
  );
}
