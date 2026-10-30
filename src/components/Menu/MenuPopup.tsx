import { useLayoutEffect, useRef, useState, type Ref, type RefObject, type SyntheticEvent } from 'react';
import { useClickOutside } from '../../hooks/useClickOutside';
import { useOverlay } from '../../hooks/useOverlay';
import { cx } from '../../utils/cx';
import { computePosition, type Placement } from '../../utils/position';
import { Portal } from '../Portal/Portal';
import { focusAdjacentTabbable, isRtl, mergeRefs } from '../../utils/element';
import { MenuList } from './MenuList';
import type { FocusRequest, MenuCloseReason, MenuItem, NavigateHandler } from './types';

export interface MenuPopupProps {
  items: MenuItem[];
  id?: string;
  ariaLabel?: string;
  ariaLabelledby?: string;
  tiered?: boolean;
  /** Element the popup is anchored to (trigger). */
  anchorRef?: RefObject<HTMLElement | null>;
  /** Viewport point (ContextMenu at pointer). Takes precedence over `anchorRef`. */
  point?: { x: number; y: number } | null;
  placement?: Placement;
  offset?: number;
  /** Element that gets focus back after close (trigger or context target). */
  restoreRef: RefObject<HTMLElement | null>;
  /** `adjacent`: Tab moves to the next tabbable after `restoreRef` (Menu); `restore`: Tab focuses `restoreRef` (ContextMenu). */
  tabBehavior?: 'adjacent' | 'restore';
  focusRequest: FocusRequest | null;
  onClose: (reason: MenuCloseReason) => void;
  onNavigate?: NavigateHandler;
  dir?: 'rtl' | 'ltr';
  className?: string;
  listRef?: Ref<HTMLUListElement>;
  /** `closed` while the exit animation runs: the popup is inert and ignores Escape. */
  state?: 'open' | 'closed';
}

/** Portalled popup menu: positioning (flip/shift), overlay stack, outside click, focus restore. Render only while open. */
export function MenuPopup({
  items,
  id,
  ariaLabel,
  ariaLabelledby,
  tiered = false,
  anchorRef,
  point,
  placement = 'bottom-start',
  offset = 4,
  restoreRef,
  tabBehavior = 'adjacent',
  focusRequest,
  onClose,
  onNavigate,
  dir,
  className,
  listRef,
  state = 'open',
}: MenuPopupProps) {
  const rootRef = useRef<HTMLDivElement | null>(null);
  const menuRef = useRef<HTMLUListElement | null>(null);
  const [pos, setPos] = useState<{ top: number; left: number; placement: Placement }>({ top: 0, left: 0, placement });
  const [resolvedDir] = useState(() => dir ?? (isRtl(restoreRef.current) ? 'rtl' : undefined));

  useLayoutEffect(() => {
    const update = () => {
      const menu = menuRef.current;
      if (!menu) return;
      const anchorRect = point ? { top: point.y, left: point.x, width: 0, height: 0 } : anchorRef?.current?.getBoundingClientRect();
      if (!anchorRect) return;
      const f = menu.getBoundingClientRect();
      const next = computePosition(anchorRect, { width: f.width, height: f.height }, { placement, offset: point ? 0 : offset, rtl: resolvedDir === 'rtl' });
      setPos((prev) => (prev.top === next.top && prev.left === next.left && prev.placement === next.placement ? prev : { top: next.top, left: next.left, placement: next.placement }));
    };
    update();
    window.addEventListener('resize', update);
    window.addEventListener('scroll', update, true);
    return () => {
      window.removeEventListener('resize', update);
      window.removeEventListener('scroll', update, true);
    };
  }, [anchorRef, point, placement, offset, resolvedDir]);

  const restore = () => {
    const el = restoreRef.current;
    if (el?.isConnected) el.focus();
  };

  const closeAll = (reason: MenuCloseReason, event?: SyntheticEvent) => {
    onClose(reason);
    if (reason === 'tab' && event) {
      event.preventDefault();
      const from = restoreRef.current;
      if (from && tabBehavior === 'adjacent') focusAdjacentTabbable(from, (event as unknown as KeyboardEvent).shiftKey);
      else restore();
      return;
    }
    restore();
  };

  // Registers on the overlay stack so a menu inside a modal stays interactive and Escape closes it first.
  useOverlay({ rootRef, contentRef: menuRef, modal: false, onEscape: state === 'open' ? () => closeAll('escape') : undefined });

  useClickOutside(point ? [menuRef] : [menuRef, ...(anchorRef ? [anchorRef] : [])], () => {
    const focusInside = rootRef.current?.contains(document.activeElement) ?? false;
    onClose('outside');
    if (focusInside)
      window.setTimeout(() => {
        if (!document.activeElement || document.activeElement === document.body) restore();
      });
  });

  return (
    <Portal>
      <div ref={rootRef} className="ui-menu-popup" dir={resolvedDir} data-state={state} data-placement={pos.placement} inert={state === 'closed' || undefined}>
        <MenuList
          items={items}
          id={id}
          ariaLabel={ariaLabel}
          ariaLabelledby={ariaLabelledby}
          tiered={tiered}
          focusRequest={focusRequest}
          onCloseAll={closeAll}
          onNavigate={onNavigate}
          listRef={mergeRefs(menuRef, listRef)}
          className={cx('ui-menu--popup', className)}
          style={{ position: 'fixed', top: pos.top, left: pos.left }}
        />
      </div>
    </Portal>
  );
}
