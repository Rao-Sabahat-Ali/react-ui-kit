/** Colour helpers shared by the scannable-code components (QRCode, Barcode). Pure, no dependencies. */

export interface Rgb {
  r: number;
  g: number;
  b: number;
  a: number;
}

/** Parses `#rgb`, `#rrggbb`, `rgb()` and `rgba()` (the forms `getComputedStyle` returns). Anything else is undefined. */
export function parseColor(input: string): Rgb | undefined {
  const value = input.trim().toLowerCase();
  const hex = /^#([0-9a-f]{3,8})$/.exec(value);
  if (hex) {
    let h = hex[1]!;
    if (h.length === 3 || h.length === 4) h = [...h].map((c) => c + c).join('');
    if (h.length !== 6 && h.length !== 8) return undefined;
    return { r: parseInt(h.slice(0, 2), 16), g: parseInt(h.slice(2, 4), 16), b: parseInt(h.slice(4, 6), 16), a: h.length === 8 ? parseInt(h.slice(6, 8), 16) / 255 : 1 };
  }
  const fn = /^rgba?\(\s*([\d.]+)[\s,]+([\d.]+)[\s,]+([\d.]+)(?:[\s,/]+([\d.]+%?))?\s*\)$/.exec(value);
  if (fn) {
    const a = fn[4] === undefined ? 1 : fn[4].endsWith('%') ? parseFloat(fn[4]) / 100 : parseFloat(fn[4]);
    return { r: Number(fn[1]), g: Number(fn[2]), b: Number(fn[3]), a };
  }
  return undefined;
}

/** WCAG relative luminance (0 black .. 1 white). */
export function relativeLuminance({ r, g, b }: Rgb): number {
  const lin = (c: number) => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
}

export function contrastRatio(a: Rgb, b: Rgb): number {
  const [hi, lo] = [relativeLuminance(a), relativeLuminance(b)].sort((x, y) => y - x) as [number, number];
  return (hi + 0.05) / (lo + 0.05);
}

/**
 * Resolve any CSS colour (including `var(--ui-*)` tokens) to the browser's computed `rgb()` string by probing
 * an element in the page. Returns the input when it cannot be resolved (e.g. jsdom).
 */
export function resolveCssColor(host: Element | null, value: string): string {
  if (typeof document === 'undefined' || typeof getComputedStyle === 'undefined') return value;
  const parent = host ?? document.body;
  const probe = document.createElement('span');
  probe.style.color = value;
  probe.style.display = 'none';
  parent.appendChild(probe);
  const resolved = getComputedStyle(probe).color;
  parent.removeChild(probe);
  return resolved || value;
}

/** Colour strings that are safe to write into an SVG attribute (no markup, quotes, url() or unresolved var()). */
export function safeColorForXml(value: string, fallback: string): string {
  return /^[#a-zA-Z0-9(),.%\s/+-]+$/.test(value) && !/url\(|var\(/i.test(value) ? value.trim() : fallback;
}

const warned = new Set<string>();
/** `console.warn` once per message, development builds only. */
export function warnOnce(message: string): void {
  if (!import.meta.env?.DEV || warned.has(message)) return;
  warned.add(message);
  console.warn(`[react-ui-kit] ${message}`);
}
