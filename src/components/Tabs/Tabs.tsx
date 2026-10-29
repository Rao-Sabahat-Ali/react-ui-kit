import { createContext, useCallback, useContext, useEffect, useId, useLayoutEffect, useRef, useState, type CSSProperties, type KeyboardEvent, type ReactNode } from 'react';
import { useLocale } from '../../locale';
import { useControllableState } from '../../hooks/useControllableState';
import { cx } from '../../utils/cx';
import { Icon, type IconName } from '../Icon/Icon';

interface TabsContextValue {
  value: string | undefined;
  select: (value: string) => void;
  baseId: string;
  variant: 'tabs' | 'pills' | 'underline';
  orientation: 'horizontal' | 'vertical';
  activation: 'auto' | 'manual';
  lazy: boolean;
  scrollable: boolean;
  visited: Set<string>;
}

const TabsContext = createContext<TabsContextValue | null>(null);

function useTabs(component: string): TabsContextValue {
  const ctx = useContext(TabsContext);
  if (!ctx) throw new Error(`<${component}> must be used inside <Tabs>.`);
  return ctx;
}

const slug = (value: string) => value.replace(/[^a-zA-Z0-9_-]/g, '_');
const tabId = (base: string, value: string) => `${base}-tab-${slug(value)}`;
const panelId = (base: string, value: string) => `${base}-panel-${slug(value)}`;

export interface TabItem {
  value: string;
  label: ReactNode;
  content: ReactNode;
  disabled?: boolean;
  icon?: IconName;
}

export interface TabsProps {
  value?: string;
  defaultValue?: string;
  onChange?: (value: string) => void;
  variant?: 'tabs' | 'pills' | 'underline';
  orientation?: 'horizontal' | 'vertical';
  activation?: 'auto' | 'manual';
  fill?: 'none' | 'fill' | 'justified';
  lazy?: boolean;
  /** Horizontal scroll with prev/next buttons when the tabs overflow (horizontal orientation only). */
  scrollable?: boolean;
  items?: TabItem[];
  className?: string;
  children?: ReactNode;
  'aria-label'?: string;
}

export function Tabs({ value: valueProp, defaultValue, onChange, variant = 'tabs', orientation = 'horizontal', activation = 'auto', fill = 'none', lazy = true, scrollable = false, items, className, children, ...rest }: TabsProps) {
  const baseId = useId();
  const firstEnabled = items?.find((i) => !i.disabled)?.value;
  const [value, setValue] = useControllableState<string | undefined>(valueProp, defaultValue ?? firstEnabled, onChange as ((v: string | undefined) => void) | undefined);
  const [visited] = useState(() => new Set<string>());
  if (value !== undefined) visited.add(value);

  const ctx: TabsContextValue = { value, select: (v) => setValue(v), baseId, variant, orientation, activation, lazy, scrollable: scrollable && orientation === 'horizontal', visited };

  const body = items ? (
    <>
      <TabList fill={fill} aria-label={rest['aria-label']}>
        {items.map((item) => (
          <Tab key={item.value} value={item.value} disabled={item.disabled} icon={item.icon}>
            {item.label}
          </Tab>
        ))}
      </TabList>
      {items.map((item) => (
        <TabPanel key={item.value} value={item.value}>
          {item.content}
        </TabPanel>
      ))}
    </>
  ) : (
    children
  );

  return (
    <TabsContext.Provider value={ctx}>
      <div className={cx('ui-tabs', orientation === 'vertical' && 'ui-tabs--vertical d-flex gap-3', className)}>{body}</div>
    </TabsContext.Provider>
  );
}

export interface TabListProps {
  children: ReactNode;
  fill?: 'none' | 'fill' | 'justified';
  className?: string;
  'aria-label'?: string;
}

const prefersReducedMotion = () => typeof window !== 'undefined' && typeof window.matchMedia === 'function' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

