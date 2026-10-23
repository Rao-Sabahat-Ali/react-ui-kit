import { cloneElement, useCallback, useEffect, useId, useRef, useState, type FocusEvent, type PointerEvent, type ReactElement, type ReactNode } from 'react';
import { useFloating } from '../../hooks/useFloating';
import { cx } from '../../utils/cx';
import { canUseDOM } from '../../utils/dom';
import type { Placement } from '../../utils/position';
import { Portal } from '../Portal/Portal';
import { elementRef, mergeRefs } from '../../utils/element';

export interface TooltipProps {
  /** Supplementary text. No interactive content (use Popover instead). */
  content: ReactNode;
  placement?: Placement;
  delay?: { show?: number; hide?: number };
  disabled?: boolean;
  /** Icon-only triggers: the string `content` becomes the trigger's persistent `aria-label`; the tooltip is `aria-hidden`. */
  asLabel?: boolean;
  offset?: number;
  id?: string;
  className?: string;
  /** A single focusable element that accepts `ref` and event props. */
  children: ReactElement;
}

/* Focus modality: show on keyboard focus, not on focus caused by a pointer (mouse-down / touch). */
let hadPointer = false;
let modalityInstalled = false;
function installModality() {
  if (modalityInstalled || !canUseDOM) return;
  modalityInstalled = true;
  document.addEventListener('pointerdown', () => (hadPointer = true), true);
  document.addEventListener('mousedown', () => (hadPointer = true), true);
  document.addEventListener('keydown', () => (hadPointer = false), true);
}

/** Only one tooltip is visible at a time. */
let hideCurrent: (() => void) | null = null;

type TriggerProps = {
  onPointerEnter?: (e: PointerEvent<HTMLElement>) => void;
  onPointerLeave?: (e: PointerEvent<HTMLElement>) => void;
  onPointerDown?: (e: PointerEvent<HTMLElement>) => void;
  onFocus?: (e: FocusEvent<HTMLElement>) => void;
  onBlur?: (e: FocusEvent<HTMLElement>) => void;
  'aria-describedby'?: string;
  'aria-label'?: string;
};

const SIDE_CLASS: Record<string, string> = { top: 'top', bottom: 'bottom', start: 'start', end: 'end' };

export function Tooltip({ content, placement = 'top', delay, disabled = false, asLabel = false, offset = 8, id, className, children }: TooltipProps) {
  const generatedId = useId();
  const tooltipId = id ?? `${generatedId}-tooltip`;
  const showDelay = delay?.show ?? 300;
  const hideDelay = delay?.hide ?? 100;
  const [visible, setVisible] = useState(false);
  const triggerRef = useRef<HTMLElement | null>(null);
  const tooltipRef = useRef<HTMLDivElement | null>(null);
  const timer = useRef<number | undefined>(undefined);
  const keyboardFocused = useRef(false);
  const position = useFloating(triggerRef, tooltipRef, { open: visible, placement, offset });

  useEffect(installModality, []);

  const clear = () => window.clearTimeout(timer.current);

  const hideNow = useCallback(() => {
    window.clearTimeout(timer.current);
    setVisible(false);
  }, []);
  const hideRef = useRef(hideNow);
  hideRef.current = hideNow;

  const show = useCallback(() => {
    window.clearTimeout(timer.current);
    if (hideCurrent && hideCurrent !== hideRef.current) hideCurrent();
    hideCurrent = hideRef.current;
    setVisible(true);
  }, []);

  const scheduleShow = () => {
    clear();
    timer.current = window.setTimeout(show, showDelay);
  };
  const scheduleHide = () => {
    clear();
    if (keyboardFocused.current) return; // persistent while focused
    timer.current = window.setTimeout(hideNow, hideDelay);
  };

  useEffect(() => {
    if (disabled) hideNow();
  }, [disabled, hideNow]);

  useEffect(
    () => () => {
      window.clearTimeout(timer.current);
      if (hideCurrent === hideRef.current) hideCurrent = null;
    },
    [],
  );

  // Escape hides the visible tooltip before anything else (Dialog, Menu) sees the key.
  useEffect(() => {
    if (!visible) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      event.stopPropagation();
      hideNow();
    };
    document.addEventListener('keydown', onKey, true);
    return () => document.removeEventListener('keydown', onKey, true);
  }, [visible, hideNow]);

  const childProps = children.props as TriggerProps;
  const label = asLabel && typeof content === 'string' ? content : undefined;
  const describedBy = visible && !asLabel ? cx(childProps['aria-describedby'], tooltipId) : childProps['aria-describedby'];

  const trigger = cloneElement(children as ReactElement<TriggerProps & { ref?: unknown }>, {
    ref: mergeRefs(triggerRef, elementRef(children)),
    'aria-describedby': describedBy || undefined,
    ...(label ? { 'aria-label': childProps['aria-label'] ?? label } : {}),
    onPointerEnter: (e: PointerEvent<HTMLElement>) => {
      childProps.onPointerEnter?.(e);
      if (disabled || e.pointerType === 'touch') return;
      if (visible) clear();
      else scheduleShow();
    },
    onPointerLeave: (e: PointerEvent<HTMLElement>) => {
      childProps.onPointerLeave?.(e);
      if (e.pointerType === 'touch') return;
      if (visible) scheduleHide();
      else clear();
    },
    onPointerDown: (e: PointerEvent<HTMLElement>) => {
      childProps.onPointerDown?.(e);
      if (e.pointerType === 'touch') hideNow();
    },
    onFocus: (e: FocusEvent<HTMLElement>) => {
      childProps.onFocus?.(e);
      if (disabled || hadPointer) return;
      keyboardFocused.current = true;
      show();
    },
    onBlur: (e: FocusEvent<HTMLElement>) => {
      childProps.onBlur?.(e);
      keyboardFocused.current = false;
      hideNow();
    },
  });

  const side = position.placement.split('-')[0] ?? 'top';

  return (
    <>
      {trigger}
      {visible && !disabled && (
        <Portal>
          <div
            ref={tooltipRef}
            id={tooltipId}
            role="tooltip"
            aria-hidden={asLabel || undefined}
            data-placement={position.placement}
            className={cx('tooltip show ui-tooltip', `bs-tooltip-${SIDE_CLASS[side] ?? 'top'}`, `ui-tooltip--${side}`, className)}
            style={{ position: 'fixed', top: position.top, left: position.left }}
            onPointerEnter={clear}
            onPointerLeave={(e) => e.pointerType !== 'touch' && scheduleHide()}
          >
            <div className="tooltip-arrow ui-tooltip__arrow" />
            <div className="tooltip-inner ui-tooltip__inner">{content}</div>
          </div>
        </Portal>
      )}
    </>
  );
}
