import { useEffect, useRef, useState, type CSSProperties, type HTMLAttributes } from 'react';
import { cx } from '../../utils/cx';

export interface SkeletonProps extends HTMLAttributes<HTMLSpanElement> {
  shape?: 'text' | 'rect' | 'circle';
  width?: CSSProperties['width'];
  height?: CSSProperties['height'];
  lines?: number;
  /** `wave`: a band sweeps across (1.4s). `glow`: a slow breath. `none`: still. Both stop offscreen and under reduced motion. */
  animation?: 'wave' | 'glow' | 'none';
}

export function Skeleton({ shape = 'text', width, height, lines = 1, animation = 'wave', className, style, ...rest }: SkeletonProps) {
  const ref = useRef<HTMLSpanElement>(null);
  const [offscreen, setOffscreen] = useState(false);

  // A skeleton that is not on screen has nothing to show: pause its animation until it scrolls back.
  useEffect(() => {
    const el = ref.current;
    if (!el || animation === 'none' || typeof IntersectionObserver === 'undefined') return;
    const observer = new IntersectionObserver((entries) => {
      const entry = entries[entries.length - 1];
      if (entry) setOffscreen(!entry.isIntersecting);
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, [animation]);

  const wrapper = cx('ui-skeleton', animation !== 'none' && `placeholder-${animation}`, className);
  const item = (key: number, w?: CSSProperties['width']) => (
    <span
      key={key}
      className={cx('placeholder ui-skeleton__item', `ui-skeleton--${shape}`, shape === 'text' && 'col-12')}
      style={{ width: w ?? width, height, ...style }}
    />
  );
  return (
    <span ref={ref} aria-hidden="true" className={wrapper} data-paused={offscreen ? 'true' : undefined} {...rest}>
      {shape === 'text' && lines > 1 ? Array.from({ length: lines }, (_, i) => item(i, i === lines - 1 ? '60%' : undefined)) : item(0)}
    </span>
  );
}
