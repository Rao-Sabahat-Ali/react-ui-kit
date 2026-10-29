import type { HTMLAttributes, ReactNode } from 'react';
import { useLocale } from '../../locale/LocaleProvider';
import { cx } from '../../utils/cx';
import { safeUrl } from '../../utils/url';
import { Icon, type IconName } from '../Icon/Icon';
import { Skeleton } from '../Skeleton/Skeleton';
import { QuantityTick } from '../QuantityTick/QuantityTick';
import { Sparkline } from '../Sparkline/Sparkline';
import { useInStatGroup } from '../StatGroup/StatGroup';

export interface StatCardProps extends Omit<HTMLAttributes<HTMLDivElement>, 'title'> {
  label: string;
  value: number | string;
  format?: Intl.NumberFormatOptions;
  /** Fractional change, 0.12 = +12%. */
  delta?: number;
  deltaLabel?: string;
  /** Lower is better (e.g. errors). */
  invertDelta?: boolean;
  icon?: IconName;
  sparkline?: number[];
  loading?: boolean;
  href?: string;
  footer?: ReactNode;
  /** `card` (default) is a bordered tile; `plain` drops the chrome so items sit in a ruled `.ui-stat-group` parts list. */
  variant?: 'card' | 'plain';
  /** Write the value as a quantity mark (`12×`). Default: on for plain numeric counts, off for text, percent and currency. */
  quantity?: boolean;
}

export function StatCard({ label, value, format, delta, deltaLabel, invertDelta = false, icon, sparkline, loading = false, href, footer, variant: variantProp, quantity: quantityProp, className, ...rest }: StatCardProps) {
  const inGroup = useInStatGroup();
  const variant = variantProp ?? (inGroup ? 'plain' : 'card');
  const { t, locale } = useLocale();
  const quantity = quantityProp ?? (typeof value === 'number' && (format?.style === undefined || format.style === 'decimal'));
  const link = safeUrl(href);

  let deltaNode: ReactNode = null;
  if (delta !== undefined) {
    const pct = new Intl.NumberFormat(locale, { style: 'percent', maximumFractionDigits: 1 }).format(Math.abs(delta));
    const good = delta === 0 ? null : (delta > 0) !== invertDelta;
    const words = delta > 0 ? t('deltaUp', { value: pct }) : delta < 0 ? t('deltaDown', { value: pct }) : t('deltaFlat');
    deltaNode = (
      <span className={cx('ui-stat-card__delta', good === true && 'text-success-emphasis', good === false && 'text-danger-emphasis')}>
        {delta !== 0 && <Icon name={delta > 0 ? 'arrow-up' : 'arrow-down'} size="sm" />}
        <span>
          {words}
          {deltaLabel ? ` ${deltaLabel}` : ''}
        </span>
      </span>
    );
  }

  return (
    <div className={cx('ui-stat-card', variant === 'card' ? 'card' : 'ui-stat-card--plain', link && 'ui-stat-card--interactive', className)} {...rest}>
      <div className={variant === 'card' ? 'card-body' : 'ui-stat-card__body'}>
        {icon && (
          <span className="ui-stat-card__icon">
            <Icon name={icon} size="lg" />
          </span>
        )}
        {loading ? (
          <Skeleton width="60%" height="2rem" />
        ) : (
          <div className="ui-stat-card__value ui-qty ui-tabular">
            <QuantityTick value={value} format={format} />
            {quantity && (
              <span className="ui-qty__mark" aria-hidden="true">
                ×
              </span>
            )}
          </div>
        )}
        <span className="ui-stat-card__label">
          {link ? (
            <a href={link} className="stretched-link">
              {label}
            </a>
          ) : (
            label
          )}
        </span>
        {!loading && deltaNode}
        {!loading && sparkline && <Sparkline className="ui-stat-card__sparkline" values={sparkline} height={32} />}
        {footer && <div className="ui-stat-card__footer">{footer}</div>}
      </div>
    </div>
  );
}
