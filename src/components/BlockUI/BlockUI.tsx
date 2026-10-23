import { useEffect, useRef, type HTMLAttributes, type KeyboardEvent, type ReactNode, type Ref } from 'react';
import { useLocale } from '../../locale/LocaleProvider';
import { cx } from '../../utils/cx';
import { Spinner } from '../Spinner/Spinner';

export interface BlockUIProps extends HTMLAttributes<HTMLDivElement> {
  blocked: boolean;
  fullScreen?: boolean;
  /** Overlay content; defaults to a spinner and the locale `blocked` message. */
  template?: ReactNode;
  children?: ReactNode;
  ref?: Ref<HTMLDivElement>;
}

export function BlockUI({ blocked, fullScreen = false, template, className, children, ref, ...rest }: BlockUIProps) {
  const { t } = useLocale();
  const contentRef = useRef<HTMLDivElement | null>(null);
  const overlayRef = useRef<HTMLDivElement | null>(null);
  const previousFocus = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!blocked) return;
    const active = document.activeElement as HTMLElement | null;
    previousFocus.current = active && active !== document.body ? active : null;
    const insideContent = Boolean(active && contentRef.current?.contains(active));
    if (fullScreen || insideContent) overlayRef.current?.focus();
    return () => {
      const target = previousFocus.current;
      previousFocus.current = null;
      if (target && target.isConnected) target.focus();
    };
  }, [blocked, fullScreen]);

  // While blocked in full-screen mode the overlay owns focus; keep Tab from leaving it.
  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (fullScreen && event.key === 'Tab') event.preventDefault();
  };

  return (
    <div ref={ref} className={cx('ui-block-ui', fullScreen && 'ui-block-ui--fullscreen', blocked && 'ui-block-ui--blocked', className)} {...rest}>
      <div ref={contentRef} className="ui-block-ui__content" inert={blocked} aria-busy={blocked ? true : undefined}>
        {children}
      </div>
      <div className="ui-block-ui__live" role="status">
        {blocked && (
          <div ref={overlayRef} tabIndex={-1} className="ui-block-ui__overlay" onKeyDown={handleKeyDown}>
            {template ?? (
              <div className="ui-block-ui__message">
                <Spinner decorative />
                <span>{t('blocked')}</span>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
