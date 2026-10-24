import type { CSSProperties, HTMLAttributes, ReactNode, Ref } from 'react';
import { useLocale } from '../../locale/LocaleProvider';
import { cx } from '../../utils/cx';
import type { Intent, Size } from '../../types';

export interface ProgressCircleProps extends Omit<HTMLAttributes<HTMLDivElement>, 'children' | 'role'> {
  /** Omit for indeterminate progress. */
  value?: number;
  max?: number;
  /** Accessible name (required). */
  label: string;
  /** Defaults to the percentage formatted for the locale. */
  valueText?: string;
  /** 40 / 64 / 96 px presets or a pixel number. */
  size?: Size | number;
  /** Ring thickness in px; defaults to size / 8. */
  strokeWidth?: number;
  variant?: 'accent' | Intent;
  /** Percentage in the centre (ignored when `children` is given). */
  showValue?: boolean;
  /** Centre content. */
  children?: ReactNode;
  ref?: Ref<HTMLDivElement>;
}

const SIZES: Record<Size, number> = { sm: 40, md: 64, lg: 96 };

export function ProgressCircle({ value, max = 100, label, valueText, size = 'md', strokeWidth, variant = 'accent', showValue = false, children, className, style, ref, ...rest }: ProgressCircleProps) {
  const { locale } = useLocale();
  const px = typeof size === 'number' ? Math.max(16, size) : SIZES[size];
  const stroke = Math.min(Math.max(strokeWidth ?? Math.round((px / 8) * 10) / 10, 1), px / 2);
  const radius = (px - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const determinate = value !== undefined;
  const clamped = determinate ? Math.min(Math.max(value, 0), max) : 0;
  const fraction = determinate && max > 0 ? clamped / max : 0;
  const percentText = new Intl.NumberFormat(locale, { style: 'percent', maximumFractionDigits: 0 }).format(fraction);
  const dash = determinate ? `${circumference} ${circumference}` : `${circumference * 0.25} ${circumference}`;
  const offset = determinate ? circumference * (1 - fraction) : 0;
  const centre = children ?? (showValue && determinate ? percentText : null);

  return (
    <div
      ref={ref}
      role="progressbar"
      aria-label={label}
      aria-valuemin={determinate ? 0 : undefined}
      aria-valuemax={determinate ? max : undefined}
      aria-valuenow={determinate ? clamped : undefined}
      aria-valuetext={determinate ? (valueText ?? percentText) : valueText}
      className={cx('ui-progress-circle', `ui-progress-circle--${variant}`, !determinate && 'ui-progress-circle--indeterminate', className)}
      style={{ '--ui-progress-circle-size': `${px}px`, ...style } as CSSProperties}
      {...rest}
    >
      <svg className="ui-progress-circle__svg" width={px} height={px} viewBox={`0 0 ${px} ${px}`} aria-hidden="true" focusable="false">
        <circle className="ui-progress-circle__track" cx={px / 2} cy={px / 2} r={radius} fill="none" strokeWidth={stroke} />
        <circle
          className="ui-progress-circle__value"
          cx={px / 2}
          cy={px / 2}
          r={radius}
          fill="none"
          strokeWidth={stroke}
          strokeLinecap={fraction >= 1 ? 'butt' : 'round'}
          strokeDasharray={dash}
          strokeDashoffset={offset}
          transform={`rotate(-90 ${px / 2} ${px / 2})`}
        />
      </svg>
      {centre !== null && centre !== undefined && <div className="ui-progress-circle__content">{centre}</div>}
    </div>
  );
}
