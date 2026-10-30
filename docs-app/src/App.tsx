import { lazy, Suspense, useEffect, useMemo, useState } from 'react';
import { Button, Icon, InputText, Select, ThemeProvider, ThemeToggle, type Profile, type ThemeSetting } from '@sabahat/react-ui-kit';
import { blueprints, findBlueprint } from './blueprints/registry';
import { BlueprintPage } from './pages/BlueprintPage';
import { BlueprintsPage } from './pages/BlueprintsPage';
import { ComponentPage } from './pages/ComponentPage';
import { HomePage } from './pages/HomePage';
import { CATEGORY_LABELS, components, isImplemented, profiles } from './registry';
import { href, useRoute } from './router';
// Heavy pages load on demand: the blueprints bring every demo screen and its source, the 3D overview its lazy examples.
const FoundationsPage = lazy(() => import('./pages/FoundationsPage').then((m) => ({ default: m.FoundationsPage })));
const ProfilesPage = lazy(() => import('./pages/ProfilesPage').then((m) => ({ default: m.ProfilesPage })));
const RoadmapPage = lazy(() => import('./pages/RoadmapPage').then((m) => ({ default: m.RoadmapPage })));
const Depth3DPage = lazy(() => import('./pages/Depth3DPage').then((m) => ({ default: m.Depth3DPage })));

function readProfile(): Profile {
  try {
    return (localStorage.getItem('docs:profile') as Profile | null) ?? 'saas';
  } catch {
    return 'saas';
  }
}

/** A theme the visitor picked (the kit stores it under `ui:theme` when the toggle is used); null until they do. */
function readPickedTheme(): ThemeSetting | null {
  try {
    const v = localStorage.getItem('ui:theme');
    return v === 'light' || v === 'dark' || v === 'system' ? v : null;
  } catch {
    return null;
  }
}

const defaultThemeOf = (profile: Profile): ThemeSetting => (profiles.find((p) => p.name === profile)?.defaultTheme as ThemeSetting | undefined) ?? 'system';

export function App() {
  const [profile, setProfile] = useState<Profile>(readProfile);
  // The profile decides the theme (game opens on the night sheet, pos and ecommerce on the light one) until the visitor picks one.
  const [picked, setPicked] = useState<ThemeSetting | null>(readPickedTheme);
  useEffect(() => {
    try {
      localStorage.setItem('docs:profile', profile);
    } catch {
      // non-fatal
    }
  }, [profile]);

  return (
    <ThemeProvider profile={profile} theme={picked ?? defaultThemeOf(profile)} onThemeChange={setPicked}>
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
      <header className={`docs-topbar ${blueprint ? 'docs-topbar--blueprint' : ''}`}>
        {/* On a phone a blueprint brings its own app header: the docs bar shrinks to the brand, and the way back is the breadcrumb. */}
        <Button className={blueprint ? 'd-none d-md-inline-flex' : 'd-lg-none'} appearance="text" variant="secondary" icon="menu" aria-label="Docs navigation" aria-expanded={navOpen} aria-controls="docs-nav" onClick={() => setNavOpen((o) => !o)} />
        <a href={href()} className="docs-brand">react-ui-kit</a>
        <div className="ms-auto d-flex align-items-center gap-2">
          <div className={`align-items-center gap-2 ${blueprint ? 'd-none d-md-flex' : 'd-flex'}`}>
            <span className="small d-none d-sm-inline">Profile</span>
            <div style={{ width: '9.5rem' }}>
              <Select<Profile> aria-label="App profile" size="sm" options={profiles.map((p) => ({ label: p.name, value: p.name as Profile }))} value={profile} onChange={(v) => v && onProfileChange(v)} />
            </div>
          </div>
          {/* One theme control on phones: the screen's own when it has one, otherwise this one. */}
          <span className={blueprint?.appTheme ? 'd-none d-md-inline-flex' : 'd-inline-flex'}>
            <ThemeToggle size="sm" />
          </span>
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
