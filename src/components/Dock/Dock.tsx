import { isValidElement, useEffect, useRef, useState, type CSSProperties, type KeyboardEvent, type FocusEvent, type MouseEvent, type PointerEvent, type ReactNode, type Ref } from 'react';
import { usePrefersReducedMotion, useMediaQuery } from '../../hooks/useMediaQuery';
import { cx } from '../../utils/cx';
import { routerLinkHandler } from '../../utils/navigation';
import { safeUrl } from '../../utils/url';
import { Icon, type IconName } from '../Icon/Icon';
import type { NavigateHandler } from '../Menu/types';
import { isRtl, mergeRefs } from '../../utils/element';
import { Tooltip } from '../Tooltip/Tooltip';

export interface DockItem {
  label: string;
  icon: IconName | ReactNode;
  command?: (event: MouseEvent<HTMLElement>) => void;
  href?: string;
}

export interface DockProps {
  items: DockItem[];
  position?: 'bottom' | 'top' | 'left' | 'right';
  /** Hover/focus magnification (fine pointers only; disabled under reduced motion). */
  magnification?: boolean;
  /** Toolbar name (required). */
  ariaLabel: string;
  /** Link items whose href matches get `aria-current="page"`. */
  activeHref?: string;
  onNavigate?: NavigateHandler;
  id?: string;
  className?: string;
  style?: CSSProperties;
  ref?: Ref<HTMLDivElement>;
}

const DEFAULT_SCALE = 1.35;

/**
 * Magnification with neighbour falloff. `focus` is a coordinate along the main axis (relative to the dock's start edge,
 * from the pointer or the centre of the focused item). Each item scales by a Gaussian of its distance to it and the
 * items shift so the enlarged ones never overlap. Everything is written as CSS custom properties consumed by
 * `transform` (translate + scale), so layout never changes under the pointer.
 */
function magnify(container: HTMLElement, items: HTMLElement[], vertical: boolean, focus: number | null) {
  if (focus === null) {
    for (const el of items) {
      el.style.removeProperty('--ui-dock-s');
      el.style.removeProperty('--ui-dock-t');
    }
    return;
  }
  const max = parseFloat(getComputedStyle(container).getPropertyValue('--ui-dock-scale')) || DEFAULT_SCALE;
  const boxes = items
    .map((el) => {
      const size = vertical ? el.offsetHeight : el.offsetWidth;
      const start = vertical ? el.offsetTop : el.offsetLeft;
      return { el, size, center: start + size / 2 };
    })
    .sort((a, b) => a.center - b.center);
  const scales = boxes.map((b) => {
    const sigma = Math.max(b.size, 1) * 1.25;
    const d = (b.center - focus) / sigma;
    return 1 + (max - 1) * Math.exp(-d * d);
  });
  const growth = boxes.map((b, i) => (scales[i]! - 1) * b.size);
  const total = growth.reduce((sum, g) => sum + g, 0);
  let before = 0;
  boxes.forEach((b, i) => {
    const shift = before + growth[i]! / 2 - total / 2;
    before += growth[i]!;
    b.el.style.setProperty('--ui-dock-s', scales[i]!.toFixed(3));
    b.el.style.setProperty('--ui-dock-t', `${shift.toFixed(2)}px`);
  });
}

const TOOLTIP_PLACEMENT = { bottom: 'top', top: 'bottom', left: 'end', right: 'start' } as const;

