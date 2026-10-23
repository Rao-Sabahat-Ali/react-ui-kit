import { useEffect, useId, useRef, useState, type CSSProperties, type FocusEvent, type KeyboardEvent, type MouseEvent, type PointerEvent, type ReactNode, type Ref, type SyntheticEvent } from 'react';
import { useClickOutside } from '../../hooks/useClickOutside';
import { useMediaQuery } from '../../hooks/useMediaQuery';
import { useTypeahead } from '../../hooks/useTypeahead';
import { useLocale } from '../../locale/LocaleProvider';
import { cx } from '../../utils/cx';
import { routerLinkHandler } from '../../utils/navigation';
import { Icon } from '../Icon/Icon';
import { HOVER_CLOSE_DELAY, HOVER_OPEN_DELAY, linkProps, MenuList } from '../Menu/MenuList';
import type { FocusRequest, MenuCloseReason, MenuItem, NavigateHandler } from '../Menu/types';
import { focusAdjacentTabbable, isRtl } from '../../utils/element';

const BREAKPOINTS = { sm: 576, md: 768, lg: 992, xl: 1200 } as const;

export interface MenubarProps {
  items: MenuItem[];
  /** Brand slot. */
  start?: ReactNode;
  /** Actions slot. */
  end?: ReactNode;
  breakpoint?: keyof typeof BREAKPOINTS;
  ariaLabel?: string;
  /** `auto`: navigation mode when every leaf item has an `href`, otherwise APG menubar. */
  mode?: 'auto' | 'navigation' | 'menubar';
  /** Current page: matching link gets `aria-current="page"`. */
  activeHref?: string;
  onNavigate?: NavigateHandler;
  /** Open submenus on hover (fine pointers, 150 ms / 300 ms intent). Never the only way to open. */
  openOnHover?: boolean;
  id?: string;
  className?: string;
  style?: CSSProperties;
  ref?: Ref<HTMLElement>;
}

const visible = (item: MenuItem) => item.visible !== false && !item.separator;
const hasChildren = (item: MenuItem) => Boolean(item.items?.some(visible));
const allLeavesHaveHref = (items: MenuItem[]): boolean => items.filter(visible).every((item) => (hasChildren(item) ? allLeavesHaveHref(item.items!) : Boolean(item.href)));

