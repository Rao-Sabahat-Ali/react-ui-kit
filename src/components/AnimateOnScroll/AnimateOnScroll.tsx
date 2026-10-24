import { useLayoutEffect, useRef, useState, type CSSProperties, type HTMLAttributes, type Ref } from 'react';
import { cx } from '../../utils/cx';

export interface AnimateOnScrollProps extends HTMLAttributes<HTMLDivElement> {
  /** `fade`: opacity. `slide-up`: opacity plus a short upward translate. */
  preset?: 'fade' | 'slide-up';
  /** Reveal once and stay revealed. `false` hides again when it leaves the viewport. */
  once?: boolean;
  /** Share (0–1) of the element that must be visible. */
  threshold?: number;
  rootMargin?: string;
  /** Transition delay in ms (stagger siblings). */
  delay?: number;
  ref?: Ref<HTMLDivElement>;
}

type Phase = 'idle' | 'pending' | 'visible';

/**
 * Reveals its children with an opacity/transform transition when they first scroll into view.
 * The content is always in the DOM and exposed to assistive technology; server output and first render are
 * visible, the hidden state is armed in a layout effect (before paint) only when animation is possible.
 */
export function AnimateOnScroll({ preset = 'fade', once = true, threshold = 0.1, rootMargin = '0px', delay = 0, className, style, children, ref, ...rest }: AnimateOnScrollProps) {
  const elRef = useRef<HTMLDivElement | null>(null);
  const [phase, setPhase] = useState<Phase>('idle');

  useLayoutEffect(() => {
    const el = elRef.current;
    const reduced = typeof window.matchMedia === 'function' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    // No observer or reduced motion: stay visible, never animate.
    if (!el || reduced || typeof IntersectionObserver === 'undefined') return;
    setPhase('pending');
    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[entries.length - 1];
        if (!entry) return;
        if (entry.isIntersecting) {
          setPhase('visible');
          if (once) observer.disconnect();
        } else if (!once) {
          setPhase('pending');
        }
      },
      { threshold, rootMargin },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [once, threshold, rootMargin]);

  return (
    <div
      ref={(node) => {
        elRef.current = node;
        if (typeof ref === 'function') ref(node);
        else if (ref) ref.current = node;
      }}
      className={cx('ui-animate', `ui-animate--${preset}`, phase === 'pending' && 'ui-animate--pending', className)}
      data-visible={phase === 'pending' ? 'false' : 'true'}
      style={delay ? ({ ...style, transitionDelay: `${delay}ms` } as CSSProperties) : style}
      {...rest}
    >
      {children}
    </div>
  );
}
