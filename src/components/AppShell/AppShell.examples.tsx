import { BottomNav } from '../BottomNav/BottomNav';
import { SidebarNav } from '../SidebarNav/SidebarNav';
import { Topbar } from '../Topbar/Topbar';
import { AppShell } from './AppShell';

const items = [
  { label: 'Home', href: '#home', icon: 'home' as const },
  { label: 'Dictionary', href: '#dictionary', icon: 'search' as const },
  { label: 'Review', href: '#review', icon: 'refresh' as const, badge: 12 },
];

export const examples = [
  {
    title: 'Sidebar shell with mobile bottom nav',
    description: 'Resize the window: below lg the sidebar becomes a drawer (menu button) and the bottom nav appears.',
    code: `<AppShell\n  topbar={<Topbar brand="Svenska ord" />}\n  sidebar={<SidebarNav items={items} activeHref={path} onNavigate={navigate} />}\n  bottomNav={<BottomNav items={items} activeHref={path} onNavigate={navigate} />}\n  stateKey="app-shell"\n>\n  {page}\n</AppShell>`,
    render: () => (
      <div style={{ height: 360, overflow: 'auto', border: '1px solid var(--ui-color-border)', borderRadius: 'var(--ui-radius-lg)' }}>
        <AppShell
          className="ui-app-shell--embedded"
          topbar={<Topbar brand="Svenska ord" sticky={false} searchShortcut={null} />}
          sidebar={<SidebarNav items={items} activeHref="#home" />}
          bottomNav={<BottomNav items={items} activeHref="#home" />}
        >
          <p className="mb-0">Page content renders in the main landmark.</p>
        </AppShell>
      </div>
    ),
  },
];
