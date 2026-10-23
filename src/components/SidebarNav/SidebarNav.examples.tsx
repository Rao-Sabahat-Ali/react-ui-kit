import { SidebarNav } from './SidebarNav';

const items = [
  { label: 'Home', href: '#home', icon: 'home' as const, section: 'Learn' },
  { label: 'Dictionary', href: '#dict', icon: 'search' as const, section: 'Learn' },
  { label: 'Practice', icon: 'star' as const, section: 'Learn', items: [{ label: 'Review', href: '#review' }, { label: 'Challenges', href: '#challenges' }] },
  { label: 'Settings', href: '#settings', icon: 'settings' as const, section: 'Account', badge: 'New' },
];

export const examples = [
  {
    title: 'Sections, groups, collapsed',
    code: `<SidebarNav items={items} activeHref={path} onNavigate={navigate} />\n<SidebarNav items={items} collapsed />`,
    render: () => (
      <div className="d-flex gap-4 align-items-start">
        <div style={{ width: 240, background: 'var(--ui-color-bg-subtle)', borderRadius: 'var(--ui-radius-lg)' }}>
          <SidebarNav items={items} activeHref="#review" />
        </div>
        <div style={{ width: 72, background: 'var(--ui-color-bg-subtle)', borderRadius: 'var(--ui-radius-lg)' }}>
          <SidebarNav items={items} collapsed ariaLabel="Collapsed" />
        </div>
      </div>
    ),
  },
];
