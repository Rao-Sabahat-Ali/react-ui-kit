import { useEffect, useId, useLayoutEffect, useMemo, useRef, useState, type HTMLAttributes, type KeyboardEvent, type ReactNode, type Ref, type RefObject } from 'react';
import { interpolate, useLocale } from '../../locale/LocaleProvider';
import { cx } from '../../utils/cx';
import { arcPath, areaPath, linePath, niceTicks, round, type Point } from './geometry';

export type ChartType = 'line' | 'area' | 'bar' | 'pie' | 'doughnut' | 'sparkline';
/** Index into the `--ui-color-chart-1..8` palette. */
export type ChartColor = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8;

export interface ChartSeries {
  name: string;
  values: (number | null)[];
  color?: ChartColor;
}

export interface ChartData {
  labels: string[];
  series: ChartSeries[];
}

export interface ChartAxis {
  min?: number;
  max?: number;
  format?: (n: number) => string;
  label?: string;
}

export interface ChartLabels {
  viewTable: string;
  hideTable: string;
  legend: string;
  /** Point announcement, `{series}`, `{label}`, `{value}`. */
  point: string;
  category: string;
}

export interface ChartProps extends Omit<HTMLAttributes<HTMLElement>, 'title' | 'children'> {
  type: ChartType;
  data: ChartData;
  /** Required accessible name (figcaption). */
  title: string;
  /** Text description for assistive technology. */
  summary?: string;
  height?: number;
  stacked?: boolean;
  horizontal?: boolean;
  yAxis?: ChartAxis;
  legend?: 'top' | 'bottom' | 'none';
  tooltip?: boolean;
  /** Show the "View as table" toggle. */
  showTable?: boolean;
  /** Custom table/alternative content rendered under the chart. */
  table?: ReactNode;
  formatValue?: (n: number) => string;
  /** Line dashes / bar hatching so colour is not the only differentiator. */
  patterns?: boolean;
  /** Hide the visible caption (still used as the accessible name). */
  hideTitle?: boolean;
  labels?: Partial<ChartLabels>;
  ref?: Ref<HTMLElement>;
}

interface Mark {
  key: string;
  series: number;
  label: number;
  value: number;
  /** Tooltip anchor in SVG px. */
  x: number;
  y: number;
}

const FALLBACK_WIDTH = 600;
const DASHES = ['', '6 4', '2 3', '10 4 2 4', '1 4', '8 3 2 3 2 3', '12 6', '4 2'];

const colorOf = (series: ChartSeries | undefined, index: number): ChartColor => (series?.color ?? ((index % 8) + 1)) as ChartColor;

