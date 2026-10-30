/**
 * Motion v2 constants (design-system-mcp foundations/motion). They mirror the CSS custom properties
 * `--ui-motion-*`, `--ui-easing-*` and `--ui-assemble-distance` generated from tokens.json; hooks read the
 * live custom properties first (so profiles such as pos and game apply) and fall back to these values.
 */
export const MOTION = {
  /** Press feedback, focus ring. */
  instant: 90,
  /** Hover / colour, small toggles. */
  quick: 160,
  /** A part entering or leaving (menus, chips, toasts, rows). */
  part: 280,
  /** Step / sheet change, dialog, drawer, board column reflow. */
  step: 420,
  /** Delay between parts of one assembly. */
  stagger: 40,
  /** Travel along the guide line, in px. */
  assembleDistance: 12,
  /** Lists animate at most this many items; beyond that they appear at once. */
  maxAnimated: 8,
  /** Opacity fades allowed under prefers-reduced-motion. */
  reducedFade: 120,
} as const;

export const EASING = {
  out: 'cubic-bezier(0.16, 1, 0.3, 1)',
  /** The "click into place" settle: only the last part of an assembly or a dropped card. */
  snap: 'cubic-bezier(0.34, 1.4, 0.64, 1)',
  /** Exits (about 70% of the enter duration). */
  in: 'cubic-bezier(0.7, 0, 0.84, 0)',
} as const;

/** CSS custom property names for each constant. */
export const MOTION_VARS = {
  instant: '--ui-motion-instant',
  quick: '--ui-motion-quick',
  part: '--ui-motion-part',
  step: '--ui-motion-step',
  stagger: '--ui-motion-stagger',
  assembleDistance: '--ui-assemble-distance',
  easingOut: '--ui-easing-out',
  easingSnap: '--ui-easing-snap',
  easingIn: '--ui-easing-in',
} as const;

/** `280ms` / `0.28s` → 280. Returns `fallback` for anything else. */
export function parseCssTime(value: string | undefined | null, fallback: number): number {
  const m = /^\s*(-?\d*\.?\d+)\s*(ms|s)\s*$/.exec(value ?? '');
  if (!m) return fallback;
  const n = parseFloat(m[1]!);
  return m[2] === 's' ? n * 1000 : n;
}

/** `12px` → 12 (rem is resolved against 16px). Returns `fallback` for anything else. */
export function parseCssLength(value: string | undefined | null, fallback: number): number {
  const m = /^\s*(-?\d*\.?\d+)\s*(px|rem)\s*$/.exec(value ?? '');
  if (!m) return fallback;
  const n = parseFloat(m[1]!);
  return m[2] === 'rem' ? n * 16 : n;
}

/** Live value of a motion custom property on `el` (honours profiles), in ms. */
export function readMotionMs(el: Element | null | undefined, name: 'instant' | 'quick' | 'part' | 'step' | 'stagger'): number {
  if (!el || typeof getComputedStyle !== 'function') return MOTION[name];
  return parseCssTime(getComputedStyle(el).getPropertyValue(MOTION_VARS[name]), MOTION[name]);
}

/** Live `--ui-assemble-distance` on `el`, in px. */
export function readAssembleDistance(el: Element | null | undefined): number {
  if (!el || typeof getComputedStyle !== 'function') return MOTION.assembleDistance;
  return parseCssLength(getComputedStyle(el).getPropertyValue(MOTION_VARS.assembleDistance), MOTION.assembleDistance);
}
