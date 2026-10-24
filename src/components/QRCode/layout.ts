import { encodeQr, qrSize, QrError, type QrEcc, type QrMode, type QrSymbol } from './encoder';

export type QrModuleShape = 'square' | 'rounded' | 'dots' | 'diamond';
export type QrFinderShape = 'square' | 'rounded' | 'circle';
export type QrLogoShape = 'square' | 'circle' | 'rounded';

export const LOGO_MIN_FRACTION = 0.1;
export const LOGO_MAX_FRACTION = 0.3;
export const LOGO_DEFAULT_FRACTION = 0.22;
export const QR_MIN_MARGIN = 2;
/** Modules reserved around the finders (separator + format information): the logo box stays inside the rest. */
const LOGO_SAFE_EDGE = 9;
/** Cleared or covered area never exceeds this share of the symbol, well inside what level H recovers. */
const LOGO_MAX_AREA = 0.18;

export interface QrLogoPlan {
  fraction?: number;
  /** Quiet space around the logo, in modules. */
  padding?: number;
  excavate?: boolean;
  shape?: QrLogoShape;
}

export interface QrLayoutOptions {
  value: string;
  ecc: QrEcc;
  /** Quiet zone in modules (minimum 2). */
  margin?: number;
  moduleShape?: QrModuleShape;
  finderShape?: QrFinderShape;
  finderInnerShape?: QrFinderShape;
  mode?: QrMode;
  /** Present when a logo is shown; the caller passes `ecc: 'H'`. */
  logo?: QrLogoPlan;
}

export interface QrLogoBox {
  /** Cleared/plate square in module units from the top-left of the whole drawing (margin included). */
  plate: { x: number; y: number; size: number };
  /** Logo content square, centred on the plate. */
  content: { x: number; y: number; size: number };
  shape: QrLogoShape;
  excavate: boolean;
}

export interface QrLayout {
  symbol: QrSymbol;
  margin: number;
  /** Modules per side including the quiet zone (the SVG viewBox is `0 0 total total`). */
  total: number;
  moduleShape: QrModuleShape;
  /** Data and function modules except finders, drawn with the module shape. */
  modulesPath: string;
  /** The three finder patterns (ring + eye), to be filled with `fill-rule: evenodd`. */
  finderPath: string;
  logo?: QrLogoBox;
  /** Whether the module shape is decorative and relies on error correction to scan reliably. */
  decorative: boolean;
}

const fmt = (n: number) => String(Math.round(n * 1000) / 1000);

/** Round a number of modules up so the cleared box is centred on the module grid (same parity as `n`). */
function clearedSide(fraction: number, padding: number, n: number): number {
  let side = Math.ceil(fraction * n + 2 * padding);
  if ((n - side) % 2 !== 0) side++;
  return side;
}

/** Smallest version (at least `from`) whose centre can hold the logo box without touching finders. */
export function versionForLogo(from: number, fraction: number, padding: number, excavate: boolean): number {
  for (let v = Math.max(1, from); v <= 40; v++) {
    const n = qrSize(v);
    const side = clearedSide(fraction, excavate ? padding : 0, n);
    if (side <= n - 2 * LOGO_SAFE_EDGE && (side * side) / (n * n) <= LOGO_MAX_AREA) return v;
  }
  return 40;
}

function rect(x: number, y: number, w: number, h: number): string {
  return `M${fmt(x)} ${fmt(y)}h${fmt(w)}v${fmt(h)}h${fmt(-w)}z`;
}

function roundedRect(x: number, y: number, w: number, h: number, r: number): string {
  const rr = Math.min(r, w / 2, h / 2);
  return `M${fmt(x + rr)} ${fmt(y)}h${fmt(w - 2 * rr)}a${fmt(rr)} ${fmt(rr)} 0 0 1 ${fmt(rr)} ${fmt(rr)}v${fmt(h - 2 * rr)}a${fmt(rr)} ${fmt(rr)} 0 0 1 ${fmt(-rr)} ${fmt(rr)}h${fmt(-(w - 2 * rr))}a${fmt(rr)} ${fmt(rr)} 0 0 1 ${fmt(-rr)} ${fmt(-rr)}v${fmt(-(h - 2 * rr))}a${fmt(rr)} ${fmt(rr)} 0 0 1 ${fmt(rr)} ${fmt(-rr)}z`;
}

function circle(cx: number, cy: number, r: number): string {
  return `M${fmt(cx - r)} ${fmt(cy)}a${fmt(r)} ${fmt(r)} 0 1 0 ${fmt(2 * r)} 0a${fmt(r)} ${fmt(r)} 0 1 0 ${fmt(-2 * r)} 0z`;
}

function shapePath(shape: QrFinderShape, x: number, y: number, size: number, radiusRatio: number): string {
  if (shape === 'circle') return circle(x + size / 2, y + size / 2, size / 2);
  if (shape === 'rounded') return roundedRect(x, y, size, size, size * radiusRatio);
  return rect(x, y, size, size);
}

