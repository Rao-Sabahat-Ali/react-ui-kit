import { lazy, Suspense, useEffect, useMemo, useState } from 'react';
import { Button, Icon, InputText, Select, ThemeProvider, ThemeToggle, type Profile } from '@sabahat/react-ui-kit';
import { blueprintNav } from './blueprints/nav';
import { ComponentPage } from './pages/ComponentPage';
import { HomePage } from './pages/HomePage';
import { CATEGORY_LABELS, components, isImplemented, profiles } from './registry';
import { href, useRoute } from './router';
// Heavy pages load on demand: the blueprints bring every demo screen and its source, the 3D overview its lazy examples.
const FoundationsPage = lazy(() => import('./pages/FoundationsPage').then((m) => ({ default: m.FoundationsPage })));
const ProfilesPage = lazy(() => import('./pages/ProfilesPage').then((m) => ({ default: m.ProfilesPage })));
const RoadmapPage = lazy(() => import('./pages/RoadmapPage').then((m) => ({ default: m.RoadmapPage })));
const BlueprintPage = lazy(() => import('./pages/BlueprintPage').then((m) => ({ default: m.BlueprintPage })));
const BlueprintsPage = lazy(() => import('./pages/BlueprintsPage').then((m) => ({ default: m.BlueprintsPage })));
const Depth3DPage = lazy(() => import('./pages/Depth3DPage').then((m) => ({ default: m.Depth3DPage })));

function readProfile(): Profile {
  try {
    return (localStorage.getItem('docs:profile') as Profile | null) ?? 'saas';
  } catch {
    return 'saas';
  }
}

export function App() {
  const [profile, setProfile] = useState<Profile>(readProfile);
  useEffect(() => {
    try {
      localStorage.setItem('docs:profile', profile);
    } catch {
      // non-fatal
    }
  }, [profile]);

  return (
    <ThemeProvider profile={profile} theme="system">
      <Shell profile={profile} onProfileChange={setProfile} />
    </ThemeProvider>
  );
}

function Shell({ profile, onProfileChange }: { profile: Profile; onProfileChange: (p: Profile) => void }) {
  const route = useRoute();
  const [query, setQuery] = useState('');
  const [navOpen, setNavOpen] = useState(false);
  const current = route.join('/');

  useEffect(() => {
    setNavOpen(false);
    document.getElementById('main')?.focus();
    window.scrollTo(0, 0);
  }, [current]);

  const groups = useMemo(() => {
    const q = query.trim().toLowerCase();
    const map = new Map<string, typeof components>();
    for (const c of components) {
      if (q && !c.name.toLowerCase().includes(q)) continue;
      const list = map.get(c.category) ?? [];
      list.push(c);
      map.set(c.category, list);
    }
    return Object.keys(CATEGORY_LABELS).filter((k) => map.has(k)).map((k) => [k, map.get(k)!] as const);
  }, [query]);

  const blueprint = route[0] === 'blueprints' ? blueprintNav.find((b) => b.slug === route[1]) : undefined;
  const page =
    blueprint ? <Suspense fallback={null}><BlueprintPage slug={blueprint.slug} onProfileChange={onProfileChange} /></Suspense> :
    route[0] === 'blueprints' ? <Suspense fallback={null}><BlueprintsPage /></Suspense> :
    route[0] === 'components' && route[1] ? <ComponentPage slug={route[1]} /> :
    route[0] === 'foundations' ? <Suspense fallback={null}><FoundationsPage /></Suspense> :
    route[0] === 'profiles' ? <Suspense fallback={null}><ProfilesPage /></Suspense> :
    route[0] === 'roadmap' ? <Suspense fallback={null}><RoadmapPage /></Suspense> :
    route[0] === '3d' ? <Suspense fallback={null}><Depth3DPage /></Suspense> :
    <HomePage />;

  const navLink = (to: string, label: string, extra?: string, icon?: string) => (
    <a key={to} href={href(...to.split('/'))} className={`docs-nav__link ${current === to ? 'active' : ''} ${extra ?? ''}`} aria-current={current === to ? 'page' : undefined}>
      {icon && <Icon name={icon} className="docs-nav__icon" />}
      {label}
    </a>
  );

  return (
    <div className={`docs-shell ${blueprint ? 'docs-shell--wide' : ''}`}>
      <a href="#main" className="visually-hidden-focusable docs-skip" onClick={(e) => { e.preventDefault(); document.getElementById('main')?.focus(); }}>
        Skip to content
      </a>
      <header className="docs-topbar">
        <Button className={blueprint ? '' : 'd-lg-none'} appearance="text" variant="secondary" icon="menu" aria-label="Navigation" aria-expanded={navOpen} aria-controls="docs-nav" onClick={() => setNavOpen((o) => !o)} />
        <a href={href()} className="docs-brand">react-ui-kit</a>
        <div className="ms-auto d-flex align-items-center gap-2">
          <span className="small d-none d-sm-inline">Profile</span>
          <div style={{ width: '9.5rem' }}>
            <Select<Profile> aria-label="App profile" size="sm" options={profiles.map((p) => ({ label: p.name, value: p.name as Profile }))} value={profile} onChange={(v) => v && onProfileChange(v)} />
          </div>
          <ThemeToggle size="sm" />
        </div>
      </header>
      <div className="docs-body">
        <nav id="docs-nav" className={`docs-nav ${navOpen ? 'docs-nav--open' : ''}`} aria-label="Docs">
          <div className="docs-nav__section">
            {navLink('', 'Overview', '', 'home')}
            {navLink('foundations', 'Foundations', '', 'layers')}
            {navLink('profiles', 'App profiles', '', 'user')}
            {navLink('blueprints', 'Blueprints', '', 'box')}
            {navLink('3d', 'Depth (3D)', '', 'layers')}
            {navLink('roadmap', 'Roadmap', '', 'list')}
          </div>
          <div className="px-3 pb-2">
            <InputText size="sm" type="search" aria-label="Filter components" placeholder="Filter components…" prefix={<Icon name="search" />} value={query} onChange={setQuery} />
          </div>
          <div className="docs-nav__section">
            <div className="docs-nav__heading">Blueprints</div>
            {blueprintNav.map((b) => navLink(`blueprints/${b.slug}`, b.title))}
          </div>
          {groups.map(([category, list]) => (
            <div key={category} className="docs-nav__section">
              <div className="docs-nav__heading">{CATEGORY_LABELS[category]}</div>
              {list.map((c) => navLink(`components/${c.slug}`, c.name, isImplemented(c) ? '' : 'docs-nav__link--pending'))}
            </div>
          ))}
        </nav>
        {blueprint ? (
          // Blueprints bring their own app shell, and with it the page's single main landmark.
          <div className="docs-main docs-main--blueprint">{page}</div>
        ) : (
          <main id="main" tabIndex={-1} className="docs-main">
            {page}
          </main>
        )}
      </div>
    </div>
  );
}
