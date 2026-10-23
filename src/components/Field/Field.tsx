import { createContext, useContext, useId, type ReactNode } from 'react';
import { cx } from '../../utils/cx';

export interface FieldContextValue {
  id: string;
  labelId: string;
  describedBy: string | undefined;
  invalid: boolean;
  required: boolean;
}

const FieldContext = createContext<FieldContextValue | null>(null);

/** For custom controls inside <Field>. Returns null outside a Field. */
export function useField(): FieldContextValue | null {
  return useContext(FieldContext);
}

interface ControlA11yInput {
  id?: string | undefined;
  invalid?: boolean | undefined;
  required?: boolean | undefined;
  'aria-describedby'?: string | undefined;
}

/** Merge Field context with a control's own props (own props win). */
export function useFieldControl(props: ControlA11yInput) {
  const field = useField();
  const fallbackId = useId();
  const describedBy = [field?.describedBy, props['aria-describedby']].filter(Boolean).join(' ') || undefined;
  const invalid = props.invalid ?? field?.invalid ?? false;
  return {
    id: props.id ?? field?.id ?? fallbackId,
    invalid,
    required: props.required ?? field?.required ?? false,
    describedBy,
    labelId: field?.labelId,
  };
}

export interface FieldProps {
  label: ReactNode;
  labelHidden?: boolean;
  help?: ReactNode;
  error?: ReactNode;
  required?: boolean;
  optionalText?: string;
  id?: string;
  inline?: boolean;
  className?: string;
  children: ReactNode;
}

export function Field({ label, labelHidden = false, help, error, required = false, optionalText, id, inline = false, className, children }: FieldProps) {
  const autoId = useId();
  const controlId = id ?? `${autoId}-control`;
  const helpId = help ? `${controlId}-help` : undefined;
  const errorId = error ? `${controlId}-error` : undefined;
  const labelId = `${controlId}-label`;
  const value: FieldContextValue = {
    id: controlId,
    labelId,
    describedBy: [helpId, errorId].filter(Boolean).join(' ') || undefined,
    invalid: Boolean(error),
    required,
  };

  return (
    <FieldContext.Provider value={value}>
      <div className={cx('ui-field', inline ? 'ui-field--inline row g-2 align-items-center' : 'mb-3', className)}>
        <label id={labelId} htmlFor={controlId} className={cx('form-label ui-field__label', labelHidden && 'visually-hidden', inline && 'col-auto mb-0')}>
          {label}
          {required && (
            <span className="ui-field__required text-danger ms-1" aria-hidden="true">
              *
            </span>
          )}
          {!required && optionalText && <span className="ui-field__optional text-body-secondary ms-1">{optionalText}</span>}
        </label>
        <div className={cx('ui-field__control', inline && 'col')}>{children}</div>
        {help && (
          <div id={helpId} className="form-text ui-field__help">
            {help}
          </div>
        )}
        {error && (
          <div id={errorId} className="invalid-feedback d-block ui-field__error">
            {error}
          </div>
        )}
      </div>
    </FieldContext.Provider>
  );
}
