import { useState, type MouseEvent, type ReactNode } from 'react';
import { useLocale } from '../../locale/LocaleProvider';
import { cx } from '../../utils/cx';
import { routerLinkHandler } from '../../utils/navigation';
import { safeUrl } from '../../utils/url';
import { useAppShell } from '../AppShell/AppShell';
import { Icon, type IconName } from '../Icon/Icon';

export interface SidebarNavItem {
  label: string;
  href?: string;
  icon?: IconName;
  badge?: ReactNode;
  items?: SidebarNavItem[];
  section?: string;
}

export interface SidebarNavProps {
  items: SidebarNavItem[];
  activeHref?: string;
  collapsed?: boolean;
  footer?: ReactNode;
  ariaLabel?: string;
  onNavigate?: (href: string, event: MouseEvent<HTMLAnchorElement>) => void;
  className?: string;
}

const containsActive = (item: SidebarNavItem, active?: string): boolean =>
  active !== undefined && (item.href === active || Boolean(item.items?.some((child) => containsActive(child, active))));

export function SidebarNav({ items, activeHref, collapsed: collapsedProp, footer, ariaLabel, onNavigate, className }: SidebarNavProps) {
  const { t } = useLocale();
  const shell = useAppShell();
  const collapsed = collapsedProp ?? shell?.collapsed ?? false;
  const afterNavigate = () => shell?.setMobileNavOpen(false);
  let lastSection: string | undefined;

  return (
    <nav aria-label={ariaLabel ?? t('mainNavigation')} className={cx('ui-sidebar-nav', collapsed && 'ui-sidebar-nav--collapsed', className)}>
      <ul className="nav flex-column ui-sidebar-nav__list">
        {items.map((item, index) => {
          const heading = item.section && item.section !== lastSection ? item.section : undefined;
          lastSection = item.section;
          return (
            <li key={`${item.label}-${index}`} className="nav-item">
              {heading && !collapsed && <div className="ui-sidebar-nav__section">{heading}</div>}
              <NavEntry item={item} activeHref={activeHref} collapsed={collapsed} onNavigate={onNavigate} afterNavigate={afterNavigate} depth={0} />
            </li>
          );
        })}
      </ul>
      {footer && <div className="ui-sidebar-nav__footer">{footer}</div>}
    </nav>
  );
}

interface NavEntryProps {
  item: SidebarNavItem;
  activeHref?: string;
  collapsed: boolean;
  onNavigate?: SidebarNavProps['onNavigate'];
  afterNavigate: () => void;
  depth: number;
}

function NavEntry({ item, activeHref, collapsed, onNavigate, afterNavigate, depth }: NavEntryProps) {
  const [open, setOpen] = useState(() => containsActive(item, activeHref));
  const content = (
    <>
      {item.icon && <Icon name={item.icon} className="ui-sidebar-nav__icon" />}
      <span className={cx('ui-sidebar-nav__label', collapsed && 'visually-hidden')}>{item.label}</span>
      {item.badge !== undefined && !collapsed && <span className="badge rounded-pill text-bg-secondary ui-sidebar-nav__badge">{item.badge}</span>}
    </>
  );

  if (item.items?.length) {
    return (
      <>
        <button type="button" className="nav-link ui-sidebar-nav__link ui-sidebar-nav__group" aria-expanded={open} title={collapsed ? item.label : undefined} onClick={() => setOpen((o) => !o)}>
          {content}
          {!collapsed && <Icon name={open ? 'chevron-up' : 'chevron-down'} size="sm" className="ui-sidebar-nav__chevron" />}
        </button>
        {open && (
          <ul className="nav flex-column ui-sidebar-nav__sublist">
            {item.items.map((child, i) => (
              <li key={`${child.label}-${i}`} className="nav-item">
                <NavEntry item={child} activeHref={activeHref} collapsed={collapsed} onNavigate={onNavigate} afterNavigate={afterNavigate} depth={depth + 1} />
              </li>
            ))}
          </ul>
        )}
      </>
    );
  }

  const href = safeUrl(item.href) ?? '#';
  const active = item.href !== undefined && item.href === activeHref;
  return (
    <a
      href={href}
      className={cx('nav-link ui-sidebar-nav__link', active && 'active')}
      aria-current={active ? 'page' : undefined}
      title={collapsed ? item.label : undefined}
      onClick={routerLinkHandler(href, onNavigate, afterNavigate)}
    >
      {content}
    </a>
  );
}
