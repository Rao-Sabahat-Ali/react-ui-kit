import { useEffect, useId, useRef, useState, type CSSProperties, type KeyboardEvent, type Ref } from 'react';
import { useClickOutside } from '../../hooks/useClickOutside';
import { useControllableState } from '../../hooks/useControllableState';
import { useMediaQuery } from '../../hooks/useMediaQuery';
import { cx } from '../../utils/cx';
import { Icon, type IconName } from '../Icon/Icon';
import { focusAdjacentTabbable, mergeRefs } from '../Tooltip/shared';
import { Tooltip } from '../Tooltip/Tooltip';

export interface SpeedDialItem {
  label: string;
  icon: IconName;
  command: () => void;
}

export type SpeedDialDirection = 'up' | 'down' | 'left' | 'right';
export type SpeedDialType = 'linear' | 'circle' | 'semi-circle' | 'quarter-circle';

export interface SpeedDialProps {
  items: SpeedDialItem[];
  direction?: SpeedDialDirection;
  type?: SpeedDialType;
  position?: 'bottom-end' | 'bottom-start' | 'top-end' | 'top-start' | 'static';
  /** Trigger's accessible name (required). */
  ariaLabel: string;
  icon?: IconName;
  /** Distance of circular layouts in rem. */
  radius?: number;
  open?: boolean;
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  id?: string;
  className?: string;
  style?: CSSProperties;
  ref?: Ref<HTMLButtonElement>;
}

const DIRECTION_ANGLE: Record<SpeedDialDirection, number> = { up: -90, down: 90, left: 180, right: 0 };
const SPREAD: Record<Exclude<SpeedDialType, 'linear'>, number> = { circle: 360, 'semi-circle': 180, 'quarter-circle': 90 };
const TOOLTIP_SIDE: Record<SpeedDialDirection, 'start' | 'end' | 'top' | 'bottom'> = { up: 'start', down: 'start', left: 'top', right: 'top' };

/** Offsets (rem) of each action for circular layouts. */
function circularOffsets(count: number, type: Exclude<SpeedDialType, 'linear'>, direction: SpeedDialDirection, radius: number) {
  const spread = SPREAD[type];
  const center = type === 'quarter-circle' ? DIRECTION_ANGLE[direction] - 45 : DIRECTION_ANGLE[direction];
  const step = spread === 360 ? 360 / count : count > 1 ? spread / (count - 1) : 0;
  const startAngle = spread === 360 ? center : center - spread / 2 + (type === 'quarter-circle' ? 45 : 0);
  return Array.from({ length: count }, (_, i) => {
    const angle = ((startAngle + i * step) * Math.PI) / 180;
    return { x: Math.round(Math.cos(angle) * radius * 100) / 100, y: Math.round(Math.sin(angle) * radius * 100) / 100 };
  });
}

