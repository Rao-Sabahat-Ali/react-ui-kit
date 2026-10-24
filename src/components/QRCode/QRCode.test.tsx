import { act, fireEvent, render, screen } from '@testing-library/react';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { createRef } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi, type MockInstance } from 'vitest';
import { LocaleProvider } from '../../locale/LocaleProvider';
import { encodeQr, QrError } from './encoder';
import { buildQrLayout, layoutToSvg } from './layout';
import { QRCode, type QRCodeHandle, type QRCodeProps } from './QRCode';
import { sanitizeFilename } from './raster';

const source = (file: string) => readFileSync(join(process.cwd(), 'src/components/QRCode', file), 'utf8');
const VALUE = 'https://example.com/ticket/8F3A';
const PNG = 'data:image/png;base64,iVBORw0KGgo=';

/** Modules covered by the square-run rectangles of a modules path (`M x y h w v 1 h -w z`). */
function coveredModules(path: string, margin: number): Set<string> {
  const out = new Set<string>();
  for (const m of path.matchAll(/M(-?[\d.]+) (-?[\d.]+)h([\d.]+)v1h-[\d.]+z/g)) {
    const y = Number(m[2]) - margin;
    for (let i = 0; i < Number(m[3]); i++) out.add(`${Number(m[1]) - margin + i},${y}`);
  }
  return out;
}

function svgOf(container: HTMLElement) {
  return container.querySelector('svg.ui-qr__code') as SVGSVGElement;
}

