import { logoShapePath, textFontSize, type QrLayout, type QrLogoContent } from './layout';

/** Canvas drawing and file helpers for QRCode. Browser-only (guarded: jsdom has no canvas). */

export interface QrColors {
  foreground: string;
  background: string;
}

export const canDrawCanvas = () => typeof Path2D !== 'undefined' && typeof document !== 'undefined';

const imageCache = new Map<string, Promise<HTMLImageElement>>();

/** Load an image once per URL (cross-origin allowed so exports are not tainted when the server permits it). */
export function loadImage(src: string): Promise<HTMLImageElement> {
  let hit = imageCache.get(src);
  if (!hit) {
    hit = new Promise<HTMLImageElement>((resolve, reject) => {
      const img = new Image();
      if (!/^(data|blob):/i.test(src)) img.crossOrigin = 'anonymous';
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error('Logo image failed to load'));
      img.src = src;
    });
    imageCache.set(src, hit);
    hit.catch(() => imageCache.delete(src));
  }
  return hit;
}

/** Draw modules and finders (synchronous). The context is scaled so one unit is one module. */
export function drawCode(ctx: CanvasRenderingContext2D, layout: QrLayout, colors: QrColors): void {
  ctx.fillStyle = colors.background;
  ctx.fillRect(0, 0, layout.total, layout.total);
  ctx.fillStyle = colors.foreground;
  if (layout.modulesPath) ctx.fill(new Path2D(layout.modulesPath));
  ctx.fill(new Path2D(layout.finderPath), 'evenodd');
  if (layout.logo?.excavate) {
    ctx.fillStyle = colors.background;
    const { x, y, size } = layout.logo.plate;
    ctx.fill(new Path2D(logoShapePath(layout.logo.shape, x, y, size)));
  }
}

/** Draw the logo content (image loading is awaited). */
export async function drawLogo(ctx: CanvasRenderingContext2D, layout: QrLayout, colors: QrColors, content: QrLogoContent, fontFamily: string): Promise<void> {
  const logo = layout.logo;
  if (!logo) return;
  const { x, y, size } = logo.content;
  if (content.kind === 'image') {
    const img = await loadImage(content.href);
    ctx.save();
    ctx.clip(new Path2D(logoShapePath(logo.shape, x, y, size)));
    const side = Math.min(img.naturalWidth || size, img.naturalHeight || size);
    const sx = ((img.naturalWidth || size) - side) / 2;
    const sy = ((img.naturalHeight || size) - side) / 2;
    ctx.drawImage(img, sx, sy, side, side, x, y, size, size);
    ctx.restore();
  } else if (content.kind === 'icon') {
    ctx.save();
    ctx.translate(x + size * 0.15, y + size * 0.15);
    ctx.scale((size * 0.7) / 24, (size * 0.7) / 24);
    ctx.lineWidth = 1.75;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.strokeStyle = colors.foreground;
    ctx.fillStyle = colors.foreground;
    const path = new Path2D(content.d);
    if (content.fill) ctx.fill(path);
    else ctx.stroke(path);
    ctx.restore();
  } else {
    ctx.save();
    ctx.fillStyle = colors.foreground;
    ctx.font = `600 ${textFontSize(size, content.text)}px ${fontFamily}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(content.text, x + size / 2, y + size / 2);
    ctx.restore();
  }
}

/** Pixels per module for an export at least `minPixels` wide, always a whole number for crisp edges. */
export function modulePixels(total: number, minPixels: number): number {
  return Math.max(1, Math.ceil(minPixels / total));
}

/** Rasterise a layout (modules, finders, logo) to a new canvas at `modulePx` pixels per module. */
export async function rasterize(layout: QrLayout, colors: QrColors, content: QrLogoContent | undefined, modulePx: number, fontFamily: string): Promise<HTMLCanvasElement> {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = layout.total * modulePx;
  const ctx = canvas.getContext('2d');
  if (!ctx || !canDrawCanvas()) throw new Error('Canvas is not available');
  ctx.scale(modulePx, modulePx);
  drawCode(ctx, layout, colors);
  if (content) await drawLogo(ctx, layout, colors, content, fontFamily);
  return canvas;
}

/** A safe download name: no path, only `[A-Za-z0-9._-]`, and the extension of the exported type. */
export function sanitizeFilename(name: string | undefined, type: 'png' | 'svg'): string {
  const base = (name ?? '').split(/[\\/]/).pop() ?? '';
  const stem = base
    .replace(/\.(png|svg)$/i, '')
    .replace(/[^A-Za-z0-9._-]+/g, '-')
    .replace(/^[.-]+|[.-]+$/g, '')
    .slice(0, 80);
  return `${stem || 'qr-code'}.${type}`;
}

export function saveBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  anchor.rel = 'noopener';
  anchor.style.display = 'none';
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  setTimeout(() => URL.revokeObjectURL(url), 0);
}

export function canvasToBlob(canvas: HTMLCanvasElement): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error('Could not create PNG'))), 'image/png');
  });
}
