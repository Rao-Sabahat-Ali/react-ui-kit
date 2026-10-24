import { useId, type ReactNode } from 'react';
import { useControllableState } from '../../hooks/useControllableState';
import { useLocale } from '../../locale/LocaleProvider';
import { cx } from '../../utils/cx';
import { Icon, type IconName } from '../Icon/Icon';

export interface PaymentMethod {
  id: string;
  label: ReactNode;
  description?: ReactNode;
  /** An icon name or your own node (for example a licensed brand mark). The kit ships no brand logos. */
  icon?: IconName | ReactNode;
  badge?: ReactNode;
  disabled?: boolean;
  /** Why the method cannot be chosen; shown under the row and announced with it. */
  disabledReason?: ReactNode;
  /** Revealed under the row while it is selected (for example `PaymentCardForm`). Unmounted when another method is chosen. */
  children?: ReactNode;
}

export interface PaymentMethodSelectorProps {
  methods: PaymentMethod[];
  value?: string | null;
  defaultValue?: string | null;
  onChange?: (id: string) => void;
  legend?: ReactNode;
  legendHidden?: boolean;
  'aria-label'?: string;
  disabled?: boolean;
  invalid?: boolean;
  error?: ReactNode;
  name?: string;
  className?: string;
}

/**
 * Single choice among payment methods as ruled rows. Native radios inside labels give one tab stop and arrow-key
 * selection (APG Radio Group); the selected row carries the accent marker. UI only: nothing is sent anywhere.
 */
export function PaymentMethodSelector({
  methods,
  value: valueProp,
  defaultValue = null,
  onChange,
  legend,
  legendHidden = false,
  'aria-label': ariaLabel,
  disabled = false,
  invalid = false,
  error,
  name: nameProp,
  className,
}: PaymentMethodSelectorProps) {
  const { t } = useLocale();
  const uid = useId();
  const name = nameProp ?? `${uid}-method`;
  const [value, setValue] = useControllableState<string | null>(valueProp, defaultValue, (next) => next !== null && onChange?.(next));
  const errorId = error ? `${uid}-error` : undefined;
  const legendText = legend ?? (ariaLabel ? undefined : t('paymentMethods'));

  return (
    <fieldset
      role="radiogroup"
      className={cx('ui-payment-methods', className)}
      disabled={disabled}
      aria-label={legendText === undefined ? ariaLabel : undefined}
      aria-invalid={invalid || Boolean(error) || undefined}
      aria-describedby={errorId}
    >
      {legendText !== undefined && <legend className={cx('form-label fs-6 ui-payment-methods__legend', legendHidden && 'visually-hidden')}>{legendText}</legend>}
      {methods.map((method, index) => {
        const selected = value === method.id;
        // `method.id` may contain spaces or other characters that break id references (aria-controls/describedby); the index keeps slugs unique.
        const inputId = `${uid}-${index}-${method.id.replace(/[^A-Za-z0-9_-]/g, '-')}`;
        const descriptionId = method.description ? `${inputId}-desc` : undefined;
        const reasonId = method.disabled && method.disabledReason ? `${inputId}-reason` : undefined;
        const panelId = `${inputId}-panel`;
        const hasPanel = selected && method.children !== undefined && method.children !== null;
        return (
          <div key={method.id} className={cx('ui-payment-methods__item', selected && 'ui-payment-methods__item--selected', method.disabled && 'ui-payment-methods__item--disabled')}>
            <label className="ui-payment-methods__row" htmlFor={inputId}>
              <input
                id={inputId}
                type="radio"
                name={name}
                value={method.id}
                className="form-check-input ui-payment-methods__input"
                checked={selected}
                disabled={method.disabled}
                aria-describedby={[descriptionId, reasonId].filter(Boolean).join(' ') || undefined}
                aria-controls={hasPanel ? panelId : undefined}
                onChange={() => setValue(method.id)}
              />
              {method.icon !== undefined && method.icon !== null && (
                <span className="ui-payment-methods__icon" aria-hidden="true">
                  {typeof method.icon === 'string' ? <Icon name={method.icon} size="lg" /> : method.icon}
                </span>
              )}
              <span className="ui-payment-methods__text">
                <span className="ui-payment-methods__label">{method.label}</span>
                {method.description && (
                  <span id={descriptionId} className="ui-payment-methods__description">
                    {method.description}
                  </span>
                )}
              </span>
              {method.badge && <span className="ui-payment-methods__badge">{method.badge}</span>}
            </label>
            {method.disabled && method.disabledReason && (
              <p id={reasonId} className="ui-payment-methods__reason">
                <span className="visually-hidden">{t('paymentUnavailable')}:</span> {method.disabledReason}
              </p>
            )}
            {hasPanel && (
              <div id={panelId} role="group" aria-labelledby={`${inputId}-title`} className="ui-payment-methods__panel">
                <span id={`${inputId}-title`} className="visually-hidden">
                  {method.label}
                </span>
                {method.children}
              </div>
            )}
          </div>
        );
      })}
      {error && (
        <div id={errorId} className="invalid-feedback d-block ui-payment-methods__error">
          {error}
        </div>
      )}
    </fieldset>
  );
}