/** Floating action button expanding into related actions (APG Menu Button). */
export function SpeedDial({
  items,
  direction = 'up',
  type = 'linear',
  position = 'bottom-end',
  ariaLabel,
  icon = 'plus',
  radius = 4.5,
  open: openProp,
  defaultOpen = false,
  onOpenChange,
  id,
  className,
  style,
  ref,
}: SpeedDialProps) {
  const baseId = useId();
  const triggerId = id ?? `${baseId}-trigger`;
  const menuId = `${baseId}-menu`;
  const [open, setOpen] = useControllableState(openProp, defaultOpen, onOpenChange);
  const [focusFirst, setFocusFirst] = useState(0);
  const rootRef = useRef<HTMLDivElement | null>(null);
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const itemEls = useRef<(HTMLButtonElement | null)[]>([]);
  const coarse = useMediaQuery('(pointer: coarse)');
  const n = items.length;

  useClickOutside([rootRef], () => setOpen(false), open);

  useEffect(() => {
    if (open && focusFirst > 0) itemEls.current[0]?.focus();
    // Only when a new keyboard/click open was requested.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [focusFirst]);

  const openMenu = () => {
    setOpen(true);
    setFocusFirst((v) => v + 1);
  };
  const close = (refocus = true) => {
    setOpen(false);
    if (refocus) triggerRef.current?.focus();
  };

  const onTriggerKeyDown = (event: KeyboardEvent<HTMLButtonElement>) => {
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault();
      openMenu();
    } else if (event.key === 'Escape' && open) {
      event.preventDefault();
      close();
    }
  };

  const keyMap = (): { next: string[]; prev: string[] } => {
    if (type !== 'linear') return { next: ['ArrowRight', 'ArrowDown'], prev: ['ArrowLeft', 'ArrowUp'] };
    const away = { up: 'ArrowUp', down: 'ArrowDown', left: 'ArrowLeft', right: 'ArrowRight' }[direction];
    const toward = { up: 'ArrowDown', down: 'ArrowUp', left: 'ArrowRight', right: 'ArrowLeft' }[direction];
    return { next: [away], prev: [toward] };
  };

  const onItemKeyDown = (index: number, event: KeyboardEvent<HTMLButtonElement>) => {
    const { next, prev } = keyMap();
    let target = -1;
    if (next.includes(event.key)) target = (index + 1) % n;
    else if (prev.includes(event.key)) target = (index - 1 + n) % n;
    else if (event.key === 'Home') target = 0;
    else if (event.key === 'End') target = n - 1;
    else if (event.key === 'Escape') {
      event.preventDefault();
      event.stopPropagation();
      close();
      return;
    } else if (event.key === 'Tab') {
      event.preventDefault();
      setOpen(false);
      if (triggerRef.current) focusAdjacentTabbable(triggerRef.current, event.shiftKey);
      return;
    }
    if (target !== -1) {
      event.preventDefault();
      itemEls.current[target]?.focus();
    }
  };

  const offsets = type === 'linear' ? null : circularOffsets(n, type, direction, radius);
  const orientation = direction === 'left' || direction === 'right' ? 'horizontal' : 'vertical';

  return (
    <div
      ref={rootRef}
      className={cx(
        'ui-speed-dial',
        `ui-speed-dial--${direction}`,
        `ui-speed-dial--${type}`,
        position !== 'static' && `position-fixed ui-speed-dial--${position}`,
        open && 'ui-speed-dial--open',
        coarse && 'ui-speed-dial--coarse',
        className,
      )}
      style={style}
    >
      <ul id={menuId} role="menu" aria-labelledby={triggerId} aria-orientation={orientation} hidden={!open} className="list-unstyled ui-speed-dial__list">
        {items.map((item, index) => {
          const offset = offsets?.[index];
          const button = (
            <button
              ref={(el) => {
                itemEls.current[index] = el;
              }}
              type="button"
              role="menuitem"
              tabIndex={-1}
              aria-label={item.label}
              className="btn rounded-circle ui-speed-dial__action"
              onClick={() => {
                item.command();
                close();
              }}
              onKeyDown={(e) => onItemKeyDown(index, e)}
            >
              <Icon name={item.icon} />
            </button>
          );
          return (
            <li
              key={`${item.label}-${index}`}
              role="none"
              className="ui-speed-dial__entry"
              style={{ '--ui-speed-dial-index': index, ...(offset ? { '--ui-speed-dial-x': `${offset.x}rem`, '--ui-speed-dial-y': `${offset.y}rem` } : {}) } as CSSProperties}
            >
              {coarse ? (
                <span className="ui-speed-dial__labelled">
                  {/* Tooltips don't show on touch: the label is visible text (the button already carries the name). */}
                  <span className="ui-speed-dial__label" aria-hidden="true">
                    {item.label}
                  </span>
                  {button}
                </span>
              ) : (
                <Tooltip content={item.label} asLabel placement={TOOLTIP_SIDE[direction]} delay={{ show: 150 }}>
                  {button}
                </Tooltip>
              )}
            </li>
          );
        })}
      </ul>
      <button
        ref={mergeRefs(triggerRef, ref)}
        id={triggerId}
        type="button"
        className="btn btn-primary rounded-circle ui-speed-dial__trigger"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={menuId}
        aria-label={ariaLabel}
        onClick={() => (open ? close(false) : openMenu())}
        onKeyDown={onTriggerKeyDown}
      >
        <Icon name={icon} className="ui-speed-dial__trigger-icon" />
      </button>
    </div>
  );
}