function TabList({ children, fill = 'none', className, ...rest }: TabListProps) {
  const ctx = useTabs('Tabs.List');
  const { t } = useLocale();
  const listRef = useRef<HTMLDivElement>(null);
  const viewportRef = useRef<HTMLDivElement>(null);
  const vertical = ctx.orientation === 'vertical';
  const scrollable = ctx.scrollable;
  const [edges, setEdges] = useState<{ overflow: boolean; atStart: boolean; atEnd: boolean }>({ overflow: false, atStart: true, atEnd: true });

  // Accent step indicator: a 2px bar under (or beside) the selected tab that slides with transform only.
  const [indicator, setIndicator] = useState<{ pos: number; size: number; ready: boolean } | null>(null);
  const showIndicator = ctx.variant !== 'pills';
  const placeIndicator = useCallback(() => {
    const selected = listRef.current?.querySelector<HTMLElement>('[role="tab"][aria-selected="true"]');
    if (!selected) return setIndicator(null);
    const pos = vertical ? selected.offsetTop : selected.offsetLeft;
    const size = vertical ? selected.offsetHeight : selected.offsetWidth;
    setIndicator((prev) => (prev && prev.pos === pos && prev.size === size ? prev : { pos, size, ready: prev !== null }));
  }, [vertical]);

  useLayoutEffect(() => {
    if (!showIndicator) return;
    placeIndicator();
    const list = listRef.current;
    const observer = typeof ResizeObserver === 'undefined' || !list ? null : new ResizeObserver(placeIndicator);
    if (list) observer?.observe(list);
    list?.querySelectorAll('[role="tab"]').forEach((tab) => observer?.observe(tab));
    return () => observer?.disconnect();
  }, [showIndicator, placeIndicator, ctx.value, children]);

  const measure = useCallback(() => {
    const el = viewportRef.current;
    if (!el) return;
    // scrollLeft is 0 at the inline start and negative in RTL, so work with its magnitude.
    const offset = Math.abs(el.scrollLeft);
    const overflow = el.scrollWidth > el.clientWidth + 1;
    const next = { overflow, atStart: offset <= 1, atEnd: offset + el.clientWidth >= el.scrollWidth - 1 };
    setEdges((prev) => (prev.overflow === next.overflow && prev.atStart === next.atStart && prev.atEnd === next.atEnd ? prev : next));
  }, []);

  const reveal = useCallback((tab: Element | null | undefined) => {
    const viewport = viewportRef.current;
    if (!viewport || !tab) return;
    const v = viewport.getBoundingClientRect();
    const r = tab.getBoundingClientRect();
    // Physical rects, so the delta is right in both directions; leave room for the scroll buttons.
    const pad = 4;
    const delta = r.left < v.left + pad ? r.left - v.left - pad : r.right > v.right - pad ? r.right - v.right + pad : 0;
    if (delta !== 0) viewport.scrollBy?.({ left: delta, behavior: prefersReducedMotion() ? 'auto' : 'smooth' });
  }, []);

  useEffect(() => {
    const viewport = viewportRef.current;
    if (!scrollable || !viewport) return;
    measure();
    const observer = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(measure);
    observer?.observe(viewport);
    if (listRef.current) observer?.observe(listRef.current);
    window.addEventListener('resize', measure);
    return () => {
      observer?.disconnect();
      window.removeEventListener('resize', measure);
    };
  }, [scrollable, measure, children]);

  // Keep the selected tab visible (selection by click, key or controlled value).
  useEffect(() => {
    if (!scrollable) return;
    reveal(listRef.current?.querySelector('[role="tab"][aria-selected="true"]'));
  }, [scrollable, ctx.value, reveal]);

  const scrollByPage = (direction: -1 | 1) => {
    const viewport = viewportRef.current;
    if (!viewport) return;
    const rtl = getComputedStyle(viewport).direction === 'rtl';
    const amount = viewport.clientWidth * 0.75 * direction * (rtl ? -1 : 1);
    viewport.scrollBy?.({ left: amount, behavior: prefersReducedMotion() ? 'auto' : 'smooth' });
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    const tabs = Array.from(listRef.current?.querySelectorAll<HTMLButtonElement>('[role="tab"]:not([disabled])') ?? []);
    const current = tabs.indexOf(document.activeElement as HTMLButtonElement);
    if (current === -1) return;
    const rtl = getComputedStyle(listRef.current!).direction === 'rtl';
    const nextKey = vertical ? 'ArrowDown' : rtl ? 'ArrowLeft' : 'ArrowRight';
    const prevKey = vertical ? 'ArrowUp' : rtl ? 'ArrowRight' : 'ArrowLeft';
    let target: number | null = null;
    if (event.key === nextKey) target = (current + 1) % tabs.length;
    else if (event.key === prevKey) target = (current - 1 + tabs.length) % tabs.length;
    else if (event.key === 'Home') target = 0;
    else if (event.key === 'End') target = tabs.length - 1;
    if (target === null) return;
    event.preventDefault();
    const tab = tabs[target]!;
    tab.focus();
    if (scrollable) reveal(tab);
    if (ctx.activation === 'auto') ctx.select(tab.dataset.value!);
  };

  const list = (
    // Focus lives on the tabs (roving tabindex); the tablist only delegates arrow keys.
    // eslint-disable-next-line jsx-a11y/interactive-supports-focus
    <div
      ref={listRef}
      role="tablist"
      aria-orientation={ctx.orientation}
      className={cx(
        'nav ui-tabs__list',
        `nav-${ctx.variant}`,
        vertical && 'flex-column',
        fill === 'fill' && 'nav-fill',
        fill === 'justified' && 'nav-justified',
        scrollable && 'ui-tabs__list--scrollable',
        className,
      )}
      onKeyDown={handleKeyDown}
      onFocus={scrollable ? (event) => reveal((event.target as Element).closest('[role="tab"]')) : undefined}
      style={indicator ? ({ '--ui-tab-pos': indicator.pos, '--ui-tab-size': indicator.size } as CSSProperties) : undefined}
      {...rest}
    >
      {children}
      {showIndicator && indicator && <span className={cx('ui-tabs__indicator', indicator.ready && 'ui-tabs__indicator--ready')} aria-hidden="true" />}
    </div>
  );

  if (!scrollable) return list;

  // The buttons are a pointer/touch affordance. Keyboard users move with the arrow keys (which scroll the focused
  // tab into view), so the buttons stay out of the tab order instead of adding two redundant stops.
  return (
    <div className={cx('ui-tabs__scroller', edges.overflow && 'ui-tabs__scroller--overflow')}>
      {edges.overflow && (
        <button type="button" tabIndex={-1} className="ui-tabs__scroll ui-tabs__scroll--start" aria-label={t('tabsScrollBack')} disabled={edges.atStart} onClick={() => scrollByPage(-1)}>
          <Icon name="chevron-left" />
        </button>
      )}
      <div ref={viewportRef} className="ui-tabs__viewport" onScroll={measure}>
        {list}
      </div>
      {edges.overflow && (
        <button type="button" tabIndex={-1} className="ui-tabs__scroll ui-tabs__scroll--end" aria-label={t('tabsScrollForward')} disabled={edges.atEnd} onClick={() => scrollByPage(1)}>
          <Icon name="chevron-right" />
        </button>
      )}
    </div>
  );
}

