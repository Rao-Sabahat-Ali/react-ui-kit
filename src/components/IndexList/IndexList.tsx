import type { HTMLAttributes, ReactNode } from 'react';
import { cx } from '../../utils/cx';
import { routerLinkHandler } from '../../utils/navigation';
import { safeUrl } from '../../utils/url';

export interface IndexListProps extends HTMLAttributes<HTMLUListElement> {
  /** Responsive columns for compact lists such as topic indexes. */
  columns?: 1 | 2 | 3;
}

/** A ruled list of things the user opens or acts on (replaces grids of equal cards). */
export function IndexList({ columns = 1, className, children, ...rest }: IndexListProps) {
  const cols = columns === 2 || columns === 3 ? columns : 1;
  return (
    <ul className={cx('ui-index', `ui-index--cols-${cols}`, className)} {...rest}>
      {children}
    </ul>
  );
}

export interface IndexItemProps extends Omit<HTMLAttributes<HTMLLIElement>, 'title'> {
  title: ReactNode;
  titleAs?: 'h2' | 'h3' | 'h4' | 'span';
  description?: ReactNode;
  meta?: ReactNode;
  /** Trailing control, usually an outline Button or a Tag. */
  action?: ReactNode;
  /** Makes the row a link (stretched link on the title). */
  href?: string;
  onNavigate?: (href: string) => void;
}

export function IndexItem({ title, titleAs: Title = 'h3', description, meta, action, href, onNavigate, lang, className, ...rest }: IndexItemProps) {
  const link = safeUrl(href);
  const titleContent = link ? (
    <a href={link} className="stretched-link" lang={lang} onClick={routerLinkHandler(link, onNavigate ? (h) => onNavigate(h) : undefined)}>
      {title}
    </a>
  ) : lang ? (
    <span lang={lang}>{title}</span>
  ) : (
    title
  );
  return (
    <li className={cx('ui-index__item', link && 'ui-index__item--link', className)} {...rest}>
      <div className="ui-index__body">
        <Title className="ui-index__title">{titleContent}</Title>
        {description !== undefined && <p className="ui-index__description">{description}</p>}
        {meta !== undefined && <p className="ui-index__meta">{meta}</p>}
      </div>
      {action !== undefined && <div className="ui-index__action">{action}</div>}
    </li>
  );
}
