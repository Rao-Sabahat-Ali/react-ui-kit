import { parseCssLength } from '@sabahat/react-ui-kit';
import type { SceneTokens } from '../types';

const FALLBACK = { surface: '#ffffff', surfaceRaised: '#ffffff', line: '#121212', lineMuted: '#e2e2e2', accent: '#1e5aa8', shell: '#c49a6c' };
const VARS: Record<keyof typeof FALLBACK, string> = {
  surface: '--ui-color-surface',
  surfaceRaised: '--ui-color-surface-raised',
  line: '--ui-color-line',
  lineMuted: '--ui-color-line-muted',
  accent: '--ui-color-accent',
  shell: '--ui-color-shell',
};

/** Hex and rgb() pass straight to three; anything else (color-mix, oklch…) is resolved by painting one pixel. */
function toColor(value: string): string {
  const v = value.trim();
  if (!v || /^(#[0-9a-f]{3,8}|rgba?\([^)]*\))$/i.test(v)) return v;
  try {
    const g = document.createElement('canvas').getContext('2d');
    if (!g) return '';
    g.canvas.width = g.canvas.height = 1;
    g.fillStyle = '#000';
    g.fillStyle = v;
    g.fillRect(0, 0, 1, 1);
    const [r, gr, b] = g.getImageData(0, 0, 1, 1).data;
    return `rgb(${r},${gr},${b})`;
  } catch {
    return '';
  }
}

/** Reads the `--ui-*` tokens that apply to `el` (so a themed subtree or profile is honoured). */
export function readTokens(el: Element): SceneTokens {
  const cs = getComputedStyle(el);
  const out = { lineWidth: parseCssLength(cs.getPropertyValue('--ui-line-width'), 2) } as SceneTokens;
  for (const key of Object.keys(VARS) as (keyof typeof FALLBACK)[]) out[key] = toColor(cs.getPropertyValue(VARS[key])) || FALLBACK[key];
  return out;
}

/** Calls `onChange` when the theme or profile attributes change on the document or the nearest themed ancestor. */
export function watchTokens(el: Element, onChange: () => void): () => void {
  if (typeof MutationObserver === 'undefined') return () => {};
  const observer = new MutationObserver(onChange);
  const init = { attributes: true, attributeFilter: ['data-bs-theme', 'data-ui-profile'] };
  observer.observe(document.documentElement, init);
  const themed = el.closest('[data-bs-theme], [data-ui-profile]');
  if (themed && themed !== document.documentElement) observer.observe(themed, init);
  return () => observer.disconnect();
}
