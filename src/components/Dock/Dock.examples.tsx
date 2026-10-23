import { Dock, type DockItem } from './Dock';

const items: DockItem[] = [
  { label: 'Home', icon: 'home', href: '#home' },
  { label: 'Search', icon: 'search', command: () => undefined },
  { label: 'Calendar', icon: 'calendar', command: () => undefined },
  { label: 'Settings', icon: 'settings', href: '#settings' },
];

export const examples = [
  {
    title: 'Bottom dock',
    description: 'Single tab stop; arrows move between items (no wrap). Labels appear as tooltips on hover and focus.',
    code: `<Dock items={items} ariaLabel="Launcher" activeHref="#home" />`,
    render: () => <Dock items={items} ariaLabel="Launcher" activeHref="#home" />,
  },
  {
    title: 'Vertical without magnification',
    code: `<Dock items={items} position="left" magnification={false} ariaLabel="Tools" />`,
    render: () => <Dock items={items} position="left" magnification={false} ariaLabel="Tools" />,
  },
];
