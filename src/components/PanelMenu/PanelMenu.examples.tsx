import type { MenuItem } from '../Menu/types';
import { PanelMenu } from './PanelMenu';

const items: MenuItem[] = [
  { key: 'account', label: 'Account', icon: 'user', items: [{ label: 'Profile', href: '#profile' }, { label: 'Security', href: '#security' }] },
  { key: 'billing', label: 'Billing', icon: 'calendar', items: [{ label: 'Invoices', href: '#invoices', badge: 3 }, { label: 'Payment methods', href: '#payment' }] },
  { key: 'advanced', label: 'Advanced', icon: 'settings', items: [{ label: 'Export data', command: () => undefined }, { label: 'Delete account', disabled: true }] },
];

export const examples = [
  {
    title: 'Settings navigation',
    description: 'The section containing activeKey starts expanded; one section open at a time unless `multiple`.',
    code: `<PanelMenu items={items} activeKey="#invoices" ariaLabel="Settings" />`,
    render: () => (
      <div style={{ maxWidth: '18rem' }}>
        <PanelMenu items={items} activeKey="#invoices" ariaLabel="Settings" />
      </div>
    ),
  },
  {
    title: 'Multiple open',
    code: `<PanelMenu items={items} multiple defaultExpandedKeys={['account', 'billing']} ariaLabel="Settings" />`,
    render: () => (
      <div style={{ maxWidth: '18rem' }}>
        <PanelMenu items={items} multiple defaultExpandedKeys={['account', 'billing']} ariaLabel="Settings (multiple)" />
      </div>
    ),
  },
];