describe('QRCode', () => {
  it('AC-1: renders an SVG role=img named "QR code" at the given size', () => {
    const { container } = render(<QRCode value={VALUE} />);
    const svg = screen.getByRole('img', { name: 'QR code' });
    expect(svg).toBe(svgOf(container));
    const total = encodeQr(VALUE, { ecc: 'M' }).size + 8;
    expect(svg.getAttribute('viewBox')).toBe(`0 0 ${total} ${total}`);
    expect(svg).toHaveAttribute('width', '160');
    expect(svg).toHaveAttribute('height', '160');
    render(<QRCode value={VALUE} size={240} />);
    expect(screen.getAllByRole('img')[1]).toHaveAttribute('width', '240');
  });

  it('AC-2: the accessible name never carries the value; label and describedValue work', () => {
    render(<QRCode value="SECRET-TOKEN-123" label="Login code" describedValue="Signs you in on this device" />);
    const img = screen.getByRole('img', { name: 'Login code' });
    expect(img.getAttribute('aria-label')).not.toContain('SECRET');
    expect(document.body.innerHTML).not.toContain('SECRET-TOKEN-123');
    const descId = img.getAttribute('aria-describedby')!;
    expect(document.getElementById(descId)).toHaveTextContent('Signs you in on this device');
  });

  it('AC-3: error correction defaults to M, is honoured, and is raised to H with a logo', () => {
    const { container, rerender } = render(<QRCode value="abc" />);
    expect(container.querySelector('figure')).toHaveAttribute('data-ecc', 'M');
    rerender(<QRCode value="abc" errorCorrection="Q" />);
    expect(container.querySelector('figure')).toHaveAttribute('data-ecc', 'Q');
    rerender(<QRCode value="abc" errorCorrection="L" logo={{ text: 'A', alt: 'Acme' }} />);
    expect(container.querySelector('figure')).toHaveAttribute('data-ecc', 'H');
    const layout = buildQrLayout({ value: 'abc', ecc: 'H', logo: {} });
    expect(layout.symbol.ecc).toBe('H');
  });

  it('AC-4: margin defaults to 4, is rounded and never below 2', () => {
    const n = encodeQr(VALUE, { ecc: 'M' }).size;
    const viewBox = (props: Partial<QRCodeProps>) => {
      const { container, unmount } = render(<QRCode value={VALUE} {...props} />);
      const v = svgOf(container).getAttribute('viewBox');
      unmount();
      return v;
    };
    expect(viewBox({})).toBe(`0 0 ${n + 8} ${n + 8}`);
    expect(viewBox({ margin: 6.4 })).toBe(`0 0 ${n + 12} ${n + 12}`);
    expect(viewBox({ margin: 0 })).toBe(`0 0 ${n + 4} ${n + 4}`);
    expect(viewBox({ margin: -3 })).toBe(`0 0 ${n + 4} ${n + 4}`);
  });

  it('AC-5: every module shape has its own geometry and function modules stay square', () => {
    const paths = Object.fromEntries(
      (['square', 'rounded', 'dots', 'diamond'] as const).map((moduleShape) => [moduleShape, buildQrLayout({ value: VALUE, ecc: 'M', moduleShape })]),
    );
    const distinct = new Set(Object.values(paths).map((l) => l.modulesPath));
    expect(distinct.size).toBe(4);
    const sym = paths.dots!.symbol;
    const n = sym.size;
    let dataDark = 0;
    for (let y = 0; y < n; y++) {
      for (let x = 0; x < n; x++) {
        const inFinder = (x < 7 && y < 7) || (x >= n - 7 && y < 7) || (x < 7 && y >= n - 7);
        if (sym.modules[y * n + x] && !sym.isFunction[y * n + x] && !inFinder) dataDark++;
      }
    }
    expect(dataDark).toBeGreaterThan(50);
    expect((paths.dots!.modulesPath.match(/a0\.45 0\.45/g) ?? []).length).toBe(dataDark * 2);
    expect(paths.rounded!.modulesPath).toContain('a0.5 0.5');
    expect(paths.diamond!.modulesPath).toContain('L');
    // Timing pattern modules are rectangles in all shapes: row 6, x = 8..n-9 alternate, so each dark one is a 1x1 run.
    for (const shape of ['rounded', 'dots', 'diamond'] as const) {
      const covered = coveredModules(paths[shape]!.modulesPath, 4);
      for (let x = 8; x < n - 8; x += 2) expect(covered.has(`${x},6`)).toBe(true);
    }
    const { container } = render(<QRCode value={VALUE} moduleShape="dots" />);
    expect(container.querySelector('figure')).toHaveAttribute('data-module-shape', 'dots');
  });

  it('AC-6: finder shapes change the finder geometry; the eye follows the ring by default', () => {
    const base = { value: VALUE, ecc: 'M' as const };
    const square = buildQrLayout(base).finderPath;
    const rounded = buildQrLayout({ ...base, finderShape: 'rounded' }).finderPath;
    const circle = buildQrLayout({ ...base, finderShape: 'circle' }).finderPath;
    expect(square).not.toContain('a');
    expect(rounded).toContain('a');
    expect(circle).toContain('a3.5 3.5');
    expect(circle).toContain('a1.5 1.5'); // eye follows
    const ringOnly = buildQrLayout({ ...base, finderShape: 'circle', finderInnerShape: 'square' }).finderPath;
    expect(ringOnly).toContain('a3.5 3.5');
    expect(ringOnly).not.toContain('a1.5 1.5');
    expect(new Set([square, rounded, circle, ringOnly]).size).toBe(4);
    const { container } = render(<QRCode value={VALUE} finderShape="rounded" />);
    expect(container.querySelector('path[fill-rule="evenodd"]')?.getAttribute('d')).toBe(rounded);
  });

  it('AC-7: colours default to the QR tokens and can be overridden', () => {
    const { container, rerender } = render(<QRCode value={VALUE} />);
    const figure = container.querySelector('figure') as HTMLElement;
    expect(figure.style.getPropertyValue('--ui-qr-fg')).toContain('--ui-color-qr-foreground');
    expect(figure.style.getPropertyValue('--ui-qr-bg')).toContain('--ui-color-qr-background');
    rerender(<QRCode value={VALUE} foreground="rgb(10, 20, 30)" background="rgb(250, 250, 240)" />);
    expect(figure.style.getPropertyValue('--ui-qr-fg')).toBe('rgb(10, 20, 30)');
    expect(figure.style.getPropertyValue('--ui-qr-bg')).toBe('rgb(250, 250, 240)');
    const scss = source('QRCode.scss');
    expect(scss).toContain('fill: var(--ui-qr-fg)');
    expect(scss).not.toMatch(/#[0-9a-f]{3,8}\b/i);
  });

  it('AC-8: logo image, icon and text; unsafe URLs dropped; alt joins the name', () => {
    const { container, rerender } = render(<QRCode value={VALUE} logo={{ src: PNG, alt: 'Acme' }} />);
    expect(container.querySelector('image')?.getAttribute('href')).toBe(PNG);
    expect(screen.getByRole('img', { name: 'QR code, with Acme logo' })).toBeInTheDocument();
    rerender(<QRCode value={VALUE} logo={{ src: 'javascript:alert(1)', alt: 'Acme' }} />);
    expect(container.querySelector('image')).toBeNull();
    expect(container.innerHTML).not.toContain('javascript:');
    expect(container.querySelector('figure')).toHaveAttribute('data-ecc', 'M'); // no usable logo, no ECC boost
    rerender(<QRCode value={VALUE} logo={{ src: 'javascript:alert(1)', text: 'AB', alt: 'Acme' }} />);
    expect(container.querySelector('image')).toBeNull();
    expect(container.querySelector('.ui-qr__logo-text')).toHaveTextContent('AB');
    rerender(<QRCode value={VALUE} logo={{ icon: 'star-filled', alt: 'Star' }} />);
    expect(container.querySelector('.ui-qr__logo path.ui-qr__fg')).not.toBeNull();
    rerender(<QRCode value={VALUE} logo={{ icon: 'check', alt: 'Tick' }} />);
    expect(container.querySelector('.ui-qr__logo path.ui-qr__stroke')).not.toBeNull();
    rerender(<QRCode value={VALUE} logo={{ src: 'https://example.com/logo.png', alt: 'Remote' }} />);
    expect(container.querySelector('image')?.getAttribute('href')).toBe('https://example.com/logo.png');
  });

  it('AC-9: logo size is clamped to 0.1-0.3 and stays clear of the finders', () => {
    for (const version of ['abc', 'x'.repeat(40), 'x'.repeat(300), 'x'.repeat(1200)]) {
      for (const fraction of [0.01, 0.1, 0.22, 0.3, 0.9]) {
        for (const padding of [0, 1, 4]) {
          for (const excavate of [true, false]) {
            const layout = buildQrLayout({ value: version, ecc: 'H', logo: { fraction, padding, excavate } });
            const n = layout.symbol.size;
            const { plate, content } = layout.logo!;
            expect(content.size / n).toBeGreaterThanOrEqual(0.1 - 1e-9);
            expect(content.size / n).toBeLessThanOrEqual(0.3 + 1e-9);
            const start = plate.x - layout.margin;
            // Inside the central zone: 9 modules of finder + separator + format information stay free.
            expect(start).toBeGreaterThanOrEqual(9);
            expect(start + plate.size).toBeLessThanOrEqual(n - 9);
            expect((plate.size * plate.size) / (n * n)).toBeLessThanOrEqual(0.18 + 1e-9);
            expect(Number.isInteger(start)).toBe(true);
          }
        }
      }
    }
    // A short value is bumped to a bigger version so the logo fits.
    const plain = buildQrLayout({ value: 'abc', ecc: 'H' });
    const logo = buildQrLayout({ value: 'abc', ecc: 'H', logo: {} });
    expect(plain.symbol.version).toBe(1);
    expect(logo.symbol.version).toBeGreaterThanOrEqual(3);
    const { container } = render(<QRCode value="abc" logo={{ text: 'A', size: 0.9, alt: 'A' }} />);
    expect(svgOf(container)).toBeInTheDocument();
  });

  it('AC-10: excavate clears the modules behind the logo; false keeps them', () => {
    const value = 'https://example.com/a/fairly/long/path?with=query&and=more'.repeat(2);
    const cleared = buildQrLayout({ value, ecc: 'H', logo: { excavate: true } });
    const kept = buildQrLayout({ value, ecc: 'H', logo: { excavate: false } });
    const inside = (layout: typeof cleared, set: Set<string>) => {
      const n = layout.symbol.size;
      const { x, y, size } = layout.logo!.plate;
      let count = 0;
      for (let j = 0; j < size; j++) for (let i = 0; i < size; i++) if (set.has(`${x - layout.margin + i},${y - layout.margin + j}`)) count++;
      expect(n).toBeGreaterThan(0);
      return count;
    };
    expect(inside(cleared, coveredModules(cleared.modulesPath, cleared.margin))).toBe(0);
    expect(inside(kept, coveredModules(kept.modulesPath, kept.margin))).toBeGreaterThan(5);
    const withPlate = render(<QRCode value={value} logo={{ text: 'A', alt: 'A' }} />);
    expect(withPlate.container.querySelector('.ui-qr__logo > path.ui-qr__bg')).not.toBeNull();
    const without = render(<QRCode value={value} logo={{ text: 'A', alt: 'A', excavate: false }} />);
    expect(without.container.querySelector('.ui-qr__logo > path.ui-qr__bg')).toBeNull();
  });

  it('AC-11: encoding is memoised and a changing value updates the same SVG in place', () => {
    const options = { value: VALUE, ecc: 'M' as const, margin: 4 };
    expect(buildQrLayout(options)).toBe(buildQrLayout({ ...options }));
    const { container, rerender } = render(<QRCode value="one" />);
    const svg = svgOf(container);
    const first = svg.querySelector('path')!.getAttribute('d');
    rerender(<QRCode value="two" />);
    expect(svgOf(container)).toBe(svg);
    expect(svg.querySelector('path')!.getAttribute('d')).not.toBe(first);
    rerender(<QRCode value="two" className="x" />);
    expect(svgOf(container)).toBe(svg);
  });

  it('AC-12: empty and too-long values show a labelled error, call onError once, and never throw', () => {
    const onError = vi.fn();
    const long = 'x'.repeat(3000);
    const { container, rerender } = render(<QRCode value={long} errorCorrection="H" size={200} onError={onError} />);
    expect(svgOf(container)).toBeNull();
    const status = screen.getByRole('status', { name: 'QR code' });
    expect(status).toHaveTextContent('This value is too long for a QR code');
    expect(container.querySelector('figure')!.style.getPropertyValue('--ui-qr-size')).toBe('200px');
    expect(onError).toHaveBeenCalledTimes(1);
    expect(onError.mock.calls[0]![0]).toBeInstanceOf(QrError);
    expect(onError.mock.calls[0]![0].code).toBe('too-long');
    rerender(<QRCode value={long} errorCorrection="H" size={200} onError={onError} className="again" />);
    expect(onError).toHaveBeenCalledTimes(1);
    rerender(<QRCode value="" onError={onError} />);
    expect(screen.getByRole('status', { name: 'QR code' })).toHaveTextContent('There is nothing to encode');
    expect(onError).toHaveBeenCalledTimes(2);
    expect(onError.mock.calls[1]![0].code).toBe('empty');
    rerender(<QRCode value="fine again" onError={onError} />);
    expect(svgOf(container)).toBeInTheDocument();
  });

  it('AC-13: loading shows a Skeleton and a Spinner with text, and no modules', () => {
    const { container } = render(<QRCode value={VALUE} status="loading" />);
    expect(container.querySelector('.ui-skeleton')).not.toBeNull();
    expect(screen.getByText('Loading QR code')).toBeInTheDocument();
    expect(svgOf(container)).toBeNull();
    expect(container.querySelector('.ui-qr__frame')).toHaveAttribute('aria-busy', 'true');
    expect(container.querySelector('figure')).toHaveAttribute('data-status', 'loading');
  });

  it('AC-14: expired fades the code and offers a Refresh button', () => {
    const onRefresh = vi.fn();
    const { container } = render(<QRCode value={VALUE} status="expired" onRefresh={onRefresh} />);
    expect(container.querySelector('figure')).toHaveClass('ui-qr--faded');
    expect(screen.getAllByText('QR code expired').length).toBeGreaterThan(0);
    fireEvent.click(screen.getByRole('button', { name: 'Refresh' }));
    expect(onRefresh).toHaveBeenCalledTimes(1);
    const scss = source('QRCode.scss');
    expect(scss).toMatch(/\.ui-qr--faded \.ui-qr__code \{\s*opacity: 0\.0\d/);
  });

  it('AC-14: no Refresh button without an onRefresh handler', () => {
    render(<QRCode value={VALUE} status="expired" />);
    expect(screen.queryByRole('button')).toBeNull();
  });

  it('AC-15: scanned fades the code and shows a success mark with text', () => {
    const { container } = render(<QRCode value={VALUE} status="scanned" />);
    expect(container.querySelector('figure')).toHaveClass('ui-qr--faded');
    expect(container.querySelector('.ui-qr__status--success')).toHaveTextContent('QR code scanned');
    expect(container.querySelector('.ui-qr__status--success svg')).not.toBeNull();
  });

  it('AC-16: status changes are announced politely, once, and not on first render', () => {
    const { container, rerender } = render(<QRCode value={VALUE} />);
    const region = container.querySelector('[aria-live="polite"]') as HTMLElement;
    expect(region).toHaveAttribute('role', 'status');
    expect(region).toHaveTextContent('');
    rerender(<QRCode value={VALUE} status="expired" />);
    expect(region).toHaveTextContent('QR code expired');
    rerender(<QRCode value={VALUE} status="expired" className="same" />);
    expect(region).toHaveTextContent('QR code expired');
    rerender(<QRCode value={VALUE} status="scanned" />);
    expect(region).toHaveTextContent('QR code scanned');
    rerender(<QRCode value={VALUE} />);
    expect(region).toHaveTextContent('');
    const first = render(<QRCode value={VALUE} status="expired" />);
    expect(first.container.querySelector('[aria-live="polite"]')).toHaveTextContent('');
  });

  describe('expiry', () => {
    beforeEach(() => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date('2026-01-01T12:00:00Z'));
    });
    afterEach(() => vi.useRealTimers());

    it('AC-17: expiresAt switches to expired and calls onExpire once', () => {
      const onExpire = vi.fn();
      const { container } = render(<QRCode value={VALUE} expiresAt={Date.now() + 5000} onExpire={onExpire} onRefresh={() => {}} />);
      expect(container.querySelector('figure')).toHaveAttribute('data-status', 'active');
      act(() => void vi.advanceTimersByTime(4999));
      expect(onExpire).not.toHaveBeenCalled();
      act(() => void vi.advanceTimersByTime(2));
      expect(container.querySelector('figure')).toHaveAttribute('data-status', 'expired');
      expect(onExpire).toHaveBeenCalledTimes(1);
      expect(container.querySelector('[aria-live="polite"]')).toHaveTextContent('QR code expired');
      act(() => void vi.advanceTimersByTime(60_000));
      expect(onExpire).toHaveBeenCalledTimes(1);
    });

    it('AC-17: a past expiresAt (Date) is expired immediately; far dates do not overflow the timer', () => {
      const onExpire = vi.fn();
      const { container, rerender } = render(<QRCode value={VALUE} expiresAt={new Date(Date.now() - 1)} onExpire={onExpire} />);
      expect(container.querySelector('figure')).toHaveAttribute('data-status', 'expired');
      expect(onExpire).toHaveBeenCalledTimes(1);
      const far = Date.now() + 40 * 24 * 3600 * 1000;
      rerender(<QRCode value={VALUE} expiresAt={far} onExpire={onExpire} />);
      expect(container.querySelector('figure')).toHaveAttribute('data-status', 'active');
      act(() => void vi.advanceTimersByTime(39 * 24 * 3600 * 1000));
      expect(onExpire).toHaveBeenCalledTimes(1);
      act(() => void vi.advanceTimersByTime(2 * 24 * 3600 * 1000));
      expect(onExpire).toHaveBeenCalledTimes(2);
    });

    it('AC-18: the timer is cleared on unmount and when expiresAt changes', () => {
      const onExpire = vi.fn();
      const { unmount } = render(<QRCode value={VALUE} expiresAt={Date.now() + 1000} onExpire={onExpire} />);
      expect(vi.getTimerCount()).toBe(1);
      unmount();
      expect(vi.getTimerCount()).toBe(0);
      act(() => void vi.advanceTimersByTime(5000));
      expect(onExpire).not.toHaveBeenCalled();

      const { rerender, container } = render(<QRCode value={VALUE} expiresAt={Date.now() + 1000} onExpire={onExpire} />);
      rerender(<QRCode value={VALUE} expiresAt={Date.now() + 10_000} onExpire={onExpire} />);
      expect(vi.getTimerCount()).toBe(1);
      act(() => void vi.advanceTimersByTime(2000));
      expect(onExpire).not.toHaveBeenCalled();
      expect(container.querySelector('figure')).toHaveAttribute('data-status', 'active');
      act(() => void vi.advanceTimersByTime(9000));
      expect(onExpire).toHaveBeenCalledTimes(1);
      // Refreshing (a new expiry) brings the code back without a flash of "expired".
      rerender(<QRCode value={VALUE} expiresAt={Date.now() + 10_000} onExpire={onExpire} />);
      expect(container.querySelector('figure')).toHaveAttribute('data-status', 'active');
    });
  });

  describe('export', () => {
    const created: string[] = [];
    const clicked: { download: string; href: string }[] = [];
    const drawn: string[] = [];
    const canvases: HTMLCanvasElement[] = [];
    let ctx: Record<string, unknown>;

    beforeEach(() => {
      created.length = clicked.length = drawn.length = canvases.length = 0;
      ctx = {
        scale: vi.fn(),
        setTransform: vi.fn(),
        fillRect: vi.fn(),
        fill: vi.fn((p: { d: string }) => drawn.push(p.d)),
        stroke: vi.fn(),
        save: vi.fn(),
        restore: vi.fn(),
        translate: vi.fn(),
        clip: vi.fn(),
        drawImage: vi.fn(),
        fillText: vi.fn(),
      };
      vi.stubGlobal('Path2D', class { constructor(public d: string) {} });
      vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockImplementation(function (this: HTMLCanvasElement) {
        canvases.push(this);
        return ctx as unknown as CanvasRenderingContext2D;
      });
      vi.spyOn(HTMLCanvasElement.prototype, 'toDataURL').mockReturnValue('data:image/png;base64,MOCK');
      vi.spyOn(HTMLCanvasElement.prototype, 'toBlob').mockImplementation((cb: BlobCallback) => cb(new Blob(['png'], { type: 'image/png' })));
      URL.createObjectURL = vi.fn(() => {
        created.push('blob');
        return 'blob:mock';
      });
      URL.revokeObjectURL = vi.fn();
      vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function (this: HTMLAnchorElement) {
        clicked.push({ download: this.download, href: this.href });
      });
    });
    afterEach(() => {
      vi.restoreAllMocks();
      vi.unstubAllGlobals();
    });

    const handle = (props: Partial<QRCodeProps> = {}) => {
      const ref = createRef<QRCodeHandle>();
      render(<QRCode ref={ref} value={VALUE} foreground="rgb(27, 26, 23)" background="rgb(255, 255, 255)" {...props} />);
      return ref.current!;
    };

    it('AC-19: toDataURL("svg") is a self-contained document with resolved colours', async () => {
      const url = await handle({ logo: { text: 'AB', alt: 'Acme' } }).toDataURL('svg');
      expect(url.startsWith('data:image/svg+xml;charset=utf-8,')).toBe(true);
      const svg = decodeURIComponent(url.slice(url.indexOf(',') + 1));
      expect(svg.startsWith('<svg xmlns="http://www.w3.org/2000/svg"')).toBe(true);
      expect(svg).toContain('fill="rgb(27, 26, 23)"');
      expect(svg).toContain('fill="rgb(255, 255, 255)"');
      expect(svg).toContain('>AB</text>');
      expect(svg).not.toContain('var(');
      expect(svg).not.toContain('<script');
      const blob = await handle().toBlob('svg');
      expect(blob.type).toBe('image/svg+xml');
      expect(await blob.text()).toContain('<path');
      // Default colours (CSS variables that cannot be resolved here) fall back to plain black on white.
      const ref = createRef<QRCodeHandle>();
      render(<QRCode ref={ref} value={VALUE} />);
      const plain = decodeURIComponent((await ref.current!.toDataURL('svg')).split(',')[1]!);
      expect(plain).not.toContain('var(');
    });

    it('AC-19: svg export escapes markup in text, hrefs and titles', () => {
      const layout = buildQrLayout({ value: VALUE, ecc: 'H', logo: {} });
      const svg = layoutToSvg(layout, { foreground: 'black"/><script>', background: 'white', size: 100, title: '<b>"&' }, { kind: 'text', text: '<&>' });
      expect(svg).not.toContain('<script>');
      expect(svg).toContain('&lt;&amp;&gt;');
      expect(svg).toContain('&lt;b&gt;&quot;&amp;');
      const img = layoutToSvg(layout, { foreground: 'black', background: 'white', size: 100 }, { kind: 'image', href: 'x" onload="alert(1)' });
      expect(img).not.toContain('onload="alert');
    });

    it('AC-20: PNG export rasterises on a canvas at whole pixels per module, at least 4x the size', async () => {
      const h = handle({ size: 160 });
      expect(await h.toDataURL('png')).toBe('data:image/png;base64,MOCK');
      const total = encodeQr(VALUE, { ecc: 'M' }).size + 8;
      const canvas = canvases.at(-1)!;
      expect(canvas.width).toBe(canvas.height);
      expect(canvas.width % total).toBe(0);
      expect(canvas.width).toBeGreaterThanOrEqual(640);
      expect(ctx.scale).toHaveBeenCalledWith(canvas.width / total, canvas.width / total);
      expect(drawn.length).toBeGreaterThanOrEqual(2);
      const blob = await h.toBlob('png');
      expect(blob.type).toBe('image/png');
    });

    it('AC-21: download sanitises the file name and picks the extension for svg and canvas renders', async () => {
      expect(sanitizeFilename('../../my code?.png', 'png')).toBe('my-code.png');
      expect(sanitizeFilename('a b/c\\d e', 'svg')).toBe('d-e.svg');
      expect(sanitizeFilename('', 'svg')).toBe('qr-code.svg');
      expect(sanitizeFilename('....', 'png')).toBe('qr-code.png');
      expect(sanitizeFilename('x'.repeat(200), 'png')).toHaveLength(84);
      const svgHandle = handle();
      await svgHandle.download('Ticket <1>');
      await svgHandle.download('ticket.png');
      await svgHandle.download('ticket.svg', 'png');
      await svgHandle.download();
      expect(clicked.map((c) => c.download)).toEqual(['Ticket-1.svg', 'ticket.png', 'ticket.png', 'qr-code.svg']);
      expect(created).toHaveLength(4);
      const canvasHandle = handle({ renderAs: 'canvas' });
      await canvasHandle.download('card');
      expect(clicked.at(-1)!.download).toBe('card.png');
      await canvasHandle.download('card', 'svg');
      expect(clicked.at(-1)!.download).toBe('card.svg');
    });

    it('AC-22: renderAs="canvas" renders a labelled canvas and draws the code', () => {
      const { container } = render(<QRCode value={VALUE} renderAs="canvas" size={200} label="Pay" logo={{ text: 'P', alt: 'Pay' }} />);
      const canvas = container.querySelector('canvas') as HTMLCanvasElement;
      expect(canvas).toHaveAttribute('role', 'img');
      expect(canvas).toHaveAttribute('aria-label', 'Pay, with Pay logo');
      const { total } = buildQrLayout({ value: VALUE, ecc: 'H', logo: {} });
      expect(canvas.width).toBe(200);
      expect(canvas.height).toBe(200);
      expect(ctx.setTransform).toHaveBeenCalledWith(200 / total, 0, 0, 200 / total, 0, 0);
      expect(ctx.fillRect).toHaveBeenCalled();
      expect(drawn.length).toBeGreaterThanOrEqual(2);
      expect(container.querySelector('svg.ui-qr__code')).toBeNull();
    });

    it('AC-22: export fails with a clear error when there is nothing to export', async () => {
      const ref = createRef<QRCodeHandle>();
      render(<QRCode ref={ref} value="" />);
      await expect(ref.current!.toDataURL('svg')).rejects.toThrow(/no QR code/);
    });
  });

  describe('dev warnings', () => {
    let warn: MockInstance<typeof console.warn>;
    beforeEach(() => {
      warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    });
    afterEach(() => warn.mockRestore());
    const messages = () => warn.mock.calls.map((c) => String(c[0]));

    it('AC-23: warns once for low contrast and for inverted codes', () => {
      const { rerender } = render(<QRCode value={VALUE} foreground="rgb(190, 190, 190)" background="rgb(255, 255, 255)" />);
      expect(messages().filter((m) => m.includes('contrast of'))).toHaveLength(1);
      rerender(<QRCode value={VALUE} foreground="rgb(190, 190, 190)" background="rgb(255, 255, 255)" className="again" />);
      expect(messages().filter((m) => m.includes('contrast of'))).toHaveLength(1);
      render(<QRCode value={VALUE} foreground="rgb(250, 250, 250)" background="rgb(10, 10, 10)" />);
      expect(messages().some((m) => m.includes('inverted'))).toBe(true);
    });

    it('AC-23: warns for margin below 4 and for mixed circle finders', () => {
      render(<QRCode value={VALUE} margin={2} />);
      expect(messages().some((m) => m.includes('quiet zone'))).toBe(true);
      render(<QRCode value={VALUE} finderShape="circle" finderInnerShape="square" />);
      expect(messages().some((m) => m.includes('circle finder ring with a square eye'))).toBe(true);
      render(<QRCode value={VALUE} moduleShape="dots" finderShape="square" finderInnerShape="rounded" />);
      expect(messages().some((m) => m.includes('square finder ring with a rounded eye under dot modules'))).toBe(true);
      render(<QRCode value={VALUE} logo={{ text: 'A', size: 0.6, alt: 'A' }} />);
      expect(messages().some((m) => m.includes('clamped'))).toBe(true);
    });

    it('AC-23: defaults and well-formed custom looks never warn', () => {
      render(<QRCode value={VALUE} />);
      render(<QRCode value={VALUE} moduleShape="dots" finderShape="rounded" foreground="rgb(27, 26, 23)" background="rgb(255, 255, 255)" logo={{ text: 'A', alt: 'A' }} />);
      render(<QRCode value={VALUE} moduleShape="rounded" finderShape="square" finderInnerShape="rounded" />);
      expect(warn).not.toHaveBeenCalled();
    });
  });

  it('AC-24: caption, bordered, className, style, title are applied', () => {
    const { container } = render(<QRCode value={VALUE} caption="Scan to pay" bordered className="mine" style={{ marginBlock: 3 }} title="Ticket code" data-testid="qr" />);
    const figure = screen.getByTestId('qr');
    expect(figure).toHaveClass('ui-qr', 'ui-qr--bordered', 'mine');
    expect(figure.style.marginBlock).toBe('3px');
    expect(figure.style.getPropertyValue('--ui-qr-size')).toBe('160px');
    expect(container.querySelector('figcaption')).toHaveTextContent('Scan to pay');
    expect(container.querySelector('svg title')).toHaveTextContent('Ticket code');
  });

  it('AC-25: strings come from the locale and can be overridden', () => {
    render(
      <LocaleProvider locale="sv" messages={{ qrCode: 'QR-kod', qrExpired: 'QR-koden har gått ut', qrRefresh: 'Uppdatera', qrTooLong: 'För långt', qrWithLogo: '{label} med {alt}' }}>
        <QRCode value={VALUE} status="expired" onRefresh={() => {}} logo={{ text: 'A', alt: 'logotyp' }} />
        <QRCode value={'x'.repeat(4000)} errorCorrection="H" />
      </LocaleProvider>,
    );
    expect(screen.getByRole('button', { name: 'Uppdatera' })).toBeInTheDocument();
    expect(screen.getAllByText('QR-koden har gått ut').length).toBeGreaterThan(0);
    expect(screen.getByRole('img', { name: 'QR-kod med logotyp' })).toBeInTheDocument();
    expect(screen.getByText('För långt')).toBeInTheDocument();
  });

  it('AC-26: no dangerouslySetInnerHTML, no network calls, logo URLs are sanitised', () => {
    for (const file of ['QRCode.tsx', 'layout.ts', 'raster.ts', 'encoder.ts']) {
      const text = source(file);
      expect(text).not.toContain('dangerouslySetInnerHTML');
      expect(text).not.toMatch(/\b(fetch|XMLHttpRequest|sendBeacon|WebSocket|localStorage|eval)\s*\(/);
    }
    expect(source('QRCode.tsx')).toContain('safeImageSrc');
  });
});