function useContainerWidth(ref: RefObject<HTMLDivElement | null>): number {
  const [width, setWidth] = useState(0);
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (el.clientWidth > 0) setWidth(el.clientWidth);
    if (typeof ResizeObserver === 'undefined') return;
    const observer = new ResizeObserver((entries) => {
      const w = entries[0]?.contentRect.width ?? 0;
      if (w > 0) setWidth(Math.round(w));
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, [ref]);
  return width > 0 ? width : FALLBACK_WIDTH;
}

export function Chart({
  type,
  data,
  title,
  summary,
  height: heightProp,
  stacked = false,
  horizontal = false,
  yAxis,
  legend = 'bottom',
  tooltip = true,
  showTable = false,
  table,
  formatValue: formatProp,
  patterns = false,
  hideTitle = false,
  labels: labelsProp,
  className,
  ref,
  ...rest
}: ChartProps) {
  const { locale, t } = useLocale();
  const L: ChartLabels = { viewTable: t('viewTable'), hideTable: t('hideTable'), legend: t('legend'), point: t('chartPoint'), category: t('category'), ...labelsProp };
  const uid = useId().replace(/:/g, '');
  const containerRef = useRef<HTMLDivElement>(null);
  const width = useContainerWidth(containerRef);
  const isPie = type === 'pie' || type === 'doughnut';
  const isSpark = type === 'sparkline';
  const height = heightProp ?? (isSpark ? 48 : 280);
  const [hidden, setHidden] = useState<Set<number>>(() => new Set());
  const [active, setActive] = useState<string | null>(null);
  const [hover, setHover] = useState<string | null>(null);
  const [focused, setFocused] = useState(false);
  const [tableOpen, setTableOpen] = useState(false);
  const markRefs = useRef(new Map<string, SVGElement>());

  const numberFormat = useMemo(() => new Intl.NumberFormat(locale), [locale]);
  const fmt = formatProp ?? ((n: number) => numberFormat.format(n));
  const tickFmt = yAxis?.format ?? fmt;
  const { labels, series } = data;
  const n = labels.length;

  // Reset when a hidden series no longer exists.
  useEffect(() => {
    setHidden((prev) => {
      const limit = isPie ? n : series.length;
      const next = new Set([...prev].filter((i) => i < limit));
      return next.size === prev.size ? prev : next;
    });
  }, [isPie, n, series.length]);

  const visibleSeries = series.map((_, i) => i).filter((i) => isPie || !hidden.has(i));

  const geometry = useMemo(() => {
    const marks: Mark[] = [];
    const slices: { i: number; d: string }[] = [];
    const axes: ReactNode[] = [];

    if (isPie) {
      const s = series[0];
      const values = labels.map((_, i) => (hidden.has(i) ? 0 : Math.max(0, s?.values[i] ?? 0)));
      const total = values.reduce((a, b) => a + b, 0);
      const cxp = width / 2;
      const cyp = height / 2;
      const r = Math.max(10, Math.min(width, height) / 2 - 8);
      const inner = type === 'doughnut' ? r * 0.6 : 0;
      let angle = 0;
      values.forEach((v, i) => {
        if (v <= 0 || total <= 0) return;
        const sweep = (v / total) * Math.PI * 2;
        const mid = angle + sweep / 2;
        const anchorR = inner ? (r + inner) / 2 : r * 0.6;
        marks.push({ key: `0-${i}`, series: 0, label: i, value: s?.values[i] ?? 0, x: cxp + anchorR * Math.sin(mid), y: cyp - anchorR * Math.cos(mid) });
        slices.push({ i, d: arcPath(cxp, cyp, r, inner, angle, angle + sweep) });
        angle += sweep;
      });
      return { marks, slices, axes, lines: [] as { si: number; d: string; area?: string }[], bars: [] as { key: string; si: number; x: number; y: number; w: number; h: number }[] };
    }

    // Value domain.
    let lo = Infinity;
    let hi = -Infinity;
    const stack = type === 'bar' && stacked;
    if (stack) {
      for (let l = 0; l < n; l += 1) {
        let pos = 0;
        let neg = 0;
        for (const si of visibleSeries) {
          const v = series[si]?.values[l];
          if (v === null || v === undefined) continue;
          if (v >= 0) pos += v;
          else neg += v;
        }
        lo = Math.min(lo, neg);
        hi = Math.max(hi, pos);
      }
    } else {
      for (const si of visibleSeries) {
        for (const v of series[si]?.values ?? []) {
          if (v === null || v === undefined) continue;
          lo = Math.min(lo, v);
          hi = Math.max(hi, v);
        }
      }
    }
    if (!Number.isFinite(lo)) {
      lo = 0;
      hi = 1;
    }
    if (type === 'bar' || type === 'area') {
      lo = Math.min(lo, 0);
      hi = Math.max(hi, 0);
    }
    const nice = isSpark ? { min: lo, max: hi === lo ? lo + 1 : hi, values: [] as number[] } : niceTicks(yAxis?.min ?? lo, yAxis?.max ?? hi, 5);
    const dMin = yAxis?.min ?? nice.min;
    const dMax = yAxis?.max ?? nice.max;
    const ticks = nice.values.filter((v) => v >= dMin - 1e-9 && v <= dMax + 1e-9);
    const span = dMax - dMin || 1;

    const longest = labels.reduce((m, l) => Math.max(m, l.length), 0);
    const tickChars = ticks.reduce((m, v) => Math.max(m, tickFmt(v).length), 1);
    const margin = isSpark
      ? { top: 4, right: 4, bottom: 4, left: 4 }
      : horizontal && type === 'bar'
        ? { top: 8, right: 16, bottom: 28, left: Math.min(160, Math.max(40, longest * 7 + 12)) }
        : { top: 12, right: 16, bottom: 32, left: Math.max(36, tickChars * 7 + 14) + (yAxis?.label ? 18 : 0) };
    const plot = { left: margin.left, top: margin.top, width: Math.max(10, width - margin.left - margin.right), height: Math.max(10, height - margin.top - margin.bottom) };
    const valuePos = (v: number) => (horizontal && type === 'bar' ? plot.left + ((v - dMin) / span) * plot.width : plot.top + plot.height * (1 - (v - dMin) / span));

    const lines: { si: number; d: string; area?: string }[] = [];
    const bars: { key: string; si: number; x: number; y: number; w: number; h: number }[] = [];

    if (type === 'bar') {
      const horiz = horizontal;
      const bandSize = (horiz ? plot.height : plot.width) / Math.max(n, 1);
      const inner = bandSize * 0.7;
      const zero = valuePos(Math.min(Math.max(0, dMin), dMax));
      for (let l = 0; l < n; l += 1) {
        const bandStart = (horiz ? plot.top : plot.left) + l * bandSize + (bandSize - inner) / 2;
        let pos = 0;
        let neg = 0;
        visibleSeries.forEach((si, k) => {
          const v = series[si]?.values[l];
          if (v === null || v === undefined) return;
          let from: number;
          let to: number;
          let offset: number;
          let thickness: number;
          if (stack) {
            const base = v >= 0 ? pos : neg;
            from = valuePos(base);
            to = valuePos(base + v);
            if (v >= 0) pos += v;
            else neg += v;
            offset = bandStart;
            thickness = inner;
          } else {
            from = zero;
            to = valuePos(v);
            thickness = inner / Math.max(visibleSeries.length, 1);
            offset = bandStart + k * thickness;
          }
          const a = Math.min(from, to);
          const size = Math.abs(to - from);
          const key = `${si}-${l}`;
          const rect = horiz ? { x: a, y: offset, w: size, h: thickness } : { x: offset, y: a, w: thickness, h: size };
          bars.push({ key, si, ...rect });
          marks.push({ key, series: si, label: l, value: v, x: horiz ? a + size : offset + thickness / 2, y: horiz ? offset + thickness / 2 : a });
        });
      }
    } else {
      const xAt = (l: number) => plot.left + (n <= 1 ? plot.width / 2 : (plot.width * l) / (n - 1));
      const baseline = valuePos(Math.min(Math.max(0, dMin), dMax));
      for (const si of visibleSeries) {
        const pts: (Point | null)[] = (series[si]?.values ?? []).slice(0, n).map((v, l) => (v === null || v === undefined ? null : { x: xAt(l), y: valuePos(v) }));
        lines.push({ si, d: linePath(pts), area: type === 'area' ? areaPath(pts, baseline) : undefined });
        pts.forEach((p, l) => {
          const v = series[si]?.values[l];
          if (p && v !== null && v !== undefined) marks.push({ key: `${si}-${l}`, series: si, label: l, value: v, x: p.x, y: p.y });
        });
      }
    }

    if (!isSpark) {
      const horiz = type === 'bar' && horizontal;
      ticks.forEach((tv) => {
        const p = valuePos(tv);
        axes.push(
          horiz ? (
            <g key={`t${tv}`} className="ui-chart__tick">
              <line className="ui-chart__grid" x1={round(p)} x2={round(p)} y1={plot.top} y2={plot.top + plot.height} />
              <text x={round(p)} y={plot.top + plot.height + 18} textAnchor="middle">
                {tickFmt(tv)}
              </text>
            </g>
          ) : (
            <g key={`t${tv}`} className="ui-chart__tick">
              <line className="ui-chart__grid" x1={plot.left} x2={plot.left + plot.width} y1={round(p)} y2={round(p)} />
              <text x={plot.left - 8} y={round(p)} textAnchor="end" dominantBaseline="middle">
                {tickFmt(tv)}
              </text>
            </g>
          ),
        );
      });
      const bandSize = (horiz ? plot.height : plot.width) / Math.max(n, 1);
      const maxLabels = Math.max(1, Math.floor(plot.width / 56));
      const every = horiz ? 1 : Math.ceil(n / maxLabels);
      labels.forEach((label, l) => {
        if (l % every !== 0) return;
        if (horiz) {
          axes.push(
            <text key={`c${l}`} className="ui-chart__category" x={plot.left - 8} y={round(plot.top + l * bandSize + bandSize / 2)} textAnchor="end" dominantBaseline="middle">
              {label}
            </text>,
          );
        } else {
          const x = type === 'bar' ? plot.left + l * bandSize + bandSize / 2 : plot.left + (n <= 1 ? plot.width / 2 : (plot.width * l) / (n - 1));
          axes.push(
            <text key={`c${l}`} className="ui-chart__category" x={round(x)} y={plot.top + plot.height + 20} textAnchor="middle">
              {label}
            </text>,
          );
        }
      });
      if (yAxis?.label && !horiz) {
        const cy = plot.top + plot.height / 2;
        axes.push(
          <text key="ylabel" className="ui-chart__axis-label" x={12} y={cy} textAnchor="middle" transform={`rotate(-90 12 ${round(cy)})`}>
            {yAxis.label}
          </text>,
        );
      }
    }
    return { marks, slices, axes, lines, bars };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [type, data, width, height, stacked, horizontal, hidden, yAxis?.min, yAxis?.max, yAxis?.label, isPie, isSpark, locale, formatProp, yAxis?.format]);

  const { marks } = geometry;
  const markByKey = new Map(marks.map((m) => [m.key, m]));
  const tabbable = active && markByKey.has(active) ? active : marks[0]?.key;
  const shown = (hover && markByKey.get(hover)) || (focused && active ? markByKey.get(active) : undefined);

  const describe = (m: Mark) =>
    interpolate(L.point, { series: isPie ? (series[0]?.name ?? '') : (series[m.series]?.name ?? ''), label: labels[m.label] ?? '', value: fmt(m.value) });

  const focusMark = (key: string | undefined) => {
    if (!key) return;
    setActive(key);
    markRefs.current.get(key)?.focus();
  };

  const handleKey = (event: KeyboardEvent<SVGElement>, m: Mark) => {
    let target: Mark | undefined;
    const sameSeries = marks.filter((x) => x.series === m.series).sort((a, b) => a.label - b.label);
    const idx = sameSeries.findIndex((x) => x.key === m.key);
    const rtl = getComputedStyle(event.currentTarget).direction === 'rtl';
    const right = rtl ? 'ArrowLeft' : 'ArrowRight';
    const left = rtl ? 'ArrowRight' : 'ArrowLeft';
    if (event.key === right || (isPie && event.key === 'ArrowDown')) target = sameSeries[idx + 1];
    else if (event.key === left || (isPie && event.key === 'ArrowUp')) target = sameSeries[idx - 1];
    else if (event.key === 'Home') target = sameSeries[0];
    else if (event.key === 'End') target = sameSeries[sameSeries.length - 1];
    else if (!isPie && (event.key === 'ArrowUp' || event.key === 'ArrowDown')) {
      const order = visibleSeries.filter((si) => marks.some((x) => x.series === si));
      const pos = order.indexOf(m.series);
      const nextSeries = order[event.key === 'ArrowDown' ? pos + 1 : pos - 1];
      if (nextSeries !== undefined) {
        const candidates = marks.filter((x) => x.series === nextSeries);
        target = candidates.reduce<Mark | undefined>((best, c) => (!best || Math.abs(c.label - m.label) < Math.abs(best.label - m.label) ? c : best), undefined);
      }
    } else if (event.key === 'Escape') {
      setHover(null);
      setFocused(false);
      return;
    } else return;
    event.preventDefault();
    if (target) focusMark(target.key);
  };

  const markProps = (m: Mark) => ({
    ref: (el: SVGElement | null) => {
      if (el) markRefs.current.set(m.key, el);
      else markRefs.current.delete(m.key);
    },
    tabIndex: m.key === tabbable ? 0 : -1,
    role: 'img',
    'aria-label': describe(m),
    'data-key': m.key,
    onFocus: () => {
      setActive(m.key);
      setFocused(true);
    },
    onBlur: () => setFocused(false),
    onKeyDown: (e: KeyboardEvent<SVGElement>) => handleKey(e, m),
    onPointerEnter: () => setHover(m.key),
    onPointerLeave: () => setHover(null),
  });

  const markClass = (si: number, extra?: string) => cx('ui-chart__mark', `ui-chart--c${colorOf(isPie ? undefined : series[si], si)}`, extra);

  const toggle = (i: number) =>
    setHidden((prev) => {
      const next = new Set(prev);
      if (next.has(i)) next.delete(i);
      else next.add(i);
      return next;
    });

  const legendItems = isPie ? labels.map((name, i) => ({ name, i, color: colorOf(undefined, i) })) : series.map((s, i) => ({ name: s.name, i, color: colorOf(s, i) }));
  const legendNode =
    legend !== 'none' && !isSpark ? (
      <ul className={cx('ui-chart__legend', `ui-chart__legend--${legend}`)} aria-label={L.legend}>
        {legendItems.map((item) => (
          <li key={item.i}>
            <button type="button" className="ui-chart__legend-item" aria-pressed={!hidden.has(item.i)} onClick={() => toggle(item.i)}>
              <span className={cx('ui-chart__swatch', `ui-chart--c${item.color}`)} aria-hidden="true" />
              {item.name}
            </button>
          </li>
        ))}
      </ul>
    ) : null;

  const label = summary ? `${title}. ${summary}` : title;
  const patternId = (i: number) => `ui-chart-${uid}-p${i}`;

  return (
    <figure ref={ref} aria-labelledby={`ui-chart-${uid}-title`} className={cx('ui-chart', `ui-chart--${type}`, horizontal && 'ui-chart--horizontal', className)} {...rest}>
      <figcaption id={`ui-chart-${uid}-title`} className={cx('ui-chart__title', hideTitle && 'visually-hidden')}>{title}</figcaption>
      {legend === 'top' && legendNode}
      <div ref={containerRef} className="ui-chart__canvas" style={{ height }}>
        <svg role="img" aria-label={label} width={width} height={height} viewBox={`0 0 ${width} ${height}`} className="ui-chart__svg" data-width={width}>
          {patterns && (
            <defs>
              {legendItems.map(({ i, color }) => (
                // Pattern content resolves CSS variables from its own position, so each carries its colour class.
                <pattern key={i} id={patternId(i)} className={`ui-chart--c${color}`} patternUnits="userSpaceOnUse" width={8} height={8} patternTransform={`rotate(${(i * 45) % 180})`}>
                  <rect width={8} height={8} className="ui-chart__pattern-bg" />
                  <line x1={0} y1={0} x2={0} y2={8} className="ui-chart__pattern-line" strokeWidth={i % 2 ? 2 : 4} />
                </pattern>
              ))}
            </defs>
          )}
          <g className="ui-chart__axes" aria-hidden="true">
            {geometry.axes}
          </g>
          {isPie &&
            geometry.slices.map((slice) => {
              const m = markByKey.get(`0-${slice.i}`)!;
              return (
                <path
                  key={slice.i}
                  d={slice.d}
                  className={markClass(slice.i, cx('ui-chart__slice', m.key === shown?.key && 'ui-chart__mark--active'))}
                  style={patterns && slice.i > 0 ? { fill: `url(#${patternId(slice.i)})` } : undefined}
                  fillRule="evenodd"
                  {...markProps(m)}
                />
              );
            })}
          {geometry.lines.map((ln) => (
            <g key={ln.si} className={cx('ui-chart__series', `ui-chart--c${colorOf(series[ln.si], ln.si)}`)}>
              {ln.area && <path className="ui-chart__area" d={ln.area} aria-hidden="true" />}
              <path className="ui-chart__line" d={ln.d} strokeDasharray={patterns ? DASHES[ln.si % 8] || undefined : undefined} aria-hidden="true" />
            </g>
          ))}
          {geometry.bars.map((b) => {
            const m = markByKey.get(b.key)!;
            return (
              <rect
                key={b.key}
                x={round(b.x)}
                y={round(b.y)}
                width={round(Math.max(b.w, 0))}
                height={round(Math.max(b.h, 0))}
                className={markClass(b.si, cx('ui-chart__bar', m.key === shown?.key && 'ui-chart__mark--active'))}
                style={patterns && b.si > 0 ? { fill: `url(#${patternId(b.si)})` } : undefined}
                {...markProps(m)}
              />
            );
          })}
          {!isPie &&
            type !== 'bar' &&
            marks.map((m) => (
              <circle
                key={m.key}
                cx={round(m.x)}
                cy={round(m.y)}
                r={isSpark ? 2.5 : 4}
                className={markClass(m.series, cx('ui-chart__point', m.key === shown?.key && 'ui-chart__mark--active'))}
                {...markProps(m)}
              />
            ))}
        </svg>
        {tooltip && shown && (
          <div className="ui-chart__tooltip" role="tooltip" style={{ left: round(shown.x), top: round(shown.y) }}>
            <span className="ui-chart__tooltip-series">{isPie ? labels[shown.label] : series[shown.series]?.name}</span>
            {!isPie && <span className="ui-chart__tooltip-label">{labels[shown.label]}</span>}
            <strong className="ui-chart__tooltip-value">{fmt(shown.value)}</strong>
          </div>
        )}
      </div>
      {legend === 'bottom' && legendNode}
      <div className="visually-hidden" aria-live="polite">
        {focused && active && markByKey.get(active) ? describe(markByKey.get(active)!) : ''}
      </div>
      {showTable && (
        <div className="ui-chart__table-toggle">
          <button type="button" className="btn btn-link btn-sm p-0" aria-expanded={tableOpen} aria-controls={`ui-chart-${uid}-table`} onClick={() => setTableOpen((o) => !o)}>
            {tableOpen ? L.hideTable : L.viewTable}
          </button>
        </div>
      )}
      {showTable && tableOpen && (
        <div id={`ui-chart-${uid}-table`} className="table-responsive ui-chart__table">
          <table className="table table-sm">
            <caption>{title}</caption>
            <thead>
              <tr>
                <th scope="col">{L.category}</th>
                {series.map((s) => (
                  <th key={s.name} scope="col">
                    {s.name}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {labels.map((l, li) => (
                <tr key={l}>
                  <th scope="row">{l}</th>
                  {series.map((s, si) => {
                    const v = s.values[li];
                    return <td key={si}>{v === null || v === undefined ? '—' : fmt(v)}</td>;
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {table}
    </figure>
  );
}
