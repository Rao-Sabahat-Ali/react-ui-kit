import type { HTMLAttributes, ReactNode, Ref } from 'react';
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
  ref?: Ref<HTMLOListElement>;
}

const toIso = (value: Date | string): string => (value instanceof Date ? (isNaN(value.getTime()) ? '' : value.toISOString()) : value);

export function Timeline<T>({ value, content, opposite, marker, date, align, layout = 'vertical', className, 'aria-label': ariaLabel, ref, ...rest }: TimelineProps<T>) {
  const { t } = useLocale();
  const horizontal = layout === 'horizontal';
  const resolved: TimelineAlign = align ?? (horizontal ? 'top' : 'left');

  return (
    <ol ref={ref} aria-label={ariaLabel ?? t('timeline')} className={cx('ui-timeline list-unstyled mb-0', `ui-timeline--${layout}`, `ui-timeline--${resolved}`, className)} {...rest}>
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
              {marker ? marker(item, index) : <span className="ui-timeline__marker" />}
              {index < value.length - 1 && <span className="ui-timeline__connector" />}
            </div>
            <div className="ui-timeline__content">{content(item, index)}</div>
          </li>
        );
      })}
    </ol>
  );
}
