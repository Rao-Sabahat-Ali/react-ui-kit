import { useCallback, useEffect, useRef, type HTMLAttributes, type KeyboardEvent, type ReactNode, type Ref } from 'react';
import { useControllableState } from '../../hooks/useControllableState';
import { useLocale } from '../../locale/LocaleProvider';
import { cx } from '../../utils/cx';
import { getFocusable } from '../../utils/dom';
import { Icon } from '../Icon/Icon';

export interface InplaceProps extends Omit<HTMLAttributes<HTMLDivElement>, 'children' | 'onToggle'> {
  display: ReactNode;
  /** Editor, rendered while active. `close` deactivates and restores focus to the display. */
  children: (close: () => void) => ReactNode;
  active?: boolean;
  defaultActive?: boolean;
  onToggle?: (active: boolean) => void;
  closable?: boolean;
  disabled?: boolean;
  /** Name used in the "Edit {label}" button; defaults to `display` when it is a string. */
  label?: string;
  ref?: Ref<HTMLDivElement>;
}

export function Inplace({ display, children, active, defaultActive = false, onToggle, closable = false, disabled = false, label, className, ref, ...rest }: InplaceProps) {
  const { t } = useLocale();
  const [isActive, setActive] = useControllableState(active, defaultActive, onToggle);
  const displayRef = useRef<HTMLButtonElement | null>(null);
  const editorRef = useRef<HTMLDivElement | null>(null);
  const previous = useRef(isActive);

  const close = useCallback(() => setActive(false), [setActive]);

  useEffect(() => {
    const was = previous.current;
    previous.current = isActive;
    if (was === isActive) return;
    if (isActive) {
      const el = editorRef.current;
      if (el) (getFocusable(el)[0] ?? el).focus();
    } else {
      displayRef.current?.focus();
    }
  }, [isActive]);

  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === 'Escape') {
      event.stopPropagation();
      event.preventDefault();
      close();
    }
  };

  const name = label ?? (typeof display === 'string' ? display : '');

  return (
    <div ref={ref} className={cx('ui-inplace', isActive && 'ui-inplace--active', disabled && 'ui-inplace--disabled', className)} {...rest}>
      {isActive ? (
        <div ref={editorRef} tabIndex={-1} className="ui-inplace__content" onKeyDown={handleKeyDown}>
          {children(close)}
          {closable && (
            <button type="button" className="btn-close ui-inplace__close" aria-label={t('close')} onClick={close} />
          )}
        </div>
      ) : (
        <button ref={displayRef} type="button" className="ui-inplace__display" disabled={disabled} aria-label={name ? t('edit', { label: name }) : t('edit', { label: '' }).trim()} onClick={() => setActive(true)}>
          <span className="ui-inplace__value">{display}</span>
          <Icon name="edit" size="sm" className="ui-inplace__icon" />
        </button>
      )}
    </div>
  );
}
