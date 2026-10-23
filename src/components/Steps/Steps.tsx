import type { CSSProperties, ReactNode, Ref } from 'react';
import { useLocale } from '../../locale/LocaleProvider';
import { cx } from '../../utils/cx';
import { Icon } from '../Icon/Icon';

/** TODO: move to locale key `stepError` (not yet in en.ts). */

export type StepStatus = 'complete' | 'current' | 'upcoming' | 'error';

export interface StepItem {
  label: string;
  description?: ReactNode;
  status?: StepStatus;
}

export interface StepsProps {
  items: StepItem[];
  activeIndex?: number;
  onSelect?: (index: number) => void;
  /** Read-only steps are not interactive. */
  readOnly?: boolean;
  orientation?: 'horizontal' | 'vertical';
  ariaLabel?: string;
  id?: string;
  className?: string;
  style?: CSSProperties;
  ref?: Ref<HTMLOListElement>;
}

/** Progress indicator for a multi-step process (ordered list, `aria-current="step"`). */
export function Steps({ items, activeIndex = 0, onSelect, readOnly = true, orientation = 'horizontal', ariaLabel, id, className, style, ref }: StepsProps) {
  const { t } = useLocale();
  const total = items.length;
  return (
    <ol ref={ref} id={id} aria-label={ariaLabel} className={cx('ui-steps', `ui-steps--${orientation}`, !readOnly && 'ui-steps--interactive', className)} style={style}>
      {items.map((item, index) => {
        const status: StepStatus = item.status ?? (index < activeIndex ? 'complete' : index === activeIndex ? 'current' : 'upcoming');
        const current = index === activeIndex;
        const statusText = status === 'complete' ? t('completed') : status === 'error' ? t('stepError') : undefined;
        const marker = (
          <span className="ui-steps__marker" aria-hidden="true">
            {status === 'complete' ? <Icon name="check" /> : status === 'error' ? <Icon name="alert-triangle" /> : index + 1}
          </span>
        );
        const text = (
          <span className="ui-steps__text">
            <span className="visually-hidden">{t('stepOf', { index: index + 1, total })}: </span>
            <span className="ui-steps__label">{item.label}</span>
            {statusText && <span className="visually-hidden">, {statusText}</span>}
            {item.description && <span className="ui-steps__description">{item.description}</span>}
          </span>
        );
        return (
          <li key={`${item.label}-${index}`} className={cx('ui-steps__item', `ui-steps__item--${status}`)} aria-current={current ? 'step' : undefined}>
            {readOnly ? (
              <span className="ui-steps__content">
                {marker}
                {text}
              </span>
            ) : (
              <button type="button" className="ui-steps__content ui-steps__button" onClick={() => onSelect?.(index)}>
                {marker}
                {text}
              </button>
            )}
          </li>
        );
      })}
    </ol>
  );
}
