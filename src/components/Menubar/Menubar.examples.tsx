import { Button } from '../Button/Button';
import type { MenuItem } from '../Menu/types';
import { Menubar } from './Menubar';

const siteItems: MenuItem[] = [
  { label: 'Home', href: '#home' },
  { label: 'Products', items: [{ label: 'Laptops', href: '#laptops' }, { label: 'Phones', href: '#phones' }, { label: 'Accessories', href: '#accessories' }] },
  { label: 'Support', items: [{ label: 'Docs', href: '#docs' }, { label: 'Contact', href: '#contact' }] },
  { label: 'Pricing', href: '#pricing' },
];

const appItems: MenuItem[] = [
  { label: 'File', items: [{ label: 'New', shortcut: '⌘N' }, { label: 'Open…', shortcut: '⌘O' }, { label: 'Export', items: [{ label: 'PDF' }, { label: 'CSV' }] }] },
  { label: 'Edit', items: [{ label: 'Undo', shortcut: '⌘Z' }, { label: 'Redo', shortcut: '⇧⌘Z' }] },
  { label: 'View', items: [{ label: 'Show sidebar', checked: true }, { label: 'Compact', checked: false }] },
  { label: 'Help', items: [{ label: 'Keyboard shortcuts' }] },
];

export const examples = [
  {
    title: 'Site navigation (disclosure)',
    description: 'All leaves have href → nav landmark with disclosure buttons; no menu roles. Collapses into a toggler below the lg breakpoint.',
    code: `<Menubar items={siteItems} activeHref="#phones" start={<strong>Acme</strong>} end={<Button size="sm">Sign in</Button>} />`,
    render: () => <Menubar items={siteItems} activeHref="#phones" start={<strong>Acme</strong>} end={<Button size="sm">Sign in</Button>} />,
  },
  {
    title: 'Application menubar',
    description: 'Items with commands → APG menubar: one tab stop, arrows move between menus, submenus follow TieredMenu.',
    code: `<Menubar items={appItems} ariaLabel="Editor" openOnHover />`,
    render: () => <Menubar items={appItems} ariaLabel="Editor" openOnHover />,
  },
];
