import { useEffect, useState } from 'react';
import {
  AppShell,
  BottomNav,
  Button,
  Card,
  ConfirmProvider,
  EmptyState,
  LocaleProvider,
  PageHeader,
  SidebarNav,
  ThemeProvider,
  ThemeToggle,
  ToastProvider,
  Topbar,
  useToast,
} from '@sabahat/react-ui-kit';

/** Generated for the "__PROFILE__" profile. Replace the pages with your app's screens (see design-system get_pattern). */
const NAV = [
  { label: 'Home', href: '/', icon: 'home' },
  { label: 'Items', href: '/items', icon: 'layers' },
  { label: 'Settings', href: '/settings', icon: 'settings' },
] as const;

function usePath() {
  const [path, setPath] = useState(window.location.pathname);
  useEffect(() => {
    const onPop = () => setPath(window.location.pathname);
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, []);
  const navigate = (to: string) => {
    window.history.pushState(null, '', to);
    setPath(to);
  };
  return { path, navigate };
}

export function App() {
  return (
    <ThemeProvider profile="__PROFILE__">
      <LocaleProvider locale="en">
        <ToastProvider>
          <ConfirmProvider>
            <Shell />
          </ConfirmProvider>
        </ToastProvider>
      </LocaleProvider>
    </ThemeProvider>
  );
}

function Shell() {
  const { path, navigate } = usePath();
  const toast = useToast();
  const items = NAV.map((n) => ({ ...n }));
  return (
    <AppShell
      __SHELL_VARIANT__
      topbar={<Topbar brand="__APP_TITLE__" actions={<ThemeToggle size="sm" />} />}
      sidebar={<SidebarNav items={items} activeHref={path} onNavigate={navigate} />}
      bottomNav={__BOTTOM_NAV__ ? <BottomNav items={items} activeHref={path} onNavigate={navigate} /> : undefined}
    >
      {path === '/' && (
        <>
          <PageHeader title="Welcome" description="__APP_DESCRIPTION__" actions={<Button onClick={() => toast.success('It works!')}>Say hello</Button>} />
          <div className="row g-3">
            <div className="col-md-6">
              <Card title="Next step">Write specs/product.md and your first feature spec, then build it with the design-system MCP.</Card>
            </div>
          </div>
        </>
      )}
      {path !== '/' && <EmptyState titleAs="h2" title="Nothing here yet" description="This page is a placeholder." action={<Button onClick={() => navigate('/')}>Go home</Button>} />}
    </AppShell>
  );
}
