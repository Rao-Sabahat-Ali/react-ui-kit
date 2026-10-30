import { useRef, type MouseEvent, type ReactNode } from 'react';
import { useSlidingMark } from '../../hooks/useSlidingMark';
import { useLocale } from '../../locale/LocaleProvider';
import { cx } from '../../utils/cx';
import { routerLinkHandler } from '../../utils/navigation';
import { safeUrl } from '../../utils/url';
import { Icon, type IconName } from '../Icon/Icon';

export interface BottomNavItem {
  label: string;
  href: string;
  icon: IconName;
  badge?: ReactNode;
}

export interface BottomNavProps {
  items: BottomNavItem[];
  activeHref?: string;
  onNavigate?: (href: string, event: MouseEvent<HTMLAnchorElement>) => void;
  ariaLabel?: string;
  className?: string;
}

export function BottomNav({ items, activeHref, onNavigate, ariaLabel, className }: BottomNavProps) {
  const { t } = useLocale();
  const listRef = useRef<HTMLUListElement>(null);
  useSlidingMark(listRef, { target: '[aria-current="page"]' }, [activeHref, items.length]);
  return (
    <nav aria-label={ariaLabel ?? t('mainNavigation')} className={cx('ui-bottom-nav', className)}>
      <ul ref={listRef} className="ui-bottom-nav__list">
        {items.map((item) => {
          const href = safeUrl(item.href) ?? '#';
          const active = item.href === activeHref;
          return (
            <li key={item.href} className="ui-bottom-nav__item">
              <a href={href} className={cx('ui-bottom-nav__link', active && 'active')} aria-current={active ? 'page' : undefined} onClick={routerLinkHandler(href, onNavigate)}>
                <span className="ui-bottom-nav__icon">
                  <Icon name={item.icon} size="lg" />
                  {item.badge !== undefined && <span className="badge ui-badge text-bg-danger ui-bottom-nav__badge">{item.badge}</span>}
                </span>
                <span className="ui-bottom-nav__label">{item.label}</span>
              </a>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