/** Launcher of icon items (APG Toolbar) with optional magnification. */
export function Dock({ items, position = 'bottom', magnification = true, ariaLabel, activeHref, onNavigate, id, className, style, ref }: DockProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const reducedMotion = usePrefersReducedMotion();
  const coarse = useMediaQuery('(pointer: coarse)');
  const orientation = position === 'left' || position === 'right' ? 'vertical' : 'horizontal';
  const magnifyOn = magnification && !reducedMotion && !coarse;

  const frame = useRef(0);
  useEffect(() => () => cancelAnimationFrame(frame.current), []);
  const vertical = orientation === 'vertical';

  const update = (focus: () => number | null) => {
    cancelAnimationFrame(frame.current);
    frame.current = requestAnimationFrame(() => {
      const container = containerRef.current;
      if (container) magnify(container, itemEls(), vertical, focus());
    });
  };
  const onPointerMove = (event: PointerEvent<HTMLElement>) => {
    if (!magnifyOn || event.pointerType === 'touch') return;
    const rect = event.currentTarget.getBoundingClientRect();
    const point = vertical ? event.clientY - rect.top - event.currentTarget.clientTop : event.clientX - rect.left - event.currentTarget.clientLeft;
    update(() => point);
  };
  const reset = () => update(() => null);
  const onItemFocus = (el: HTMLElement) => {
    let visible = false;
    try {
      visible = el.matches(':focus-visible');
    } catch {
      // Selector unsupported: no keyboard magnification.
    }
    if (!magnifyOn || !visible) return;
    update(() => (vertical ? el.offsetTop + el.offsetHeight / 2 : el.offsetLeft + el.offsetWidth / 2));
  };

  const itemEls = () => Array.from(containerRef.current?.querySelectorAll<HTMLElement>('.ui-dock__item') ?? []);

  // Roving tabindex without wrapping (APG Toolbar); RTL inverts horizontal arrows.
  const onKeyDown = (event: KeyboardEvent<HTMLElement>) => {
    const els = itemEls();
    const current = els.indexOf(event.currentTarget);
    const rtl = isRtl(containerRef.current);
    const next = orientation === 'vertical' ? 'ArrowDown' : rtl ? 'ArrowLeft' : 'ArrowRight';
    const prev = orientation === 'vertical' ? 'ArrowUp' : rtl ? 'ArrowRight' : 'ArrowLeft';
    let target = -1;
    if (event.key === next) target = Math.min(current + 1, els.length - 1);
    else if (event.key === prev) target = Math.max(current - 1, 0);
    else if (event.key === 'Home') target = 0;
    else if (event.key === 'End') target = els.length - 1;
    if (target === -1) return;
    event.preventDefault();
    setActiveIndex(target);
    els[target]?.focus();
  };

  return (
    <div
      ref={mergeRefs(containerRef, ref)}
      id={id}
      role="toolbar"
      aria-label={ariaLabel}
      aria-orientation={orientation}
      className={cx('ui-dock', `ui-dock--${position}`, `ui-dock--${orientation}`, magnifyOn && 'ui-dock--magnify', className)}
      style={style}
      onPointerMove={onPointerMove}
      onPointerLeave={reset}
      onBlur={reset}
    >
      {items.map((item, index) => {
        const iconNode = typeof item.icon === 'string' ? <Icon name={item.icon} /> : isValidElement(item.icon) ? <span aria-hidden="true">{item.icon}</span> : null;
        const common = {
          className: 'ui-dock__item',
          tabIndex: index === Math.min(activeIndex, items.length - 1) ? 0 : -1,
          onFocus: (event: FocusEvent<HTMLElement>) => {
            setActiveIndex(index);
            onItemFocus(event.currentTarget);
          },
          onKeyDown,
        };
        const href = safeUrl(item.href);
        const control = href ? (
          <a
            {...common}
            href={href}
            aria-current={href === activeHref ? 'page' : undefined}
            onClick={(event: MouseEvent<HTMLAnchorElement>) => {
              item.command?.(event);
              routerLinkHandler(href, onNavigate)(event);
            }}
          >
            {iconNode}
          </a>
        ) : (
          <button {...common} type="button" onClick={(event) => item.command?.(event)}>
            {iconNode}
          </button>
        );
        return (
          <Tooltip key={`${item.label}-${index}`} content={item.label} asLabel placement={TOOLTIP_PLACEMENT[position]} delay={{ show: 150 }}>
            {control}
          </Tooltip>
        );
      })}
    </div>
  );
}
