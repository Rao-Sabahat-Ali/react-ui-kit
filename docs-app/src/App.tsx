import { useEffect, useMemo, useState } from 'react';
import { Button, Icon, InputText, Select, ThemeProvider, ThemeToggle, type Profile } from '@sabahat/react-ui-kit';
import { BlueprintPage } from './pages/BlueprintPage';
import { BlueprintsPage } from './pages/BlueprintsPage';
import { findBlueprint, blueprints } from './blueprints/registry';
import { ComponentPage } from './pages/ComponentPage';
import { FoundationsPage } from './pages/FoundationsPage';
import { HomePage } from './pages/HomePage';
import { ProfilesPage } from './pages/ProfilesPage';
import { RoadmapPage } from './pages/RoadmapPage';
import { CATEGORY_LABELS, components, isImplemented, profiles } from './registry';
import { href, useRoute } from './router';

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

  const blueprint = route[0] === 'blueprints' ? findBlueprint(route[1]) : undefined;
  const page =
    blueprint ? <BlueprintPage slug={blueprint.slug} onProfileChange={onProfileChange} /> :
    route[0] === 'blueprints' ? <BlueprintsPage /> :
    route[0] === 'components' && route[1] ? <ComponentPage slug={route[1]} /> :
    route[0] === 'foundations' ? <FoundationsPage /> :
    route[0] === 'profiles' ? <ProfilesPage /> :
    route[0] === 'roadmap' ? <RoadmapPage /> :
    <HomePage />;

  const navLink = (to: string, label: string, extra?: string) => (
    <a key={to} href={href(...to.split('/'))} className={`docs-nav__link ${current === to ? 'active' : ''} ${extra ?? ''}`} aria-current={current === to ? 'page' : undefined}>
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
          <span className="small text-body-secondary d-none d-sm-inline">Profile</span>
          <div style={{ width: '9.5rem' }}>
            <Select<Profile> aria-label="App profile" size="sm" options={profiles.map((p) => ({ label: p.name, value: p.name as Profile }))} value={profile} onChange={(v) => v && onProfileChange(v)} />
          </div>
          <ThemeToggle size="sm" />
        </div>
      </header>
      <div className="docs-body">
        <nav id="docs-nav" className={`docs-nav ${navOpen ? 'docs-nav--open' : ''}`} aria-label="Docs">
          <div className="docs-nav__section">
            {navLink('', 'Overview')}
            {navLink('foundations', 'Foundations')}
            {navLink('profiles', 'App profiles')}
            {navLink('blueprints', 'Blueprints')}
            {navLink('roadmap', 'Roadmap')}
          </div>
          <div className="px-3 pb-2">
            <InputText size="sm" type="search" aria-label="Filter components" placeholder="Filter components…" prefix={<Icon name="search" />} value={query} onChange={setQuery} />
          </div>
          <div className="docs-nav__section">
            <div className="docs-nav__heading">Blueprints</div>
            {blueprints.map((b) => navLink(`blueprints/${b.slug}`, b.title))}
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
