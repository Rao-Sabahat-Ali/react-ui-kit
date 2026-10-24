import { createContext, useContext, type HTMLAttributes, type ReactNode, type Ref } from 'react';
import { useLocale } from '../../locale/LocaleProvider';
import { cx } from '../../utils/cx';
import { CopyButton } from '../CopyButton/CopyButton';

type Columns = 1 | 2 | 3;

interface ListContext {
  emptyText: string;
}
const Context = createContext<ListContext>({ emptyText: '—' });

export interface DescriptionListProps extends Omit<HTMLAttributes<HTMLDListElement>, 'children'> {
  /** Columns from `md` up (always one below). Clamped to 1–3. */
  columns?: Columns;
  layout?: 'stacked' | 'inline';
  ruled?: boolean;
  /** Shown for empty values. */
  emptyText?: string;
  children?: ReactNode;
  ref?: Ref<HTMLDListElement>;
}

const clampColumns = (n: number | undefined): Columns => (n === undefined ? 1 : (Math.min(3, Math.max(1, Math.round(n) || 1)) as Columns));

export function DescriptionList({ columns = 1, layout = 'stacked', ruled = false, emptyText = '—', className, children, ref, ...rest }: DescriptionListProps) {
  return (
    <Context.Provider value={{ emptyText }}>
      <dl ref={ref} className={cx('ui-description-list', `ui-description-list--cols-${clampColumns(columns)}`, `ui-description-list--${layout}`, ruled && 'ui-description-list--ruled', className)} {...rest}>
        {children}
      </dl>
    </Context.Provider>
  );
}

export interface DescriptionItemProps {
  term: ReactNode;
  children?: ReactNode;
  /** Adds a copy button; a string overrides the copied text. */
  copyable?: boolean | string;
  /** Columns the item spans. */
  span?: Columns;
  className?: string;
}

const isEmpty = (node: ReactNode) => node === null || node === undefined || node === false || node === '';

export function DescriptionItem({ term, children, copyable = false, span = 1, className }: DescriptionItemProps) {
  const { emptyText } = useContext(Context);
  const { t } = useLocale();
  const empty = isEmpty(children);
  const copyValue = typeof copyable === 'string' ? copyable : copyable && (typeof children === 'string' || typeof children === 'number') ? String(children) : undefined;
  const showCopy = !empty && copyValue !== undefined;

  return (
    <div className={cx('ui-description-list__item', span > 1 && `ui-description-list__item--span-${clampColumns(span)}`, className)}>
      <dt className="ui-description-list__term">{term}</dt>
      <dd className="ui-description-list__value">
        {empty ? (
          <span className="ui-description-list__empty">
            <span aria-hidden="true">{emptyText}</span>
            <span className="visually-hidden">{t('emptyValue')}</span>
          </span>
        ) : (
          <span className="ui-description-list__text">{children}</span>
        )}
        {showCopy && (
          <CopyButton
            className="ui-description-list__copy"
            iconOnly
            size="sm"
            value={copyValue}
            label={typeof term === 'string' ? t('copyLabel', { label: term }) : t('copy')}
          />
        )}
      </dd>
    </div>
  );
}