export interface TabProps {
  value: string;
  children: ReactNode;
  disabled?: boolean;
  icon?: IconName;
  badge?: ReactNode;
  className?: string;
}

function Tab({ value, children, disabled = false, icon, badge, className }: TabProps) {
  const ctx = useTabs('Tabs.Tab');
  const selected = ctx.value === value;
  return (
    <button
      type="button"
      role="tab"
      id={tabId(ctx.baseId, value)}
      aria-selected={selected}
      aria-controls={panelId(ctx.baseId, value)}
      tabIndex={selected ? 0 : -1}
      disabled={disabled}
      data-value={value}
      className={cx('nav-link ui-tabs__tab', selected && 'active', className)}
      onClick={() => ctx.select(value)}
      onKeyDown={(event) => {
        if (ctx.activation === 'manual' && (event.key === 'Enter' || event.key === ' ')) {
          event.preventDefault();
          ctx.select(value);
        }
      }}
    >
      {icon && <Icon name={icon} className="ui-tabs__icon" />}
      {children}
      {badge !== undefined && <span className="badge rounded-pill text-bg-secondary ui-tabs__badge">{badge}</span>}
    </button>
  );
}

export interface TabPanelProps {
  value: string;
  children: ReactNode;
  className?: string;
}

function TabPanel({ value, children, className }: TabPanelProps) {
  const ctx = useTabs('Tabs.Panel');
  const selected = ctx.value === value;
  if (ctx.lazy && !ctx.visited.has(value)) return null;
  return (
    <div
      role="tabpanel"
      id={panelId(ctx.baseId, value)}
      aria-labelledby={tabId(ctx.baseId, value)}
      tabIndex={0}
      hidden={!selected}
      className={cx('ui-tabs__panel', className)}
    >
      {children}
    </div>
  );
}

Tabs.List = TabList;
Tabs.Tab = Tab;
Tabs.Panel = TabPanel;
