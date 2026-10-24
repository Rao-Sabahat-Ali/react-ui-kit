import { Children, cloneElement, isValidElement, useId, type ReactElement, type ReactNode } from 'react';
import { cx } from '../../utils/cx';

interface ControlProps {
  id?: string;
  invalid?: boolean;
  required?: boolean;
  disabled?: boolean;
  'aria-describedby'?: string;
}

export interface IftaLabelProps {
  label: ReactNode;
  /** One control (InputText, InputTextarea, Select or a native input/select/textarea). */
  children: ReactElement<ControlProps>;
  help?: ReactNode;
  error?: ReactNode;
  required?: boolean;
  className?: string;
}

/** Label inside the control's border, above the value. Same control contract as <Field>; do not nest inside Field. */
export function IftaLabel({ label, children, help, error, required = false, className }: IftaLabelProps) {
  const autoId = useId();
  const child = Children.only(children);
  if (!isValidElement<ControlProps>(child)) return null;
  const id = child.props.id ?? `${autoId}-control`;
  const helpId = help ? `${id}-help` : undefined;
  const errorId = error ? `${id}-error` : undefined;
  const describedBy = [child.props['aria-describedby'], helpId, errorId].filter(Boolean).join(' ') || undefined;
  const native = typeof child.type === 'string';

  const control = cloneElement(child, {
    id,
    ...(required ? { required: true } : {}),
    // Kit controls take `invalid`; native elements take aria-invalid.
    ...(error ? (native ? { 'aria-invalid': true } : { invalid: true }) : {}),
    'aria-describedby': describedBy,
  } as Partial<ControlProps>);

  return (
    <div className={cx('ui-ifta mb-3', className)}>
      <div className={cx('ui-ifta__box', Boolean(error) && 'ui-ifta__box--invalid', child.props.disabled && 'ui-ifta__box--disabled')}>
        <label htmlFor={id} className="ui-ifta__label">
          {label}
          {required && (
            <span className="ui-ifta__required text-danger ms-1" aria-hidden="true">
              *
            </span>
          )}
        </label>
        {control}
      </div>
      {help && (
        <div id={helpId} className="form-text ui-ifta__help">
          {help}
        </div>
      )}
      {error && (
        <div id={errorId} className="invalid-feedback d-block ui-ifta__error">
          {error}
        </div>
      )}
    </div>
  );
}
