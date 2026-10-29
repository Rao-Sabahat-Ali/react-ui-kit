import type { ChangeEvent, InputHTMLAttributes, ReactNode, Ref } from 'react';
import { useControllableState } from '../../hooks/useControllableState';
import { cx } from '../../utils/cx';
import { useFieldControl } from '../Field/Field';

export interface SwitchProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'checked' | 'defaultChecked' | 'onChange' | 'type' | 'size'> {
  checked?: boolean;
  defaultChecked?: boolean;
  onChange?: (checked: boolean, event: ChangeEvent<HTMLInputElement>) => void;
  label?: ReactNode;
  labelPosition?: 'end' | 'start';
  size?: 'md' | 'lg';
  ref?: Ref<HTMLInputElement>;
}

export function Switch({ checked: checkedProp, defaultChecked = false, onChange, label, labelPosition = 'end', size = 'md', className, id: idProp, ref, ...rest }: SwitchProps) {
  const control = useFieldControl({ id: idProp, 'aria-describedby': rest['aria-describedby'] });
  const [checked, setChecked] = useControllableState<boolean>(checkedProp, defaultChecked);
  const handleChange = (event: ChangeEvent<HTMLInputElement>) => {
    setChecked(event.target.checked);
    onChange?.(event.target.checked, event);
  };
  return (
    <div className={cx('form-check form-switch ui-switch', labelPosition === 'start' && 'form-check-reverse', size === 'lg' && 'ui-switch--lg', className)}>
      <span className="ui-switch__control">
        <input
          ref={ref}
          type="checkbox"
          role="switch"
          id={control.id}
          checked={checked}
          onChange={handleChange}
          {...rest}
          aria-describedby={control.describedBy}
          className="form-check-input ui-switch__input"
        />
        <span className="ui-switch__knob" aria-hidden="true" />
      </span>
      {label !== undefined && (
        <label className="form-check-label ui-switch__label" htmlFor={control.id}>
          {label}
        </label>
      )}
    </div>
  );
}
