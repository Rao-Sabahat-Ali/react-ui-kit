import type { CSSProperties, HTMLAttributes } from 'react';
import { cx } from '../../utils/cx';
import type { Intent, Size } from '../../types';

export interface ProgressBarProps extends Omit<HTMLAttributes<HTMLDivElement>, 'children'> {
  /** Omit for indeterminate progress. */
  value?: number;
  max?: number;
  /** Fill colour. `primary` (the default) is the accent: progress is an accent job, ink is for the main button. */
  variant?: Intent;
  /** Writes the percentage beside the track as a quantity mark (`lg` only). */
  showValue?: boolean;
  /** Kept for compatibility; the sheet has no stripes, so it does not change the drawing. */
  striped?: boolean;
  /** Determinate bars breathe softly; indeterminate bars always travel. */
  animated?: boolean;
  size?: Size;
  /** Accessible name (required). */
  label: string;
  valueText?: string;
}

export function ProgressBar({ value, max = 100, variant = 'primary', showValue = false, striped = false, animated = false, size = 'md', label, valueText, className, style, ...rest }: ProgressBarProps) {
  const determinate = value !== undefined;
  const clamped = determinate ? Math.min(Math.max(value, 0), max) : 0;
  const fraction = determinate && max > 0 ? clamped / max : 0;
  const percent = fraction * 100;
  return (
    <div
      role="progressbar"
      aria-label={label}
      aria-valuemin={determinate ? 0 : undefined}
      aria-valuemax={determinate ? max : undefined}
      aria-valuenow={determinate ? clamped : undefined}
      aria-valuetext={valueText}
      className={cx('ui-progress-bar', `ui-progress-bar--${size}`, `ui-progress-bar--${variant}`, !determinate && 'ui-progress-bar--indeterminate', className)}
      style={style}
      {...rest}
    >
      <div className="progress ui-progress-bar__track">
        <div
          className={cx('progress-bar ui-progress-bar__fill', (striped || !determinate) && 'progress-bar-striped', (animated || !determinate) && 'progress-bar-animated')}
          style={determinate ? ({ '--ui-progress-value': fraction } as CSSProperties) : undefined}
        />
      </div>
      {showValue && determinate && size === 'lg' ? <span className="ui-progress-bar__value">{`${Math.round(percent)}%`}</span> : null}
    </div>
  );
}
