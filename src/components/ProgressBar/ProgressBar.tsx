import type { HTMLAttributes } from 'react';
import { cx } from '../../utils/cx';
import type { Intent, Size } from '../../types';

export interface ProgressBarProps extends Omit<HTMLAttributes<HTMLDivElement>, 'children'> {
  /** Omit for indeterminate progress. */
  value?: number;
  max?: number;
  variant?: Intent;
  showValue?: boolean;
  striped?: boolean;
  animated?: boolean;
  size?: Size;
  /** Accessible name (required). */
  label: string;
  valueText?: string;
}

export function ProgressBar({ value, max = 100, variant = 'primary', showValue = false, striped = false, animated = false, size = 'md', label, valueText, className, ...rest }: ProgressBarProps) {
  const determinate = value !== undefined;
  const clamped = determinate ? Math.min(Math.max(value, 0), max) : 0;
  const percent = determinate && max > 0 ? (clamped / max) * 100 : 0;
  return (
    <div
      role="progressbar"
      aria-label={label}
      aria-valuemin={determinate ? 0 : undefined}
      aria-valuemax={determinate ? max : undefined}
      aria-valuenow={determinate ? clamped : undefined}
      aria-valuetext={valueText}
      className={cx('progress ui-progress-bar', `ui-progress-bar--${size}`, !determinate && 'ui-progress-bar--indeterminate', className)}
      {...rest}
    >
      <div
        className={cx('progress-bar', `bg-${variant}`, (striped || !determinate) && 'progress-bar-striped', (animated || !determinate) && 'progress-bar-animated')}
        style={{ width: determinate ? `${percent}%` : '100%' }}
      >
        {showValue && determinate && size === 'lg' ? `${Math.round(percent)}%` : null}
      </div>
    </div>
  );
}
