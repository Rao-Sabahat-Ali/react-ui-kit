import { useId, useRef, type MouseEvent, type ReactNode, type RefObject } from 'react';
import { useOverlay } from '../../hooks/useOverlay';
import { useLocale } from '../../locale/LocaleProvider';
import { cx } from '../../utils/cx';
import { usePresence } from '../../motion/usePresence';
import { Portal } from '../Portal/Portal';

export type DialogCloseReason = 'escape' | 'backdrop' | 'close-button';

export interface DialogProps {
  open: boolean;
  onClose: (reason: DialogCloseReason) => void;
  title?: ReactNode;
  'aria-label'?: string;
  'aria-describedby'?: string;
  children?: ReactNode;
  footer?: ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'fullscreen';
  fullscreenBelow?: 'sm' | 'md' | 'lg' | 'xl' | 'xxl';
  centered?: boolean;
  scrollable?: boolean;
  closeOnBackdrop?: boolean;
  closeOnEscape?: boolean;
  showClose?: boolean;
  initialFocus?: RefObject<HTMLElement | null>;
  appendTo?: HTMLElement | null;
  className?: string;
  /** Overlay role. ConfirmDialog uses "alertdialog". */
  role?: 'dialog' | 'alertdialog';
}

const SIZE_CLASS = { sm: 'modal-sm', md: undefined, lg: 'modal-lg', xl: 'modal-xl', fullscreen: 'modal-fullscreen' } as const;

export function Dialog(props: DialogProps) {
  // Stays mounted with data-state="closed" while the exit animation runs (motion v2), then unmounts.
  const { present, state } = usePresence(props.open, { exit: 'step' });
  if (!present) return null;
  return <DialogInner {...props} state={state} />;
}

function DialogInner({
  onClose,
  title,
  children,
  footer,
  size = 'md',
  fullscreenBelow,
  centered = true,
  scrollable = true,
  closeOnBackdrop = true,
  closeOnEscape = true,
  showClose = true,
  initialFocus,
  appendTo,
  className,
  role = 'dialog',
  state = 'open',
  ...aria
}: DialogProps & { state?: 'open' | 'closed' }) {
  const { t } = useLocale();
  const titleId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const pointerDownOnBackdrop = useRef(false);
  useOverlay({ rootRef, contentRef, initialFocus, onEscape: closeOnEscape && state === 'open' ? () => onClose('escape') : undefined });

  const handleBackdropDown = (event: MouseEvent<HTMLDivElement>) => {
    pointerDownOnBackdrop.current = event.target === event.currentTarget;
  };
  const handleBackdropClick = (event: MouseEvent<HTMLDivElement>) => {
    if (state === 'open' && closeOnBackdrop && pointerDownOnBackdrop.current && event.target === event.currentTarget) onClose('backdrop');
    pointerDownOnBackdrop.current = false;
  };

  return (
    <Portal container={appendTo}>
      <div ref={rootRef} className="ui-dialog-root" data-state={state}>
        <div className="modal-backdrop show ui-dialog__backdrop" />
        {/* Backdrop click is a pointer convenience; keyboard users close with Escape (useOverlay). */}
        {/* eslint-disable-next-line jsx-a11y/click-events-have-key-events, jsx-a11y/no-static-element-interactions */}
        <div className={cx('modal d-block ui-dialog', className)} onMouseDown={handleBackdropDown} onClick={handleBackdropClick}>
          <div
            className={cx(
              'modal-dialog ui-dialog__dialog',
              SIZE_CLASS[size],
              fullscreenBelow && `modal-fullscreen-${fullscreenBelow}-down`,
              centered && 'modal-dialog-centered',
              scrollable && 'modal-dialog-scrollable',
            )}
          >
            <div
              ref={contentRef}
              role={role}
              aria-modal="true"
              aria-labelledby={title ? titleId : undefined}
              aria-label={title ? undefined : aria['aria-label']}
              aria-describedby={aria['aria-describedby']}
              tabIndex={-1}
              className="modal-content ui-dialog__content"
            >
              {(title || showClose) && (
                <div className="modal-header ui-dialog__header">
                  {title && (
                    <h2 id={titleId} className="modal-title fs-5 ui-dialog__title">
                      {title}
                    </h2>
                  )}
                  {showClose && <button type="button" className="btn-close" aria-label={t('close')} onClick={() => onClose('close-button')} />}
                </div>
              )}
              <div className="modal-body ui-dialog__body">{children}</div>
              {footer && <div className="modal-footer ui-dialog__footer">{footer}</div>}
            </div>
          </div>
        </div>
      </div>
    </Portal>
  );
}
