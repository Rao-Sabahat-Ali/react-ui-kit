import type { CSSProperties, HTMLAttributes } from 'react';
import { cx } from '../../utils/cx';

export interface SkeletonProps extends HTMLAttributes<HTMLSpanElement> {
  shape?: 'text' | 'rect' | 'circle';
  width?: CSSProperties['width'];
  height?: CSSProperties['height'];
  lines?: number;
  animation?: 'wave' | 'glow' | 'none';
}

export function Skeleton({ shape = 'text', width, height, lines = 1, animation = 'wave', className, style, ...rest }: SkeletonProps) {
  const wrapper = cx('ui-skeleton', animation !== 'none' && `placeholder-${animation}`, className);
  const item = (key: number, w?: CSSProperties['width']) => (
    <span
      key={key}
      className={cx('placeholder ui-skeleton__item', `ui-skeleton--${shape}`, shape === 'text' && 'col-12')}
      style={{ width: w ?? width, height, ...style }}
    />
  );
  return (
    <span aria-hidden="true" className={wrapper} {...rest}>
      {shape === 'text' && lines > 1 ? Array.from({ length: lines }, (_, i) => item(i, i === lines - 1 ? '60%' : undefined)) : item(0)}
    </span>
  );
}
