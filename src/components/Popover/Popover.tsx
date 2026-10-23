import { cloneElement, useEffect, useId, useRef, type CSSProperties, type KeyboardEvent, type MouseEvent, type ReactElement, type ReactNode, type Ref, type RefObject } from 'react';
import { useClickOutside } from '../../hooks/useClickOutside';
import { useControllableState } from '../../hooks/useControllableState';
import { useFloating } from '../../hooks/useFloating';
import { useOverlay } from '../../hooks/useOverlay';
import { cx } from '../../utils/cx';
import { getFocusable } from '../../utils/dom';
import type { Placement } from '../../utils/position';
import { Portal } from '../Portal/Portal';
import { elementRef, focusAdjacentTabbable, mergeRefs } from '../Tooltip/shared';

export interface PopoverProps {
  open?: boolean;
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  /** Native `<button>` element; receives `aria-haspopup`, `aria-expanded`, `aria-controls` and the toggle handler. */
  trigger: ReactElement;
  placement?: Placement;
  title?: ReactNode;
  dismissOnOutside?: boolean;
  arrow?: boolean;
  offset?: number;
  /** Required when there is no `title`. */
  ariaLabel?: string;
  initialFocus?: RefObject<HTMLElement | null>;
  appendTo?: HTMLElement | null;
  id?: string;
  className?: string;
  style?: CSSProperties;
  children?: ReactNode;
  /** Ref to the panel (`role="dialog"`). */
  ref?: Ref<HTMLDivElement>;
}

type TriggerProps = { onClick?: (e: MouseEvent<HTMLElement>) => void; onKeyDown?: (e: KeyboardEvent<HTMLElement>) => void };

export function Popover({
  open: openProp,
  defaultOpen = false,
  onOpenChange,
  trigger,
  placement = 'bottom',
  title,
  dismissOnOutside = true,
  arrow = true,
  offset = 8,
  ariaLabel,
  initialFocus,
  appendTo,
  id,
  className,
  style,
  children,
  ref,
}: PopoverProps) {
  const generatedId = useId();
  const panelId = id ?? `${generatedId}-popover`;
  const [open, setOpen] = useControllableState(openProp, defaultOpen, onOpenChange);
  const triggerRef = useRef<HTMLElement | null>(null);
  const triggerProps = trigger.props as TriggerProps;

  const toggle = () => setOpen(!open);

  const triggerEl = cloneElement(trigger as ReactElement<Record<string, unknown>>, {
    ref: mergeRefs(triggerRef, elementRef(trigger)),
    'aria-haspopup': 'dialog',
    'aria-expanded': open,
    'aria-controls': open ? panelId : undefined,
    onClick: (e: MouseEvent<HTMLElement>) => {
      triggerProps.onClick?.(e);
      if (!e.defaultPrevented) toggle();
    },
    onKeyDown: (e: KeyboardEvent<HTMLElement>) => {
      triggerProps.onKeyDown?.(e);
      // Non-modal: Tab from the trigger enters the open panel (it lives in a portal).
      if (open && e.key === 'Tab' && !e.shiftKey) {
        const panel = document.getElementById(panelId);
        const first = panel ? (getFocusable(panel)[0] ?? panel) : null;
        if (first) {
          e.preventDefault();
          first.focus();
        }
      }
    },
  });

  return (
    <>
      {triggerEl}
      {open && (
        <PopoverPanel
          id={panelId}
          triggerRef={triggerRef}
          placement={placement}
          offset={offset}
          title={title}
          ariaLabel={ariaLabel}
          arrow={arrow}
          dismissOnOutside={dismissOnOutside}
          initialFocus={initialFocus}
          appendTo={appendTo}
          className={className}
          style={style}
          panelRef={ref}
          onClose={() => setOpen(false)}
        >
          {children}
        </PopoverPanel>
      )}
    </>
  );
}

interface PanelProps {
  id: string;
  triggerRef: RefObject<HTMLElement | null>;
  placement: Placement;
  offset: number;
  title?: ReactNode;
  ariaLabel?: string;
  arrow: boolean;
  dismissOnOutside: boolean;
  initialFocus?: RefObject<HTMLElement | null>;
  appendTo?: HTMLElement | null;
  className?: string;
  style?: CSSProperties;
  panelRef?: Ref<HTMLDivElement>;
  onClose: () => void;
  children?: ReactNode;
}

function PopoverPanel({ id, triggerRef, placement, offset, title, ariaLabel, arrow, dismissOnOutside, initialFocus, appendTo, className, style, panelRef, onClose, children }: PanelProps) {
  const titleId = `${id}-title`;
  const rootRef = useRef<HTMLDivElement | null>(null);
  const contentRef = useRef<HTMLDivElement | null>(null);
  const position = useFloating(triggerRef, contentRef, { open: true, placement, offset });

  const closeAndFocusTrigger = () => {
    onClose();
    triggerRef.current?.focus();
  };

  // Registers on the overlay stack (Escape top-most only); non-modal: no trap, inert or scroll lock.
  useOverlay({ rootRef, contentRef, modal: false, onEscape: closeAndFocusTrigger });

  useEffect(() => {
    const panel = contentRef.current;
    if (!panel) return;
    const target = initialFocus?.current ?? getFocusable(panel)[0] ?? panel;
    target.focus();
    // Only on mount.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useClickOutside(
    [triggerRef, contentRef],
    () => {
      const focusInside = contentRef.current?.contains(document.activeElement) ?? false;
      onClose();
      // Let the clicked element take focus first; restore only if focus would otherwise be lost.
      if (focusInside)
        window.setTimeout(() => {
          if (!document.activeElement || document.activeElement === document.body) triggerRef.current?.focus();
        });
    },
    dismissOnOutside,
  );

  const handleKeyDown = (event: globalThis.KeyboardEvent) => {
    if (event.key !== 'Tab') return;
    const panel = contentRef.current;
    const trigger = triggerRef.current;
    if (!panel || !trigger) return;
    const focusable = getFocusable(panel);
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    const active = document.activeElement;
    if (event.shiftKey && (active === first || active === panel)) {
      event.preventDefault();
      trigger.focus();
    } else if (!event.shiftKey && (active === last || focusable.length === 0)) {
      event.preventDefault();
      onClose();
      focusAdjacentTabbable(trigger);
    }
  };

  const keyHandler = useRef(handleKeyDown);
  keyHandler.current = handleKeyDown;
  useEffect(() => {
    const panel = contentRef.current;
    if (!panel) return;
    const listener = (e: globalThis.KeyboardEvent) => keyHandler.current(e);
    panel.addEventListener('keydown', listener);
    return () => panel.removeEventListener('keydown', listener);
  }, []);

  const side = position.placement.split('-')[0] ?? 'bottom';

  return (
    <Portal container={appendTo}>
      <div ref={rootRef} className="ui-popover-root">
        <div
          ref={mergeRefs(contentRef, panelRef)}
          id={id}
          role="dialog"
          aria-labelledby={title ? titleId : undefined}
          aria-label={title ? undefined : ariaLabel}
          tabIndex={-1}
          data-placement={position.placement}
          className={cx('popover ui-popover', `bs-popover-${side}`, `ui-popover--${side}`, className)}
          style={{ ...style, position: 'fixed', top: position.top, left: position.left }}
        >
          {arrow && <div className="popover-arrow ui-popover__arrow" />}
          {title && (
            <h3 id={titleId} className="popover-header ui-popover__header">
              {title}
            </h3>
          )}
          <div className="popover-body ui-popover__body">{children}</div>
        </div>
      </div>
    </Portal>
  );
}
