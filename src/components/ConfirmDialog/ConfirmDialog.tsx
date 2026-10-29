import { createContext, useCallback, useContext, useId, useRef, useState, type ReactNode } from 'react';
import { useLocale } from '../../locale/LocaleProvider';
import { Button } from '../Button/Button';
import { Dialog } from '../Dialog/Dialog';

export interface ConfirmOptions {
  title: ReactNode;
  message?: ReactNode;
  acceptLabel?: string;
  rejectLabel?: string;
  severity?: 'primary' | 'danger';
}

export interface ConfirmDialogProps extends ConfirmOptions {
  open: boolean;
  onAccept: () => void;
  onReject: () => void;
}

export function ConfirmDialog({ open, title, message, acceptLabel, rejectLabel, severity = 'primary', onAccept, onReject }: ConfirmDialogProps) {
  const { t } = useLocale();
  const rejectRef = useRef<HTMLButtonElement>(null);
  const acceptRef = useRef<HTMLButtonElement>(null);
  const messageId = useId();
  return (
    <Dialog
      open={open}
      role="alertdialog"
      size="sm"
      title={title}
      showClose={false}
      closeOnBackdrop={false}
      onClose={onReject}
      initialFocus={severity === 'danger' ? rejectRef : acceptRef}
      aria-describedby={message ? messageId : undefined}
      footer={
        <>
          <Button ref={rejectRef} variant="secondary" appearance="outline" onClick={onReject}>
            {rejectLabel ?? t('cancel')}
          </Button>
          <Button ref={acceptRef} variant={severity} onClick={onAccept}>
            {acceptLabel ?? t('confirm')}
          </Button>
        </>
      }
    >
      {message && <div id={messageId}>{message}</div>}
    </Dialog>
  );
}

type ConfirmFn = (options: ConfirmOptions) => Promise<boolean>;
const ConfirmContext = createContext<ConfirmFn | null>(null);

/** Provides the promise-based `useConfirm()` API. */
export function ConfirmProvider({ children }: { children: ReactNode }) {
  // The last request stays rendered with open={false} so the dialog can play its exit animation (Dialog unmounts itself).
  const [state, setState] = useState<(ConfirmOptions & { resolve: (ok: boolean) => void }) | null>(null);
  const [open, setOpen] = useState(false);
  const confirm = useCallback<ConfirmFn>(
    (options) =>
      new Promise<boolean>((resolve) => {
        setState({ ...options, resolve });
        setOpen(true);
      }),
    [],
  );
  const settle = (ok: boolean) => {
    state?.resolve(ok);
    setOpen(false);
  };
  return (
    <ConfirmContext.Provider value={confirm}>
      {children}
      {state && <ConfirmDialog {...state} open={open} onAccept={() => settle(true)} onReject={() => settle(false)} />}
    </ConfirmContext.Provider>
  );
}

export function useConfirm(): ConfirmFn {
  const ctx = useContext(ConfirmContext);
  if (!ctx) throw new Error('useConfirm must be used inside <ConfirmProvider>.');
  return ctx;
}
