import { useEffect, useId, useImperativeHandle, useRef, useState, type Ref, type RefObject } from 'react';
import { useLocale } from '../../locale/LocaleProvider';
import { cx } from '../../utils/cx';
import { MenuPopup } from '../Menu/MenuPopup';
import type { FocusRequest, MenuItem, NavigateHandler } from '../Menu/types';
import { isRtl } from '../../utils/element';

export const LONG_PRESS_MS = 500;
const LONG_PRESS_TOLERANCE = 10;

export interface ContextMenuHandle {
  /** Open at the event's pointer position (or at the event target when it has no coordinates). */
  show: (event: { clientX: number; clientY: number; target?: EventTarget | null } | Event) => void;
  hide: () => void;
}

export interface ContextMenuProps {
  items: MenuItem[];
  /** Element that opens the menu (must be focusable for keyboard users). Omit and set `global` for the whole document. */
  target?: RefObject<HTMLElement | null>;
  global?: boolean;
  onShow?: (event: Event) => void;
  onHide?: () => void;
  ariaLabel?: string;
  onNavigate?: NavigateHandler;
  className?: string;
  ref?: Ref<ContextMenuHandle>;
}

/** Only one context menu is open at a time. */
let hideActive: (() => void) | null = null;

export function ContextMenu({ items, target, global = false, onShow, onHide, ariaLabel, onNavigate, className, ref }: ContextMenuProps) {
  const { t } = useLocale();
  const menuId = useId();
  const [point, setPoint] = useState<{ x: number; y: number } | null>(null);
  const [request, setRequest] = useState<FocusRequest | null>(null);
  const restoreRef = useRef<HTMLElement | null>(null);
  const pointRef = useRef<{ x: number; y: number } | null>(null);
  const seq = useRef(0);
  const suppressUntil = useRef(0);
  const callbacks = useRef({ onShow, onHide });
  callbacks.current = { onShow, onHide };

  const hide = useRef(() => {});
  hide.current = () => {
    if (hideActive === hide.current) hideActive = null;
    if (pointRef.current) callbacks.current.onHide?.();
    pointRef.current = null;
    setPoint(null);
  };

  const openAt = (x: number, y: number, origin: EventTarget | null, event: Event) => {
    if (hideActive && hideActive !== hide.current) hideActive();
    hideActive = hide.current;
    const el = target?.current ?? (origin instanceof HTMLElement ? origin : null);
    restoreRef.current = document.activeElement instanceof HTMLElement && document.activeElement !== document.body && (!el || el.contains(document.activeElement)) ? document.activeElement : el;
    seq.current += 1;
    setRequest({ position: 'first', seq: seq.current });
    pointRef.current = { x, y };
    setPoint({ x, y });
    callbacks.current.onShow?.(event);
  };
  const openAtRef = useRef(openAt);
  openAtRef.current = openAt;

  const openAtElement = (el: HTMLElement, event: Event) => {
    const rect = el.getBoundingClientRect();
    openAtRef.current(isRtl(el) ? rect.right : rect.left, rect.bottom, el, event);
  };

  useImperativeHandle(ref, () => ({
    show: (event) => {
      if (event instanceof Event) event.preventDefault();
      const e = event as { clientX?: number; clientY?: number; target?: EventTarget | null };
      if (typeof e.clientX === 'number' && typeof e.clientY === 'number') openAtRef.current(e.clientX, e.clientY, e.target ?? null, event as Event);
      else if (e.target instanceof HTMLElement) openAtElement(e.target, event as Event);
    },
    hide: () => hide.current(),
  }));

  useEffect(() => {
    const node: HTMLElement | Document | null = target?.current ?? (global ? document : null);
    if (!node) return;
    let press: { timer: number; x: number; y: number } | null = null;
    const cancelPress = () => {
      if (press) window.clearTimeout(press.timer);
      press = null;
    };

    const onContextMenu = (event: Event) => {
      const e = event as MouseEvent;
      e.preventDefault();
      // Keyboard or long-press already opened ours; swallow the follow-up native event.
      if (Date.now() < suppressUntil.current) return;
      openAtRef.current(e.clientX, e.clientY, e.target, e);
    };
    const onKeyDown = (event: Event) => {
      const e = event as KeyboardEvent;
      if (!((e.shiftKey && e.key === 'F10') || e.key === 'ContextMenu')) return;
      e.preventDefault();
      suppressUntil.current = Date.now() + 300;
      const el = target?.current ?? (e.target instanceof HTMLElement ? e.target : null);
      if (el) openAtElement(el, e);
    };
    const onPointerDown = (event: Event) => {
      const e = event as PointerEvent;
      if (e.pointerType !== 'touch') return;
      cancelPress();
      const origin = e.target;
      const x = e.clientX;
      const y = e.clientY;
      press = {
        x,
        y,
        timer: window.setTimeout(() => {
          press = null;
          suppressUntil.current = Date.now() + 1000;
          openAtRef.current(x, y, origin, e);
        }, LONG_PRESS_MS),
      };
    };
    const onPointerMove = (event: Event) => {
      const e = event as PointerEvent;
      if (press && Math.hypot(e.clientX - press.x, e.clientY - press.y) > LONG_PRESS_TOLERANCE) cancelPress();
    };

    node.addEventListener('contextmenu', onContextMenu);
    node.addEventListener('keydown', onKeyDown);
    node.addEventListener('pointerdown', onPointerDown);
    node.addEventListener('pointermove', onPointerMove);
    node.addEventListener('pointerup', cancelPress);
    node.addEventListener('pointercancel', cancelPress);
    const el = node instanceof HTMLElement ? node : null;
    el?.classList.add('ui-context-menu-target');
    return () => {
      cancelPress();
      node.removeEventListener('contextmenu', onContextMenu);
      node.removeEventListener('keydown', onKeyDown);
      node.removeEventListener('pointerdown', onPointerDown);
      node.removeEventListener('pointermove', onPointerMove);
      node.removeEventListener('pointerup', cancelPress);
      node.removeEventListener('pointercancel', cancelPress);
      el?.classList.remove('ui-context-menu-target');
    };
  }, [target, global]);

  useEffect(
    () => () => {
      if (hideActive === hide.current) hideActive = null;
    },
    [],
  );

  if (!point) return null;
  return (
    <MenuPopup
      items={items}
      id={menuId}
      ariaLabel={ariaLabel ?? t('menu')}
      tiered
      point={point}
      placement="bottom-start"
      restoreRef={restoreRef}
      tabBehavior="restore"
      focusRequest={request}
      onClose={() => hide.current()}
      onNavigate={onNavigate}
      className={cx('ui-context-menu', className)}
    />
  );
}
