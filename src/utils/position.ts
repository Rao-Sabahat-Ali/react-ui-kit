export type Side = 'top' | 'bottom' | 'start' | 'end';
export type Align = 'start' | 'center' | 'end';
export type Placement = Side | `${Side}-start` | `${Side}-end`;

export interface Rect {
  top: number;
  left: number;
  width: number;
  height: number;
}

export interface PositionResult {
  top: number;
  left: number;
  placement: Placement;
}

interface Options {
  placement: Placement;
  offset?: number;
  /** Viewport padding kept free when shifting. */
  padding?: number;
  rtl?: boolean;
  viewport?: { width: number; height: number };
}

const OPPOSITE: Record<Side, Side> = { top: 'bottom', bottom: 'top', start: 'end', end: 'start' };

function split(placement: Placement): [Side, Align] {
  const [side, align] = placement.split('-') as [Side, Align | undefined];
  return [side, align ?? 'center'];
}

function place(anchor: Rect, floating: { width: number; height: number }, side: Side, align: Align, offset: number, rtl: boolean) {
  const physical = side === 'start' ? (rtl ? 'right' : 'left') : side === 'end' ? (rtl ? 'left' : 'right') : side;
  let top = 0;
  let left = 0;
  if (physical === 'top' || physical === 'bottom') {
    top = physical === 'top' ? anchor.top - floating.height - offset : anchor.top + anchor.height + offset;
    const startEdge = rtl ? anchor.left + anchor.width - floating.width : anchor.left;
    const endEdge = rtl ? anchor.left : anchor.left + anchor.width - floating.width;
    left = align === 'start' ? startEdge : align === 'end' ? endEdge : anchor.left + (anchor.width - floating.width) / 2;
  } else {
    left = physical === 'left' ? anchor.left - floating.width - offset : anchor.left + anchor.width + offset;
    top = align === 'start' ? anchor.top : align === 'end' ? anchor.top + anchor.height - floating.height : anchor.top + (anchor.height - floating.height) / 2;
  }
  return { top, left };
}

function fits(pos: { top: number; left: number }, floating: { width: number; height: number }, vw: number, vh: number, pad: number) {
  return pos.top >= pad && pos.left >= pad && pos.top + floating.height <= vh - pad && pos.left + floating.width <= vw - pad;
}

/**
 * Compute viewport coordinates (position: fixed) for a floating element.
 * Flips to the opposite side when it doesn't fit, then shifts along the axis
 * to stay inside the viewport. In-house replacement for Popper/Floating UI.
 */
export function computePosition(anchor: Rect, floating: { width: number; height: number }, options: Options): PositionResult {
  const { offset = 8, padding = 8, rtl = false } = options;
  const vw = options.viewport?.width ?? window.innerWidth;
  const vh = options.viewport?.height ?? window.innerHeight;
  const [side, align] = split(options.placement);

  let chosen: Side = side;
  let pos = place(anchor, floating, side, align, offset, rtl);
  if (!fits(pos, floating, vw, vh, padding)) {
    const flipped = place(anchor, floating, OPPOSITE[side], align, offset, rtl);
    if (fits(flipped, floating, vw, vh, padding)) {
      pos = flipped;
      chosen = OPPOSITE[side];
    }
  }

  const left = Math.min(Math.max(pos.left, padding), Math.max(padding, vw - floating.width - padding));
  const top = Math.min(Math.max(pos.top, padding), Math.max(padding, vh - floating.height - padding));
  const placement = (align === 'center' ? chosen : `${chosen}-${align}`) as Placement;
  return { top, left, placement };
}
