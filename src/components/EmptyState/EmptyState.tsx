import type { HTMLAttributes, ReactNode } from 'react';
import { cx } from '../../utils/cx';
import { Icon, type IconName } from '../Icon/Icon';

export interface EmptyStateProps extends Omit<HTMLAttributes<HTMLDivElement>, 'title'> {
  icon?: IconName;
  title: ReactNode;
  /** Use `'h1'` when the empty state is the whole page. */
  titleAs?: 'h1' | 'h2' | 'h3' | 'h4';
  description?: ReactNode;
  action?: ReactNode;
  variant?: 'empty' | 'no-results' | 'error' | 'first-run';
  size?: 'sm' | 'md';
  /** Announce the error variant to assistive tech. */
  live?: boolean;
}

const DEFAULT_ICON: Record<NonNullable<EmptyStateProps['variant']>, IconName> = {
  empty: 'info',
  'no-results': 'search',
  error: 'alert-circle',
  'first-run': 'star',
};

export function EmptyState({ icon, title, titleAs: Title = 'h3', description, action, variant = 'empty', size = 'md', live = false, className, ...rest }: EmptyStateProps) {
  return (
    <div role={variant === 'error' && live ? 'alert' : undefined} className={cx('ui-empty-state text-center', `ui-empty-state--${variant}`, `ui-empty-state--${size}`, className)} {...rest}>
      <span className="ui-empty-state__icon">
        <Icon name={icon ?? DEFAULT_ICON[variant]} size={size === 'sm' ? 'md' : 'lg'} />
      </span>
      <Title className="ui-empty-state__title">{title}</Title>
      {description && <p className="ui-empty-state__description">{description}</p>}
      {action && <div className="ui-empty-state__action">{action}</div>}
    </div>
  );
}
