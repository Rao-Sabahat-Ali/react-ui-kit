/** Pure geometry helpers for Chart (no DOM). */

function niceNum(range: number, round: boolean): number {
  if (range <= 0 || !Number.isFinite(range)) return 1;
  const exponent = Math.floor(Math.log10(range));
  const fraction = range / 10 ** exponent;
  let nice: number;
  if (round) nice = fraction < 1.5 ? 1 : fraction < 3 ? 2 : fraction < 7 ? 5 : 10;
  else nice = fraction <= 1 ? 1 : fraction <= 2 ? 2 : fraction <= 5 ? 5 : 10;
  return nice * 10 ** exponent;
}

export interface Ticks {
  min: number;
  max: number;
  step: number;
  values: number[];
}

/** "Nice numbers" axis ticks (Heckbert). */
export function niceTicks(min: number, max: number, count = 5): Ticks {
  let lo = min;
  let hi = max;
  if (lo === hi) {
    if (lo === 0) hi = 1;
    else if (lo > 0) lo = 0;
    else hi = 0;
  }
  const range = niceNum(hi - lo, false);
  const step = niceNum(range / Math.max(count - 1, 1), true);
  const niceMin = Math.floor(lo / step) * step;
  const niceMax = Math.ceil(hi / step) * step;
  const values: number[] = [];
  // Avoid float drift (0.30000000000000004).
  const decimals = Math.max(0, -Math.floor(Math.log10(step)));
  for (let v = niceMin; v <= niceMax + step / 2; v += step) values.push(Number(v.toFixed(decimals)));
  return { min: niceMin, max: niceMax, step, values };
}

export interface Point {
  x: number;
  y: number;
}

/** Line path; `null` points break the line into separate sub-paths (gaps). */
export function linePath(points: (Point | null)[]): string {
  let d = '';
  let pen = false;
  for (const p of points) {
    if (!p) {
      pen = false;
      continue;
    }
    d += `${pen ? 'L' : 'M'}${round(p.x)} ${round(p.y)}`;
    pen = true;
  }
  return d;
}

/** Area path closed to `baseline`; each contiguous run of points is its own closed shape. */
export function areaPath(points: (Point | null)[], baseline: number): string {
  const runs: Point[][] = [];
  let run: Point[] = [];
  for (const p of points) {
    if (p) run.push(p);
    else if (run.length) {
      runs.push(run);
      run = [];
    }
  }
  if (run.length) runs.push(run);
  return runs
    .map((r) => {
      const first = r[0]!;
      const last = r[r.length - 1]!;
      return `M${round(first.x)} ${round(baseline)}${r.map((p) => `L${round(p.x)} ${round(p.y)}`).join('')}L${round(last.x)} ${round(baseline)}Z`;
    })
    .join('');
}

/** Pie/doughnut slice. Angles in radians, 0 = 12 o'clock, clockwise. */
export function arcPath(cx: number, cy: number, r: number, inner: number, start: number, end: number): string {
  const sweep = end - start;
  if (sweep <= 0) return '';
  if (sweep >= Math.PI * 2 - 1e-6) {
    // Full circle: two half arcs (a single arc with identical endpoints draws nothing).
    const outer = `M${round(cx)} ${round(cy - r)}A${r} ${r} 0 1 1 ${round(cx)} ${round(cy + r)}A${r} ${r} 0 1 1 ${round(cx)} ${round(cy - r)}Z`;
    if (inner <= 0) return outer;
    return `${outer}M${round(cx)} ${round(cy - inner)}A${inner} ${inner} 0 1 0 ${round(cx)} ${round(cy + inner)}A${inner} ${inner} 0 1 0 ${round(cx)} ${round(cy - inner)}Z`;
  }
  const large = sweep > Math.PI ? 1 : 0;
  const pt = (radius: number, angle: number) => `${round(cx + radius * Math.sin(angle))} ${round(cy - radius * Math.cos(angle))}`;
  if (inner <= 0) return `M${round(cx)} ${round(cy)}L${pt(r, start)}A${r} ${r} 0 ${large} 1 ${pt(r, end)}Z`;
  return `M${pt(r, start)}A${r} ${r} 0 ${large} 1 ${pt(r, end)}L${pt(inner, end)}A${inner} ${inner} 0 ${large} 0 ${pt(inner, start)}Z`;
}

export const round = (n: number) => Math.round(n * 100) / 100;
