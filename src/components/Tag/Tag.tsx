import type { HTMLAttributes, ReactNode } from 'react';
import { cx } from '../../utils/cx';
import type { Intent } from '../../types';
import { Icon, type IconName } from '../Icon/Icon';

export interface TagProps extends HTMLAttributes<HTMLSpanElement> {
  value: ReactNode;
  severity?: Intent;
  appearance?: 'subtle' | 'solid' | 'outline';
  icon?: IconName;
  rounded?: boolean;
}

export function Tag({ value, severity = 'secondary', appearance = 'subtle', icon, rounded = false, className, ...rest }: TagProps) {
  return (
    <span
      className={cx(
        'badge ui-tag',
        appearance === 'solid' && `text-bg-${severity}`,
        appearance === 'subtle' && `bg-${severity}-subtle text-${severity}-emphasis border border-${severity}-subtle`,
        appearance === 'outline' && `border border-${severity} text-${severity}-emphasis`,
        rounded && 'rounded-pill',
        className,
      )}
      {...rest}
    >
      {icon && <Icon name={icon} className="ui-tag__icon" />}
      {value}
    </span>
  );
}
