import { useLayoutEffect, useRef, type HTMLAttributes, type Ref } from 'react';
import { useLocale } from '../../locale/LocaleProvider';
import { cx } from '../../utils/cx';
import { EASING, readMotionMs } from '../../motion/tokens';
import { safeAnimate } from '../../motion/env';
import { useCountTick } from '../../motion/useCountTick';

export interface QuantityTickProps extends Omit<HTMLAttributes<HTMLSpanElement>, 'children'> {
  ref?: Ref<HTMLSpanElement>;
  value: number | string;
  /** `Intl.NumberFormat` options for numeric values. */
  format?: Intl.NumberFormatOptions;
  /** Turn the roll off (the value still updates and is still announced). Default true. */
  animate?: boolean;
  /** Announce changes once through a polite live region. Default true; the first render is never announced. */
  announce?: boolean;
}

/**
 * A count that rolls digit by digit when it changes (motion "Tick"). Only changed columns move; the visual digits are
 * `aria-hidden` and a single polite live region carries the whole value, so a screen reader hears one announcement
 * per change, never one per digit. Reduced motion and hidden tabs show the new value at once.
 */
export function QuantityTick({ value, format, animate = true, announce = true, className, ref, ...rest }: QuantityTickProps) {
  const { locale } = useLocale();
  const text = typeof value === 'number' ? new Intl.NumberFormat(locale, format).format(value) : value;
  const { chars, direction } = useCountTick(text, { animate });
  const root = useRef<HTMLSpanElement | null>(null);

  useLayoutEffect(() => {
    const el = root.current;
    if (!el) return;
    const duration = readMotionMs(el, 'part');
    el.querySelectorAll<HTMLElement>('.ui-qty-tick__roll').forEach((roll) => {
      const frames = direction >= 0 ? [{ transform: 'translateY(0)' }, { transform: 'translateY(-50%)' }] : [{ transform: 'translateY(-50%)' }, { transform: 'translateY(0)' }];
      safeAnimate(roll, frames, { duration, easing: EASING.out, fill: 'both', reduced: 'skip' });
    });
  }, [chars, direction]);

  return (
    <span
      ref={(node) => {
        root.current = node;
        if (typeof ref === 'function') ref(node);
        else if (ref) ref.current = node;
      }}
      className={cx('ui-qty-tick ui-tabular', className)}
      {...rest}
    >
      <span className="ui-qty-tick__visual" aria-hidden="true">
        {chars.map((c, i) => (
          <span key={`${chars.length - i}`} className="ui-qty-tick__col">
            {c.prev === null ? (
              c.char
            ) : (
              <span className="ui-qty-tick__roll">
                {direction >= 0 ? (
                  <>
                    <span>{c.prev}</span>
                    <span>{c.char}</span>
                  </>
                ) : (
                  <>
                    <span>{c.char}</span>
                    <span>{c.prev}</span>
                  </>
                )}
              </span>
            )}
          </span>
        ))}
      </span>
      <span className="visually-hidden" role={announce ? 'status' : undefined}>
        {text}
      </span>
    </span>
  );
}
