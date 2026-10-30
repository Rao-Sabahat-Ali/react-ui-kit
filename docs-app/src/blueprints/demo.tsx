import { useToast } from '@sabahat/react-ui-kit';
import type { DemoNavItem } from './DemoShell';

/** Navigation inside a demo frame is not wired: say so instead of leaving the docs page. */
export function useNotWired() {
  const toast = useToast();
  return (href: string) => toast.info(`${href} is not part of this blueprint`);
}

export const SAAS_NAV: DemoNavItem[] = [
  { label: 'Overview', href: '/', icon: 'home', section: 'Bookkeeping' },
  { label: 'Reports', href: '/reports', icon: 'calendar', section: 'Bookkeeping' },
  { label: 'Settings', href: '/settings', icon: 'settings', section: 'Account' },
];
