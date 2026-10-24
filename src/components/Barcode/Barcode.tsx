import { useEffect, useMemo, useRef, type CSSProperties, type HTMLAttributes, type Ref } from 'react';
import { useScanColorWarnings } from '../../hooks/useScanColorWarnings';
import { useLocale } from '../../locale/LocaleProvider';
import { cx } from '../../utils/cx';
import { Icon } from '../Icon/Icon';
import { BarcodeError, encodeBarcode, type BarcodeEncoding, type BarcodeFormat } from './encodings';

export interface BarcodeProps extends Omit<HTMLAttributes<HTMLDivElement>, 'children' | 'onError'> {
  value: string;
  format?: BarcodeFormat;
  /** Bar height in px (the human-readable text is extra). Default 80. */
  height?: number;
  /** Width of the narrowest bar in px. Default 2. */
  barWidth?: number;
  displayValue?: boolean;
  /** Quiet zone on each side in modules; defaults per format (10, EAN-13 11, UPC-A 9, EAN-8 7). */
  margin?: number;
  foreground?: string;
  background?: string;
  label?: string;
  onError?: (error: BarcodeError) => void;
  /** The SVG element. */
  ref?: Ref<SVGSVGElement>;
}

const DEFAULT_FOREGROUND = 'var(--ui-color-qr-foreground, black)';
const DEFAULT_BACKGROUND = 'var(--ui-color-qr-background, white)';

type Built = { encoding: BarcodeEncoding; error?: undefined } | { encoding?: undefined; error: BarcodeError };

/** Merge the `1` bits into bar rectangles; bars inside a guard range are returned separately (they hang lower). */
export function barRects(bits: string, guards: readonly [number, number][]): { normal: [number, number][]; guard: [number, number][] } {
  const normal: [number, number][] = [];
  const guard: [number, number][] = [];
  for (let i = 0; i < bits.length; i++) {
    if (bits[i] !== '1') continue;
    let end = i;
    while (end + 1 < bits.length && bits[end + 1] === '1') end++;
    const inGuard = guards.some(([start, stop]) => i >= start && end < stop);
    (inGuard ? guard : normal).push([i, end - i + 1]);
    i = end;
  }
  return { normal, guard };
}

export function Barcode({
  value,
  format = 'code128',
  height = 80,
  barWidth = 2,
  displayValue = true,
  margin,
  foreground,
  background,
  label,
  onError,
  className,
  style,
  ref,
  ...rest
}: BarcodeProps) {
  const { t } = useLocale();
  const rootRef = useRef<HTMLDivElement>(null);
  const fg = foreground ?? DEFAULT_FOREGROUND;
  const bg = background ?? DEFAULT_BACKGROUND;

  const built = useMemo<Built>(() => {
    try {
      return { encoding: encodeBarcode(format, value) };
    } catch (e) {
      return { error: e instanceof BarcodeError ? e : new BarcodeError('invalid-character', e instanceof Error ? e.message : 'Encoding failed') };
    }
  }, [format, value]);
  const { encoding, error } = built;

  const onErrorRef = useRef(onError);
  onErrorRef.current = onError;
  useEffect(() => {
    if (error) onErrorRef.current?.(error);
  }, [error]);

  useScanColorWarnings('Barcode', rootRef, fg, bg);

  const bar = Math.max(1, barWidth);
  const barHeight = Math.max(8, height);
  const fontSize = Math.min(18, Math.max(11, bar * 6));
  const textBand = displayValue ? Math.round(fontSize * 1.3) : 0;
  const totalHeight = barHeight + textBand;
  const rootStyle = { '--ui-qr-fg': fg, '--ui-qr-bg': bg, ...style } as CSSProperties;
  const baseLabel = label ?? t('barcode');

  let body;
  if (error || !encoding) {
    const code = error?.code;
    const message =
      code === 'empty' ? t('barcodeEmpty') : code === 'invalid-length' ? t('barcodeInvalidLength') : code === 'check-digit' ? t('barcodeCheckDigit') : t('barcodeInvalidCharacter');
    body = (
      <div className="ui-barcode__error" role="status" aria-label={baseLabel} style={{ minBlockSize: totalHeight }}>
        <Icon name="alert-circle" size="lg" />
        <p className="ui-barcode__error-text">{message}</p>
      </div>
    );
  } else {
    const quiet = Math.max(0, margin ?? encoding.quietZone);
    const modules = encoding.bits.length + 2 * quiet;
    const width = modules * bar;
    const guardDrop = displayValue ? Math.round(fontSize * 0.6) : 0;
    const { normal, guard } = barRects(encoding.bits, displayValue ? encoding.guards : []);
    const rect = ([start, len]: [number, number], h: number) => `M${(quiet + start) * bar} 0h${len * bar}v${h}h${-len * bar}z`;
    const textY = barHeight + fontSize * 1.05;
    const texts =
      encoding.text.length > 0
        ? encoding.text
        : [{ text: [...encoding.value].map((c) => (c.charCodeAt(0) < 32 ? '·' : c)).join(''), x: encoding.bits.length / 2, anchor: 'middle' as const }];
    body = (
      <svg
        ref={ref}
        className="ui-barcode__svg"
        role="img"
        aria-label={`${baseLabel} ${encoding.value}`}
        xmlns="http://www.w3.org/2000/svg"
        viewBox={`0 0 ${width} ${totalHeight}`}
        width={width}
        height={totalHeight}
        focusable="false"
        shapeRendering="crispEdges"
        data-format={encoding.format}
      >
        <rect className="ui-barcode__bg" width={width} height={totalHeight} />
        <path className="ui-barcode__bar" d={normal.map((r) => rect(r, barHeight)).join('')} />
        {guard.length > 0 && <path className="ui-barcode__bar ui-barcode__bar--guard" d={guard.map((r) => rect(r, barHeight + guardDrop)).join('')} />}
        {displayValue &&
          texts.map((tx, i) => (
            <text key={i} className="ui-barcode__text" aria-hidden="true" x={(quiet + tx.x) * bar} y={textY} textAnchor={tx.anchor} fontSize={fontSize}>
              {tx.text}
            </text>
          ))}
      </svg>
    );
  }

  return (
    <div ref={rootRef} className={cx('ui-barcode', error && 'ui-barcode--invalid', className)} style={rootStyle} data-format={format} {...rest}>
      {body}
    </div>
  );
}
