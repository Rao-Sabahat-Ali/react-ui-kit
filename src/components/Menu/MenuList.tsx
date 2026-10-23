import {
  Fragment,
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type KeyboardEvent,
  type MouseEvent,
  type PointerEvent,
  type ReactNode,
  type Ref,
  type RefObject,
  type SyntheticEvent,
} from 'react';
import { useFloating } from '../../hooks/useFloating';
import { useTypeahead } from '../../hooks/useTypeahead';
import { cx } from '../../utils/cx';
import { routerLinkHandler } from '../../utils/navigation';
import { safeUrl } from '../../utils/url';
import { Icon } from '../Icon/Icon';
import { isRtl, mergeRefs } from '../Tooltip/shared';
import type { FocusRequest, MenuCloseReason, MenuItem, NavigateHandler } from './types';

export const HOVER_OPEN_DELAY = 150;
export const HOVER_CLOSE_DELAY = 300;

export interface MenuListProps {
  items: MenuItem[];
  id?: string;
  ariaLabel?: string;
  ariaLabelledby?: string;
  /** Items with `items` open flyout submenus (TieredMenu); otherwise they render as labelled groups. */
  tiered?: boolean;
  /** Inline menu: roving tabindex (exactly one item has tabindex 0). Popup menus keep every item at -1. */
  inline?: boolean;
  level?: number;
  hidden?: boolean;
  focusRequest?: FocusRequest | null;
  /** Close every level (activation, Tab, Escape at root). */
  onCloseAll?: (reason: MenuCloseReason, event?: SyntheticEvent) => void;
  /** Close this (sub)level and focus its parent item. */
  onCloseLevel?: () => void;
  /** Menubar: ArrowRight on a leaf / ArrowLeft in a first-level submenu. */
  onHorizontal?: (direction: 'next' | 'prev', event: KeyboardEvent<HTMLElement>) => void;
  onNavigate?: NavigateHandler;
  /** Open submenus on hover (fine pointers). */
  hoverOpen?: boolean;
  orientation?: 'vertical' | 'horizontal';
  className?: string;
  style?: CSSProperties;
  listRef?: Ref<HTMLUListElement>;
}

interface Flat {
  item: MenuItem;
  key: string;
}

const isVisible = (item: MenuItem) => item.visible !== false;
const hasChildren = (item: MenuItem) => Boolean(item.items?.some(isVisible));
export const itemKey = (item: MenuItem, path: string) => item.key ?? `${path}:${item.label}`;

/** Resolve the anchor attributes for an item href (safeUrl + rel for _blank). */
export function linkProps(item: MenuItem): { href: string; target?: string; rel?: string } | null {
  const href = safeUrl(item.href);
  if (!href || item.disabled) return null;
  return item.target === '_blank' ? { href, target: '_blank', rel: 'noopener noreferrer' } : { href };
}

