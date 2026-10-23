import { useId, useRef, type ReactNode, type RefObject } from 'react';
import { useOverlay } from '../../hooks/useOverlay';
import { useLocale } from '../../locale/LocaleProvider';
import { cx } from '../../utils/cx';
import { Portal } from '../Portal/Portal';
import type { DialogCloseReason } from '../Dialog/Dialog';

export interface DrawerProps {
  open: boolean;
  onClose: (reason: DialogCloseReason) => void;
  title?: ReactNode;
  'aria-label'?: string;
  children?: ReactNode;
  footer?: ReactNode;
  position?: 'start' | 'end' | 'top' | 'bottom';
  size?: 'sm' | 'md' | 'lg' | 'full';
  /** Non-modal drawers leave the page interactive (no backdrop, no focus trap). */
  modal?: boolean;
  closeOnBackdrop?: boolean;
  closeOnEscape?: boolean;
  showClose?: boolean;
  initialFocus?: RefObject<HTMLElement | null>;
  className?: string;
  id?: string;
}

export function Drawer(props: DrawerProps) {
  if (!props.open) return null;
  return <DrawerInner {...props} />;
}

function DrawerInner({
  onClose,
  title,
  children,
  footer,
  position = 'end',
  size = 'md',
  modal = true,
  closeOnBackdrop = true,
  closeOnEscape = true,
  showClose = true,
  initialFocus,
  className,
  id,
  ...aria
}: DrawerProps) {
  const { t } = useLocale();
  const titleId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  useOverlay({ rootRef, contentRef, initialFocus, modal, onEscape: closeOnEscape ? () => onClose('escape') : undefined });

  return (
    <Portal>
      <div ref={rootRef} className="ui-drawer-root">
        {/* Backdrop click is a pointer convenience; keyboard users close with Escape (useOverlay). */}
        {/* eslint-disable-next-line jsx-a11y/click-events-have-key-events, jsx-a11y/no-static-element-interactions */}
        {modal && <div className="offcanvas-backdrop show ui-drawer__backdrop" onClick={() => closeOnBackdrop && onClose('backdrop')} />}
        <div
          ref={contentRef}
          id={id}
          role="dialog"
          aria-modal={modal || undefined}
          aria-labelledby={title ? titleId : undefined}
          aria-label={title ? undefined : aria['aria-label']}
          tabIndex={-1}
          className={cx('offcanvas show ui-drawer', `offcanvas-${position}`, `ui-drawer--${size}`, className)}
        >
          {(title || showClose) && (
            <div className="offcanvas-header ui-drawer__header">
              {title && (
                <h2 id={titleId} className="offcanvas-title fs-5 ui-drawer__title">
                  {title}
                </h2>
              )}
              {showClose && <button type="button" className="btn-close ms-auto" aria-label={t('close')} onClick={() => onClose('close-button')} />}
            </div>
          )}
          <div className="offcanvas-body ui-drawer__body">{children}</div>
          {footer && <div className="ui-drawer__footer">{footer}</div>}
        </div>
      </div>
    </Portal>
  );
}