/** Path of a square with per-corner radii (clockwise from top-left). Radius 0 gives a sharp corner. */
function cornerRect(x: number, y: number, tl: number, tr: number, br: number, bl: number): string {
  const arc = (r: number, dx: number, dy: number) => (r > 0 ? `a${fmt(r)} ${fmt(r)} 0 0 1 ${fmt(dx)} ${fmt(dy)}` : '');
  return (
    `M${fmt(x + tl)} ${fmt(y)}h${fmt(1 - tl - tr)}${arc(tr, tr, tr)}v${fmt(1 - tr - br)}${arc(br, -br, br)}` +
    `h${fmt(-(1 - br - bl))}${arc(bl, -bl, -bl)}v${fmt(-(1 - bl - tl))}${arc(tl, tl, -tl)}z`
  );
}

export function finderRing(shape: QrFinderShape, innerShape: QrFinderShape, x: number, y: number): string {
  // Outer 7x7, hole 5x5 (same shape as the outer), eye 3x3 (its own shape); filled with evenodd.
  return shapePath(shape, x, y, 7, 0.3) + shapePath(shape, x + 1, y + 1, 5, 0.24) + shapePath(innerShape, x + 2, y + 2, 3, 0.3);
}

const memo = new Map<string, QrLayout>();
const MEMO_LIMIT = 48;

/**
 * Encode and lay out a code: the SVG path data for modules and finders and the logo box. Memoised by value and
 * options, so a re-render with the same inputs (or a second instance) costs nothing. Throws `QrError`.
 */
export function buildQrLayout(options: QrLayoutOptions): QrLayout {
  const {
    value,
    ecc,
    margin: rawMargin = 4,
    moduleShape = 'square',
    finderShape = 'square',
    finderInnerShape = finderShape,
    mode,
    logo,
  } = options;
  const key = JSON.stringify([value, ecc, rawMargin, moduleShape, finderShape, finderInnerShape, mode ?? null, logo ?? null]);
  const hit = memo.get(key);
  if (hit) return hit;

  const margin = Math.max(QR_MIN_MARGIN, Math.round(Number.isFinite(rawMargin) ? rawMargin : 4));
  const fraction = logo ? Math.min(LOGO_MAX_FRACTION, Math.max(LOGO_MIN_FRACTION, logo.fraction ?? LOGO_DEFAULT_FRACTION)) : 0;
  const padding = logo ? Math.min(4, Math.max(0, logo.padding ?? 1)) : 0;
  const excavate = logo ? (logo.excavate ?? true) : false;

  let symbol = encodeQr(value, { ecc, mode });
  if (logo) {
    const wanted = versionForLogo(symbol.version, fraction, padding, excavate);
    if (wanted > symbol.version) symbol = encodeQr(value, { ecc, mode, minVersion: wanted });
  }
  const n = symbol.size;
  const total = n + 2 * margin;

  let box: QrLogoBox | undefined;
  let cleared: ((x: number, y: number) => boolean) | undefined;
  if (logo) {
    const contentSize = fraction * n;
    const side = clearedSide(fraction, excavate ? padding : 0, n);
    const start = (n - side) / 2;
    box = {
      plate: { x: margin + start, y: margin + start, size: side },
      content: { x: margin + (n - contentSize) / 2, y: margin + (n - contentSize) / 2, size: contentSize },
      shape: logo.shape ?? 'square',
      excavate,
    };
    if (excavate) cleared = (x, y) => x >= start && x < start + side && y >= start && y < start + side;
  }

  const inFinder = (x: number, y: number) => (x < 7 && y < 7) || (x >= n - 7 && y < 7) || (x < 7 && y >= n - 7);
  const drawn = (x: number, y: number) => x >= 0 && y >= 0 && x < n && y < n && symbol.modules[y * n + x] === 1 && !inFinder(x, y) && !cleared?.(x, y);

  // Function modules (timing, alignment, format and version information) always stay square: readers lock
  // onto them first. Only data modules take the chosen shape.
  const isSquare = (x: number, y: number) => drawn(x, y) && (moduleShape === 'square' || symbol.isFunction[y * n + x] === 1);
  let modulesPath = '';
  for (let y = 0; y < n; y++) {
    for (let x = 0; x < n; x++) {
      if (!isSquare(x, y)) continue;
      let end = x;
      while (end + 1 < n && isSquare(end + 1, y)) end++;
      modulesPath += rect(margin + x, margin + y, end - x + 1, 1);
      x = end;
    }
  }
  if (moduleShape !== 'square') {
    for (let y = 0; y < n; y++) {
      for (let x = 0; x < n; x++) {
        if (!drawn(x, y) || isSquare(x, y)) continue;
        const px = margin + x;
        const py = margin + y;
        if (moduleShape === 'dots') modulesPath += circle(px + 0.5, py + 0.5, 0.45);
        else if (moduleShape === 'diamond') modulesPath += `M${fmt(px + 0.5)} ${fmt(py - 0.02)}L${fmt(px + 1.02)} ${fmt(py + 0.5)}L${fmt(px + 0.5)} ${fmt(py + 1.02)}L${fmt(px - 0.02)} ${fmt(py + 0.5)}z`;
        else {
          const up = drawn(x, y - 1);
          const down = drawn(x, y + 1);
          const left = drawn(x - 1, y);
          const right = drawn(x + 1, y);
          const r = 0.5;
          modulesPath += cornerRect(px, py, !up && !left ? r : 0, !up && !right ? r : 0, !down && !right ? r : 0, !down && !left ? r : 0);
        }
      }
    }
  }

  const finderPath = [
    [0, 0],
    [n - 7, 0],
    [0, n - 7],
  ]
    .map(([fx, fy]) => finderRing(finderShape, finderInnerShape, margin + fx!, margin + fy!))
    .join('');

  const layout: QrLayout = {
    symbol,
    margin,
    total,
    moduleShape,
    modulesPath,
    finderPath,
    logo: box,
    decorative: moduleShape !== 'square',
  };
  if (memo.size >= MEMO_LIMIT) memo.delete(memo.keys().next().value!);
  memo.set(key, layout);
  return layout;
}

