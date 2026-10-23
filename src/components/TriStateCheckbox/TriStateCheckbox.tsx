import { useId, type ButtonHTMLAttributes, type KeyboardEvent, type MouseEvent, type ReactNode, type Ref } from 'react';
import { useControllableState } from '../../hooks/useControllableState';
import { cx } from '../../utils/cx';
import { useFieldControl } from '../Field/Field';
import { Icon } from '../Icon/Icon';

export type TriState = boolean | null;

export interface TriStateCheckboxProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'value' | 'defaultValue' | 'onChange' | 'role' | 'type'> {
  value?: TriState;
  defaultValue?: TriState;
  onChange?: (value: TriState, event?: MouseEvent<HTMLButtonElement>) => void;
  label?: ReactNode;
  /** Extra text for assistive technology describing each state (e.g. "Any", "Yes", "No"). */
  labels?: { true?: string; false?: string; null?: string };
  invalid?: boolean;
  ref?: Ref<HTMLButtonElement>;
}

/** null -> true -> false -> null */
export const nextTriState = (value: TriState): TriState => (value === null ? true : value === true ? false : null);

export function TriStateCheckbox({
  value: valueProp,
  defaultValue = null,
  onChange,
  label,
  labels,
  invalid: invalidProp,
  disabled,
  className,
  id: idProp,
  onClick,
  onKeyDown,
  ref,
  ...rest
}: TriStateCheckboxProps) {
  const control = useFieldControl({ id: idProp, invalid: invalidProp, 'aria-describedby': rest['aria-describedby'] });
  const [value, setValue] = useControllableState<TriState>(valueProp, defaultValue);
  const stateTextId = useId();
  const stateText = labels?.[String(value) as 'true' | 'false' | 'null'];
  const describedBy = [control.describedBy, stateText ? stateTextId : undefined].filter(Boolean).join(' ') || undefined;

  const handleClick = (event: MouseEvent<HTMLButtonElement>) => {
    onClick?.(event);
    if (event.defaultPrevented) return;
    const next = nextTriState(value);
    setValue(next);
    onChange?.(next, event);
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLButtonElement>) => {
    onKeyDown?.(event);
    // APG checkbox: Space toggles; Enter does not.
    if (event.key === 'Enter') event.preventDefault();
  };

  return (
    <div className={cx('form-check ui-tri-state-checkbox', className)}>
      <button
        ref={ref}
        type="button"
        role="checkbox"
        id={control.id}
        aria-checked={value === null ? 'mixed' : value}
        aria-invalid={control.invalid || undefined}
        disabled={disabled}
        {...rest}
        aria-describedby={describedBy}
        onClick={handleClick}
        onKeyDown={handleKeyDown}
        className={cx('ui-tri-state-checkbox__box', value === true && 'is-checked', value === false && 'is-unchecked', value === null && 'is-mixed', control.invalid && 'is-invalid')}
      >
        {value === true && <Icon name="check" size="sm" />}
        {value === false && <Icon name="x" size="sm" />}
        {value === null && <Icon name="minus" size="sm" />}
      </button>
      {stateText && (
        <span id={stateTextId} className="visually-hidden">
          {stateText}
        </span>
      )}
      {label !== undefined && (
        <label className="form-check-label ui-tri-state-checkbox__label" htmlFor={control.id}>
          {label}
        </label>
      )}
    </div>
  );
}
