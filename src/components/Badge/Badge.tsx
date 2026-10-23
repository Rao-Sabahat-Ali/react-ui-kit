import type { HTMLAttributes, ReactNode } from 'react';
import { cx } from '../../utils/cx';
import type { Intent } from '../../types';

export interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  value?: ReactNode;
  variant?: Intent;
  appearance?: 'solid' | 'subtle';
  pill?: boolean;
  dot?: boolean;
  max?: number;
  label?: string;
  overlay?: { children: ReactNode; position?: 'top-end' | 'top-start' | 'bottom-end' | 'bottom-start' };
}

const POSITION = {
  'top-end': 'top-0 start-100',
  'top-start': 'top-0 start-0',
  'bottom-end': 'top-100 start-100',
  'bottom-start': 'top-100 start-0',
} as const;

export function Badge({ value, variant = 'primary', appearance = 'solid', pill = true, dot = false, max = 99, label, overlay, className, ...rest }: BadgeProps) {
  const display = typeof value === 'number' && value > max ? `${max}+` : value;
  const badge = (
    <span
      className={cx(
        'badge ui-badge',
        appearance === 'solid' ? `text-bg-${variant}` : `bg-${variant}-subtle text-${variant}-emphasis`,
        pill && 'rounded-pill',
        dot && 'ui-badge--dot p-1',
        overlay && `position-absolute translate-middle ${POSITION[overlay.position ?? 'top-end']}`,
        className,
      )}
      {...rest}
    >
      {!dot && <span aria-hidden={label ? true : undefined}>{display}</span>}
      {label && <span className="visually-hidden">{label}</span>}
    </span>
  );
  if (!overlay) return badge;
  return (
    <span className="position-relative d-inline-flex ui-badge__overlay">
      {overlay.children}
      {badge}
    </span>
  );
}
