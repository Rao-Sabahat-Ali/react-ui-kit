import { useId, useMemo, useRef, type CSSProperties, type KeyboardEvent, type MouseEvent, type ReactNode, type Ref } from 'react';
import { useControllableState } from '../../hooks/useControllableState';
import { useLocale } from '../../locale/LocaleProvider';
import { cx } from '../../utils/cx';
import { routerLinkHandler } from '../../utils/navigation';
import { Icon } from '../Icon/Icon';
import { linkProps } from '../Menu/MenuList';
import type { MenuItem, NavigateHandler } from '../Menu/types';
import { mergeRefs } from '../../utils/element';

export interface PanelMenuProps {
  items: MenuItem[];
  /** Allow several sections open at once. */
  multiple?: boolean;
  expandedKeys?: string[];
  defaultExpandedKeys?: string[];
  onToggle?: (expandedKeys: string[], item: MenuItem) => void;
  /** Current route: matches an item's `key` or `href`; gets `aria-current="page"` and its ancestors start expanded. */
  activeKey?: string;
  ariaLabel?: string;
  /** Heading level wrapping section headers. */
  headingLevel?: 2 | 3 | 4 | 5 | 6;
  onNavigate?: NavigateHandler;
  id?: string;
  className?: string;
  style?: CSSProperties;
  ref?: Ref<HTMLElement>;
}

const visible = (item: MenuItem) => item.visible !== false && !item.separator;
const hasChildren = (item: MenuItem) => Boolean(item.items?.some(visible));
const keyOf = (item: MenuItem, path: string) => item.key ?? path;

/** Keys of the sections that contain `activeKey`. */
function ancestorsOf(items: MenuItem[], activeKey: string | undefined, path = ''): string[] | null {
  if (activeKey === undefined) return null;
  const list = items.filter(visible);
  for (let i = 0; i < list.length; i++) {
    const item = list[i]!;
    const p = path ? `${path}.${i}` : `${i}`;
    if (item.key === activeKey || (item.href !== undefined && item.href === activeKey)) return [];
    if (hasChildren(item)) {
      const inner = ancestorsOf(item.items!, activeKey, p);
      if (inner) return [keyOf(item, p), ...inner];
    }
  }
  return null;
}

/** Path of section keys from the root to `key` (inclusive). */
function chainTo(items: MenuItem[], key: string, path = ''): string[] | null {
  const list = items.filter(visible);
  for (let i = 0; i < list.length; i++) {
    const item = list[i]!;
    const p = path ? `${path}.${i}` : `${i}`;
    const k = keyOf(item, p);
    if (k === key) return [k];
    if (hasChildren(item)) {
      const inner = chainTo(item.items!, key, p);
      if (inner) return [k, ...inner];
    }
  }
  return null;
}

/** Accordion-style hierarchical navigation (APG Disclosure). */
export function PanelMenu({ items, multiple = false, expandedKeys, defaultExpandedKeys = [], onToggle, activeKey, ariaLabel, headingLevel = 3, onNavigate, id, className, style, ref }: PanelMenuProps) {
  const { t } = useLocale();
  const baseId = useId();
  const navRef = useRef<HTMLElement | null>(null);
  const initial = useMemo(() => Array.from(new Set([...defaultExpandedKeys, ...(ancestorsOf(items, activeKey) ?? [])])), []); // eslint-disable-line react-hooks/exhaustive-deps
  const [expanded, setExpanded] = useControllableState<string[]>(expandedKeys, initial);

  const toggle = (item: MenuItem, key: string) => {
    const isOpen = expanded.includes(key);
    let next: string[];
    if (isOpen) next = expanded.filter((k) => k !== key);
    else if (multiple) next = [...expanded, key];
    else next = chainTo(items, key) ?? [key];
    setExpanded(next);
    onToggle?.(next, item);
  };

  const onHeaderKeyDown = (event: KeyboardEvent<HTMLButtonElement>) => {
    if (!['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(event.key)) return;
    const headers = Array.from(navRef.current?.querySelectorAll<HTMLButtonElement>('.ui-panel-menu__header') ?? []).filter((el) => !el.closest('[hidden]'));
    const index = headers.indexOf(event.currentTarget);
    const target =
      event.key === 'Home' ? 0 : event.key === 'End' ? headers.length - 1 : event.key === 'ArrowDown' ? Math.min(index + 1, headers.length - 1) : Math.max(index - 1, 0);
    event.preventDefault();
    headers[target]?.focus();
  };

  const isActive = (item: MenuItem) => activeKey !== undefined && (item.key === activeKey || (item.href !== undefined && item.href === activeKey));

  const renderLeaf = (item: MenuItem): ReactNode => {
    const content = (
      <>
        {item.icon && <Icon name={item.icon} className="ui-panel-menu__icon" />}
        <span className="ui-panel-menu__label">{item.label}</span>
        {item.badge !== undefined && <span className="badge ui-badge text-bg-secondary ui-panel-menu__badge">{item.badge}</span>}
      </>
    );
    const active = isActive(item);
    const link = linkProps(item);
    if (link)
      return (
        <a href={link.href} target={link.target} rel={link.rel} className={cx('ui-panel-menu__link', active && 'active')} aria-current={active ? 'page' : undefined} onClick={routerLinkHandler(link.href, onNavigate)}>
          {content}
        </a>
      );
    return (
      <button
        type="button"
        className={cx('ui-panel-menu__link', active && 'active', item.disabled && 'disabled')}
        aria-current={active ? 'page' : undefined}
        aria-disabled={item.disabled || undefined}
        onClick={(event: MouseEvent<HTMLButtonElement>) => {
          if (!item.disabled) item.command?.({ item, event });
        }}
      >
        {content}
      </button>
    );
  };

  const renderItems = (list: MenuItem[], path: string, depth: number): ReactNode =>
    list.filter(visible).map((item, i) => {
      const p = path ? `${path}.${i}` : `${i}`;
      const key = keyOf(item, p);
      if (!hasChildren(item)) return <li key={key} className="ui-panel-menu__leaf">{renderLeaf(item)}</li>;
      const open = expanded.includes(key);
      const contentId = `${baseId}-section-${p}`;
      return (
        <li key={key} className={cx('ui-panel-menu__section', depth === 0 && 'ui-panel-menu__section--root')}>
          <div role="heading" aria-level={headingLevel + Math.min(depth, 6 - headingLevel)} className="ui-panel-menu__heading">
            <button
              type="button"
              className={cx('ui-panel-menu__header', open && 'ui-panel-menu__header--open')}
              aria-expanded={open}
              aria-controls={contentId}
              aria-disabled={item.disabled || undefined}
              onClick={() => !item.disabled && toggle(item, key)}
              onKeyDown={onHeaderKeyDown}
            >
              {item.icon && <Icon name={item.icon} className="ui-panel-menu__icon" />}
              <span className="ui-panel-menu__label">{item.label}</span>
              <Icon name="chevron-down" className="ui-panel-menu__chevron" />
            </button>
          </div>
          <div id={contentId} hidden={!open} className="ui-panel-menu__content">
            <ul className="list-unstyled ui-panel-menu__list">{renderItems(item.items!, p, depth + 1)}</ul>
          </div>
        </li>
      );
    });

  return (
    <nav ref={mergeRefs(navRef, ref)} id={id} aria-label={ariaLabel ?? t('menu')} className={cx('ui-panel-menu', className)} style={style}>
      <ul className="list-unstyled ui-panel-menu__list ui-panel-menu__list--root">{renderItems(items, '', 0)}</ul>
    </nav>
  );
}