/** One level of a menu (APG Menu): roles, keyboard, typeahead, checkable items and flyout submenus. */
export function MenuList({
  items,
  id,
  ariaLabel,
  ariaLabelledby,
  tiered = false,
  inline = false,
  level = 0,
  hidden = false,
  focusRequest,
  onCloseAll,
  onCloseLevel,
  onHorizontal,
  onNavigate,
  hoverOpen = true,
  orientation,
  className,
  style,
  listRef,
}: MenuListProps) {
  const baseId = useId();
  const ulRef = useRef<HTMLUListElement | null>(null);

  // Focusable items in DOM order (separators skipped; groups flattened in non-tiered menus).
  const flat = useMemo(() => {
    const out: Flat[] = [];
    const walk = (list: MenuItem[], path: string) =>
      list.filter(isVisible).forEach((item, i) => {
        if (item.separator) return;
        if (!tiered && hasChildren(item)) walk(item.items!, `${path}.${i}`);
        else out.push({ item, key: itemKey(item, `${path}.${i}`) });
      });
    walk(items, `${level}`);
    return out;
  }, [items, tiered, level]);
  const indexOf = useMemo(() => new Map(flat.map((f, i) => [f.item, i])), [flat]);

  const [activeIndex, setActiveIndex] = useState(0);
  const [openIndex, setOpenIndex] = useState<number | null>(null);
  const [subRequest, setSubRequest] = useState<FocusRequest | null>(null);
  const [checkedOverrides, setCheckedOverrides] = useState<Record<string, boolean>>({});
  const itemEls = useRef<(HTMLElement | null)[]>([]);
  const anchorRefs = useRef<{ current: HTMLElement | null }[]>([]);
  const timer = useRef<number | undefined>(undefined);
  const lastPointerType = useRef<string>('mouse');
  const seq = useRef(0);

  useEffect(() => setCheckedOverrides({}), [items]);
  useEffect(() => () => window.clearTimeout(timer.current), []);

  const safeActive = Math.min(activeIndex, Math.max(flat.length - 1, 0));
  const typeahead = useTypeahead(flat, (f: Flat) => f.item.label);

  const focusItem = useCallback((index: number) => {
    const el = itemEls.current[index];
    if (el) {
      el.focus();
      setActiveIndex(index);
    }
  }, []);

  useEffect(() => {
    if (!focusRequest || hidden) return;
    focusItem(focusRequest.position === 'first' ? 0 : flat.length - 1);
    // Re-run only for a new request.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [focusRequest?.seq, focusRequest, hidden]);

  const isChecked = (f: Flat) => checkedOverrides[f.key] ?? Boolean(f.item.checked);
  const isCheckable = (item: MenuItem) => item.checked !== undefined || item.group !== undefined;
  const isParent = (index: number) => tiered && Boolean(flat[index] && hasChildren(flat[index]!.item));

  const openSub = (index: number, position: 'first' | 'last' | null) => {
    window.clearTimeout(timer.current);
    openRef.current = index;
    setOpenIndex(index);
    seq.current += 1;
    setSubRequest(position ? { position, seq: seq.current } : null);
  };

  const openRef = useRef<number | null>(null);
  openRef.current = openIndex;
  const closeSub = (refocus: boolean) => {
    window.clearTimeout(timer.current);
    const current = openRef.current;
    if (current !== null) {
      const sub = itemEls.current[current]?.parentElement?.querySelector('[role="menu"]');
      if (refocus || sub?.contains(document.activeElement)) itemEls.current[current]?.focus();
    }
    openRef.current = null;
    setOpenIndex(null);
    setSubRequest(null);
  };

  const toggleChecked = (f: Flat) => {
    const { item } = f;
    if (item.group !== undefined) {
      const next: Record<string, boolean> = { ...checkedOverrides };
      flat.forEach((other) => {
        if (other.item.group === item.group) next[other.key] = other === f;
      });
      setCheckedOverrides(next);
    } else {
      setCheckedOverrides({ ...checkedOverrides, [f.key]: !isChecked(f) });
    }
  };

  const handleClick = (index: number, event: MouseEvent<HTMLElement>) => {
    const f = flat[index];
    if (!f) return;
    const { item } = f;
    if (item.disabled) {
      event.preventDefault();
      return;
    }
    if (isParent(index)) {
      // Touch toggles; mouse opens (a hover may already have opened it).
      if (lastPointerType.current === 'touch' && openIndex === index) closeSub(false);
      else openSub(index, event.detail === 0 ? 'first' : null);
      return;
    }
    if (isCheckable(item)) {
      toggleChecked(f);
      item.command?.({ item, event });
      return;
    }
    item.command?.({ item, event });
    const link = linkProps(item);
    if (link && event.currentTarget instanceof HTMLAnchorElement) routerLinkHandler(link.href, onNavigate)(event as MouseEvent<HTMLAnchorElement>);
    onCloseAll?.('activate', event);
  };

  const handleKeyDown = (index: number, event: KeyboardEvent<HTMLElement>) => {
    const f = flat[index];
    if (!f) return;
    const rtl = isRtl(ulRef.current);
    const horizontal = orientation === 'horizontal';
    const next = horizontal ? (rtl ? 'ArrowLeft' : 'ArrowRight') : 'ArrowDown';
    const prev = horizontal ? (rtl ? 'ArrowRight' : 'ArrowLeft') : 'ArrowUp';
    const inlineEnd = rtl ? 'ArrowLeft' : 'ArrowRight';
    const inlineStart = rtl ? 'ArrowRight' : 'ArrowLeft';
    const n = flat.length;
    const { key } = event;

    if (key === next) {
      event.preventDefault();
      focusItem((index + 1) % n);
    } else if (key === prev) {
      event.preventDefault();
      focusItem((index - 1 + n) % n);
    } else if (key === 'Home') {
      event.preventDefault();
      focusItem(0);
    } else if (key === 'End') {
      event.preventDefault();
      focusItem(n - 1);
    } else if (!horizontal && key === inlineEnd) {
      event.preventDefault();
      if (isParent(index) && !f.item.disabled) openSub(index, 'first');
      else onHorizontal?.('next', event);
    } else if (!horizontal && key === inlineStart) {
      event.preventDefault();
      if (level === 1 && onHorizontal) onHorizontal('prev', event);
      else if (level > 0) onCloseLevel?.();
    } else if (key === 'Enter' || key === ' ') {
      event.preventDefault();
      if (f.item.disabled) return;
      if (isParent(index)) {
        openSub(index, 'first');
        return;
      }
      itemEls.current[index]?.click();
      if (key === 'Enter' && isCheckable(f.item)) onCloseAll?.('activate', event);
    } else if (key === 'Escape') {
      if (level > 0) {
        event.preventDefault();
        event.stopPropagation();
        onCloseLevel?.();
      } else if (!inline && onCloseAll) {
        event.preventDefault();
        event.stopPropagation();
        onCloseAll('escape', event);
      }
    } else if (key === 'Tab') {
      if (openIndex !== null) closeSub(false);
      onCloseAll?.('tab', event);
    } else if (key.length === 1 && !event.ctrlKey && !event.metaKey && !event.altKey && key !== ' ') {
      const match = typeahead(key, index);
      if (match !== -1) {
        event.preventDefault();
        focusItem(match);
      }
    }
  };

  const handlePointerEnter = (index: number, event: PointerEvent<HTMLElement>) => {
    if (event.pointerType === 'touch') return;
    itemEls.current[index]?.focus({ preventScroll: true });
    setActiveIndex(index);
    if (!tiered || !hoverOpen) return;
    window.clearTimeout(timer.current);
    if (openIndex === index) return;
    if (openIndex !== null) {
      // A flyout is open: give the pointer time to travel (diagonally) into it before switching.
      timer.current = window.setTimeout(() => (isParent(index) ? openSub(index, null) : closeSub(false)), HOVER_CLOSE_DELAY);
    } else if (isParent(index)) {
      timer.current = window.setTimeout(() => openSub(index, null), HOVER_OPEN_DELAY);
    }
  };

  const handleEntryEnter = (index: number, event: PointerEvent<HTMLElement>) => {
    // Pointer is back over the open parent or its flyout: keep it open.
    if (event.pointerType !== 'touch' && openIndex === index) window.clearTimeout(timer.current);
  };

  const handleEntryLeave = (index: number, event: PointerEvent<HTMLElement>) => {
    if (event.pointerType === 'touch' || !hoverOpen || openIndex !== index) return;
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => closeSub(false), HOVER_CLOSE_DELAY);
  };

  const childCloseAll = (reason: MenuCloseReason, event?: SyntheticEvent) => {
    const parent = openIndex;
    window.clearTimeout(timer.current);
    setOpenIndex(null);
    setSubRequest(null);
    if (parent !== null && reason !== 'tab') itemEls.current[parent]?.focus();
    onCloseAll?.(reason, event);
  };

  const renderItem = (item: MenuItem) => {
    const index = indexOf.get(item);
    if (index === undefined) return null;
    const f = flat[index]!;
    const parent = isParent(index);
    const open = openIndex === index;
    const checkable = isCheckable(item);
    const role = item.group !== undefined ? 'menuitemradio' : checkable ? 'menuitemcheckbox' : 'menuitem';
    const link = !parent && !checkable ? linkProps(item) : null;
    const itemId = `${baseId}-item-${index}`;
    const subId = `${baseId}-sub-${index}`;
    const anchorRef = (anchorRefs.current[index] ??= { current: null });
    const setEl = (el: HTMLElement | null) => {
      itemEls.current[index] = el;
      anchorRef.current = el;
    };
    const common = {
      id: itemId,
      role,
      tabIndex: inline && level === 0 ? (index === safeActive ? 0 : -1) : -1,
      'aria-disabled': item.disabled || undefined,
      'aria-checked': checkable ? isChecked(f) : undefined,
      'aria-haspopup': parent ? ('menu' as const) : undefined,
      'aria-expanded': parent ? open : undefined,
      'aria-controls': parent ? subId : undefined,
      className: cx('dropdown-item ui-menu__item', item.danger && 'ui-menu__item--danger', item.disabled && 'disabled', parent && 'ui-menu__item--parent', open && 'active'),
      onClick: (e: MouseEvent<HTMLElement>) => handleClick(index, e),
      onKeyDown: (e: KeyboardEvent<HTMLElement>) => handleKeyDown(index, e),
      onFocus: () => setActiveIndex(index),
      onPointerEnter: (e: PointerEvent<HTMLElement>) => handlePointerEnter(index, e),
      onPointerDown: (e: PointerEvent<HTMLElement>) => (lastPointerType.current = e.pointerType),
    };
    const content = (
      <>
        {checkable && (
          <span className="ui-menu__check" aria-hidden="true">
            {isChecked(f) && <Icon name="check" />}
          </span>
        )}
        {item.icon ? <Icon name={item.icon} className="ui-menu__icon" /> : item.danger ? <Icon name="alert-triangle" className="ui-menu__icon" /> : null}
        <span className="ui-menu__label">{item.label}</span>
        {item.badge !== undefined && <span className="badge rounded-pill text-bg-secondary ui-menu__badge">{item.badge}</span>}
        {item.shortcut && (
          <span className="ui-menu__shortcut" aria-hidden="true">
            {item.shortcut}
          </span>
        )}
        {parent && <Icon name="chevron-right" directional className="ui-menu__submenu-icon" />}
      </>
    );
    return (
      <li
        key={f.key}
        role="none"
        className={cx('ui-menu__entry', parent && 'ui-menu__entry--parent')}
        onPointerEnter={parent ? (e) => handleEntryEnter(index, e) : undefined}
        onPointerLeave={parent ? (e) => handleEntryLeave(index, e) : undefined}
      >
        {link ? (
          <a ref={setEl} {...common} {...link}>
            {content}
          </a>
        ) : (
          <div ref={setEl} {...common}>
            {content}
          </div>
        )}
        {parent && (
          <Flyout anchorRef={anchorRef} open={open}>
            {(floatingRef, floatingStyle) => (
              <MenuList
                items={item.items!}
                id={subId}
                ariaLabelledby={itemId}
                tiered
                level={level + 1}
                hidden={!open}
                focusRequest={open ? subRequest : null}
                onCloseAll={childCloseAll}
                onCloseLevel={() => closeSub(true)}
                onHorizontal={onHorizontal}
                onNavigate={onNavigate}
                hoverOpen={hoverOpen}
                listRef={floatingRef}
                style={floatingStyle}
                className="ui-menu--submenu"
              />
            )}
          </Flyout>
        )}
      </li>
    );
  };

  const renderList = (list: MenuItem[], path: string): ReactNode =>
    list.filter(isVisible).map((item, i) => {
      const p = `${path}.${i}`;
      if (item.separator) return <li key={`sep-${p}`} role="separator" className="dropdown-divider ui-menu__separator" />;
      if (!tiered && hasChildren(item)) {
        const headerId = `${baseId}-group-${p}`;
        return (
          <Fragment key={`group-${p}`}>
            <li role="presentation" id={headerId} className="dropdown-header ui-menu__group-header">
              {item.label}
            </li>
            <li role="none">
              <ul role="group" aria-labelledby={headerId} className="list-unstyled ui-menu__group">
                {renderList(item.items!, p)}
              </ul>
            </li>
          </Fragment>
        );
      }
      return renderItem(item);
    });

  return (
    <ul
      ref={mergeRefs(ulRef, listRef)}
      id={id}
      role="menu"
      aria-label={ariaLabel}
      aria-labelledby={ariaLabel ? undefined : ariaLabelledby}
      aria-orientation={orientation}
      hidden={hidden}
      className={cx('dropdown-menu show ui-menu', level > 0 && 'ui-menu--level', className)}
      style={style}
    >
      {renderList(items, `${level}`)}
    </ul>
  );
}

function Flyout({
  anchorRef,
  open,
  children,
}: {
  anchorRef: RefObject<HTMLElement | null>;
  open: boolean;
  children: (floatingRef: RefObject<HTMLUListElement | null>, style: CSSProperties) => ReactNode;
}) {
  const floatingRef = useRef<HTMLUListElement | null>(null);
  const pos = useFloating(anchorRef, floatingRef, { open, placement: 'end-start', offset: 2 });
  return <>{children(floatingRef, { position: 'fixed', top: pos.top, left: pos.left })}</>;
}
