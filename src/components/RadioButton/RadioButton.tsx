import { useId, type ChangeEvent, type InputHTMLAttributes, type ReactNode } from 'react';
import { useControllableState } from '../../hooks/useControllableState';
import { cx } from '../../utils/cx';

export interface RadioButtonProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type' | 'onChange'> {
  label?: ReactNode;
  description?: ReactNode;
  inline?: boolean;
  invalid?: boolean;
  onChange?: (value: string, event: ChangeEvent<HTMLInputElement>) => void;
}

export function RadioButton({ label, description, inline = false, invalid = false, className, id: idProp, onChange, ...rest }: RadioButtonProps) {
  const autoId = useId();
  const id = idProp ?? autoId;
  const descriptionId = description ? `${id}-desc` : undefined;
  return (
    <div className={cx('form-check ui-radio', inline && 'form-check-inline', className)}>
      <span className="ui-radio__control">
        <input
          type="radio"
          id={id}
          className={cx('form-check-input ui-radio__input', invalid && 'is-invalid')}
          aria-describedby={descriptionId}
          onChange={(e) => onChange?.(e.target.value, e)}
          {...rest}
        />
        <span className="ui-radio__dot" aria-hidden="true" />
      </span>
      {label !== undefined && (
        <label className="form-check-label ui-radio__label" htmlFor={id}>
          {label}
        </label>
      )}
      {description && (
        <div id={descriptionId} className="form-text mt-0 ui-radio__description">
          {description}
        </div>
      )}
    </div>
  );
}

export interface RadioOption<T> {
  label: ReactNode;
  value: T;
  disabled?: boolean;
  description?: ReactNode;
}

export interface RadioGroupProps<T> {
  legend: ReactNode;
  legendHidden?: boolean;
  options: RadioOption<T>[];
  value?: T | null;
  defaultValue?: T | null;
  onChange?: (value: T) => void;
  inline?: boolean;
  invalid?: boolean;
  disabled?: boolean;
  name?: string;
  className?: string;
}

export function RadioGroup<T>({ legend, legendHidden = false, options, value: valueProp, defaultValue = null, onChange, inline = false, invalid = false, disabled, name: nameProp, className }: RadioGroupProps<T>) {
  const autoName = useId();
  const name = nameProp ?? autoName;
  const [value, setValue] = useControllableState<T | null>(valueProp, defaultValue);
  return (
    <fieldset className={cx('ui-radio-group mb-3', className)} disabled={disabled}>
      <legend className={cx('form-label fs-6 ui-radio-group__legend', legendHidden && 'visually-hidden')}>{legend}</legend>
      {options.map((option, index) => (
        <RadioButton
          key={index}
          name={name}
          value={String(index)}
          label={option.label}
          description={option.description}
          inline={inline}
          invalid={invalid}
          disabled={option.disabled}
          checked={value === option.value}
          onChange={() => {
            setValue(option.value);
            onChange?.(option.value);
          }}
        />
      ))}
    </fieldset>
  );
}
