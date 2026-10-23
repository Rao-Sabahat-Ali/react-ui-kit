import type { HTMLAttributes } from 'react';
import { useLocale } from '../../locale/LocaleProvider';
import { cx } from '../../utils/cx';
import type { Intent, Size } from '../../types';

export interface SpinnerProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: Intent | 'current';
  type?: 'border' | 'grow';
  size?: Size;
  label?: string;
  /** Hide from assistive tech (e.g. inside a busy Button). */
  decorative?: boolean;
}

export function Spinner({ variant = 'current', type = 'border', size = 'md', label, decorative = false, className, ...rest }: SpinnerProps) {
  const { t } = useLocale();
  const classes = cx(
    'ui-spinner',
    `spinner-${type}`,
    size === 'sm' && `spinner-${type}-sm`,
    size === 'lg' && 'ui-spinner--lg',
    variant !== 'current' && `text-${variant}`,
    className,
  );
  if (decorative) return <span className={classes} aria-hidden="true" {...rest} />;
  return (
    <span className={classes} role="status" {...rest}>
      <span className="visually-hidden">{label ?? t('loading')}</span>
    </span>
  );
}