export function Menubar({ items, start, end, breakpoint = 'lg', ariaLabel, mode = 'auto', activeHref, onNavigate, openOnHover = false, id, className, style, ref }: MenubarProps) {
  const { t } = useLocale();
  const baseId = useId();
  const panelId = `${baseId}-panel`;
  const label = ariaLabel ?? t('mainNavigation');
  const navigation = mode === 'navigation' || (mode === 'auto' && allLeavesHaveHref(items));
  const collapsed = useMediaQuery(`(max-width: ${BREAKPOINTS[breakpoint] - 0.02}px)`);
  const [panelOpen, setPanelOpen] = useState(false);
  const togglerRef = useRef<HTMLButtonElement | null>(null);
  const panelRef = useRef<HTMLDivElement | null>(null);
  const topItems = items.filter(visible);

  // Collapsed panel: Escape closes it (after any open submenu handled the key) and focuses the toggler.
  useEffect(() => {
    if (!collapsed || !panelOpen) return;
    const onKey = (event: globalThis.KeyboardEvent) => {
      if (event.key !== 'Escape' || event.defaultPrevented || !panelRef.current?.contains(event.target as Node)) return;
      // An open disclosure submenu handles Escape first.
      const openSub = panelRef.current.querySelector('button[aria-expanded="true"]')?.parentElement;
      if (openSub?.contains(event.target as Node)) return;
      event.preventDefault();
      setPanelOpen(false);
      togglerRef.current?.focus();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [collapsed, panelOpen]);

  let body: ReactNode;
  if (collapsed) {
    body = (
      <>
        <button
          ref={togglerRef}
          type="button"
          className="navbar-toggler ui-menubar__toggler"
          aria-expanded={panelOpen}
          aria-controls={panelId}
          aria-label={t('menu')}
          onClick={() => setPanelOpen(!panelOpen)}
        >
          <Icon name="menu" />
        </button>
        <div ref={panelRef} id={panelId} hidden={!panelOpen} className="ui-menubar__panel">
          {navigation ? (
            <DisclosureNav items={topItems} activeHref={activeHref} onNavigate={onNavigate} vertical openOnHover={false} />
          ) : (
            <MenuList items={topItems} ariaLabel={label} tiered inline hoverOpen={false} onNavigate={onNavigate} className="ui-menubar__vertical" />
          )}
        </div>
      </>
    );
  } else {
    body = navigation ? (
      <DisclosureNav items={topItems} activeHref={activeHref} onNavigate={onNavigate} openOnHover={openOnHover} />
    ) : (
      <MenubarBar items={topItems} ariaLabel={label} activeHref={activeHref} onNavigate={onNavigate} openOnHover={openOnHover} />
    );
  }

  const content = (
    <div className="container-fluid ui-menubar__inner">
      {start && <div className="navbar-brand ui-menubar__start">{start}</div>}
      {body}
      {end && <div className="ui-menubar__end">{end}</div>}
    </div>
  );
  const classes = cx('navbar navbar-expand ui-menubar', collapsed && 'ui-menubar--collapsed', className);

  // Navigation mode is a landmark; menubar mode names the menubar itself (no duplicate landmark).
  return navigation ? (
    <nav ref={ref} id={id} aria-label={label} className={classes} style={style}>
      {content}
    </nav>
  ) : (
    <div ref={ref as Ref<HTMLDivElement>} id={id} className={classes} style={style}>
      {content}
    </div>
  );
}

/* ---------- Navigation mode: APG Disclosure Navigation ---------- */

interface DisclosureNavProps {
  items: MenuItem[];
  activeHref?: string;
  onNavigate?: NavigateHandler;
  vertical?: boolean;
  openOnHover: boolean;
}

function DisclosureNav({ items, activeHref, onNavigate, vertical = false, openOnHover }: DisclosureNavProps) {
  const baseId = useId();
  const [openIndex, setOpenIndex] = useState<number | null>(null);
  const listRef = useRef<HTMLUListElement | null>(null);
  const timer = useRef<number | undefined>(undefined);
  const buttons = useRef<(HTMLButtonElement | null)[]>([]);
  useClickOutside([listRef], () => setOpenIndex(null), openIndex !== null);
  useEffect(() => () => window.clearTimeout(timer.current), []);

  // Escape anywhere in an open submenu closes it and focuses its button.
  useEffect(() => {
    if (openIndex === null) return;
    const onKey = (event: globalThis.KeyboardEvent) => {
      if (event.key !== 'Escape' || event.defaultPrevented) return;
      const li = buttons.current[openIndex]?.parentElement;
      const inside = li?.contains(event.target as Node) ?? false;
      // Hover-opened submenus are dismissible while focus is elsewhere (WCAG 1.4.13).
      if (!inside && event.target !== document.body) return;
      event.preventDefault();
      setOpenIndex(null);
      if (inside) buttons.current[openIndex]?.focus();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [openIndex]);

  const renderLinks = (list: MenuItem[], depth: number): ReactNode =>
    list.filter(visible).map((item, i) => {
      if (hasChildren(item))
        return (
          <li key={`${item.label}-${i}`} className="ui-menubar__group">
            <span className="dropdown-header ui-menubar__group-label">{item.label}</span>
            <ul className="list-unstyled ui-menubar__group-list">{renderLinks(item.items!, depth + 1)}</ul>
          </li>
        );
      return (
        <li key={`${item.label}-${i}`}>
          <NavLink item={item} activeHref={activeHref} onNavigate={onNavigate} className="dropdown-item ui-menubar__link" after={() => setOpenIndex(null)} />
        </li>
      );
    });

  const hoverEnter = (index: number, event: PointerEvent<HTMLElement>) => {
    if (!openOnHover || event.pointerType === 'touch') return;
    window.clearTimeout(timer.current);
    if (openIndex === index) return;
    timer.current = window.setTimeout(() => setOpenIndex(index), HOVER_OPEN_DELAY);
  };
  const hoverLeave = (index: number, event: PointerEvent<HTMLElement>) => {
    if (!openOnHover || event.pointerType === 'touch') return;
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => setOpenIndex((o) => (o === index ? null : o)), HOVER_CLOSE_DELAY);
  };

  return (
    <ul ref={listRef} className={cx('navbar-nav ui-menubar__list', vertical && 'flex-column ui-menubar__list--vertical')}>
      {items.map((item, index) => {
        if (!hasChildren(item)) {
          return (
            <li key={`${item.label}-${index}`} className="nav-item">
              <NavLink item={item} activeHref={activeHref} onNavigate={onNavigate} className="nav-link ui-menubar__top" />
            </li>
          );
        }
        const open = openIndex === index;
        const subId = `${baseId}-sub-${index}`;
        return (
          <li
            key={`${item.label}-${index}`}
            className="nav-item ui-menubar__item"
            onPointerEnter={(e) => hoverEnter(index, e)}
            onPointerLeave={(e) => hoverLeave(index, e)}
            onBlur={(e: FocusEvent<HTMLLIElement>) => {
              if (open && !e.currentTarget.contains(e.relatedTarget as Node | null)) setOpenIndex(null);
            }}
          >
            <button
              ref={(el) => {
                buttons.current[index] = el;
              }}
              type="button"
              className="nav-link dropdown-toggle ui-menubar__top"
              aria-expanded={open}
              aria-controls={subId}
              onClick={() => setOpenIndex(open ? null : index)}
            >
              {item.icon && <Icon name={item.icon} className="ui-menubar__icon" />}
              {item.label}
            </button>
            <ul id={subId} hidden={!open} className="dropdown-menu show ui-menubar__submenu">
              {renderLinks(item.items!, 1)}
            </ul>
          </li>
        );
      })}
    </ul>
  );
}

/** Link for disclosure navigation; items whose href is unsafe or disabled render as inert text. */
export function NavLink({ item, activeHref, onNavigate, className, after }: { item: MenuItem; activeHref?: string; onNavigate?: NavigateHandler; className: string; after?: () => void }) {
  const link = linkProps(item);
  const content = (
    <>
      {item.icon && <Icon name={item.icon} className="ui-menubar__icon" />}
      {item.label}
    </>
  );
  if (!link)
    return (
      <span className={cx(className, 'disabled')} aria-disabled="true">
        {content}
      </span>
    );
  const current = link.href === activeHref;
  return (
    <a href={link.href} target={link.target} rel={link.rel} className={cx(className, current && 'active')} aria-current={current ? 'page' : undefined} onClick={routerLinkHandler(link.href, onNavigate, after)}>
      {content}
    </a>
  );
}

/* ---------- Menubar mode: APG Menubar ---------- */

interface MenubarBarProps {
  items: MenuItem[];
  ariaLabel: string;
  activeHref?: string;
  onNavigate?: NavigateHandler;
  openOnHover: boolean;
}

function MenubarBar({ items, ariaLabel, activeHref, onNavigate, openOnHover }: MenubarBarProps) {
  const baseId = useId();
  const barRef = useRef<HTMLUListElement | null>(null);
  const itemEls = useRef<(HTMLElement | null)[]>([]);
  const [activeIndex, setActiveIndex] = useState(0);
  const [openIndex, setOpenIndex] = useState<number | null>(null);
  const [request, setRequest] = useState<FocusRequest | null>(null);
  const seq = useRef(0);
  const timer = useRef<number | undefined>(undefined);
  const typeahead = useTypeahead(items, (item: MenuItem) => item.label);
  const n = items.length;

  useClickOutside([barRef], () => setOpenIndex(null), openIndex !== null);
  useEffect(() => () => window.clearTimeout(timer.current), []);

  // Hover-opened submenus close on Escape even when focus is elsewhere (WCAG 1.4.13 dismissible).
  useEffect(() => {
    if (openIndex === null) return;
    const onKey = (event: globalThis.KeyboardEvent) => {
      if (event.key !== 'Escape' || event.defaultPrevented) return;
      if (barRef.current?.contains(event.target as Node) || event.target === document.body) {
        event.preventDefault();
        setOpenIndex(null);
      }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [openIndex]);

  const focusTop = (index: number) => {
    setActiveIndex(index);
    itemEls.current[index]?.focus();
  };
  const isParent = (index: number) => Boolean(items[index] && hasChildren(items[index]!));

  const open = (index: number, position: 'first' | 'last' | null) => {
    window.clearTimeout(timer.current);
    seq.current += 1;
    setRequest(position ? { position, seq: seq.current } : null);
    setOpenIndex(index);
  };
  const close = (refocus: boolean) => {
    window.clearTimeout(timer.current);
    const current = openIndex;
    setOpenIndex(null);
    setRequest(null);
    if (refocus && current !== null) focusTop(current);
  };

  const moveTo = (index: number, keepOpen: boolean, position: 'first' | null = null) => {
    focusTop(index);
    if (keepOpen && isParent(index)) open(index, position);
    else setOpenIndex(null);
  };

  const handleKeyDown = (index: number, event: KeyboardEvent<HTMLElement>) => {
    const rtl = isRtl(barRef.current);
    const next = rtl ? 'ArrowLeft' : 'ArrowRight';
    const prev = rtl ? 'ArrowRight' : 'ArrowLeft';
    const { key } = event;
    const item = items[index]!;
    if (key === next || key === prev) {
      event.preventDefault();
      moveTo((index + (key === next ? 1 : -1) + n) % n, openIndex !== null);
    } else if (key === 'Home' || key === 'End') {
      event.preventDefault();
      moveTo(key === 'Home' ? 0 : n - 1, openIndex !== null);
    } else if ((key === 'ArrowDown' || key === 'Enter' || key === ' ') && isParent(index)) {
      event.preventDefault();
      if (!item.disabled) open(index, 'first');
    } else if (key === 'ArrowUp' && isParent(index)) {
      event.preventDefault();
      if (!item.disabled) open(index, 'last');
    } else if (key === 'Enter' || key === ' ') {
      event.preventDefault();
      itemEls.current[index]?.click();
    } else if (key === 'Escape') {
      if (openIndex !== null) {
        event.preventDefault();
        close(true);
      }
    } else if (key === 'Tab') {
      setOpenIndex(null);
    } else if (key.length === 1 && !event.ctrlKey && !event.metaKey && !event.altKey) {
      const match = typeahead(key, index);
      if (match !== -1) {
        event.preventDefault();
        moveTo(match, false);
      }
    }
  };

  const handleClick = (index: number, event: MouseEvent<HTMLElement>) => {
    const item = items[index]!;
    if (item.disabled) {
      event.preventDefault();
      return;
    }
    setActiveIndex(index);
    if (isParent(index)) {
      if (openIndex === index) close(false);
      else open(index, event.detail === 0 ? 'first' : null);
      return;
    }
    item.command?.({ item, event });
    const link = linkProps(item);
    if (link && event.currentTarget instanceof HTMLAnchorElement) routerLinkHandler(link.href, onNavigate)(event as MouseEvent<HTMLAnchorElement>);
    setOpenIndex(null);
  };

  const subCloseAll = (index: number) => (reason: MenuCloseReason, event?: SyntheticEvent) => {
    window.clearTimeout(timer.current);
    setOpenIndex(null);
    setRequest(null);
    if (reason === 'tab' && event) {
      event.preventDefault();
      const top = itemEls.current[index];
      if (top) focusAdjacentTabbable(top, (event as KeyboardEvent<HTMLElement>).shiftKey);
      return;
    }
    focusTop(index);
  };

  const hoverEnter = (index: number, event: PointerEvent<HTMLElement>) => {
    if (!openOnHover || event.pointerType === 'touch') return;
    window.clearTimeout(timer.current);
    if (openIndex === index) return;
    if (openIndex !== null) timer.current = window.setTimeout(() => (isParent(index) ? open(index, null) : setOpenIndex(null)), HOVER_OPEN_DELAY);
    else if (isParent(index)) timer.current = window.setTimeout(() => open(index, null), HOVER_OPEN_DELAY);
  };
  const hoverLeave = (index: number, event: PointerEvent<HTMLElement>) => {
    if (!openOnHover || event.pointerType === 'touch' || openIndex !== index) return;
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => setOpenIndex((o) => (o === index ? null : o)), HOVER_CLOSE_DELAY);
  };

  return (
    <ul ref={barRef} role="menubar" aria-label={ariaLabel} aria-orientation="horizontal" className="navbar-nav ui-menubar__bar">
      {items.map((item, index) => {
        const parent = isParent(index);
        const isOpen = openIndex === index;
        const itemId = `${baseId}-item-${index}`;
        const subId = `${baseId}-sub-${index}`;
        const link = parent ? null : linkProps(item);
        const common = {
          id: itemId,
          role: 'menuitem',
          tabIndex: index === Math.min(activeIndex, n - 1) ? 0 : -1,
          'aria-haspopup': parent ? ('menu' as const) : undefined,
          'aria-expanded': parent ? isOpen : undefined,
          'aria-controls': parent ? subId : undefined,
          'aria-disabled': item.disabled || undefined,
          'aria-current': link && link.href === activeHref ? ('page' as const) : undefined,
          className: cx('nav-link ui-menubar__top', isOpen && 'active', item.disabled && 'disabled'),
          onKeyDown: (e: KeyboardEvent<HTMLElement>) => handleKeyDown(index, e),
          onClick: (e: MouseEvent<HTMLElement>) => handleClick(index, e),
          onFocus: () => setActiveIndex(index),
          ref: (el: HTMLElement | null) => {
            itemEls.current[index] = el;
          },
        };
        const content = (
          <>
            {item.icon && <Icon name={item.icon} className="ui-menubar__icon" />}
            {item.label}
            {parent && <Icon name="chevron-down" className="ui-menubar__caret" />}
          </>
        );
        return (
          <li key={`${item.label}-${index}`} role="none" className="nav-item ui-menubar__item" onPointerEnter={(e) => hoverEnter(index, e)} onPointerLeave={(e) => hoverLeave(index, e)}>
            {link ? (
              <a {...common} {...link}>
                {content}
              </a>
            ) : (
              <div {...common}>{content}</div>
            )}
            {parent && (
              <MenuList
                items={item.items!}
                id={subId}
                ariaLabelledby={itemId}
                tiered
                level={1}
                hidden={!isOpen}
                focusRequest={isOpen ? request : null}
                hoverOpen={openOnHover}
                onCloseAll={subCloseAll(index)}
                onCloseLevel={() => close(true)}
                onHorizontal={(direction) => {
                  const target = (index + (direction === 'next' ? 1 : -1) + n) % n;
                  moveTo(target, true, 'first');
                }}
                onNavigate={onNavigate}
                className="ui-menubar__submenu"
              />
            )}
          </li>
        );
      })}
    </ul>
  );
}
