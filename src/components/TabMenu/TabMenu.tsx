import { useEffect, useRef, type CSSProperties, type ReactNode, type Ref } from 'react';
import { useLocale } from '../../locale/LocaleProvider';
import { cx } from '../../utils/cx';
import { routerLinkHandler } from '../../utils/navigation';
import { safeUrl } from '../../utils/url';
import { Icon, type IconName } from '../Icon/Icon';
import type { NavigateHandler } from '../Menu/types';

export interface TabMenuItem {
  label: string;
  href: string;
  icon?: IconName;
  badge?: ReactNode;
}

export interface TabMenuProps {
  items: TabMenuItem[];
  activeHref?: string;
  variant?: 'tabs' | 'pills' | 'underline';
  ariaLabel?: string;
  onNavigate?: NavigateHandler;
  id?: string;
  className?: string;
  style?: CSSProperties;
  ref?: Ref<HTMLElement>;
}

/** Route-level navigation styled as tabs: links with `aria-current="page"`, no tab roles. */
export function TabMenu({ items, activeHref, variant = 'tabs', ariaLabel, onNavigate, id, className, style, ref }: TabMenuProps) {
  const { t } = useLocale();
  const listRef = useRef<HTMLUListElement | null>(null);

  useEffect(() => {
    listRef.current?.querySelector('[aria-current="page"]')?.scrollIntoView?.({ block: 'nearest', inline: 'nearest' });
  }, [activeHref]);

  return (
    <nav ref={ref} id={id} aria-label={ariaLabel ?? t('mainNavigation')} className={cx('ui-tab-menu', className)} style={style}>
      <ul ref={listRef} className={cx('nav flex-nowrap ui-tab-menu__list', `nav-${variant}`)}>
        {items.map((item, index) => {
          const href = safeUrl(item.href);
          const active = href !== undefined && href === activeHref;
          const content = (
            <>
              {item.icon && <Icon name={item.icon} className="ui-tab-menu__icon" />}
              <span>{item.label}</span>
              {item.badge !== undefined && <span className="badge rounded-pill text-bg-secondary ui-tab-menu__badge">{item.badge}</span>}
            </>
          );
          return (
            <li key={`${item.href}-${index}`} className="nav-item">
              {href ? (
                <a href={href} className={cx('nav-link ui-tab-menu__link', active && 'active')} aria-current={active ? 'page' : undefined} onClick={routerLinkHandler(href, onNavigate)}>
                  {content}
                </a>
              ) : (
                <span className="nav-link disabled ui-tab-menu__link" aria-disabled="true">
                  {content}
                </span>
              )}
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
