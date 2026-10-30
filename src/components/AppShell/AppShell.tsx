import { createContext, useCallback, useContext, useEffect, useId, useLayoutEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { useMediaQuery } from '../../hooks/useMediaQuery';
import { useLocale } from '../../locale/LocaleProvider';
import { useOptionalTheme } from '../../theme/ThemeProvider';
import type { Profile } from '../../theme/profiles.generated';
import { cx } from '../../utils/cx';
import { Drawer } from '../Drawer/Drawer';
import { clearBottomNavOffset, setBottomNavOffset } from './bottomNavOffset';

const BREAKPOINTS = { md: 768, lg: 992, xl: 1200 } as const;

/** Shell type of each app profile (spec: Variants). */
const PROFILE_SHELL: Record<Profile, 'sidebar' | 'top-nav' | 'full-bleed'> = {
  saas: 'sidebar',
  admin: 'sidebar',
  dashboard: 'sidebar',
  cms: 'sidebar',
  ecommerce: 'top-nav',
  landing: 'top-nav',
  pos: 'full-bleed',
  game: 'full-bleed',
};

export interface AppShellContextValue {
  isMobile: boolean;
  collapsed: boolean;
  toggleCollapsed: () => void;
  mobileNavOpen: boolean;
  setMobileNavOpen: (open: boolean) => void;
  /** Drawer below the breakpoint, collapse above. */
  toggleNav: () => void;
  hasSidebar: boolean;
  navId: string;
}

const AppShellContext = createContext<AppShellContextValue | null>(null);

/** Shell context; null outside AppShell so components can be used standalone. */
export function useAppShell(): AppShellContextValue | null {
  return useContext(AppShellContext);
}

export interface AppShellProps {
  /** Defaults to the shell type of the active ThemeProvider profile, or `sidebar` without one. */
  variant?: 'sidebar' | 'top-nav' | 'full-bleed';
  topbar?: ReactNode;
  /** Alias of `topbar` (the top-nav shell's banner is usually called a header). `topbar` wins when both are set. */
  header?: ReactNode;
  sidebar?: ReactNode;
  footer?: ReactNode;
  bottomNav?: ReactNode;
  sidebarCollapsed?: boolean;
  defaultSidebarCollapsed?: boolean;
  onSidebarCollapsedChange?: (collapsed: boolean) => void;
  mobileBreakpoint?: keyof typeof BREAKPOINTS;
  skipLinkLabel?: string;
  stateKey?: string;
  hud?: { top?: ReactNode; bottom?: ReactNode; start?: ReactNode; end?: ReactNode };
  mobileNavTitle?: ReactNode;
  className?: string;
  children: ReactNode;
}

function readCollapsed(key: string | undefined): boolean | null {
  if (!key) return null;
  try {
    const v = localStorage.getItem(`ui:${key}`);
    return v === null ? null : v === '1';
  } catch {
    return null;
  }
}

export function AppShell({
  variant: variantProp,
  topbar: topbarProp,
  header,
  sidebar,
  footer,
  bottomNav,
  sidebarCollapsed,
  defaultSidebarCollapsed = false,
  onSidebarCollapsedChange,
  mobileBreakpoint = 'lg',
  skipLinkLabel,
  stateKey,
  hud,
  mobileNavTitle,
  className,
  children,
}: AppShellProps) {
  const { t } = useLocale();
  const profile = useOptionalTheme()?.profile;
  const variant = variantProp ?? (profile ? PROFILE_SHELL[profile] : 'sidebar');
  const topbar = topbarProp ?? header;
  const navId = useId();
  const isMobile = !useMediaQuery(`(min-width: ${BREAKPOINTS[mobileBreakpoint]}px)`, true);
  const [internalCollapsed, setInternalCollapsed] = useState(() => readCollapsed(stateKey) ?? defaultSidebarCollapsed);
  const collapsed = sidebarCollapsed ?? internalCollapsed;
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  useEffect(() => {
    if (!isMobile) setMobileNavOpen(false);
  }, [isMobile]);

  const toggleCollapsed = useCallback(() => {
    const next = !collapsed;
    setInternalCollapsed(next);
    onSidebarCollapsedChange?.(next);
    if (stateKey) {
      try {
        localStorage.setItem(`ui:${stateKey}`, next ? '1' : '0');
      } catch {
        // best-effort persistence
      }
    }
  }, [collapsed, onSidebarCollapsedChange, stateKey]);

  const hasSidebar = variant === 'sidebar' && Boolean(sidebar);
  const toggleNav = useCallback(() => {
    if (isMobile) setMobileNavOpen((o) => !o);
    else toggleCollapsed();
  }, [isMobile, toggleCollapsed]);

  const ctx = useMemo<AppShellContextValue>(
    () => ({ isMobile, collapsed: !isMobile && collapsed, toggleCollapsed, mobileNavOpen, setMobileNavOpen, toggleNav, hasSidebar, navId }),
    [isMobile, collapsed, toggleCollapsed, mobileNavOpen, toggleNav, hasSidebar, navId],
  );

  const showBottomNav = Boolean(bottomNav) && isMobile;

  // While the bottom nav is shown and fixed to the bottom edge, publish its height so fixed overlays (CookieBanner) sit above it.
  // An embedded shell (docs demos: sticky inside a frame) shares no edge with the page and publishes nothing.
  const bottomNavRef = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => {
    const el = bottomNavRef.current;
    if (!showBottomNav || !el) return;
    const id = Symbol('bottom-nav');
    const publish = () => {
      if (getComputedStyle(el).position === 'fixed') setBottomNavOffset(id, el.getBoundingClientRect().height);
      else clearBottomNavOffset(id);
    };
    publish();
    const observer = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(publish);
    observer?.observe(el);
    return () => {
      observer?.disconnect();
      clearBottomNavOffset(id);
    };
  }, [showBottomNav]);

  return (
    <AppShellContext.Provider value={ctx}>
      <div className={cx('ui-app-shell', `ui-app-shell--${variant}`, collapsed && !isMobile && 'ui-app-shell--collapsed', showBottomNav && 'ui-app-shell--with-bottom-nav', className)}>
        <a
          href="#main"
          className="visually-hidden-focusable ui-app-shell__skip"
          onClick={(e) => {
            e.preventDefault();
            document.getElementById('main')?.focus();
          }}
        >
          {skipLinkLabel ?? t('skipToContent')}
        </a>
        {variant !== 'full-bleed' && topbar}
        <div className="ui-app-shell__body">
          {hasSidebar && !isMobile && (
            <aside id={navId} className="ui-app-shell__sidebar">
              {sidebar}
            </aside>
          )}
          <main id="main" tabIndex={-1} className="ui-app-shell__main">
            {variant === 'full-bleed' && hud?.top && <div className="ui-app-shell__hud ui-app-shell__hud--top">{hud.top}</div>}
            {children}
            {variant === 'full-bleed' && hud?.bottom && <div className="ui-app-shell__hud ui-app-shell__hud--bottom">{hud.bottom}</div>}
          </main>
        </div>
        {footer && <footer className="ui-app-shell__footer">{footer}</footer>}
        {showBottomNav && (
          <div ref={bottomNavRef} className="ui-app-shell__bottom-nav">
            {bottomNav}
          </div>
        )}
        {hasSidebar && isMobile && (
          <Drawer open={mobileNavOpen} onClose={() => setMobileNavOpen(false)} position="start" size="sm" title={mobileNavTitle} aria-label={t('menu')} id={navId}>
            {sidebar}
          </Drawer>
        )}
      </div>
    </AppShellContext.Provider>
  );
}
