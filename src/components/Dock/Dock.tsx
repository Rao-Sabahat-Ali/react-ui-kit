import { isValidElement, useRef, useState, type CSSProperties, type KeyboardEvent, type MouseEvent, type ReactNode, type Ref } from 'react';
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

const TOOLTIP_PLACEMENT = { bottom: 'top', top: 'bottom', left: 'end', right: 'start' } as const;

/** Launcher of icon items (APG Toolbar) with optional magnification. */
export function Dock({ items, position = 'bottom', magnification = true, ariaLabel, activeHref, onNavigate, id, className, style, ref }: DockProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const reducedMotion = usePrefersReducedMotion();
  const coarse = useMediaQuery('(pointer: coarse)');
  const orientation = position === 'left' || position === 'right' ? 'vertical' : 'horizontal';
  const magnify = magnification && !reducedMotion && !coarse;

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
      className={cx('ui-dock', `ui-dock--${position}`, `ui-dock--${orientation}`, magnify && 'ui-dock--magnify', className)}
      style={style}
    >
      {items.map((item, index) => {
        const iconNode = typeof item.icon === 'string' ? <Icon name={item.icon} /> : isValidElement(item.icon) ? <span aria-hidden="true">{item.icon}</span> : null;
        const common = {
          className: 'ui-dock__item',
          tabIndex: index === Math.min(activeIndex, items.length - 1) ? 0 : -1,
          onFocus: () => setActiveIndex(index),
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
