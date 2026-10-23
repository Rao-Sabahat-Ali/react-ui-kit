import type { MouseEvent } from 'react';

/** True for a plain left click that a client-side router may handle (no modifier keys, same tab). */
export function isPlainClick(event: MouseEvent<HTMLAnchorElement>): boolean {
  return event.button === 0 && !event.metaKey && !event.ctrlKey && !event.shiftKey && !event.altKey && !event.defaultPrevented && (!event.currentTarget.target || event.currentTarget.target === '_self');
}

/** Click handler for links: delegates plain clicks to `onNavigate`, keeps native behaviour otherwise. */
export function routerLinkHandler(href: string, onNavigate?: (href: string, event: MouseEvent<HTMLAnchorElement>) => void, after?: () => void) {
  return (event: MouseEvent<HTMLAnchorElement>) => {
    if (onNavigate && isPlainClick(event)) {
      event.preventDefault();
      onNavigate(href, event);
    }
    after?.();
  };
}
