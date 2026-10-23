import { useRef, type ChangeEvent, type InputHTMLAttributes, type ReactNode, type Ref } from 'react';
import { useControllableState } from '../../hooks/useControllableState';
import { useLocale } from '../../locale/LocaleProvider';
import { cx } from '../../utils/cx';
import type { Size } from '../../types';
import { useFieldControl } from '../Field/Field';
import { Icon } from '../Icon/Icon';

export interface InputTextProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'value' | 'defaultValue' | 'onChange' | 'size' | 'type' | 'prefix'> {
  value?: string;
  defaultValue?: string;
  onChange?: (value: string, event?: ChangeEvent<HTMLInputElement>) => void;
  type?: 'text' | 'email' | 'search' | 'tel' | 'url';
  size?: Size;
  invalid?: boolean;
  prefix?: ReactNode;
  suffix?: ReactNode;
  clearable?: boolean;
  plaintext?: boolean;
  ref?: Ref<HTMLInputElement>;
}

export function InputText({
  value: valueProp,
  defaultValue = '',
  onChange,
  type = 'text',
  size = 'md',
  invalid: invalidProp,
  prefix,
  suffix,
  clearable = false,
  plaintext = false,
  className,
  id: idProp,
  required: requiredProp,
  ref,
  ...rest
}: InputTextProps) {
  const { t } = useLocale();
  const control = useFieldControl({ id: idProp, invalid: invalidProp, required: requiredProp, 'aria-describedby': rest['aria-describedby'] });
  const [value, setValue] = useControllableState<string>(valueProp, defaultValue);
  const innerRef = useRef<HTMLInputElement | null>(null);

  const setRefs = (node: HTMLInputElement | null) => {
    innerRef.current = node;
    if (typeof ref === 'function') ref(node);
    else if (ref) ref.current = node;
  };

  const handleChange = (event: ChangeEvent<HTMLInputElement>) => {
    setValue(event.target.value);
    onChange?.(event.target.value, event);
  };

  const handleClear = () => {
    setValue('');
    onChange?.('');
    innerRef.current?.focus();
  };

  const input = (
    <input
      ref={setRefs}
      id={control.id}
      type={type}
      value={value}
      onChange={handleChange}
      required={control.required || undefined}
      aria-invalid={control.invalid || undefined}
      {...rest}
      aria-describedby={control.describedBy}
      readOnly={plaintext || rest.readOnly}
      className={cx(
        plaintext ? 'form-control-plaintext' : 'form-control',
        'ui-input-text',
        size === 'sm' && 'form-control-sm',
        size === 'lg' && 'form-control-lg',
        control.invalid && 'is-invalid',
        !(prefix || suffix || clearable) && className,
      )}
    />
  );

  if (!prefix && !suffix && !clearable) return input;

  return (
    <div className={cx('input-group ui-input-text__group', size === 'sm' && 'input-group-sm', size === 'lg' && 'input-group-lg', control.invalid && 'has-validation', className)}>
      {prefix && <span className="input-group-text ui-input-text__addon">{prefix}</span>}
      {input}
      {clearable && value !== '' && !rest.disabled && !rest.readOnly && (
        <button type="button" className="btn ui-input-text__clear" aria-label={t('clear')} onClick={handleClear}>
          <Icon name="x" />
        </button>
      )}
      {suffix && <span className="input-group-text ui-input-text__addon">{suffix}</span>}
    </div>
  );
}
