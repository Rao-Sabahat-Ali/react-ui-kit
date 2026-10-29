import type { CSSProperties, Ref, SVGAttributes } from 'react';
import { useLocale } from '../../locale/LocaleProvider';
import { cx } from '../../utils/cx';

export type SparklineType = 'line' | 'area' | 'bar';
/** Index into the `--ui-color-chart-1..8` palette. */
export type SparklineColor = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8;

export interface SparklineProps extends Omit<SVGAttributes<SVGSVGElement>, 'values' | 'type' | 'height' | 'color' | 'children' | 'ref'> {
  /** Series; `null` and non-finite values are gaps. */
  values: (number | null | undefined)[];
  type?: SparklineType;
  /** Pixel height; the width is 100% of the container. */
  height?: number;
  color?: SparklineColor;
  showMinMax?: boolean;
  /** Accessible name. Without it the sparkline is decorative (`aria-hidden`). */
  label?: string;
  /** Text alternative appended to the label; generated from the data by default, `false` disables. */
  summary?: string | false;
  ref?: Ref<SVGSVGElement>;
}

const PAD = 3;
const round = (n: number) => Math.round(n * 100) / 100;

export function Sparkline({ values, type = 'line', height = 32, color = 1, showMinMax = false, label, summary, className, ref, ...rest }: SparklineProps) {
  const { t, locale } = useLocale();
  const points = values.map((v, i) => ({ v: typeof v === 'number' && Number.isFinite(v) ? v : null, i }));
  const valid = points.filter((p): p is { v: number; i: number } => p.v !== null);
  const bars = type === 'bar';
  if (valid.length < (bars ? 1 : 2)) return null;

  const n = values.length;
  const min = Math.min(...valid.map((p) => p.v));
  const max = Math.max(...valid.map((p) => p.v));
  const lo = bars ? Math.min(0, min) : min;
  const hi = bars ? Math.max(0, max) : max;
  const span = hi - lo || 1;
  const top = PAD;
  const bottom = height - PAD;
  const yOf = (v: number) => (hi === lo ? (top + bottom) / 2 : bottom - ((v - lo) / span) * (bottom - top));
  const slot = 100 / n;
  const xOf = (i: number) => (bars ? slot * i + slot / 2 : n === 1 ? 50 : (i / (n - 1)) * 100);

  // Line segments (gaps split the line).
  const segments: { x: number; y: number }[][] = [];
  if (!bars) {
    let current: { x: number; y: number }[] = [];
    for (const p of points) {
      if (p.v === null) {
        if (current.length) segments.push(current);
        current = [];
      } else current.push({ x: round(xOf(p.i)), y: round(yOf(p.v)) });
    }
    if (current.length) segments.push(current);
  }
  const linePath = segments.map((s) => s.map((pt, k) => `${k ? 'L' : 'M'}${pt.x} ${pt.y}`).join(' ')).join(' ');
  const areaPath = segments
    .filter((s) => s.length > 1)
    .map((s) => `${s.map((pt, k) => `${k ? 'L' : 'M'}${pt.x} ${pt.y}`).join(' ')} L${s[s.length - 1]!.x} ${bottom} L${s[0]!.x} ${bottom} Z`)
    .join(' ');

  const lowest = valid.find((p) => p.v === min)!;
  const highest = valid.find((p) => p.v === max)!;

  let name: string | undefined;
  if (label) {
    const nf = new Intl.NumberFormat(locale, { maximumFractionDigits: 2 });
    const auto = t('sparklineSummary', { count: valid.length, first: nf.format(valid[0]!.v), last: nf.format(valid[valid.length - 1]!.v), min: nf.format(min), max: nf.format(max) });
    const text = summary === false ? '' : (summary ?? auto);
    name = text ? `${label}. ${text}` : label;
  }
  const a11y = name ? { role: 'img' as const, 'aria-label': name } : { 'aria-hidden': true as const };

  const zeroY = yOf(0);
  return (
    <svg
      ref={ref}
      className={cx('ui-sparkline', `ui-sparkline--${type}`, `ui-sparkline--color-${color}`, className)}
      viewBox={`0 0 100 ${height}`}
      preserveAspectRatio="none"
      width="100%"
      height={height}
      focusable="false"
      {...a11y}
      {...rest}
    >
      {type === 'area' && areaPath && <path className="ui-sparkline__area" d={areaPath} />}
      {!bars && <path className="ui-sparkline__line" d={linePath} fill="none" vectorEffect="non-scaling-stroke" />}
      {bars &&
        valid.map((p) => {
          const y = yOf(p.v);
          return <rect key={p.i} className={cx('ui-sparkline__bar', p.v < 0 && 'ui-sparkline__bar--neg')} style={{ '--ui-i': Math.min(p.i, 7) } as CSSProperties} x={round(slot * p.i + slot * 0.15)} width={round(slot * 0.7)} y={round(Math.min(y, zeroY))} height={round(Math.max(Math.abs(y - zeroY), p.v === 0 ? 0 : 1))} />;
        })}
      {showMinMax &&
        [lowest, highest].map((p, k) => (
          <path key={k} className="ui-sparkline__marker" d={`M${round(xOf(p.i))} ${round(yOf(p.v))}h0`} vectorEffect="non-scaling-stroke" />
        ))}
    </svg>
  );
}
