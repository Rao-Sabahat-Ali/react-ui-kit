import { cloneElement, useId, useRef, useState, type CSSProperties, type KeyboardEvent, type MouseEvent, type ReactElement, type Ref } from 'react';
import { useControllableState } from '../../hooks/useControllableState';
import { useLocale } from '../../locale/LocaleProvider';
import { cx } from '../../utils/cx';
import type { Placement } from '../../utils/position';
import { Button } from '../Button/Button';
import { elementRef, mergeRefs } from '../../utils/element';
import { MenuList } from './MenuList';
import { MenuPopup } from './MenuPopup';
import type { FocusRequest, MenuItem, NavigateHandler } from './types';

export interface MenuProps {
  items: MenuItem[];
  /** Render as a popup opened from `trigger`. */
  popup?: boolean;
  /** Popup mode: a native `<button>`; gets `aria-haspopup="menu"`, `aria-expanded`, `aria-controls`. Defaults to a "More actions" icon button. */
  trigger?: ReactElement;
  open?: boolean;
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  placement?: Placement;
  /** Accessible name. Popup menus default to being labelled by the trigger. */
  ariaLabel?: string;
  /** Plain left clicks on `href` items are passed here (client-side routing). */
  onNavigate?: NavigateHandler;
  id?: string;
  className?: string;
  style?: CSSProperties;
  /** Ref to the `role="menu"` list. */
  ref?: Ref<HTMLUListElement>;
}

type TriggerProps = { id?: string; onClick?: (e: MouseEvent<HTMLElement>) => void; onKeyDown?: (e: KeyboardEvent<HTMLElement>) => void };

/** Shared implementation of Menu and TieredMenu. */
export function MenuBase({ tiered, items, popup = false, trigger, open: openProp, defaultOpen = false, onOpenChange, placement = 'bottom-start', ariaLabel, onNavigate, id, className, style, ref }: MenuProps & { tiered: boolean }) {
  const { t } = useLocale();
  const generatedId = useId();
  const menuId = id ?? `${generatedId}-menu`;
  const [open, setOpen] = useControllableState(openProp, defaultOpen, onOpenChange);
  const [request, setRequest] = useState<FocusRequest | null>({ position: 'first', seq: 0 });
  const triggerRef = useRef<HTMLElement | null>(null);
  const seq = useRef(0);

  if (!popup) {
    return (
      <MenuList
        items={items}
        id={menuId}
        ariaLabel={ariaLabel}
        tiered={tiered}
        inline
        onNavigate={onNavigate}
        listRef={ref}
        className={cx('ui-menu--inline', className)}
        style={style}
      />
    );
  }

  const triggerElement = trigger ?? <Button variant="secondary" appearance="text" icon="more-vertical" aria-label={t('moreActions')} />;
  const triggerProps = triggerElement.props as TriggerProps;
  const triggerId = triggerProps.id ?? `${generatedId}-trigger`;

  const openWith = (position: 'first' | 'last') => {
    seq.current += 1;
    setRequest({ position, seq: seq.current });
    setOpen(true);
  };

  const triggerEl = cloneElement(triggerElement as ReactElement<Record<string, unknown>>, {
    ref: mergeRefs(triggerRef, elementRef(triggerElement)),
    id: triggerId,
    'aria-haspopup': 'menu',
    'aria-expanded': open,
    'aria-controls': open ? menuId : undefined,
    onClick: (e: MouseEvent<HTMLElement>) => {
      triggerProps.onClick?.(e);
      if (e.defaultPrevented) return;
      if (open) setOpen(false);
      else openWith('first');
    },
    onKeyDown: (e: KeyboardEvent<HTMLElement>) => {
      triggerProps.onKeyDown?.(e);
      if (e.defaultPrevented) return;
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        e.preventDefault();
        openWith(e.key === 'ArrowDown' ? 'first' : 'last');
      }
    },
  });

  return (
    <>
      {triggerEl}
      {open && (
        <MenuPopup
          items={items}
          id={menuId}
          ariaLabel={ariaLabel}
          ariaLabelledby={triggerId}
          tiered={tiered}
          anchorRef={triggerRef}
          placement={placement}
          restoreRef={triggerRef}
          focusRequest={request}
          onClose={() => setOpen(false)}
          onNavigate={onNavigate}
          className={className}
          listRef={ref}
        />
      )}
    </>
  );
}

/** APG Menu / Menu Button. Items with `items` render as labelled groups. */
export function Menu(props: MenuProps) {
  return <MenuBase {...props} tiered={false} />;
}
