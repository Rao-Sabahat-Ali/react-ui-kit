import { useEffect, useId, useRef, type ChangeEvent, type InputHTMLAttributes, type ReactNode, type Ref } from 'react';
import { useControllableState } from '../../hooks/useControllableState';
import { cx } from '../../utils/cx';
import { useFieldControl } from '../Field/Field';

export interface CheckboxProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'checked' | 'defaultChecked' | 'onChange' | 'type'> {
  checked?: boolean;
  defaultChecked?: boolean;
  onChange?: (checked: boolean, event: ChangeEvent<HTMLInputElement>) => void;
  indeterminate?: boolean;
  label?: ReactNode;
  inline?: boolean;
  invalid?: boolean;
  ref?: Ref<HTMLInputElement>;
}

export function Checkbox({ checked: checkedProp, defaultChecked = false, onChange, indeterminate = false, label, inline = false, invalid: invalidProp, className, id: idProp, ref, ...rest }: CheckboxProps) {
  const control = useFieldControl({ id: idProp, invalid: invalidProp, 'aria-describedby': rest['aria-describedby'] });
  const [checked, setChecked] = useControllableState<boolean>(checkedProp, defaultChecked);
  const innerRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (innerRef.current) innerRef.current.indeterminate = indeterminate;
  }, [indeterminate]);

  const setRefs = (node: HTMLInputElement | null) => {
    innerRef.current = node;
    if (typeof ref === 'function') ref(node);
    else if (ref) ref.current = node;
  };

  const handleChange = (event: ChangeEvent<HTMLInputElement>) => {
    setChecked(event.target.checked);
    onChange?.(event.target.checked, event);
  };

  return (
    <div className={cx('form-check ui-checkbox', inline && 'form-check-inline', className)}>
      <input
        ref={setRefs}
        type="checkbox"
        id={control.id}
        checked={checked}
        onChange={handleChange}
        aria-invalid={control.invalid || undefined}
        {...rest}
        aria-describedby={control.describedBy}
        className={cx('form-check-input ui-checkbox__input', control.invalid && 'is-invalid')}
      />
      {label !== undefined && (
        <label className="form-check-label ui-checkbox__label" htmlFor={control.id}>
          {label}
        </label>
      )}
    </div>
  );
}

export interface CheckboxOption {
  label: ReactNode;
  value: string;
  disabled?: boolean;
}

export interface CheckboxGroupProps {
  legend: ReactNode;
  options: CheckboxOption[];
  value?: string[];
  defaultValue?: string[];
  onChange?: (value: string[]) => void;
  inline?: boolean;
  invalid?: boolean;
  disabled?: boolean;
  className?: string;
}

export function CheckboxGroup({ legend, options, value: valueProp, defaultValue = [], onChange, inline = false, invalid, disabled, className }: CheckboxGroupProps) {
  const [value, setValue] = useControllableState<string[]>(valueProp, defaultValue, onChange);
  const name = useId();
  const toggle = (optionValue: string, on: boolean) => {
    const set = new Set(value);
    if (on) set.add(optionValue);
    else set.delete(optionValue);
    // Keep option order stable regardless of click order.
    setValue(options.map((o) => o.value).filter((v) => set.has(v)));
  };
  return (
    <fieldset className={cx('ui-checkbox-group mb-3', className)} disabled={disabled}>
      <legend className="form-label fs-6 ui-checkbox-group__legend">{legend}</legend>
      {options.map((option) => (
        <Checkbox
          key={option.value}
          name={name}
          value={option.value}
          label={option.label}
          inline={inline}
          invalid={invalid}
          disabled={option.disabled}
          checked={value.includes(option.value)}
          onChange={(on) => toggle(option.value, on)}
        />
      ))}
    </fieldset>
  );
}
