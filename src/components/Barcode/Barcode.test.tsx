import { render, screen } from '@testing-library/react';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi, type MockInstance } from 'vitest';
import { LocaleProvider } from '../../locale/LocaleProvider';
import { Barcode, barRects } from './Barcode';
import { BARCODE_FORMATS, BarcodeError, CODE128_PATTERNS, CODE39_PATTERNS, code128Codes, eanCheckDigit, encodeBarcode, ITF_PATTERNS } from './encodings';

const source = (file: string) => readFileSync(join(process.cwd(), 'src/components/Barcode', file), 'utf8');
const svgOf = (container: HTMLElement) => container.querySelector('svg.ui-barcode__svg') as SVGSVGElement;
const code = (fn: () => unknown) => {
  try {
    fn();
  } catch (e) {
    return e instanceof BarcodeError ? e.code : 'other';
  }
  return 'none';
};

describe('Barcode', () => {
  it('AC-1: renders an SVG role=img named with the label and the encoded value; size follows props', () => {
    const { container } = render(<Barcode value="Hello" height={64} barWidth={3} />);
    const svg = screen.getByRole('img', { name: 'Barcode Hello' });
    expect(svg).toBe(svgOf(container));
    const enc = encodeBarcode('code128', 'Hello');
    const width = (enc.bits.length + 20) * 3;
    expect(svg.getAttribute('viewBox')).toMatch(new RegExp(`^0 0 ${width} \\d+$`));
    expect(svg).toHaveAttribute('width', String(width));
    expect(Number(svg.getAttribute('height'))).toBeGreaterThan(64);
    render(<Barcode value="Hello" displayValue={false} height={64} />);
    expect(screen.getAllByRole('img')[1]).toHaveAttribute('height', '64');
    expect(screen.getAllByRole('img')[1]).toHaveAttribute('width', String((enc.bits.length + 20) * 2));
  });

  it('AC-2: Code 128 "Hello" is start B, H e l l o, checksum 76, stop', () => {
    expect(code128Codes('Hello')).toEqual([104, 40, 69, 76, 76, 79, 76, 106]);
    // Reference pattern from an independent implementation (quiet zones removed).
    expect(encodeBarcode('code128', 'Hello').bits).toBe('110100100001100010100010110010000110010100001100101000010001111010110010100001100011101011');
    expect(CODE128_PATTERNS).toHaveLength(107);
    expect(new Set(CODE128_PATTERNS).size).toBe(107);
    CODE128_PATTERNS.forEach((pattern, i) => {
      const modules = [...pattern].reduce((sum, w) => sum + Number(w), 0);
      expect(modules).toBe(i === 106 ? 13 : 11);
      const bars = [...pattern].filter((_, k) => k % 2 === 0).reduce((sum, w) => sum + Number(w), 0);
      expect(bars % 2).toBe(0); // every Code 128 symbol has an even number of bar modules
    });
  });

  it('AC-2: Code 128 switches sets: numeric runs use set C, control characters use set A', () => {
    expect(code128Codes('123456')).toEqual([105, 12, 34, 56, (105 + 12 + 2 * 34 + 3 * 56) % 103, 106]);
    expect(code128Codes('12AB34')[0]).toBe(104); // short runs in the middle stay in B
    expect(code128Codes('ORDER-1234567')).toContain(99); // CODE C switch
    expect(code128Codes('12345')).toEqual([104, 17, 99, 23, 45, (104 + 17 + 2 * 99 + 3 * 23 + 4 * 45) % 103, 106]); // odd run: first digit in B, then pairs in C
    expect(code128Codes('\tA')[0]).toBe(103); // control character starts in set A
    expect(code128Codes('A\tb')).toContain(101); // switch to A for the tab
    expect(code128Codes('\tb')).toContain(100); // and back to B for lowercase
    expect(encodeBarcode('code128', '123456').bits).toBe('11010011100101100111001000101100011100010110100011011101100011101011');
    expect(code(() => encodeBarcode('code128', 'naïve'))).toBe('invalid-character');
    expect(code(() => encodeBarcode('code128', ''))).toBe('empty');
  });

  it('AC-3: EAN-13 "5901234123457" is the standard 95-module pattern; check digit is added or verified', () => {
    const enc = encodeBarcode('ean13', '5901234123457');
    expect(enc.bits).toBe('10100010110100111011001100100110111101001110101010110011011011001000010101110010011101000100101');
    expect(enc.bits).toHaveLength(95);
    expect(enc.value).toBe('5901234123457');
    expect(eanCheckDigit('590123412345')).toBe(7);
    expect(encodeBarcode('ean13', '590123412345').value).toBe('5901234123457');
    expect(encodeBarcode('ean13', '590123412345').bits).toBe(enc.bits);
    expect(code(() => encodeBarcode('ean13', '5901234123458'))).toBe('check-digit');
    expect(enc.text.map((t) => t.text)).toEqual(['5', '901234', '123457']);
  });

  it('AC-4: EAN-8 and UPC-A compute and verify check digits; wrong input is a typed error', () => {
    expect(encodeBarcode('ean8', '9638507').value).toBe('96385074');
    expect(encodeBarcode('ean8', '96385074').bits).toBe('1010001011010111101111010110111010101001110111001010001001011100101');
    expect(encodeBarcode('ean8', '96385074').bits).toHaveLength(67);
    expect(encodeBarcode('upca', '12345678901').value).toBe('123456789012');
    expect(encodeBarcode('upca', '123456789012').bits).toBe('10100110010010011011110101000110110001010111101010100010010010001110100111001011001101101100101');
    expect(encodeBarcode('upca', '123456789012').text.map((t) => t.text)).toEqual(['1', '23456', '78901', '2']);
    expect(code(() => encodeBarcode('ean8', '96385075'))).toBe('check-digit');
    expect(code(() => encodeBarcode('upca', '12345'))).toBe('invalid-length');
    expect(code(() => encodeBarcode('ean13', '12345678901234'))).toBe('invalid-length');
    expect(code(() => encodeBarcode('ean13', '59012341234A'))).toBe('invalid-character');
    expect(code(() => encodeBarcode('ean13', ''))).toBe('empty');
    expect(eanCheckDigit('0')).toBe(0);
    expect(eanCheckDigit('036000291452'.slice(0, 11))).toBe(2);
  });

  it('AC-5: Code 39 upper-cases input, adds * start/stop and rejects unsupported characters', () => {
    const enc = encodeBarcode('code39', 'code39');
    expect(enc.value).toBe('CODE39');
    expect(enc.bits).toBe('1000101110111010111011101000101011101011101000101010111000101110111010111000101011101110001010101011100010111010100010111011101');
    expect(Object.keys(CODE39_PATTERNS)).toHaveLength(44);
    for (const pattern of Object.values(CODE39_PATTERNS)) expect([...pattern].filter((w) => w === '1')).toHaveLength(3); // 3 wide of 9
    expect(new Set(Object.values(CODE39_PATTERNS)).size).toBe(44);
    expect(code(() => encodeBarcode('code39', 'a*b'))).toBe('invalid-character');
    expect(code(() => encodeBarcode('code39', 'é'))).toBe('invalid-character');
    expect(code(() => encodeBarcode('code39', ''))).toBe('empty');
  });

  it('AC-6: Interleaved 2 of 5 needs an even number of digits and uses standard start/stop', () => {
    const enc = encodeBarcode('itf', '1234567890');
    expect(enc.bits).toBe('101011101000101011100011101110100010100011101000111000101010001010111000111010111010001110001011101');
    expect(enc.bits.startsWith('1010')).toBe(true);
    expect(enc.bits.endsWith('11101')).toBe(true);
    for (const p of ITF_PATTERNS) expect([...p].filter((w) => w === '1')).toHaveLength(2);
    expect(code(() => encodeBarcode('itf', '123'))).toBe('invalid-length');
    expect(code(() => encodeBarcode('itf', '12ab'))).toBe('invalid-character');
    expect(code(() => encodeBarcode('itf', ''))).toBe('empty');
  });

  it('AC-7: an invalid value shows a labelled status error, calls onError once, never throws', () => {
    const onError = vi.fn();
    const { container, rerender } = render(<Barcode value="12345" format="ean13" height={64} onError={onError} />);
    expect(svgOf(container)).toBeNull();
    expect(screen.getByRole('status', { name: 'Barcode' })).toHaveTextContent('wrong length');
    expect(onError).toHaveBeenCalledTimes(1);
    expect(onError.mock.calls[0]![0]).toBeInstanceOf(BarcodeError);
    expect(onError.mock.calls[0]![0].code).toBe('invalid-length');
    rerender(<Barcode value="12345" format="ean13" height={64} onError={onError} className="again" />);
    expect(onError).toHaveBeenCalledTimes(1);
    rerender(<Barcode value="" onError={onError} />);
    expect(screen.getByRole('status')).toHaveTextContent('nothing to encode');
    expect(onError).toHaveBeenCalledTimes(2);
    rerender(<Barcode value="5901234123458" format="ean13" />);
    expect(screen.getByRole('status')).toHaveTextContent('check digit');
    rerender(<Barcode value="é" format="code39" />);
    expect(screen.getByRole('status')).toHaveTextContent('characters');
    rerender(<Barcode value="fine" />);
    expect(svgOf(container)).toBeInTheDocument();
  });

  it('AC-8: displayValue shows tabular text (EAN grouped with outside digits); false hides it', () => {
    const { container, rerender } = render(<Barcode value="5901234123457" format="ean13" />);
    const texts = [...container.querySelectorAll('text')].map((t) => t.textContent);
    expect(texts).toEqual(['5', '901234', '123457']);
    expect(container.querySelector('text')).toHaveAttribute('aria-hidden', 'true');
    expect(source('Barcode.scss')).toContain('font-variant-numeric: tabular-nums');
    rerender(<Barcode value="ORDER-1" />);
    expect([...container.querySelectorAll('text')].map((t) => t.textContent)).toEqual(['ORDER-1']);
    rerender(<Barcode value="ORDER-1" displayValue={false} />);
    expect(container.querySelector('text')).toBeNull();
    rerender(<Barcode value="5901234123457" format="ean13" displayValue={false} />);
    expect(container.querySelector('.ui-barcode__bar--guard')).toBeNull();
    rerender(<Barcode value="5901234123457" format="ean13" />);
    expect(container.querySelector('.ui-barcode__bar--guard')).not.toBeNull();
  });

  it('AC-9: bars are merged rectangles whose modules equal the 1 bits', () => {
    for (const [format, value] of [['code128', 'Hello'], ['ean13', '5901234123457'], ['code39', 'ABC'], ['itf', '123456'], ['ean8', '96385074'], ['upca', '123456789012']] as const) {
      const enc = encodeBarcode(format, value);
      const { container, unmount } = render(<Barcode value={value} format={format} barWidth={2} height={50} displayValue={false} />);
      const d = [...container.querySelectorAll('path.ui-barcode__bar')].map((p) => p.getAttribute('d')).join('');
      const widths = [...d.matchAll(/h(\d+)v50h-/g)].map((m) => Number(m[1]) / 2);
      expect(widths.reduce((a, b) => a + b, 0)).toBe([...enc.bits].filter((b) => b === '1').length);
      expect(widths.length).toBe(enc.bits.match(/1+/g)!.length);
      unmount();
    }
    const { normal, guard } = barRects('10101', [[0, 3]]);
    expect(guard).toEqual([[0, 1], [2, 1]]);
    expect(normal).toEqual([[4, 1]]);
  });

  it('AC-10: colours default to the QR tokens, can be overridden, and warn in dev when unreadable', () => {
    const warn: MockInstance<typeof console.warn> = vi.spyOn(console, 'warn').mockImplementation(() => {});
    try {
      const { container, rerender } = render(<Barcode value="Hello" />);
      const root = container.querySelector('.ui-barcode') as HTMLElement;
      expect(root.style.getPropertyValue('--ui-qr-fg')).toContain('--ui-color-qr-foreground');
      expect(root.style.getPropertyValue('--ui-qr-bg')).toContain('--ui-color-qr-background');
      expect(warn).not.toHaveBeenCalled();
      rerender(<Barcode value="Hello" foreground="rgb(33, 44, 55)" background="rgb(255, 255, 250)" />);
      expect(root.style.getPropertyValue('--ui-qr-fg')).toBe('rgb(33, 44, 55)');
      expect(warn).not.toHaveBeenCalled();
      rerender(<Barcode value="Hello" foreground="rgb(180, 180, 175)" background="rgb(255, 255, 255)" />);
      expect(warn.mock.calls.some((c) => String(c[0]).includes('contrast of'))).toBe(true);
      rerender(<Barcode value="Hello" foreground="rgb(240, 240, 240)" background="rgb(15, 15, 15)" />);
      expect(warn.mock.calls.some((c) => String(c[0]).includes('inverted'))).toBe(true);
      expect(source('Barcode.scss')).not.toMatch(/#[0-9a-f]{3,8}\b/i);
    } finally {
      warn.mockRestore();
    }
  });

  it('AC-11: margin defaults per format, is never negative, and widens the viewBox on both sides', () => {
    const quiet = (format: Parameters<typeof encodeBarcode>[0], value: string) => encodeBarcode(format, value).quietZone;
    expect([quiet('code128', 'a'), quiet('ean13', '5901234123457'), quiet('upca', '123456789012'), quiet('ean8', '96385074'), quiet('code39', 'A'), quiet('itf', '1234')]).toEqual([10, 11, 9, 7, 10, 10]);
    const width = (props: Partial<Parameters<typeof Barcode>[0]>) => {
      const { container, unmount } = render(<Barcode value="Hello" barWidth={1} {...props} />);
      const w = Number(svgOf(container).getAttribute('width'));
      unmount();
      return w;
    };
    const bits = encodeBarcode('code128', 'Hello').bits.length;
    expect(width({})).toBe(bits + 20);
    expect(width({ margin: 4 })).toBe(bits + 8);
    expect(width({ margin: -5 })).toBe(bits);
    const { container } = render(<Barcode value="Hello" margin={5} barWidth={2} displayValue={false} height={30} />);
    expect(container.querySelector('path.ui-barcode__bar')!.getAttribute('d')!.startsWith('M10 0')).toBe(true);
  });

  it('AC-12: label, className, style and ref are applied; value or format changes re-render in place', () => {
    const ref = { current: null as SVGSVGElement | null };
    const { container, rerender } = render(<Barcode value="one" label="Order" className="mine" style={{ marginBlock: 3 }} data-testid="bc" ref={ref} />);
    const root = screen.getByTestId('bc');
    expect(root).toHaveClass('ui-barcode', 'mine');
    expect(root.style.marginBlock).toBe('3px');
    expect(screen.getByRole('img', { name: 'Order one' })).toBe(ref.current);
    const svg = svgOf(container);
    const d = svg.querySelector('path.ui-barcode__bar')!.getAttribute('d');
    rerender(<Barcode value="two" label="Order" ref={ref} data-testid="bc" />);
    expect(svgOf(container)).toBe(svg);
    expect(svg.querySelector('path.ui-barcode__bar')!.getAttribute('d')).not.toBe(d);
    expect(screen.getByRole('img', { name: 'Order two' })).toBeInTheDocument();
    rerender(<Barcode value="12345678" format="itf" label="Order" ref={ref} data-testid="bc" />);
    expect(svg).toHaveAttribute('data-format', 'itf');
  });

  it('AC-13: strings come from the locale and can be overridden', () => {
    render(
      <LocaleProvider locale="sv" messages={{ barcode: 'Streckkod', barcodeInvalidLength: 'Fel längd' }}>
        <Barcode value="Hej" />
        <Barcode value="123" format="ean13" label="Artikel" />
      </LocaleProvider>,
    );
    expect(screen.getByRole('img', { name: 'Streckkod Hej' })).toBeInTheDocument();
    expect(screen.getByRole('status', { name: 'Artikel' })).toHaveTextContent('Fel längd');
  });

  it('AC-14: no dangerouslySetInnerHTML and no network calls', () => {
    for (const file of ['Barcode.tsx', 'encodings.ts']) {
      const text = source(file);
      expect(text).not.toContain('dangerouslySetInnerHTML');
      expect(text).not.toMatch(/\b(fetch|XMLHttpRequest|sendBeacon|WebSocket|localStorage|eval)\s*\(/);
    }
  });

  describe('AC-15: agreement with reference encoders', () => {
    // Reference vectors were produced with JsBarcode and decoded with ZXing outside the repository (see the spec's
    // verification record); the checks here are the structural invariants plus the fixed patterns above.
    it('every format starts and ends with a bar and has the standard length', () => {
      expect(BARCODE_FORMATS).toEqual(['code128', 'ean13', 'ean8', 'upca', 'code39', 'itf']);
      const samples: [Parameters<typeof encodeBarcode>[0], string, number][] = [
        ['code128', 'Hello', 11 * 7 + 13],
        ['code128', 'A', 11 * 3 + 13],
        ['code128', '123456', 11 * 5 + 13],
        ['ean13', '5901234123457', 95],
        ['upca', '03600029145', 95],
        ['ean8', '1234567', 67],
        ['code39', 'A', 3 * 15 + 2], // three characters of 15 modules (3 wide, 6 narrow) and two gaps
        ['itf', '1234', 4 + 2 * 18 + 5], // start, two digit pairs of 18 modules, stop
      ];
      for (const [format, value, length] of samples) {
        const { bits } = encodeBarcode(format, value);
        expect(bits, `${format} ${value}`).toHaveLength(length);
        expect(bits[0]).toBe('1');
        expect(bits.at(-1)).toBe('1');
        expect(bits).toMatch(/^[01]+$/);
      }
    });
  });
});

let consoleError: MockInstance<typeof console.error>;
beforeEach(() => {
  consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
});
afterEach(() => {
  expect(consoleError).not.toHaveBeenCalled();
  consoleError.mockRestore();
});
