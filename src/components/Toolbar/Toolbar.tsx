import { useEffect, useRef, type FocusEvent, type HTMLAttributes, type KeyboardEvent, type ReactNode, type Ref } from 'react';
import { useRovingFocus } from '../../hooks/useRovingFocus';
import { cx } from '../../utils/cx';
import { isEditable } from '../../utils/dom';

export interface ToolbarProps extends Omit<HTMLAttributes<HTMLDivElement>, 'children'> {
  start?: ReactNode;
  center?: ReactNode;
  end?: ReactNode;
  /** Accessible name; required when `roving`. */
  ariaLabel?: string;
  /** APG toolbar keyboard model: one tab stop, arrows move between controls. */
  roving?: boolean;
  ref?: Ref<HTMLDivElement>;
}

const ITEM_SELECTOR = 'button, a[href], input:not([type="hidden"]), select, textarea, [role="button"], [role="checkbox"], [role="radio"], [role="switch"]';

export function Toolbar({ start, center, end, ariaLabel, roving = false, className, onKeyDown, onFocus, ref, ...rest }: ToolbarProps) {
  const rootRef = useRef<HTMLDivElement | null>(null);
  const handleRoving = useRovingFocus(rootRef, { orientation: 'horizontal', selector: ITEM_SELECTOR });

  if (roving && !ariaLabel && !rest['aria-labelledby'] && import.meta.env?.DEV) {
    console.warn('[react-ui-kit] Toolbar: `ariaLabel` is required when `roving` is set.');
  }

  // Keep exactly one tab stop: the last focused item, else the first enabled one.
  useEffect(() => {
    if (!roving || !rootRef.current) return;
    const items = Array.from(rootRef.current.querySelectorAll<HTMLElement>(ITEM_SELECTOR)).filter((el) => !el.hasAttribute('disabled') && el.getAttribute('aria-disabled') !== 'true');
    if (!items.length) return;
    const current = items.find((el) => el.getAttribute('tabindex') === '0') ?? items[0]!;
    items.forEach((el) => el.setAttribute('tabindex', el === current ? '0' : '-1'));
  });

  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    onKeyDown?.(event);
    if (!roving || event.defaultPrevented) return;
    if (isEditable(event.target) && (event.key === 'ArrowLeft' || event.key === 'ArrowRight' || event.key === 'Home' || event.key === 'End')) return;
    handleRoving(event);
  };

  const handleFocus = (event: FocusEvent<HTMLDivElement>) => {
    onFocus?.(event);
    if (!roving || !rootRef.current) return;
    const target = event.target as HTMLElement;
    if (!target.matches(ITEM_SELECTOR)) return;
    rootRef.current.querySelectorAll<HTMLElement>(ITEM_SELECTOR).forEach((el) => el.setAttribute('tabindex', el === target ? '0' : '-1'));
  };

  return (
    <div
      ref={(node) => {
        rootRef.current = node;
        if (typeof ref === 'function') ref(node);
        else if (ref) ref.current = node;
      }}
      role="toolbar"
      aria-label={ariaLabel}
      className={cx('btn-toolbar ui-toolbar', className)}
      onKeyDown={handleKeyDown}
      onFocus={handleFocus}
      {...rest}
    >
      {start !== undefined && <div className="ui-toolbar__start">{start}</div>}
      {center !== undefined && <div className="ui-toolbar__center">{center}</div>}
      {end !== undefined && <div className="ui-toolbar__end">{end}</div>}
    </div>
  );
}
