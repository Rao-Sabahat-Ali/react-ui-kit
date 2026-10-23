import { useId, useState, type HTMLAttributes, type KeyboardEvent, type Ref } from 'react';
import { useControllableState } from '../../hooks/useControllableState';
import { useLocale } from '../../locale/LocaleProvider';
import { clamp } from '../../utils/number';
import { cx } from '../../utils/cx';
import type { Size } from '../../types';
import { useFieldControl } from '../Field/Field';
import { Icon } from '../Icon/Icon';

export interface RatingProps extends Omit<HTMLAttributes<HTMLDivElement>, 'defaultValue' | 'onChange'> {
  value?: number | null;
  defaultValue?: number | null;
  onChange?: (value: number | null) => void;
  stars?: number;
  /** Display only: `role="img"` with fractional fill. */
  readOnly?: boolean;
  /** Allow clearing (click the current star again, or press Delete/Backspace). */
  cancel?: boolean;
  size?: Size;
  disabled?: boolean;
  invalid?: boolean;
  ref?: Ref<HTMLDivElement>;
}

function Star({ fill }: { fill: number }) {
  return (
    <span className="ui-rating__icon" aria-hidden="true">
      <Icon name="star" className="ui-rating__star-empty" />
      <span className="ui-rating__star-fill" style={{ inlineSize: `${clamp(fill, 0, 1) * 100}%` }}>
        <Icon name="star-filled" />
      </span>
    </span>
  );
}

export function Rating({
  value: valueProp,
  defaultValue = null,
  onChange,
  stars = 5,
  readOnly = false,
  cancel = true,
  size = 'md',
  disabled = false,
  invalid: invalidProp,
  className,
  ref,
  ...rest
}: RatingProps) {
  const { t } = useLocale();
  const control = useFieldControl({ invalid: invalidProp, 'aria-describedby': rest['aria-describedby'] });
  const [value, setValue] = useControllableState<number | null>(valueProp, defaultValue);
  const [hover, setHover] = useState<number | null>(null);
  const name = useId();
  const classes = cx('ui-rating', `ui-rating--${size}`, readOnly && 'ui-rating--readonly', disabled && 'ui-rating--disabled', control.invalid && 'is-invalid', className);
  const items = Array.from({ length: stars }, (_, i) => i + 1);

  if (readOnly) {
    const shown = value ?? 0;
    return (
      <div ref={ref} role="img" aria-label={t('ratingStar', { value: shown, max: stars })} className={classes} {...rest}>
        {items.map((n) => (
          <Star key={n} fill={shown - (n - 1)} />
        ))}
      </div>
    );
  }

  const select = (next: number | null) => {
    setValue(next);
    onChange?.(next);
  };

  const preview = hover ?? value ?? 0;
  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (cancel && value !== null && (event.key === 'Delete' || event.key === 'Backspace')) {
      event.preventDefault();
      select(null);
    }
  };

  return (
    // Focus lives on the star radios (roving tabindex), not the group container.
    // eslint-disable-next-line jsx-a11y/interactive-supports-focus
    <div
      ref={ref}
      role="radiogroup"
      aria-label={rest['aria-labelledby'] || control.labelId ? undefined : t('ratingLabel')}
      aria-labelledby={rest['aria-labelledby'] ?? control.labelId}
      aria-invalid={control.invalid || undefined}
      aria-describedby={control.describedBy}
      className={classes}
      onMouseLeave={() => setHover(null)}
      {...rest}
    >
      {items.map((n) => (
        <label key={n} className="ui-rating__item" onMouseEnter={() => !disabled && setHover(n)}>
          <input
            type="radio"
            name={name}
            value={n}
            className="visually-hidden ui-rating__input"
            checked={value === n}
            disabled={disabled}
            aria-label={t('ratingStar', { value: n, max: stars })}
            onChange={() => select(n)}
            onClick={() => {
              if (cancel && value === n) select(null);
            }}
            onKeyDown={handleKeyDown}
          />
          <Star fill={preview - (n - 1)} />
        </label>
      ))}
    </div>
  );
}
