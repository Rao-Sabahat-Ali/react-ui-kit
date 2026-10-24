import { useCallback, useEffect, useRef, useState, type Ref } from 'react';
import { useLocale } from '../../locale/LocaleProvider';
import { cx } from '../../utils/cx';
import { copyToClipboard } from '../../utils/clipboard';
import { Button, type ButtonAppearance, type ButtonVariant } from '../Button/Button';
import type { Size } from '../../types';

export interface CopyButtonProps {
  /**
   * Text to copy. A function is evaluated on click. Never rendered or logged.
   * Never use this for card data, passwords or other secrets: the clipboard is readable by other apps and clipboard
   * managers, and the component does not (and cannot) clear it afterwards.
   */
  value: string | (() => string);
  /** Idle label; the accessible name when `iconOnly`. */
  label?: string;
  copiedLabel?: string;
  failedLabel?: string;
  /** ms until the idle state returns; `0` keeps the state until the next click. */
  timeout?: number;
  iconOnly?: boolean;
  /** Receives the copied text. With `sensitive` it is called with no argument. */
  onCopy?: (value: string) => void;
  /**
   * The text is a one-time token or similar: `onCopy` is called WITHOUT the text and the component keeps no reference
   * to it after the copy call. This does not make clipboard use safe for secrets (see `value`). Default `false`.
   */
  sensitive?: boolean;
  onError?: (error: unknown) => void;
  variant?: ButtonVariant;
  appearance?: ButtonAppearance;
  size?: Size;
  disabled?: boolean;
  className?: string;
  ref?: Ref<HTMLButtonElement>;
}

type Status = 'idle' | 'copied' | 'failed';

export function CopyButton({
  value,
  label,
  copiedLabel,
  failedLabel,
  timeout = 2000,
  iconOnly = false,
  onCopy,
  sensitive = false,
  onError,
  variant = 'secondary',
  appearance = 'text',
  size = 'md',
  disabled = false,
  className,
  ref,
}: CopyButtonProps) {
  const { t } = useLocale();
  const idle = label ?? t('copy');
  const done = copiedLabel ?? t('copied');
  const failed = failedLabel ?? t('copyFailed');
  const [status, setStatus] = useState<Status>('idle');
  const timer = useRef<number | undefined>(undefined);
  const mounted = useRef(true);

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      window.clearTimeout(timer.current);
    };
  }, []);

  const handleClick = useCallback(async () => {
    window.clearTimeout(timer.current);
    let next: Status = 'failed';
    let text = '';
    let error: unknown = new Error('Copy failed');
    try {
      text = typeof value === 'function' ? value() : value;
      next = (await copyToClipboard(text)) ? 'copied' : 'failed';
    } catch (e) {
      error = e;
    }
    if (!mounted.current) return;
    setStatus(next);
    if (next === 'copied') {
      if (sensitive) {
        text = '';
        (onCopy as (() => void) | undefined)?.();
      } else onCopy?.(text);
    } else onError?.(error);
    if (timeout > 0) timer.current = window.setTimeout(() => mounted.current && setStatus('idle'), timeout);
  }, [value, timeout, onCopy, onError, sensitive]);

  const text = status === 'copied' ? done : status === 'failed' ? failed : idle;
  const icon = status === 'copied' ? 'check' : status === 'failed' ? 'alert-circle' : 'copy';
  const announcement = status === 'copied' ? done : status === 'failed' ? failed : '';

  const common = {
    ref,
    variant,
    appearance,
    size,
    disabled,
    icon,
    onClick: handleClick,
    className: 'ui-copy-button__button',
  } as const;

  return (
    <span className={cx('ui-copy-button', status !== 'idle' && `ui-copy-button--${status}`, className)}>
      {iconOnly ? <Button {...common} aria-label={idle} /> : <Button {...common}>{text}</Button>}
      <span className="visually-hidden ui-copy-button__status" role="status" aria-live="polite">
        {announcement}
      </span>
    </span>
  );
}
