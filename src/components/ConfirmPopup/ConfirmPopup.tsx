import { createContext, useCallback, useContext, useEffect, useId, useRef, useState, type ReactNode } from 'react';
import { useClickOutside } from '../../hooks/useClickOutside';
import { useFloating } from '../../hooks/useFloating';
import { useOverlay } from '../../hooks/useOverlay';
import { useLocale } from '../../locale/LocaleProvider';
import { cx } from '../../utils/cx';
import type { Placement } from '../../utils/position';
import { Button } from '../Button/Button';
import { Icon, type IconName } from '../Icon/Icon';
import { Portal } from '../Portal/Portal';

/** Default accessible name. TODO: move to locale `confirmation` key (not yet in en.ts). */

export type ConfirmPopupSeverity = 'primary' | 'info' | 'warning' | 'danger';

export interface ConfirmPopupOptions {
  /** Element the popup is anchored to; receives focus again after every outcome. */
  target: HTMLElement;
  message: ReactNode;
  acceptLabel?: string;
  rejectLabel?: string;
  severity?: ConfirmPopupSeverity;
  placement?: Placement;
}

export interface ConfirmPopupProps extends ConfirmPopupOptions {
  onAccept: () => void;
  onReject: () => void;
}

const SEVERITY_ICON: Record<ConfirmPopupSeverity, IconName> = {
  primary: 'alert-circle',
  info: 'info',
  warning: 'alert-triangle',
  danger: 'alert-triangle',
};

/** Anchored alert dialog. Usually rendered through `ConfirmPopupProvider` + `useConfirmPopup()`. */
export function ConfirmPopup({ target, message, acceptLabel, rejectLabel, severity = 'primary', placement = 'bottom', onAccept, onReject }: ConfirmPopupProps) {
  const { t } = useLocale();
  const messageId = useId();
  const rootRef = useRef<HTMLDivElement | null>(null);
  const contentRef = useRef<HTMLDivElement | null>(null);
  const acceptRef = useRef<HTMLButtonElement | null>(null);
  const rejectRef = useRef<HTMLButtonElement | null>(null);
  const anchorRef = useRef<HTMLElement | null>(target);
  anchorRef.current = target;
  const position = useFloating(anchorRef, contentRef, { open: true, placement, offset: 8 });

  useOverlay({ rootRef, contentRef, initialFocus: severity === 'danger' ? rejectRef : acceptRef, onEscape: onReject, modal: true });
  useClickOutside([contentRef], (event) => {
    // Keep the click from moving focus: focus goes back to the target instead.
    event.preventDefault();
    onReject();
  });

  // Declared after useOverlay so this cleanup runs last: focus always returns to the target.
  useEffect(
    () => () => {
      if (target.isConnected) target.focus();
    },
    [target],
  );

  const side = position.placement.split('-')[0] ?? 'bottom';

  return (
    <Portal>
      <div ref={rootRef} className="ui-confirm-popup-root">
        <div className="ui-confirm-popup__catcher" aria-hidden="true" />
        <div
          ref={contentRef}
          role="alertdialog"
          aria-modal="true"
          aria-label={t('confirmation')}
          aria-describedby={messageId}
          data-placement={position.placement}
          className={cx('popover ui-confirm-popup', `bs-popover-${side}`, `ui-confirm-popup--${side}`, `ui-confirm-popup--${severity}`)}
          style={{ position: 'fixed', top: position.top, left: position.left }}
        >
          <div className="popover-arrow ui-confirm-popup__arrow" />
          <div className="popover-body ui-confirm-popup__body">
            <div className="ui-confirm-popup__message">
              <Icon name={SEVERITY_ICON[severity]} className={cx('ui-confirm-popup__icon', `text-${severity}`)} />
              <div id={messageId}>{message}</div>
            </div>
            <div className="ui-confirm-popup__actions">
              <Button ref={rejectRef} size="sm" variant="secondary" appearance="outline" onClick={onReject}>
                {rejectLabel ?? t('cancel')}
              </Button>
              <Button ref={acceptRef} size="sm" variant={severity} onClick={onAccept}>
                {acceptLabel ?? t('confirm')}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </Portal>
  );
}

export type ConfirmPopupFn = (options: ConfirmPopupOptions) => Promise<boolean>;
const ConfirmPopupContext = createContext<ConfirmPopupFn | null>(null);

export interface ConfirmPopupProviderProps {
  children: ReactNode;
}

/** Provides `useConfirmPopup()`. Only one popup is open at a time. */
export function ConfirmPopupProvider({ children }: ConfirmPopupProviderProps) {
  const [state, setState] = useState<(ConfirmPopupOptions & { id: number }) | null>(null);
  const pending = useRef<((ok: boolean) => void) | null>(null);
  const counter = useRef(0);

  const confirmPopup = useCallback<ConfirmPopupFn>(
    (options) =>
      new Promise<boolean>((resolve) => {
        pending.current?.(false);
        pending.current = resolve;
        counter.current += 1;
        setState({ ...options, id: counter.current });
      }),
    [],
  );

  const settle = (ok: boolean) => {
    const resolve = pending.current;
    pending.current = null;
    setState(null);
    resolve?.(ok);
  };

  return (
    <ConfirmPopupContext.Provider value={confirmPopup}>
      {children}
      {state && <ConfirmPopup key={state.id} {...state} onAccept={() => settle(true)} onReject={() => settle(false)} />}
    </ConfirmPopupContext.Provider>
  );
}

/** `const confirmPopup = useConfirmPopup(); if (await confirmPopup({ target, message })) …` */
export function useConfirmPopup(): ConfirmPopupFn {
  const ctx = useContext(ConfirmPopupContext);
  if (!ctx) throw new Error('useConfirmPopup must be used inside <ConfirmPopupProvider>.');
  return ctx;
}
