import { useId, type ReactNode } from 'react';
import { useControllableState } from '../../hooks/useControllableState';
import { cx } from '../../utils/cx';
import type { Intent, Size } from '../../types';
import { Icon, type IconName } from '../Icon/Icon';

export interface SelectButtonOption<T> {
  label: ReactNode;
  value: T;
  icon?: IconName;
  disabled?: boolean;
  /** Required when label is not text (icon-only). */
  ariaLabel?: string;
}

interface BaseProps<T> {
  options: SelectButtonOption<T>[];
  size?: Size;
  variant?: Intent;
  block?: boolean;
  disabled?: boolean;
  'aria-label'?: string;
  className?: string;
}

interface SingleProps<T> extends BaseProps<T> {
  multiple?: false;
  value?: T | null;
  defaultValue?: T | null;
  onChange?: (value: T | null) => void;
  allowEmpty?: boolean;
}

interface MultipleProps<T> extends BaseProps<T> {
  multiple: true;
  value?: T[];
  defaultValue?: T[];
  onChange?: (value: T[]) => void;
  allowEmpty?: never;
}

export type SelectButtonProps<T> = SingleProps<T> | MultipleProps<T>;

export function SelectButton<T>(props: SelectButtonProps<T>) {
  const { options, size = 'md', variant = 'primary', block = false, disabled = false, className } = props;
  const name = useId();
  const [single, setSingle] = useControllableState<T | null>(
    props.multiple ? undefined : props.value,
    props.multiple ? null : (props.defaultValue ?? null),
    props.multiple ? undefined : props.onChange,
  );
  const [many, setMany] = useControllableState<T[]>(props.multiple ? props.value : undefined, props.multiple ? (props.defaultValue ?? []) : [], props.multiple ? props.onChange : undefined);

  const isSelected = (v: T) => (props.multiple ? many.includes(v) : single === v);
  const toggle = (option: SelectButtonOption<T>) => {
    if (props.multiple) {
      const next = many.includes(option.value) ? many.filter((v) => v !== option.value) : [...many, option.value];
      setMany(options.map((o) => o.value).filter((v) => next.includes(v)));
    } else if (single === option.value) {
      if (props.allowEmpty) setSingle(null);
    } else {
      setSingle(option.value);
    }
  };

  return (
    <div
      role="group"
      aria-label={props['aria-label']}
      className={cx('btn-group ui-select-button', size === 'sm' && 'btn-group-sm', size === 'lg' && 'btn-group-lg', block && 'd-flex w-100', className)}
    >
      {options.map((option, index) => {
        const id = `${name}-${index}`;
        const selected = isSelected(option.value);
        return (
          <span key={id} className={cx('ui-select-button__item', block && 'flex-fill d-flex')}>
            <input
              type={props.multiple ? 'checkbox' : 'radio'}
              className="btn-check"
              name={name}
              id={id}
              autoComplete="off"
              checked={selected}
              disabled={disabled || option.disabled}
              aria-label={option.ariaLabel}
              onChange={() => toggle(option)}
              onClick={() => {
                // Radios don't fire change when re-clicked; support allowEmpty deselect.
                if (!props.multiple && selected && props.allowEmpty) toggle(option);
              }}
            />
            <label className={cx('btn', `btn-outline-${variant}`, 'ui-select-button__label', block && 'flex-fill')} htmlFor={id}>
              {option.icon && <Icon name={option.icon} className="ui-select-button__icon" />}
              {option.label}
            </label>
          </span>
        );
      })}
    </div>
  );
}
