import { useSyncExternalStore } from 'react';
import { canUseDOM } from '../utils/dom';

/** True while the tab is visible (reactive). Auto-playing motion uses it to stop in a hidden tab. */
export function useDocumentVisible(): boolean {
  return useSyncExternalStore(
    (notify) => {
      if (!canUseDOM) return () => {};
      document.addEventListener('visibilitychange', notify);
      return () => document.removeEventListener('visibilitychange', notify);
    },
    () => (canUseDOM ? document.visibilityState !== 'hidden' : true),
    () => true,
  );
}
