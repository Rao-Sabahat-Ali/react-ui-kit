/**
 * Publishes the height of a fixed bottom nav as `--ui-bottom-nav-offset` on the document root, so fixed overlays at the
 * bottom edge (CookieBanner) can sit above it. Several shells can share a page; the tallest wins and the original inline
 * value comes back when the last one goes.
 */
const PROPERTY = '--ui-bottom-nav-offset';
const heights = new Map<symbol, number>();
let saved: string | null = null;

function apply() {
  const root = document.documentElement;
  const max = Math.max(0, ...heights.values());
  if (max === 0) {
    if (saved !== null) {
      if (saved) root.style.setProperty(PROPERTY, saved);
      else root.style.removeProperty(PROPERTY);
      if (!root.getAttribute('style')) root.removeAttribute('style');
      saved = null;
    }
    return;
  }
  saved ??= root.style.getPropertyValue(PROPERTY);
  root.style.setProperty(PROPERTY, `${max}px`);
}

export function setBottomNavOffset(id: symbol, height: number) {
  heights.set(id, Math.ceil(height));
  apply();
}

export function clearBottomNavOffset(id: symbol) {
  heights.delete(id);
  apply();
}