/** Message of a layout failure for the UI: the typed error code, or `unknown`. */
export function layoutErrorCode(error: unknown): 'too-long' | 'empty' | 'invalid-option' | 'unknown' {
  return error instanceof QrError ? error.code : 'unknown';
}

// ---------------------------------------------------------------------------------------------
// Standalone SVG export (a string, never injected into the DOM by the component)
// ---------------------------------------------------------------------------------------------

export type QrLogoContent =
  | { kind: 'image'; href: string }
  | { kind: 'icon'; d: string; fill?: boolean }
  | { kind: 'text'; text: string };

export interface QrSvgStyle {
  foreground: string;
  background: string;
  fontFamily?: string;
  /** Pixel width and height of the exported SVG. */
  size: number;
  /** Accessible name written into the file. */
  title?: string;
}

const escapeXml = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&apos;');

export function logoShapePath(shape: QrLogoShape, x: number, y: number, size: number): string {
  return shapePath(shape === 'circle' ? 'circle' : shape === 'rounded' ? 'rounded' : 'square', x, y, size, 0.2);
}

export function textFontSize(boxSize: number, text: string): number {
  const len = Math.max(1, [...text].length);
  return Math.min(boxSize * 0.52, (boxSize * 1.15) / len);
}

/** A self-contained SVG document for the layout (colours must already be resolved, not CSS variables). */
export function layoutToSvg(layout: QrLayout, style: QrSvgStyle, content?: QrLogoContent): string {
  const { total, modulesPath, finderPath, logo } = layout;
  const fg = escapeXml(style.foreground);
  const bg = escapeXml(style.background);
  let inner = `<rect width="${total}" height="${total}" fill="${bg}"/>`;
  if (modulesPath) inner += `<path d="${modulesPath}" fill="${fg}"/>`;
  inner += `<path d="${finderPath}" fill="${fg}" fill-rule="evenodd"/>`;
  if (logo && content) {
    if (logo.excavate) inner += `<path d="${logoShapePath(logo.shape, logo.plate.x, logo.plate.y, logo.plate.size)}" fill="${bg}"/>`;
    const { x, y, size } = logo.content;
    if (content.kind === 'image') {
      inner += `<clipPath id="qr-logo-clip"><path d="${logoShapePath(logo.shape, x, y, size)}"/></clipPath>`;
      inner += `<image href="${escapeXml(content.href)}" x="${fmt(x)}" y="${fmt(y)}" width="${fmt(size)}" height="${fmt(size)}" preserveAspectRatio="xMidYMid slice" clip-path="url(#qr-logo-clip)"/>`;
    } else if (content.kind === 'icon') {
      const scale = (size * 0.7) / 24;
      const offset = size * 0.15;
      inner += `<g transform="translate(${fmt(x + offset)} ${fmt(y + offset)}) scale(${fmt(scale)})"><path d="${escapeXml(content.d)}" fill="${content.fill ? fg : 'none'}" stroke="${content.fill ? 'none' : fg}" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"/></g>`;
    } else {
      inner += `<text x="${fmt(x + size / 2)}" y="${fmt(y + size / 2)}" text-anchor="middle" dominant-baseline="central" font-family="${escapeXml(style.fontFamily ?? 'sans-serif')}" font-weight="600" font-size="${fmt(textFontSize(size, content.text))}" fill="${fg}">${escapeXml(content.text)}</text>`;
    }
  }
  const title = style.title ? `<title>${escapeXml(style.title)}</title>` : '';
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${total} ${total}" width="${style.size}" height="${style.size}" role="img"${style.title ? ` aria-label="${escapeXml(style.title)}"` : ''}>${title}${inner}</svg>`;
}
