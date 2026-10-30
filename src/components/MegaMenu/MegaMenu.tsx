import { useEffect, useId, useRef, useState, type CSSProperties, type FocusEvent, type PointerEvent, type ReactNode, type Ref } from 'react';
import { useClickOutside } from '../../hooks/useClickOutside';
import { useLocale } from '../../locale/LocaleProvider';
import { cx } from '../../utils/cx';
import { usePresence } from '../../motion/usePresence';
import type { IconName } from '../Icon/Icon';
import { Icon } from '../Icon/Icon';
import { HOVER_CLOSE_DELAY, HOVER_OPEN_DELAY } from '../Menu/MenuList';
import type { MenuItem, NavigateHandler } from '../Menu/types';
import { NavLink } from '../Menubar/Menubar';

/** TODO: move to locale key `viewAll` (not yet in en.ts). */

export interface MegaMenuColumn {
  header?: string;
  items: MenuItem[];
}

export interface MegaMenuItem {
  label: string;
  href?: string;
  icon?: IconName;
  columns?: MegaMenuColumn[];
  featured?: ReactNode;
}

export interface MegaMenuProps {
  items: MegaMenuItem[];
  orientation?: 'horizontal' | 'vertical';
  ariaLabel?: string;
  activeHref?: string;
  onNavigate?: NavigateHandler;
  /** Hover intent (150 ms open / 300 ms close) on fine pointers; never the only way to open. */
  openOnHover?: boolean;
  /** Label of the link to a top-level item's own `href` inside its panel. */
  viewAllLabel?: string;
  id?: string;
  className?: string;
  style?: CSSProperties;
  ref?: Ref<HTMLElement>;
}

/** Multi-column disclosure navigation (APG Disclosure Navigation, no menu roles). */
export function MegaMenu({ items, orientation = 'horizontal', ariaLabel, activeHref, onNavigate, openOnHover = false, viewAllLabel: viewAllLabelProp, id, className, style, ref }: MegaMenuProps) {
  const { t } = useLocale();
  const viewAllLabel = viewAllLabelProp ?? t('viewAll');
  const baseId = useId();
  const [openIndex, setOpenIndex] = useState<number | null>(null);
  const listRef = useRef<HTMLUListElement | null>(null);
  const buttons = useRef<(HTMLButtonElement | null)[]>([]);
  const timer = useRef<number | undefined>(undefined);

  useClickOutside([listRef], () => setOpenIndex(null), openIndex !== null);
  useEffect(() => () => window.clearTimeout(timer.current), []);

  useEffect(() => {
    if (openIndex === null) return;
    const onKey = (event: globalThis.KeyboardEvent) => {
      if (event.key !== 'Escape' || event.defaultPrevented) return;
      const li = buttons.current[openIndex]?.parentElement;
      const inside = li?.contains(event.target as Node) ?? false;
      if (!inside && event.target !== document.body) return;
      event.preventDefault();
      setOpenIndex(null);
      if (inside) buttons.current[openIndex]?.focus();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [openIndex]);

  const close = () => setOpenIndex(null);

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
    <nav ref={ref} id={id} aria-label={ariaLabel ?? t('mainNavigation')} className={cx('ui-mega-menu', `ui-mega-menu--${orientation}`, className)} style={style}>
      <ul ref={listRef} className={cx('nav ui-mega-menu__list', orientation === 'vertical' && 'flex-column')}>
        {items.map((item, index) => {
          if (!item.columns?.length) {
            return (
              <li key={`${item.label}-${index}`} className="nav-item">
                <NavLink item={item} activeHref={activeHref} onNavigate={onNavigate} className="nav-link ui-mega-menu__top" />
              </li>
            );
          }
          const open = openIndex === index;
          const panelId = `${baseId}-panel-${index}`;
          return (
            <li
              key={`${item.label}-${index}`}
              className="nav-item ui-mega-menu__item"
              onPointerEnter={(e) => hoverEnter(index, e)}
              onPointerLeave={(e) => hoverLeave(index, e)}
              onBlur={(e: FocusEvent<HTMLLIElement>) => {
                if (open && !e.currentTarget.contains(e.relatedTarget as Node | null)) close();
              }}
            >
              <button
                ref={(el) => {
                  buttons.current[index] = el;
                }}
                type="button"
                className="nav-link ui-mega-menu__top"
                aria-expanded={open}
                aria-controls={panelId}
                onClick={() => setOpenIndex(open ? null : index)}
              >
                {item.icon && <Icon name={item.icon} className="ui-mega-menu__icon" />}
                {item.label}
                <Icon name={orientation === 'vertical' ? 'chevron-right' : 'chevron-down'} directional={orientation === 'vertical'} className="ui-mega-menu__caret" />
              </button>
              <MegaPanel id={panelId} open={open}>
                <div className="row g-4">
                  {item.columns.map((column, c) => {
                    const headingId = `${panelId}-col-${c}`;
                    return (
                      <div key={c} className="col ui-mega-menu__column">
                        {column.header && (
                          <h3 id={headingId} className="ui-mega-menu__heading">
                            {column.header}
                          </h3>
                        )}
                        <ul className="list-unstyled ui-mega-menu__links" aria-labelledby={column.header ? headingId : undefined}>
                          {column.items
                            .filter((link) => link.visible !== false && !link.separator)
                            .map((link, l) => (
                              <li key={`${link.label}-${l}`}>
                                <NavLink item={link} activeHref={activeHref} onNavigate={onNavigate} className="dropdown-item ui-mega-menu__link" after={close} />
                              </li>
                            ))}
                        </ul>
                      </div>
                    );
                  })}
                  {item.featured && <div className="col-12 col-lg-4 ui-mega-menu__featured">{item.featured}</div>}
                </div>
                {item.href && (
                  <div className="ui-mega-menu__view-all">
                    <NavLink item={{ label: `${viewAllLabel} ${item.label}`, href: item.href }} activeHref={activeHref} onNavigate={onNavigate} className="ui-mega-menu__view-all-link" after={close} />
                  </div>
                )}
              </MegaPanel>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

/** The panel stays mounted (inert, data-state="closed") while its exit animation runs, then is hidden. */
function MegaPanel({ id, open, children }: { id: string; open: boolean; children: ReactNode }) {
  const { present, state } = usePresence(open, { exit: 'part' });
  return (
    <div id={id} hidden={!present} data-state={state} inert={state === 'closed' || undefined} className="dropdown-menu show ui-mega-menu__panel">
      {children}
    </div>
  );
}
