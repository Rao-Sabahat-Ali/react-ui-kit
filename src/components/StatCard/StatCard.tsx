import type { HTMLAttributes, ReactNode } from 'react';
import { useLocale } from '../../locale/LocaleProvider';
import { cx } from '../../utils/cx';
import { safeUrl } from '../../utils/url';
import { Icon, type IconName } from '../Icon/Icon';
import { Skeleton } from '../Skeleton/Skeleton';

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
}

function Sparkline({ values }: { values: number[] }) {
  if (values.length < 2) return null;
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;
  const points = values.map((v, i) => `${(i / (values.length - 1)) * 100},${30 - ((v - min) / range) * 28 - 1}`).join(' ');
  return (
    <svg className="ui-stat-card__sparkline" viewBox="0 0 100 30" preserveAspectRatio="none" aria-hidden="true" focusable="false">
      <polyline points={points} fill="none" stroke="currentColor" strokeWidth="2" vectorEffect="non-scaling-stroke" />
    </svg>
  );
}

export function StatCard({ label, value, format, delta, deltaLabel, invertDelta = false, icon, sparkline, loading = false, href, footer, className, ...rest }: StatCardProps) {
  const { t, locale } = useLocale();
  const display = typeof value === 'number' ? new Intl.NumberFormat(locale, format).format(value) : value;
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
    <div className={cx('card ui-stat-card', link && 'ui-stat-card--interactive', className)} {...rest}>
      <div className="card-body">
        <div className="ui-stat-card__header">
          <span className="ui-stat-card__label">
            {link ? (
              <a href={link} className="stretched-link">
                {label}
              </a>
            ) : (
              label
            )}
          </span>
          {icon && (
            <span className="ui-stat-card__icon">
              <Icon name={icon} />
            </span>
          )}
        </div>
        {loading ? (
          <Skeleton width="60%" height="2rem" />
        ) : (
          <div className="ui-stat-card__value ui-tabular">{display}</div>
        )}
        {!loading && deltaNode}
        {!loading && sparkline && <Sparkline values={sparkline} />}
        {footer && <div className="ui-stat-card__footer">{footer}</div>}
      </div>
    </div>
  );
}
