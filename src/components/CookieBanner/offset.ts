/**
 * Keeps clear of the banner at the bottom of the page (WCAG 2.4.11 Focus Not Obscured): `--ui-consent-offset` plus
 * matching bottom padding and scroll padding on the document. Several banners (a live docs example next to the
 * site's own) share the document, so the largest height wins and the original inline styles come back with the last one.
 *
 * A fixed bottom nav (`--ui-bottom-nav-offset`, published by AppShell) lifts the banner above itself. The shell already
 * pads its main region for the nav, so the document padding stays the banner's own height (no double count); the scroll
 * padding adds the nav, because a focused element has to clear both. It is a calc on the live variable, so a nav that
 * appears, resizes or goes away after the banner needs no update here.
 */
const heights = new Map<symbol, number>();
let saved: { padding: string; scrollPadding: string; offset: string } | null = null;

function restore(root: HTMLElement, property: string, value: string) {
  if (value) root.style.setProperty(property, value);
  else root.style.removeProperty(property);
}

function apply() {
  const root = document.documentElement;
  const max = Math.max(0, ...heights.values());
  if (max === 0) {
    if (saved) {
      restore(root, 'padding-bottom', saved.padding);
      restore(root, 'scroll-padding-bottom', saved.scrollPadding);
      restore(root, '--ui-consent-offset', saved.offset);
      if (!root.getAttribute('style')) root.removeAttribute('style');
      saved = null;
    }
    return;
  }
  saved ??= {
    padding: root.style.getPropertyValue('padding-bottom'),
    scrollPadding: root.style.getPropertyValue('scroll-padding-bottom'),
    offset: root.style.getPropertyValue('--ui-consent-offset'),
  };
  root.style.setProperty('--ui-consent-offset', `${max}px`);
  root.style.setProperty('padding-bottom', `${max}px`);
  root.style.setProperty('scroll-padding-bottom', `calc(${max}px + var(--ui-bottom-nav-offset, 0px))`);
}

export function setConsentOffset(id: symbol, height: number) {
  heights.set(id, Math.ceil(height));
  apply();
}

export function clearConsentOffset(id: symbol) {
  heights.delete(id);
  apply();
}
