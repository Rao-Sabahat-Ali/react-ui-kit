import { useLayoutEffect, useRef, useState, type HTMLAttributes, type ReactNode, type Ref } from 'react';
import { useAssemble } from '../../motion/useAssemble';
import { mergeRefs } from '../../utils/element';
import { useLocale } from '../../locale/LocaleProvider';
import { cx } from '../../utils/cx';

export type TimelineAlign = 'left' | 'right' | 'alternate' | 'top' | 'bottom';
export type TimelineLayout = 'vertical' | 'horizontal';

export interface TimelineProps<T> extends Omit<HTMLAttributes<HTMLOListElement>, 'children' | 'content'> {
  value: T[];
  content: (item: T, index: number) => ReactNode;
  /** Content on the opposite side of the marker (typically the date). */
  opposite?: (item: T, index: number) => ReactNode;
  /** Custom marker; defaults to a dot. */
  marker?: (item: T, index: number) => ReactNode;
  /** When provided, the opposite content is wrapped in `<time dateTime>`. */
  date?: (item: T) => Date | string | null | undefined;
  align?: TimelineAlign;
  layout?: TimelineLayout;
  /** Number the default markers (1, 2, 3 ...). Use only when the order carries meaning. */
  numbered?: boolean;
  /** Events assemble along the guide line the first time the timeline scrolls into view. Default true. */
  animate?: boolean;
  ref?: Ref<HTMLOListElement>;
}

const toIso = (value: Date | string): string => (value instanceof Date ? (isNaN(value.getTime()) ? '' : value.toISOString()) : value);

export function Timeline<T>({ value, content, opposite, marker, date, align, layout = 'vertical', numbered = false, animate = true, className, 'aria-label': ariaLabel, ref, ...rest }: TimelineProps<T>) {
  const { t } = useLocale();
  const horizontal = layout === 'horizontal';
  const resolved: TimelineAlign = align ?? (horizontal ? 'top' : 'left');
  const listRef = useRef<HTMLOListElement | null>(null);

  // First view: the events assemble once, when the timeline first enters the viewport (never before, never again).
  const [seen, setSeen] = useState(false);
  useLayoutEffect(() => {
    const el = listRef.current;
    if (!animate || !el || seen) return;
    const inView = () => {
      const r = el.getBoundingClientRect();
      return r.bottom > 0 && r.top < window.innerHeight && r.right > 0 && r.left < window.innerWidth;
    };
    if (typeof IntersectionObserver === 'undefined' || inView()) {
      setSeen(true);
      return;
    }
    const observer = new IntersectionObserver((entries) => {
      if (entries.some((e) => e.isIntersecting)) {
        setSeen(true);
        observer.disconnect();
      }
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, [animate, seen]);
  // `trigger` stays constant: the assembly plays once, when `enabled` first becomes true.
  useAssemble(listRef, { parts: ':scope > .ui-timeline__event', guide: '.ui-timeline__connector', axis: horizontal ? 'inline' : 'block', enabled: animate && seen });

  return (
    <ol ref={mergeRefs(listRef, ref)} aria-label={ariaLabel ?? t('timeline')} className={cx('ui-timeline list-unstyled mb-0', `ui-timeline--${layout}`, `ui-timeline--${resolved}`, className)} {...rest}>
      {value.map((item, index) => {
        const when = date?.(item);
        const iso = when ? toIso(when) : '';
        const side = opposite?.(item, index);
        const oppositeNode =
          iso && (side !== undefined || when) ? (
            <time dateTime={iso}>{side ?? (when instanceof Date ? when.toLocaleDateString() : when)}</time>
          ) : (
            side
          );
        return (
          <li key={index} className={cx('ui-timeline__event', index % 2 === 1 && 'ui-timeline__event--even')}>
            <div className="ui-timeline__opposite">{oppositeNode}</div>
            <div className="ui-timeline__separator" aria-hidden="true">
              {marker ? marker(item, index) : numbered ? <span className="ui-timeline__marker ui-timeline__marker--number">{index + 1}</span> : <span className="ui-timeline__marker" />}
              {index < value.length - 1 && <span className="ui-timeline__connector" />}
            </div>
            <div className="ui-timeline__content">{content(item, index)}</div>
          </li>
        );
      })}
    </ol>
  );
}
