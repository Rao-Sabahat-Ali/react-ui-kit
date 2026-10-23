import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { useMediaQuery } from '../hooks/useMediaQuery';
import { canUseDOM } from '../utils/dom';
import { PROFILES, type Density, type Profile, type ThemeSetting } from './profiles.generated';

export interface ThemeContextValue {
  theme: ThemeSetting;
  resolvedTheme: 'light' | 'dark';
  setTheme: (theme: ThemeSetting) => void;
  toggleTheme: () => void;
  profile: Profile;
  density: Density;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

export interface ThemeProviderProps {
  profile?: Profile;
  theme?: ThemeSetting;
  onThemeChange?: (theme: ThemeSetting) => void;
  density?: Density;
  storageKey?: string | null;
  target?: HTMLElement | null;
  children: ReactNode;
}

const isThemeSetting = (v: unknown): v is ThemeSetting => v === 'light' || v === 'dark' || v === 'system';

function readStored(key: string | null): ThemeSetting | null {
  if (!key || !canUseDOM) return null;
  try {
    const value = window.localStorage.getItem(key);
    return isThemeSetting(value) ? value : null;
  } catch {
    return null;
  }
}

function writeStored(key: string | null, value: ThemeSetting): void {
  if (!key || !canUseDOM) return;
  try {
    window.localStorage.setItem(key, value);
  } catch {
    // Storage can be unavailable (private mode, blocked); persistence is best-effort.
  }
}

export function ThemeProvider({ profile = 'saas', theme: themeProp, onThemeChange, density, storageKey = 'ui:theme', target, children }: ThemeProviderProps) {
  const profileDef = PROFILES[profile];
  const [internal, setInternal] = useState<ThemeSetting>(() => readStored(storageKey) ?? themeProp ?? profileDef.defaultTheme);
  const theme = themeProp !== undefined && onThemeChange ? themeProp : internal;
  const prefersDark = useMediaQuery('(prefers-color-scheme: dark)');
  const resolvedTheme = theme === 'system' ? (prefersDark ? 'dark' : 'light') : theme;

  useEffect(() => {
    const el = target ?? (canUseDOM ? document.documentElement : null);
    if (!el) return;
    el.setAttribute('data-bs-theme', resolvedTheme);
    el.setAttribute('data-ui-profile', profile);
    if (density) el.setAttribute('data-ui-density', density);
    else el.removeAttribute('data-ui-density');
    el.style.colorScheme = resolvedTheme;
  }, [target, resolvedTheme, profile, density]);

  const setTheme = useCallback(
    (next: ThemeSetting) => {
      setInternal(next);
      writeStored(storageKey, next);
      onThemeChange?.(next);
    },
    [storageKey, onThemeChange],
  );

  const value = useMemo<ThemeContextValue>(
    () => ({
      theme,
      resolvedTheme,
      setTheme,
      toggleTheme: () => setTheme(resolvedTheme === 'dark' ? 'light' : 'dark'),
      profile,
      density: density ?? profileDef.density,
    }),
    [theme, resolvedTheme, setTheme, profile, density, profileDef.density],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used inside <ThemeProvider>. Wrap your app root with <ThemeProvider profile="...">.');
  return ctx;
}

/**
 * Inline <head> script source that applies the stored theme before first paint
 * (prevents a flash of the wrong theme). Paste the returned string into a <script> tag.
 */
export function themeScript({ profile = 'saas', storageKey = 'ui:theme' }: { profile?: Profile; storageKey?: string } = {}): string {
  const fallback = PROFILES[profile].defaultTheme;
  return `(function(){try{var t=localStorage.getItem(${JSON.stringify(storageKey)})||${JSON.stringify(fallback)};if(t==='system'){t=matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light'}var d=document.documentElement;d.setAttribute('data-bs-theme',t);d.setAttribute('data-ui-profile',${JSON.stringify(profile)});d.style.colorScheme=t}catch(e){}})();`;
}
