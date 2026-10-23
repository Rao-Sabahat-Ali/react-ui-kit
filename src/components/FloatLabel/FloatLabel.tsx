import { Children, cloneElement, isValidElement, useId, type ReactElement, type ReactNode } from 'react';
import { cx } from '../../utils/cx';

export interface FloatLabelProps {
  label: string;
  /** A single control accepting `id`, `placeholder`, `invalid` and `aria-describedby` (InputText, InputTextarea, Password, native select). */
  children: ReactElement<ControlProps>;
  help?: ReactNode;
  error?: ReactNode;
  className?: string;
}

interface ControlProps {
  id?: string;
  placeholder?: string;
  invalid?: boolean;
  'aria-describedby'?: string;
}

/** Bootstrap floating-label layout. Do not combine with <Field>. */
export function FloatLabel({ label, children, help, error, className }: FloatLabelProps) {
  const autoId = useId();
  const child = Children.only(children);
  if (!isValidElement<ControlProps>(child)) return null;
  const id = child.props.id ?? `${autoId}-control`;
  const helpId = help ? `${id}-help` : undefined;
  const errorId = error ? `${id}-error` : undefined;
  const describedBy = [child.props['aria-describedby'], helpId, errorId].filter(Boolean).join(' ') || undefined;
  const isNativeSelect = child.type === 'select';

  const control = cloneElement(child, {
    id,
    ...(isNativeSelect ? {} : { placeholder: child.props.placeholder ?? label }),
    ...(error ? { invalid: true } : {}),
    'aria-describedby': describedBy,
  });

  return (
    <div className={cx('ui-float-label mb-3', className)}>
      <div className="form-floating ui-float-label__group">
        {control}
        <label htmlFor={id} className="ui-float-label__label">
          {label}
        </label>
      </div>
      {help && (
        <div id={helpId} className="form-text ui-float-label__help">
          {help}
        </div>
      )}
      {error && (
        <div id={errorId} className="invalid-feedback d-block ui-float-label__error">
          {error}
        </div>
      )}
    </div>
  );
}
