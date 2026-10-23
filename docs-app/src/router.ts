import { useSyncExternalStore } from 'react';

/** Minimal hash router: "#/components/button" → ["components", "button"]. No router dependency. */
const subscribe = (notify: () => void) => {
  window.addEventListener('hashchange', notify);
  return () => window.removeEventListener('hashchange', notify);
};

export function useRoute(): string[] {
  const hash = useSyncExternalStore(subscribe, () => window.location.hash, () => '');
  return hash.replace(/^#\/?/, '').split('/').filter(Boolean);
}

export const href = (...parts: string[]) => `#/${parts.join('/')}`;
