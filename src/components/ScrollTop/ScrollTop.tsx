import { useEffect, useRef, useState, type ButtonHTMLAttributes, type Ref } from 'react';
import { usePrefersReducedMotion } from '../../hooks/useMediaQuery';
import { usePresence } from '../../motion/usePresence';
import { useLocale } from '../../locale/LocaleProvider';
import { cx } from '../../utils/cx';
import { Icon } from '../Icon/Icon';

export interface ScrollTopProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'children'> {
  /** Scroll distance in px after which the button appears. */
  threshold?: number;
  /** `window` scrolls the page; `parent` scrolls the nearest container (the button's parent element). */
  target?: 'window' | 'parent';
  behavior?: 'smooth' | 'auto';
  /** Accessible name; defaults to the locale `scrollTop` message. */
  label?: string;
  ref?: Ref<HTMLButtonElement>;
}

/** The element keyboard users land on after scrolling: skip-link target, then `main`. */
function findPageTop(): HTMLElement | null {
  return document.querySelector<HTMLElement>('[data-skip-target], #main-content, main, [role="main"]');
}

export function ScrollTop({ threshold = 400, target = 'window', behavior = 'smooth', label, className, onClick, ref, ...rest }: ScrollTopProps) {
  const { t } = useLocale();
  const reduced = usePrefersReducedMotion();
  const [visible, setVisible] = useState(false);
  const innerRef = useRef<HTMLButtonElement | null>(null);
  // Stays mounted (hidden) so `target="parent"` can find its scroller; presence keeps it visible while it leaves.
  const { present, state } = usePresence(visible);

  useEffect(() => {
    const scroller: Window | HTMLElement | null = target === 'window' ? window : innerRef.current?.parentElement ?? null;
    if (!scroller) return;
    const read = () => ('scrollY' in scroller ? scroller.scrollY : scroller.scrollTop);
    const update = () => setVisible(read() > threshold);
    update();
    scroller.addEventListener('scroll', update, { passive: true });
    return () => scroller.removeEventListener('scroll', update);
  }, [target, threshold]);

  const handleClick: ButtonHTMLAttributes<HTMLButtonElement>['onClick'] = (event) => {
    onClick?.(event);
    if (event.defaultPrevented) return;
    const effective = reduced ? 'auto' : behavior;
    const parent = innerRef.current?.parentElement;
    if (target === 'parent' && parent) parent.scrollTo({ top: 0, behavior: effective });
    else window.scrollTo({ top: 0, behavior: effective });
    const top = findPageTop() ?? (target === 'parent' ? parent ?? null : null);
    if (top) {
      if (!top.hasAttribute('tabindex')) {
        top.setAttribute('tabindex', '-1');
        top.addEventListener('blur', () => top.removeAttribute('tabindex'), { once: true });
      }
      top.focus({ preventScroll: true });
    }
  };

  return (
    <button
      ref={(node) => {
        innerRef.current = node;
        if (typeof ref === 'function') ref(node);
        else if (ref) ref.current = node;
      }}
      type="button"
      hidden={!present}
      data-state={state}
      aria-label={label ?? t('scrollTop')}
      className={cx('ui-scroll-top', target === 'parent' && 'ui-scroll-top--parent', className)}
      onClick={handleClick}
      {...rest}
    >
      <Icon name="arrow-up" />
    </button>
  );
}
