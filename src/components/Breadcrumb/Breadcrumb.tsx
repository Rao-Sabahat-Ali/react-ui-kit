import type { CSSProperties, MouseEvent, ReactNode, Ref, SyntheticEvent } from 'react';
import { useLocale } from '../../locale/LocaleProvider';
import { cx } from '../../utils/cx';
import { routerLinkHandler } from '../../utils/navigation';
import { safeUrl } from '../../utils/url';
import { Icon, type IconName } from '../Icon/Icon';
import { Menu } from '../Menu/Menu';
import type { MenuItem, NavigateHandler } from '../Menu/types';

export interface BreadcrumbItem {
  label: string;
  href?: string;
  icon?: IconName;
  command?: (e: { item: BreadcrumbItem; event: SyntheticEvent }) => void;
}

export interface BreadcrumbProps {
  items: BreadcrumbItem[];
  home?: BreadcrumbItem;
  /** Collapse middle items into an overflow menu when there are more than this many. */
  maxItems?: number;
  /** String divider (CSS `--bs-breadcrumb-divider`) or a custom node. */
  separator?: ReactNode;
  ariaLabel?: string;
  onNavigate?: NavigateHandler;
  id?: string;
  className?: string;
  style?: CSSProperties;
  ref?: Ref<HTMLElement>;
}

export function Breadcrumb({ items, home, maxItems, separator, ariaLabel, onNavigate, id, className, style, ref }: BreadcrumbProps) {
  const { t } = useLocale();
  const all = home ? [home, ...items] : items;
  const collapse = maxItems !== undefined && maxItems >= 2 && all.length > maxItems;
  const head = collapse ? all.slice(0, 1) : all;
  const hidden = collapse ? all.slice(1, all.length - (maxItems - 1)) : [];
  const tail = collapse ? all.slice(all.length - (maxItems - 1)) : [];
  // Default separator: a 2px line-art chevron (the kit Icon, mirrored in RTL). A string keeps Bootstrap's text divider.
  const sep: ReactNode = separator ?? <Icon name="chevron-right" directional />;
  const customSeparator = typeof sep !== 'string';
  const dividerStyle = typeof sep === 'string' ? ({ '--bs-breadcrumb-divider': JSON.stringify(sep) } as CSSProperties) : ({ '--bs-breadcrumb-divider': "''" } as CSSProperties);

  const renderEntry = (item: BreadcrumbItem, current: boolean) => {
    const content = (
      <>
        {item.icon && <Icon name={item.icon} className="ui-breadcrumb__icon" />}
        <span className="ui-breadcrumb__label">{item.label}</span>
      </>
    );
    if (current)
      return (
        <span aria-current="page" className="ui-breadcrumb__current">
          {content}
        </span>
      );
    const href = safeUrl(item.href);
    if (href)
      return (
        <a
          href={href}
          className="ui-breadcrumb__link"
          onClick={(event: MouseEvent<HTMLAnchorElement>) => {
            item.command?.({ item, event });
            routerLinkHandler(href, onNavigate)(event);
          }}
        >
          {content}
        </a>
      );
    if (item.command)
      return (
        <button type="button" className="btn btn-link p-0 align-baseline ui-breadcrumb__link" onClick={(event) => item.command?.({ item, event })}>
          {content}
        </button>
      );
    return <span className="ui-breadcrumb__text">{content}</span>;
  };

  const li = (item: BreadcrumbItem, index: number, current: boolean) => (
    <li key={`${item.label}-${index}`} className={cx('breadcrumb-item ui-breadcrumb__item', current && 'active')}>
      {customSeparator && index > 0 && (
        <span className="ui-breadcrumb__separator" aria-hidden="true">
          {sep}
        </span>
      )}
      {renderEntry(item, current)}
    </li>
  );

  const overflowItems: MenuItem[] = hidden.map((item) => ({
    label: item.label,
    icon: item.icon,
    href: item.href,
    command: item.command ? ({ event }) => item.command?.({ item, event }) : undefined,
  }));

  const last = all.length - 1;
  return (
    <nav ref={ref} id={id} aria-label={ariaLabel ?? t('breadcrumb')} className={cx('ui-breadcrumb', !customSeparator && 'ui-breadcrumb--text-divider', className)} style={{ ...dividerStyle, ...style }}>
      <ol className="breadcrumb mb-0">
        {head.map((item, i) => li(item, i, !collapse && i === last))}
        {collapse && (
          <li className="breadcrumb-item ui-breadcrumb__item ui-breadcrumb__overflow">
            {customSeparator && (
              <span className="ui-breadcrumb__separator" aria-hidden="true">
                {sep}
              </span>
            )}
            <Menu
              popup
              items={overflowItems}
              onNavigate={onNavigate}
              trigger={
                <button type="button" className="btn btn-link p-0 align-baseline ui-breadcrumb__more" aria-label={t('breadcrumbMore')}>
                  <Icon name="more-horizontal" />
                </button>
              }
            />
          </li>
        )}
        {tail.map((item, i) => li(item, i + 1 + hidden.length + 1, i === tail.length - 1))}
      </ol>
    </nav>
  );
}
