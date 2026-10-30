import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { canAnimate, prefersReducedMotion } from '../../motion/env';
import { readMotionMs } from '../../motion/tokens';
import { useFlip } from '../../motion/useFlip';
import { useLocale } from '../../locale/LocaleProvider';
import { cx } from '../../utils/cx';
import type { Severity } from '../../types';
import { Icon, type IconName } from '../Icon/Icon';

export interface ToastOptions {
  severity?: Severity;
  title?: ReactNode;
  message?: ReactNode;
  /** Auto-dismiss after ms. Errors default to sticky. */
  life?: number;
  sticky?: boolean;
  action?: { label: string; onClick: () => void };
}

interface ToastItem extends ToastOptions {
  id: number;
  /** Exit animation running: the toast is still mounted with data-state="closed". */
  leaving?: boolean;
}

export interface ToastApi {
  show: (options: ToastOptions) => number;
  dismiss: (id: number) => void;
  clear: () => void;
  success: (message: ReactNode, options?: ToastOptions) => number;
  error: (message: ReactNode, options?: ToastOptions) => number;
  info: (message: ReactNode, options?: ToastOptions) => number;
  warning: (message: ReactNode, options?: ToastOptions) => number;
}

export type ToastPosition = 'top-start' | 'top-center' | 'top-end' | 'bottom-start' | 'bottom-center' | 'bottom-end';

const ToastContext = createContext<ToastApi | null>(null);

const ICONS: Record<Severity, IconName> = { info: 'info', success: 'check-circle', warning: 'alert-triangle', danger: 'alert-circle', secondary: 'info' };
const DEFAULT_LIFE = 5000;

export interface ToastProviderProps {
  position?: ToastPosition;
  max?: number;
  children: ReactNode;
}

export function ToastProvider({ position = 'top-end', max = 5, children }: ToastProviderProps) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const nextId = useRef(1);

  const remove = useCallback((id: number) => setToasts((list) => list.filter((t) => t.id !== id)), []);
  const dismiss = useCallback(
    (id: number) => {
      if (prefersReducedMotion() || !canAnimate()) return remove(id);
      setToasts((list) => list.map((t) => (t.id === id ? { ...t, leaving: true } : t)));
      window.setTimeout(() => remove(id), Math.round(readMotionMs(document.documentElement, 'part') * 0.7));
    },
    [remove],
  );
  const show = useCallback(
    (options: ToastOptions) => {
      const id = nextId.current++;
      setToasts((list) => [...list, { ...options, id }].slice(-max));
      return id;
    },
    [max],
  );
  const api = useMemo<ToastApi>(
    () => ({
      show,
      dismiss,
      clear: () => setToasts([]),
      success: (message, o) => show({ ...o, message, severity: 'success' }),
      error: (message, o) => show({ ...o, message, severity: 'danger' }),
      info: (message, o) => show({ ...o, message, severity: 'info' }),
      warning: (message, o) => show({ ...o, message, severity: 'warning' }),
    }),
    [show, dismiss],
  );

  const polite = toasts.filter((t) => t.severity !== 'danger');
  const assertive = toasts.filter((t) => t.severity === 'danger');
  const [vertical, horizontal] = position.split('-') as ['top' | 'bottom', 'start' | 'center' | 'end'];

  return (
    <ToastContext.Provider value={api}>
      {children}
      <div className={cx('toast-container position-fixed p-3 ui-toast-container', `ui-toast-container--${vertical}`, `ui-toast-container--${horizontal}`)}>
        <ToastRegion role="status" live="polite" toasts={polite} onDismiss={dismiss} />
        <ToastRegion role="alert" live="assertive" toasts={assertive} onDismiss={dismiss} />
      </div>
    </ToastContext.Provider>
  );
}

function ToastRegion({ role, live, toasts, onDismiss }: { role: 'status' | 'alert'; live: 'polite' | 'assertive'; toasts: ToastItem[]; onDismiss: (id: number) => void }) {
  const ref = useRef<HTMLDivElement>(null);
  // Remaining toasts slide into the gap a dismissed one leaves (FLIP, transform only).
  useFlip(ref, [toasts.map((t) => t.id).join()]);
  return (
    <div ref={ref} role={role} aria-live={live} className="ui-toast-region">
      {toasts.map((t) => (
        <ToastView key={t.id} toast={t} onDismiss={onDismiss} />
      ))}
    </div>
  );
}

function ToastView({ toast, onDismiss }: { toast: ToastItem; onDismiss: (id: number) => void }) {
  const { t } = useLocale();
  const severity = toast.severity ?? 'info';
  const sticky = toast.sticky ?? severity === 'danger';
  const [paused, setPaused] = useState(false);
  const remaining = useRef(toast.life ?? DEFAULT_LIFE);

  useEffect(() => {
    if (sticky || paused || toast.leaving) return;
    const started = Date.now();
    const timer = window.setTimeout(() => onDismiss(toast.id), remaining.current);
    return () => {
      window.clearTimeout(timer);
      remaining.current -= Date.now() - started;
    };
  }, [sticky, paused, onDismiss, toast.id, toast.leaving]);

  return (
    <div
      className={cx('toast show ui-toast', `ui-toast--${severity}`)}
      data-state={toast.leaving ? 'closed' : 'open'}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)}
      onBlur={() => setPaused(false)}
    >
      <div className="toast-body ui-toast__body">
        <Icon name={ICONS[severity]} className="ui-toast__icon" />
        <div className="ui-toast__content">
          {toast.title && <div className="ui-toast__title">{toast.title}</div>}
          {toast.message && <div className="ui-toast__message">{toast.message}</div>}
          {toast.action && (
            <button
              type="button"
              className="btn btn-link btn-sm p-0 ui-toast__action"
              onClick={() => {
                toast.action!.onClick();
                onDismiss(toast.id);
              }}
            >
              {toast.action.label}
            </button>
          )}
        </div>
        <button type="button" className="btn-close ui-toast__close" aria-label={t('dismiss')} onClick={() => onDismiss(toast.id)} />
      </div>
    </div>
  );
}

export function useToast(): ToastApi {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used inside <ToastProvider>.');
  return ctx;
}
