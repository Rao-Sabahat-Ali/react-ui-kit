import type { ReactNode } from 'react';
import { AppShell, SidebarNav, ThemeToggle, Topbar, type IconName } from '@sabahat/react-ui-kit';

export interface DemoNavItem {
  label: string;
  href: string;
  icon: IconName;
  section?: string;
}

/**
 * Docs-only frame for blueprints that are page content (overview, settings, detail): the app shell a real app would
 * provide, embedded in the docs page. The blueprint screens themselves never depend on it.
 */
export function DemoShell({
  brand,
  nav,
  active,
  onNavigate,
  children,
}: {
  brand: string;
  nav: DemoNavItem[];
  active: string;
  onNavigate: (href: string) => void;
  children: ReactNode;
}) {
  return (
    <AppShell
      variant="sidebar"
      className="ui-app-shell--embedded"
      topbar={<Topbar brand={brand} sticky={false} actions={<ThemeToggle size="sm" />} />}
      sidebar={<SidebarNav items={nav} activeHref={active} onNavigate={(href) => onNavigate(href)} />}
    >
      {children}
    </AppShell>
  );
}
