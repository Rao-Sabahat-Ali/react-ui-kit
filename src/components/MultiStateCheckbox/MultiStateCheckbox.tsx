import type { ButtonHTMLAttributes, MouseEvent, Ref } from 'react';
import { useControllableState } from '../../hooks/useControllableState';
import { cx } from '../../utils/cx';
import type { Size } from '../../types';
import { useFieldControl } from '../Field/Field';
import { Icon, type IconName } from '../Icon/Icon';

export interface MultiStateOption<T> {
  value: T;
  label: string;
  icon?: IconName;
}

export interface MultiStateCheckboxProps<T> extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'value' | 'defaultValue' | 'onChange' | 'type' | 'children' | 'aria-label'> {
  options: MultiStateOption<T>[];
  value?: T | null;
  defaultValue?: T | null;
  onChange?: (value: T | null, event?: MouseEvent<HTMLButtonElement>) => void;
  /** Include the empty (null) state in the cycle. */
  empty?: boolean;
  /** Accessible name of the control; announced as "{label}: {state}". */
  label: string;
  /** Text for the empty state. */
  emptyLabel?: string;
  size?: Size;
  invalid?: boolean;
  ref?: Ref<HTMLButtonElement>;
}

/** Local default; no matching key exists in locale/en.ts. */
const DEFAULT_EMPTY_LABEL = 'None';

export function MultiStateCheckbox<T>({
  options,
  value: valueProp,
  defaultValue = null,
  onChange,
  empty = true,
  label,
  emptyLabel = DEFAULT_EMPTY_LABEL,
  size = 'md',
  invalid: invalidProp,
  className,
  id: idProp,
  onClick,
  ref,
  ...rest
}: MultiStateCheckboxProps<T>) {
  const control = useFieldControl({ id: idProp, invalid: invalidProp, 'aria-describedby': rest['aria-describedby'] });
  const [value, setValue] = useControllableState<T | null>(valueProp, defaultValue);

  const current = value === null ? undefined : options.find((o) => Object.is(o.value, value));
  const stateLabel = current ? current.label : emptyLabel;

  const handleClick = (event: MouseEvent<HTMLButtonElement>) => {
    onClick?.(event);
    if (event.defaultPrevented || options.length === 0) return;
    const states: (T | null)[] = empty ? [null, ...options.map((o) => o.value)] : options.map((o) => o.value);
    const index = states.findIndex((s) => Object.is(s, current ? current.value : null));
    const next = states[(index + 1) % states.length] as T | null;
    setValue(next);
    onChange?.(next, event);
  };

  return (
    <button
      ref={ref}
      type="button"
      id={control.id}
      aria-label={`${label}: ${stateLabel}`}
      {...rest}
      aria-describedby={control.describedBy}
      onClick={handleClick}
      className={cx(
        'btn btn-outline-secondary ui-multi-state-checkbox',
        size === 'sm' && 'btn-sm',
        size === 'lg' && 'btn-lg',
        control.invalid && 'is-invalid',
        className,
      )}
    >
      {current?.icon ? <Icon name={current.icon} /> : <span className="ui-multi-state-checkbox__text">{stateLabel}</span>}
    </button>
  );
}
